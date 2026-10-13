import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndIncrementUsage } from "../_shared/usage-limits.ts";
import { SAFETY_PROMPT, isSafe, findMatureTerms, sanitizeUserText, isBlockedVenue } from "../_shared/content-safety.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface OsmVenue {
  name: string;
  lat: number;
  lon: number;
  category: string;
  website?: string;
  city?: string;
  distance_miles: number;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function formatMiles(miles: number): string {
  if (miles < 0.1) return `${Math.round(miles * 5280)} feet`;
  if (miles < 10) return `${miles.toFixed(1)} miles`;
  return `${Math.round(miles)} miles`;
}

// Query OpenStreetMap Overpass API for real venues near the user
async function searchOverpass(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  filters: string[]
): Promise<OsmVenue[]> {
  // Build Overpass QL query — looks for nodes/ways/relations matching any filter
  const filterBlocks = filters
    .map(
      (f) =>
        `node[${f}](around:${radiusMeters},${latitude},${longitude});` +
        `way[${f}](around:${radiusMeters},${latitude},${longitude});`
    )
    .join("");
  const query = `[out:json][timeout:20];(${filterBlocks});out center tags 60;`;

  try {
    let resp: Response | null = null;
    for (const host of ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]) {
      try {
        resp = await fetch(host, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "TeenEffort/1.0 (support.teeneffort@gmail.com)" },
          body: "data=" + encodeURIComponent(query),
          signal: AbortSignal.timeout(12000),
        });
        if (resp.ok) break;
        console.error("Overpass error:", host, resp.status);
      } catch (e) { console.error("Overpass failed:", host, e); resp = null; }
    }
    if (!resp || !resp.ok) {
      console.error("Overpass error:", resp.status);
      return [];
    }
    const data = await resp.json();
    const out: OsmVenue[] = [];
    for (const el of data.elements || []) {
      const tags = el.tags || {};
      const name: string | undefined = tags.name;
      if (!name) continue;
      // 13+ rule: never show alcohol, adult, gambling or smoking venues
      if (isBlockedVenue(tags)) continue;
      // Skip places marked closed / disused / demolished in OpenStreetMap
      const closedName = /\b(closed|permanently closed|former|defunct)\b/i.test(name);
      const oh = String(tags.opening_hours || "").toLowerCase().trim();
      const ended = tags.end_date || tags["disused"] === "yes" || tags["abandoned"] === "yes" ||
        Object.keys(tags).some((k) => /^(disused|abandoned|was|demolished|removed|razed|closed):/.test(k));
      if (closedName || ended || oh === "closed" || oh === "off") continue;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (typeof lat !== "number" || typeof lon !== "number") continue;
      const category =
        tags.amenity || tags.leisure || tags.tourism || tags.shop || tags.cuisine || "venue";
      out.push({
        name,
        lat,
        lon,
        category,
        website: tags.website || tags["contact:website"] || undefined,
        city: tags["addr:city"],
        distance_miles: haversineMiles(latitude, longitude, lat, lon),
      });
    }
    out.sort((a, b) => a.distance_miles - b.distance_miles);
    return out;
  } catch (e) {
    console.error("Overpass fetch failed:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Enforce monthly free-tier limit (paid users are unlimited)
    let usage;
    try {
      usage = await checkAndIncrementUsage(req, "date_ideas");
    } catch (authErr) {
      console.error("Auth/usage error", authErr);
      return new Response(
        JSON.stringify({ error: "You must be signed in to generate date ideas." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!usage.allowed) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          message: `You've used all ${usage.limit} free date generations this month. Upgrade for unlimited access.`,
          feature: "date_ideas",
          limit: usage.limit,
          remaining: 0,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const { latitude, longitude, includeEating } = body;
    // Neutralize any user/client text before it reaches a prompt
    const cost = sanitizeUserText(body.cost, 100);
    const location = sanitizeUserText(body.location, 200);
    const activity = sanitizeUserText(body.activity, 200);
    const distance = sanitizeUserText(body.distance, 100);
    const timeRange = sanitizeUserText(body.timeRange, 100);
    const cuisine = sanitizeUserText(body.cuisine, 200);
    const funActivity = sanitizeUserText(body.funActivity, 200);
    const clientCity = typeof body.city === "string" ? sanitizeUserText(body.city, 80) : undefined;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasLocation = typeof latitude === "number" && typeof longitude === "number";

    // Determine search radius from "distance" filter (miles → meters)
    let radiusMeters = 16093; // default 10 miles
    const distStr = Array.isArray(distance) ? distance.join(" ") : String(distance || "");
    if (distStr.includes("5 miles")) radiusMeters = 8047;
    else if (distStr.includes("10 miles")) radiusMeters = 16093;
    else if (distStr.includes("15 miles")) radiusMeters = 24140;
    else if (distStr.includes("20 miles")) radiusMeters = 32187;

    // Build OSM tag filters based on what the user wants
    const osmFilters: string[] = [];
    const actStr = Array.isArray(activity) ? activity.join(" ") : String(activity || "");
    const funStr = Array.isArray(funActivity) ? funActivity.join(" ") : String(funActivity || "");
    const combined = `${actStr} ${funStr}`.toLowerCase();

    if (includeEating) {
      osmFilters.push('"amenity"~"restaurant|cafe|ice_cream|fast_food"');
    }
    if (combined.includes("romantic") || combined.includes("relaxed") || combined.includes("cozy")) {
      osmFilters.push('"amenity"~"cafe|restaurant|ice_cream"');
      osmFilters.push('"leisure"~"park|garden"');
      osmFilters.push('"tourism"~"viewpoint|gallery|museum"');
    }
    if (combined.includes("adventure") || combined.includes("outdoor") || combined.includes("active")) {
      osmFilters.push('"leisure"~"park|nature_reserve|sports_centre|pitch|water_park|stadium|trampoline_park|escape_game|bowling_alley|climbing|miniature_golf|golf_course|ice_rink"');
      osmFilters.push('"tourism"~"attraction|theme_park|zoo|aquarium"');
    }
    if (combined.includes("creative") || combined.includes("art") || combined.includes("cultural")) {
      osmFilters.push('"tourism"~"museum|gallery|artwork"');
      osmFilters.push('"amenity"~"arts_centre|theatre|cinema|library"');
    }
    if (combined.includes("social") || combined.includes("nightlife") || combined.includes("playful") || combined.includes("fun")) {
      osmFilters.push('"amenity"~"cinema|theatre|bowling_alley|ice_cream"');
      osmFilters.push('"leisure"~"bowling_alley|escape_game|amusement_arcade|trampoline_park"');
    }

    // Always include a generic fallback so we never come up empty
    if (osmFilters.length === 0) {
      osmFilters.push('"tourism"~"attraction|museum|gallery|viewpoint|theme_park|zoo|aquarium"');
      osmFilters.push('"leisure"~"park|garden|bowling_alley|escape_game|ice_rink|miniature_golf"');
      osmFilters.push('"amenity"~"cafe|restaurant|cinema|theatre|arts_centre"');
    }

    let venues: OsmVenue[] = [];
    if (hasLocation) {
      venues = await searchOverpass(latitude, longitude, radiusMeters, osmFilters);
      console.log(`Overpass returned ${venues.length} venues within ${radiusMeters}m`);
    }

    // Reverse-geocode for the city label
    let cityLabel = "";
    if (hasLocation) {
      try {
        const geo = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`,
          { headers: { "User-Agent": "TeenEffort/1.0 (support.teeneffort@gmail.com)" }, signal: AbortSignal.timeout(8000) }
        );
        if (geo.ok) {
          const g = await geo.json();
          const a = g.address || {};
          const city = a.city || a.town || a.village || a.county || "";
          const state = a.state || "";
          cityLabel = [city, state].filter(Boolean).join(", ");
        }
      } catch (e) {
        console.warn("Reverse geocode failed:", e);
      }
      if (!cityLabel && clientCity) cityLabel = clientCity;
      console.log("User city resolved:", cityLabel ? "yes" : "no");
    }

    // Pick the closest 15 to give the AI plenty of options
    const topVenues = venues.slice(0, 15);

    const venueContext = topVenues.length > 0
      ? `\n\nReal venues near the user (from OpenStreetMap, sorted by distance). EVERY date idea MUST be built around ONE of these EXACT venues. Do NOT invent or substitute other names:\n${topVenues
          .map((v, i) => `${i + 1}. ${v.name} — ${v.category} — ${formatMiles(v.distance_miles)} away${v.website ? ` — website: ${v.website}` : ""}`)
          .join("\n")}`
      : "";

    const locationLine = cityLabel
      ? `\n\nUSER LOCATION: ${cityLabel}. Every suggestion MUST be in or within driving distance of ${cityLabel}. ABSOLUTELY DO NOT suggest venues in San Francisco, New York, Los Angeles, or any other city the user is not in.`
      : hasLocation
        ? `\n\nThe user is somewhere nearby the venue list above; suggest only those nearby venues. Never default to San Francisco.`
        : "";

    const prompt = `${SAFETY_PROMPT}

You are a creative date planner for a 13+ audience. Generate exactly 3 unique, specific date ideas based on these preferences:

- Budget (total cost for two people, MUST be respected): ${cost || "any"}
- Setting: ${location || "any"}
- Activity Style: ${activity || "any"}
${funActivity ? `- Specific Activity: ${funActivity}` : ""}
- Cuisine: ${includeEating && cuisine ? cuisine : "N/A - do NOT suggest restaurants"}
- Distance willing to travel: ${distance || "any"}
${!includeEating ? "IMPORTANT: The user does NOT want restaurant or dining suggestions. Focus on activities and experiences only." : ""}
- Time available: ${timeRange || "any"}${locationLine}
${venueContext}

${topVenues.length > 0
  ? `CRITICAL: Pick 3 different venues from the numbered list above. Use the EXACT venue name. Do NOT invent venues. Skip any venue you know has permanently closed. Do NOT suggest places from other cities. Every title MUST name the exact venue AND the city, e.g. "Dinner at The Refectory in ${cityLabel || "your city"}". The description must also name the venue and city — never give a generic overview like "a cozy restaurant downtown".`
  : cityLabel
    ? `CRITICAL: No live venue data. Suggest REAL, well-known places that actually exist in ${cityLabel}, and name the exact place in every title and description, e.g. "Stroll through Franklin Park Conservatory in ${cityLabel}". Never invent venues, only suggest places you are confident are CURRENTLY OPEN (never anything permanently closed, relocated, or seasonal-only out of season), never give generic overviews, and never name places from San Francisco, New York, or other cities.`
    : "CRITICAL: No location data. Keep suggestions generic — do NOT name specific venues."}

For each idea, respond ONLY with valid JSON — no markdown, no code fences, no extra text. Use this exact format:
[
  {
    "title": "Catchy title that names the exact venue and city, e.g. 'Dinner at The Refectory in Columbus, Ohio'",
    "description": "2-3 sentence vivid description that names the specific venue and city — never a generic overview",
    "estimated_cost": "e.g. Free, $10-20, $50+",
    "duration": "e.g. 2-3 hours",
    "vibe": "one word mood like Romantic, Adventurous, Cozy",
    "venue_name": "EXACT venue name from the list above (or null if no list)",
    "website_url": "Official venue website if you know it for certain — otherwise null. NOT Yelp, NOT TripAdvisor, NOT a Google search."
  }
]`;

    const callAI = async (extra: string): Promise<Response> => fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: `You are a date planning assistant. ${SAFETY_PROMPT} Always respond with valid JSON arrays only. No markdown formatting.` },
            { role: "user", content: prompt + extra },
          ],
        }),
      },
    );

    const mapsUrl = (name: string) =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}${cityLabel ? ", " + cityLabel : ""}`)}`;

    const enrich = async (idea: any) => {
      const venueName: string | undefined = idea.venue_name || undefined;
      let matched: OsmVenue | undefined;
      if (venueName) {
        const vn = venueName.toLowerCase();
        matched = topVenues.find((v) => v.name.toLowerCase() === vn || v.name.toLowerCase().includes(vn) || vn.includes(v.name.toLowerCase()));
      }
      let distance_miles = "N/A";
      if (matched) {
        distance_miles = formatMiles(matched.distance_miles);
      } else if (hasLocation && venueName) {
        try {
          const q = encodeURIComponent(`${venueName}${cityLabel ? ", " + cityLabel : ""}`);
          const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
            { headers: { "User-Agent": "TeenEffort/1.0 (support.teeneffort@gmail.com)" }, signal: AbortSignal.timeout(8000) });
          if (r.ok) {
            const arr = await r.json();
            if (Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
              distance_miles = formatMiles(haversineMiles(latitude, longitude, parseFloat(arr[0].lat), parseFloat(arr[0].lon)));
            }
          }
        } catch (e) { console.warn("Nominatim venue lookup failed:", e); }
      }
      // Always link to Google Maps: never 404s and shows hours / "Permanently closed".
      const url = venueName || idea.title ? mapsUrl(matched?.name || venueName || idea.title) : undefined;
      return {
        title: String(idea.title || ""), description: String(idea.description || ""),
        estimated_cost: String(idea.estimated_cost || ""), duration: String(idea.duration || ""),
        vibe: String(idea.vibe || ""), venue_name: venueName ?? null, distance_miles, url,
      };
    };

    const ignore = [cityLabel, ...cityLabel.split(",").map((x) => x.trim())].filter(Boolean);
    let ideas: any[] = [];
    let lastSafe: any[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await callAI(attempt === 0 ? "" :
        "\n\nYour previous answer contained content not suitable for ages 13+. Rewrite with completely wholesome, alcohol-free, non-physical activities only.");
      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        console.error("AI gateway error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "AI service error" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "[]";
      let parsed: any[] = [];
      try {
        const p = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        parsed = Array.isArray(p) ? p : [];
      } catch { console.error("Failed to parse AI response"); }
      const enriched = await Promise.all(parsed.slice(0, 3).map(enrich));
      if (enriched.length > 0 && isSafe(enriched, ignore)) { ideas = enriched; break; }
      console.warn(`Safety check failed (attempt ${attempt + 1}):`, findMatureTerms(enriched, ignore).join(", "));
      lastSafe = enriched.filter((i) => isSafe(i, ignore));
    }

    // Fallback: keep only safe ideas, fill the rest with wholesome defaults. Never return failed output.
    if (ideas.length === 0) {
      const where = cityLabel ? ` in ${cityLabel}` : "";
      const defaults = [
        { title: `Picnic at a local park${where}`, description: "Pack sandwiches, fruit and a blanket, then spend the afternoon talking, playing cards or frisbee in the sunshine.", estimated_cost: "$10-20", duration: "2-3 hours", vibe: "Relaxed", venue_name: null, distance_miles: "N/A", url: mapsUrl("parks") },
        { title: `Mini golf and ice cream${where}`, description: "Challenge each other to a round of mini golf, then cool off with your favorite ice cream flavors.", estimated_cost: "$20-40", duration: "2 hours", vibe: "Playful", venue_name: null, distance_miles: "N/A", url: mapsUrl("mini golf") },
        { title: `Museum afternoon${where}`, description: "Explore a local museum together and pick a favorite exhibit each to tell the other about.", estimated_cost: "Free-$30", duration: "2-3 hours", vibe: "Curious", venue_name: null, distance_miles: "N/A", url: mapsUrl("museum") },
      ];
      ideas = [...lastSafe, ...defaults].slice(0, 3);
    }

    return new Response(JSON.stringify({ ideas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
