import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const resp = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(query),
    });
    if (!resp.ok) {
      console.error("Overpass error:", resp.status);
      return [];
    }
    const data = await resp.json();
    const out: OsmVenue[] = [];
    for (const el of data.elements || []) {
      const tags = el.tags || {};
      const name: string | undefined = tags.name;
      if (!name) continue;
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
    const { cost, location, activity, distance, timeRange, cuisine, latitude, longitude, funActivity, includeEating } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasLocation = typeof latitude === "number" && typeof longitude === "number";

    // Determine search radius from "distance" filter (in meters)
    let radiusMeters = 12000;
    const distStr = Array.isArray(distance) ? distance.join(" ") : String(distance || "");
    if (distStr.includes("Walking")) radiusMeters = 2000;
    else if (distStr.includes("Short drive")) radiusMeters = 12000;
    else if (distStr.includes("Day trip")) radiusMeters = 30000;
    else if (distStr.includes("Road trip")) radiusMeters = 80000;

    // Build OSM tag filters based on what the user wants
    const osmFilters: string[] = [];
    const actStr = Array.isArray(activity) ? activity.join(" ") : String(activity || "");
    const funStr = Array.isArray(funActivity) ? funActivity.join(" ") : String(funActivity || "");
    const combined = `${actStr} ${funStr}`.toLowerCase();

    if (includeEating) {
      osmFilters.push('"amenity"~"restaurant|cafe|bar|pub|ice_cream|fast_food"');
    }
    if (combined.includes("romantic") || combined.includes("relaxed") || combined.includes("cozy")) {
      osmFilters.push('"amenity"~"cafe|bar|restaurant"');
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
      osmFilters.push('"amenity"~"bar|pub|nightclub|cinema|theatre|bowling_alley"');
      osmFilters.push('"leisure"~"bowling_alley|escape_game|amusement_arcade|trampoline_park"');
    }

    // Always include a generic fallback so we never come up empty
    if (osmFilters.length === 0) {
      osmFilters.push('"tourism"~"attraction|museum|gallery|viewpoint|theme_park|zoo|aquarium"');
      osmFilters.push('"leisure"~"park|garden|bowling_alley|escape_game|ice_rink|miniature_golf"');
      osmFilters.push('"amenity"~"cafe|restaurant|bar|cinema|theatre|arts_centre"');
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
          { headers: { "User-Agent": "DateApp/1.0" } }
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
      console.log("User city:", cityLabel || "(unknown)", "coords:", latitude, longitude);
    }

    // Pick the closest 15 to give the AI plenty of options
    const topVenues = venues.slice(0, 15);

    const venueContext = topVenues.length > 0
      ? `\n\nReal venues near the user (from OpenStreetMap, sorted by distance). EVERY date idea MUST be built around ONE of these EXACT venues. Do NOT invent or substitute other names:\n${topVenues
          .map((v, i) => `${i + 1}. ${v.name} — ${v.category} — ${formatMiles(v.distance_miles)} away${v.website ? ` — website: ${v.website}` : ""}`)
          .join("\n")}`
      : "";

    const locationLine = cityLabel
      ? `\n\nUSER LOCATION: ${cityLabel} (lat ${latitude}, lon ${longitude}). Every suggestion MUST be in or within driving distance of ${cityLabel}. ABSOLUTELY DO NOT suggest venues in San Francisco, New York, Los Angeles, or any other city the user is not in.`
      : hasLocation
        ? `\n\nUSER LOCATION: lat ${latitude}, lon ${longitude}. Suggest places near these coordinates only. Never default to San Francisco.`
        : "";

    const prompt = `You are a creative date planner. Generate exactly 3 unique, specific date ideas based on these preferences:

- Budget: ${cost || "any"}
- Setting: ${location || "any"}
- Activity Style: ${activity || "any"}
${funActivity ? `- Specific Activity: ${funActivity}` : ""}
- Cuisine: ${includeEating && cuisine ? cuisine : "N/A - do NOT suggest restaurants"}
- Distance willing to travel: ${distance || "any"}
${!includeEating ? "IMPORTANT: The user does NOT want restaurant or dining suggestions. Focus on activities and experiences only." : ""}
- Time available: ${timeRange || "any"}${locationLine}
${venueContext}

${topVenues.length > 0
  ? "CRITICAL: Pick 3 different venues from the numbered list above. Use the EXACT venue name. Do NOT invent venues. Do NOT suggest places from other cities."
  : cityLabel
    ? `CRITICAL: No live venue data. Suggest REAL, well-known places that actually exist in ${cityLabel}. Never invent venues from San Francisco, New York, or other cities.`
    : "CRITICAL: No location data. Keep suggestions generic — do NOT name specific venues."}

For each idea, respond ONLY with valid JSON — no markdown, no code fences, no extra text. Use this exact format:
[
  {
    "title": "Short catchy title",
    "description": "2-3 sentence vivid description mentioning the specific venue name",
    "estimated_cost": "e.g. Free, $10-20, $50+",
    "duration": "e.g. 2-3 hours",
    "vibe": "one word mood like Romantic, Adventurous, Cozy",
    "venue_name": "EXACT venue name from the list above (or null if no list)",
    "website_url": "Official venue website if you know it for certain — otherwise null. NOT Yelp, NOT TripAdvisor, NOT a Google search."
  }
]`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a date planning assistant. Always respond with valid JSON arrays only. No markdown formatting." },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Too many requests. Please wait a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let ideas;
    try {
      ideas = JSON.parse(cleaned);

      ideas = await Promise.all(ideas.map(async (idea: any) => {
        const venueName: string | undefined = idea.venue_name;
        let matched: OsmVenue | undefined;
        if (venueName) {
          const vn = venueName.toLowerCase();
          matched = topVenues.find(
            (v) => v.name.toLowerCase() === vn ||
                   v.name.toLowerCase().includes(vn) ||
                   vn.includes(v.name.toLowerCase())
          );
        }

        // Distance: prefer real OSM distance; otherwise geocode the venue name with Nominatim
        let distance_miles = "N/A";
        if (matched) {
          distance_miles = formatMiles(matched.distance_miles);
        } else if (hasLocation && venueName) {
          try {
            const q = encodeURIComponent(`${venueName}${cityLabel ? ", " + cityLabel : ""}`);
            const r = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
              { headers: { "User-Agent": "DateApp/1.0" } }
            );
            if (r.ok) {
              const arr = await r.json();
              if (Array.isArray(arr) && arr[0]?.lat && arr[0]?.lon) {
                const miles = haversineMiles(latitude, longitude, parseFloat(arr[0].lat), parseFloat(arr[0].lon));
                distance_miles = formatMiles(miles);
              }
            }
          } catch (e) {
            console.warn("Nominatim venue lookup failed:", e);
          }
        }

        // Link priority: matched OSM website → AI-supplied URL → Google Maps place link
        let url: string | undefined;
        if (matched?.website && matched.website.startsWith("http")) {
          url = matched.website;
        } else if (typeof idea.website_url === "string" && idea.website_url.startsWith("http")) {
          url = idea.website_url;
        } else if (venueName) {
          const q = encodeURIComponent(`${venueName}${cityLabel ? " " + cityLabel : ""}`);
          url = `https://www.google.com/maps/search/?api=1&query=${q}`;
        }

        return { ...idea, distance_miles, url };
      }));
    } catch {
      console.error("Failed to parse AI response:", raw);
      ideas = [];
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
