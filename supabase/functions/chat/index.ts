import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cost, location, activity, distance, timeRange, latitude, longitude } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const hasLocation = typeof latitude === "number" && typeof longitude === "number";
    const locationContext = hasLocation
      ? `near coordinates ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Use these coordinates to suggest REAL, specific venues, restaurants, parks, and attractions that actually exist near this location.`
      : "anywhere (no specific location provided)";

    const distanceField = hasLocation
      ? `"distance_miles": "estimated miles from the user's location, e.g. '2.5 miles', '12 miles'"`
      : `"distance_miles": "N/A"`;

    const prompt = `You are a creative date planner. Generate exactly 3 unique, specific date ideas based on these preferences:

- Budget: ${cost || "any"}
- Setting: ${location || "any"}
- Activity Style: ${activity || "any"}
- Distance willing to travel: ${distance || "any"}
- Time available: ${timeRange || "any"}
- Location: ${locationContext}

${hasLocation ? "IMPORTANT: Suggest real, existing places near the user's coordinates. Estimate the driving distance in miles from the user's location to each venue." : ""}

For each idea, respond ONLY with valid JSON — no markdown, no code fences, no extra text. Use this exact format:
[
  {
    "title": "Short catchy title",
    "description": "2-3 sentence vivid description of the date mentioning the specific venue/place name",
    "estimated_cost": "e.g. Free, $10-20, $50+",
    "duration": "e.g. 2-3 hours",
    "vibe": "one word mood like Romantic, Adventurous, Cozy",
    ${distanceField}
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
