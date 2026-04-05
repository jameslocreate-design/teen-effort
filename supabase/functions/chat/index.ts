import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface YelpBusiness {
  name: string;
  rating: number;
  review_count: number;
  price?: string;
  location: {
    address1: string;
    city: string;
  };
  categories: Array<{ title: string }>;
  distance: number;
  url: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

async function searchYelp(
  term: string,
  latitude: number,
  longitude: number,
  categories?: string,
  radius?: number
): Promise<YelpBusiness[]> {
  const YELP_API_KEY = Deno.env.get("YELP_API_KEY");
  if (!YELP_API_KEY) throw new Error("YELP_API_KEY is not configured");

  const params = new URLSearchParams({
    term,
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    limit: "10",
    radius: (radius || 8000).toString(), // ~5 miles default
  });
  
  if (categories) params.append("categories", categories);

  const response = await fetch(
    `https://api.yelp.com/v3/businesses/search?${params}`,
    {
      headers: {
        Authorization: `Bearer ${YELP_API_KEY}`,
      },
    }
  );

  if (!response.ok) {
    console.error("Yelp API error:", response.status, await response.text());
    return [];
  }

  const data = await response.json();
  return data.businesses || [];
}

function metersToMiles(meters: number): string {
  const miles = meters / 1609.34;
  return miles < 1 ? `${(miles * 5280).toFixed(0)} feet` : `${miles.toFixed(1)} miles`;
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

    let yelpVenues: YelpBusiness[] = [];
    if (hasLocation) {
      let radius = 8000;
      if (distance?.includes("Walking")) radius = 1600;
      else if (distance?.includes("Short drive")) radius = 8000;
      else if (distance?.includes("Day trip")) radius = 16000;
      else if (distance?.includes("Road trip")) radius = 40000;

      const categoryMap: Record<string, string> = {
        Italian: "italian",
        American: "tradamerican,newamerican",
        Chinese: "chinese",
        Japanese: "japanese",
        Mexican: "mexican",
        Thai: "thai",
        French: "french",
        Indian: "indian",
      };

      // Build multiple search queries to cover all aspects of the date
      const searches: Array<{ term: string; categories?: string }> = [];

      if (funActivity) {
        searches.push({ term: funActivity });
      }
      if (includeEating && cuisine) {
        searches.push({ term: cuisine, categories: categoryMap[cuisine] });
      }
      if (activity?.includes("Romantic")) {
        searches.push({ term: "romantic date night" });
      } else if (activity?.includes("Adventure")) {
        searches.push({ term: "outdoor activities adventures" });
      } else if (activity?.includes("Creative")) {
        searches.push({ term: "art classes painting pottery" });
      } else if (activity?.includes("Relaxed")) {
        searches.push({ term: "cafe lounge spa" });
      }

      // Always add a general "things to do" search as fallback
      if (searches.length === 0) {
        searches.push({ term: "fun things to do date" });
        if (includeEating) searches.push({ term: "restaurants" });
      }

      // Run all searches in parallel and combine results
      const allResults = await Promise.all(
        searches.map(s => searchYelp(s.term, latitude, longitude, s.categories, radius))
      );

      // Combine and deduplicate by name
      const seen = new Set<string>();
      for (const results of allResults) {
        for (const biz of results) {
          if (!seen.has(biz.name)) {
            seen.add(biz.name);
            yelpVenues.push(biz);
          }
        }
      }
      console.log(`Found ${yelpVenues.length} Yelp venues from ${searches.length} searches`);
    }

    const yelpContext = yelpVenues.length > 0
      ? `\n\nHere are real venues from Yelp near the user. EVERY date idea MUST reference at least one of these venues:\n${yelpVenues
          .slice(0, 10)
          .map(
            (v, i) =>
              `${i + 1}. ${v.name} - ${v.rating}★ (${v.review_count} reviews), ${v.categories.map(c => c.title).join(", ")}, ${metersToMiles(v.distance)} away`
          )
          .join("\n")}`
      : "";

    const prompt = `You are a creative date planner. Generate exactly 3 unique, specific date ideas based on these preferences:

- Budget: ${cost || "any"}
- Setting: ${location || "any"}
- Activity Style: ${activity || "any"}
${funActivity ? `- Specific Activity: ${funActivity}` : ""}
- Cuisine: ${includeEating && cuisine ? cuisine : "N/A - do NOT suggest restaurants"}
${!includeEating ? "IMPORTANT: The user does NOT want restaurant or dining suggestions. Focus on activities and experiences only." : ""}
- Time available: ${timeRange || "any"}
${yelpContext}

${yelpVenues.length > 0 ? "CRITICAL: You MUST use the venue names from the Yelp list above. Build each date idea around ONE specific venue from the list." : ""}

For each idea, respond ONLY with valid JSON — no markdown, no code fences, no extra text. Use this exact format:
[
  {
    "title": "Short catchy title",
    "description": "2-3 sentence vivid description of the date mentioning the specific venue name from Yelp",
    "estimated_cost": "e.g. Free, $10-20, $50+",
    "duration": "e.g. 2-3 hours",
    "vibe": "one word mood like Romantic, Adventurous, Cozy",
    "venue_name": "Exact venue name from Yelp list (or null if no location)",
    "distance_miles": "distance from Yelp (or N/A)"
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
      
      // Enhance with Yelp data
      ideas = ideas.map((idea: any) => {
        const venueName = idea.venue_name;
        if (venueName && yelpVenues.length > 0) {
          const match = yelpVenues.find(v => 
            v.name.toLowerCase().includes(venueName.toLowerCase()) ||
            venueName.toLowerCase().includes(v.name.toLowerCase())
          );
          if (match) {
            return {
              ...idea,
              rating: match.rating,
              review_count: match.review_count,
              url: match.url,
              distance_miles: metersToMiles(match.distance),
            };
          }
        }
        return idea;
      });
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
