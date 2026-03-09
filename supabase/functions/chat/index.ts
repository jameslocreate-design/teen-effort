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
    const { cost, location, activity, distance, timeRange, cuisine, latitude, longitude, funActivity } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasLocation = typeof latitude === "number" && typeof longitude === "number";

    let yelpVenues: YelpBusiness[] = [];
    if (hasLocation) {
      // Get radius in meters based on distance preference
      let radius = 8000; // ~5 miles default
      if (distance?.includes("Walking")) radius = 1600; // ~1 mile
      else if (distance?.includes("Short drive")) radius = 8000; // ~5 miles
      else if (distance?.includes("Day trip")) radius = 16000; // ~10 miles
      else if (distance?.includes("Road trip")) radius = 40000; // ~25 miles

      // Map cuisine to Yelp categories
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

      const categories = cuisine ? categoryMap[cuisine] : undefined;
      const searchTerm = funActivity || 
                         (activity?.includes("Romantic") ? "romantic date" : 
                         activity?.includes("Adventure") ? "activities" :
                         activity?.includes("Creative") ? "art entertainment" :
                         cuisine || "restaurants");

      yelpVenues = await searchYelp(searchTerm, latitude, longitude, categories, radius);
      console.log(`Found ${yelpVenues.length} Yelp venues`);
    }

    const yelpContext = yelpVenues.length > 0
      ? `\n\nHere are real venues from Yelp near the user (use EXACTLY these names and details):\n${yelpVenues
          .slice(0, 6)
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
- Cuisine: ${cuisine || "any"}
- Distance willing to travel: ${distance || "any"}
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
