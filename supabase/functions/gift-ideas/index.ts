import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkAndIncrementUsage } from "../_shared/usage-limits.ts";
import { SAFETY_PROMPT, isSafe, findMatureTerms, sanitizeUserText } from "../_shared/content-safety.ts";

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
    let usage;
    try {
      usage = await checkAndIncrementUsage(req, "gift_ideas");
    } catch (authErr) {
      console.error("Auth/usage error", authErr);
      return new Response(
        JSON.stringify({ error: "You must be signed in to generate gift ideas." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!usage.allowed) {
      return new Response(
        JSON.stringify({
          error: "limit_reached",
          message: `You've used all ${usage.limit} free gift generations this month. Upgrade for unlimited access.`,
          feature: "gift_ideas",
          limit: usage.limit,
          remaining: 0,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json();
    const cost = sanitizeUserText(body.cost, 100);
    const personalization = sanitizeUserText(body.personalization, 800);
    const event = sanitizeUserText(body.event, 100);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `${SAFETY_PROMPT} Never suggest alcohol, barware, lingerie, adult items, tobacco/vape products, weapons, or gambling items.

You are a creative gift planner for couples aged 13+. Generate exactly 4 unique, thoughtful gift ideas based on these preferences:

- Budget: ${cost || "any"}
- Personalization details: ${personalization || "none provided — suggest universally appealing gifts"}
- Event/Season: ${event || "any occasion"}

${personalization ? `IMPORTANT: The user shared specific personalization details: "${personalization}". Tailor EVERY gift suggestion to incorporate these interests, hobbies, favorite bands, movies, shows, sports teams, etc. Be creative and specific — don't just slap a logo on something.` : ""}

For each idea, respond ONLY with valid JSON — no markdown, no code fences, no extra text. Use this exact format:
[
  {
    "title": "Short catchy gift title",
    "description": "2-3 sentences describing the gift, why it's special, and how it connects to their interests",
    "estimated_cost": "e.g. $15-25, $50+, Under $10",
    "where_to_buy": "specific store or website name",
    "where_to_buy_url": "direct URL to the store or product page (e.g. https://www.etsy.com, https://www.amazon.com). Must be a real, valid URL.",
    "personalization_tip": "how to make it even more personal",
    "vibe": "one word like Sentimental, Playful, Luxurious, Creative, Practical"
  }
]`;

    const callAI = (extra: string) => fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are a gift planning assistant for couples. ${SAFETY_PROMPT} Always respond with valid JSON arrays only. No markdown formatting.` },
          { role: "user", content: prompt + extra },
        ],
      }),
    });

    let ideas: any[] = [];
    let lastSafe: any[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await callAI(attempt === 0 ? "" :
        "\n\nYour previous answer contained content not suitable for ages 13+. Rewrite with completely wholesome gifts only.");
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
        parsed = Array.isArray(p) ? p.slice(0, 4) : [];
      } catch { console.error("Failed to parse AI response"); }
      if (parsed.length > 0 && isSafe(parsed)) { ideas = parsed; break; }
      console.warn(`Safety check failed (attempt ${attempt + 1}):`, findMatureTerms(parsed).join(", "));
      lastSafe = parsed.filter((i) => isSafe(i));
    }

    if (ideas.length === 0) {
      const defaults = [
        { title: "Custom photo book", description: "A printed book of your favorite photos together, with short captions about each memory.", estimated_cost: "$20-40", where_to_buy: "Shutterfly", where_to_buy_url: "https://www.shutterfly.com", personalization_tip: "Add a handwritten note on the first page.", vibe: "Sentimental" },
        { title: "Cozy movie night kit", description: "A blanket, their favorite snacks and a movie you both want to see, packed in a gift box.", estimated_cost: "$20-35", where_to_buy: "Target", where_to_buy_url: "https://www.target.com", personalization_tip: "Pick a movie tied to an inside joke.", vibe: "Playful" },
        { title: "Handwritten letter jar", description: "A jar filled with small notes to open on different days or moods.", estimated_cost: "Under $10", where_to_buy: "Michaels", where_to_buy_url: "https://www.michaels.com", personalization_tip: "Color-code notes by occasion.", vibe: "Creative" },
        { title: "Matching friendship bracelets", description: "Simple matching bracelets you can both wear every day.", estimated_cost: "$10-25", where_to_buy: "Etsy", where_to_buy_url: "https://www.etsy.com", personalization_tip: "Engrave the date you met.", vibe: "Sentimental" },
      ];
      ideas = [...lastSafe, ...defaults].slice(0, 4);
    }

    return new Response(JSON.stringify({ ideas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gift-ideas error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
