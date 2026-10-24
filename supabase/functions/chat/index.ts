import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndIncrementUsage } from "../_shared/usage-limits.ts";
import { buildVenueSearchUrl } from "../_shared/venue-links.ts";
import { matchVerifiedVenue, searchRadiusMeters, validCoordinates, withinRadius } from "../_shared/venue-locality.ts";
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
      } catch { console.error("Overpass failed:", host); resp = null; }
    }
    if (!resp || !resp.ok) {
      console.error("Overpass error:", resp?.status);
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
  } catch {
    console.error("Overpass fetch failed");
    return [];
  }
}

// Reliable place finder: Google Maps Places API (New) via the connector gateway.
// Server-side only — never expose LOVABLE_API_KEY or the connection key to the browser.
const GOOGLE_GATEWAY = "https://connector-gateway.lovable.dev/google_maps";

// Place types we search, grouped by the kind of date they suit. All are
// alcohol-free-friendly categories; anything bar-like is excluded after the fact.
const GOOGLE_TYPE_GROUPS: string[][] = [
  ["restaurant", "cafe", "ice_cream_shop", "bakery"],
  ["park", "garden", "hiking_area", "picnic_ground"],
  ["museum", "art_gallery", "aquarium", "zoo", "tourist_attraction"],
  ["movie_theater", "bowling_alley", "amusement_park", "miniature_golf_course", "ice_skating_rink", "trampoline_park"],
];

async function searchGooglePlaces(
  latitude: number,
  longitude: number,
  radiusMeters: number,
): Promise<OsmVenue[]> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GOOGLE_MAPS_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
    console.error("Google Maps connector credentials missing");
    return [];
  }
  const radius = Math.min(Math.max(radiusMeters, 1000), 50000); // Google caps at 50km
  const results = await Promise.all(
    GOOGLE_TYPE_GROUPS.map(async (includedTypes) => {
      try {
        const resp = await fetch(`${GOOGLE_GATEWAY}/places/v1/places:searchNearby`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
            "Content-Type": "application/json",
            "X-Goog-FieldMask": "places.displayName,places.location,places.primaryType,places.formattedAddress,places.businessStatus",
          },
          body: JSON.stringify({
            includedTypes,
            maxResultCount: 10,
            locationRestriction: {
              circle: { center: { latitude, longitude }, radius },
            },
          }),
          signal: AbortSignal.timeout(12000),
        });
        if (!resp.ok) {
          console.error("Google Places error:", resp.status, await resp.text());
          return [];
        }
        const data = await resp.json();
        return (data.places || []) as any[];
      } catch {
        console.error("Google Places fetch failed");
        return [];
      }
    }),
  );

  const seen = new Set<string>();
  const out: OsmVenue[] = [];
  for (const place of results.flat()) {
    const name: string | undefined = place?.displayName?.text;
    const lat = place?.location?.latitude;
    const lon = place?.location?.longitude;
    if (!name || typeof lat !== "number" || typeof lon !== "number") continue;
    // Skip anything Google marks as closed
    const status = String(place?.businessStatus || "").toUpperCase();
    if (status === "CLOSED_PERMANENTLY" || status === "CLOSED_TEMPORARILY") continue;
    // 13+ rule: block alcohol/adult/gambling venues by name
    if (isBlockedVenue({ name })) continue;
    const key = name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    // Extract the city from the formatted address when possible
    const addr: string = place?.formattedAddress || "";
    const parts = addr.split(",").map((p: string) => p.trim()).filter(Boolean);
    const city = parts.length >= 2 ? parts[parts.length - 2] : undefined;
    out.push({
      name,
      lat,
      lon,
      category: String(place?.primaryType || "venue").replace(/_/g, " "),
      city,
      distance_miles: haversineMiles(latitude, longitude, lat, lon),
    });
  }
  out.sort((a, b) => a.distance_miles - b.distance_miles);
  return out;
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

    const hasLocation = validCoordinates(latitude, longitude);

    // Determine search radius from "distance" filter (miles → meters)
    const radiusMeters = searchRadiusMeters(body.distance);
    if (!hasLocation) {
      return new Response(JSON.stringify({ error: "Allow location access and try again so we can find nearby places." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
      } catch {
        console.warn("Reverse geocode failed");
      }
      if (!cityLabel && clientCity) cityLabel = clientCity;
      console.log("User city resolved:", cityLabel ? "yes" : "no");
    }

    // Pick the closest 15 to give the AI plenty of options
    const topVenues = venues.filter(venue => validCoordinates(venue.lat, venue.lon) && withinRadius(venue.distance_miles, radiusMeters)).slice(0, 15);
    if (!topVenues.length) {
      return new Response(JSON.stringify({ error: "We couldn't verify nearby places right now. Please try again or widen your distance filter." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const venueContext = topVenues.length > 0
      ? `\n\nReal venues near the user (from OpenStreetMap, sorted by distance). EVERY date idea MUST be built around ONE of these EXACT venues. Do NOT invent or substitute other names:\n${topVenues
          .map((v, i) => `${i + 1}. ${v.name} — ${v.category} — ${formatMiles(v.distance_miles)} away${v.website ? ` — website: ${v.website}` : ""}`)
          .join("\n")}`
      : "";

    const locationLine = cityLabel
      ? `\n\nUSER LOCATION: ${cityLabel}. Every suggestion MUST use a verified venue from the list within ${radiusMeters / 1609.344} miles. Do not substitute a venue from another city.`
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
  ? `CRITICAL: Pick 3 different venues from the numbered list above. Use the EXACT venue name. Do NOT invent venues. Skip any venue you know has permanently closed. Do NOT suggest places from other cities. Every title MUST name the exact venue AND the city, e.g. "Lunch at Hot Chicken Takeover in ${cityLabel || "your city"}". The description must also name the venue and city — never give a generic overview like "a cozy restaurant downtown".`
  : cityLabel
    ? `CRITICAL: No live venue data. Suggest REAL, well-known places that actually exist in ${cityLabel}, and name the exact place in every title and description, e.g. "Stroll through Franklin Park Conservatory in ${cityLabel}". Never invent venues, only suggest places you are confident are CURRENTLY OPEN (never anything permanently closed, relocated, or seasonal-only out of season), never give generic overviews, and never name places from San Francisco, New York, or other cities.`
    : "CRITICAL: No location data. Keep suggestions generic — do NOT name specific venues."}

For each idea, respond ONLY with valid JSON — no markdown, no code fences, no extra text. Use this exact format:
[
  {
    "title": "Catchy title that names the exact venue and city, e.g. 'Lunch at Hot Chicken Takeover in Columbus, Ohio'",
    "description": "2-3 sentence vivid description that names the specific venue and city — never a generic overview",
    "estimated_cost": "e.g. Free, $10-20, $50+",
    "duration": "e.g. 2-3 hours",
    "vibe": "one word mood like Romantic, Adventurous, Cozy",
    "venue_name": "EXACT venue name from the list above; if no list but a city is provided, the exact real place name you suggest, without activity words or city. Use null only for a generic activity with no specific venue.",
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

    const enrich = async (idea: any) => {
      if (!idea || typeof idea !== "object") return null;
      const matched = matchVerifiedVenue(idea.venue_name, topVenues, radiusMeters);
      if (!matched) return null;
      const locality = matched.city || cityLabel;
      // Canonical venue/city copy prevents an otherwise valid venue ID from
      // being paired with hallucinated out-of-area prose or a second venue.
      const where = locality ? ` in ${locality}` : " nearby";
      const url = buildVenueSearchUrl(matched.name, locality);
      return {
        title: `${matched.name}${where}`,
        description: `Spend time together at ${matched.name}${where}. Check current opening hours and any booking requirements before you go.`,
        estimated_cost: String(idea.estimated_cost || ""), duration: String(idea.duration || ""),
        vibe: String(idea.vibe || ""), venue_name: matched.name, distance_miles: formatMiles(matched.distance_miles), url,
      };
    };

    const ignore = [cityLabel, ...cityLabel.split(",").map((x) => x.trim())].filter(Boolean);
    let ideas: any[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await callAI(attempt === 0 ? "" :
        "\n\nYour previous answer failed venue or safety validation. Use only EXACT names from the verified venue list and completely wholesome, alcohol-free, non-physical activities.");
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
      const enriched = (await Promise.all(parsed.slice(0, 3).map(enrich))).filter((idea) => idea !== null);
      const unique = enriched.filter((idea, index) => enriched.findIndex(other => other.venue_name === idea.venue_name) === index);
      if (unique.length === Math.min(3, topVenues.length) && isSafe(parsed, ignore) && isSafe(unique, ignore)) { ideas = unique; break; }
      console.warn(`Safety check failed (attempt ${attempt + 1}):`, findMatureTerms(enriched, ignore).join(", "));
    }

    // Fallback: keep only safe ideas, fill the rest with wholesome defaults. Never return failed output.
    if (ideas.length === 0) {
      const defaults = await Promise.all(topVenues.map(venue => enrich({ venue_name: venue.name, estimated_cost: "Check venue pricing", duration: "1-2 hours", vibe: "Relaxed" })));
      ideas = defaults.filter(idea => idea && isSafe(idea, ignore)).slice(0, 3);
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
