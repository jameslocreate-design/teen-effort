import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SAFETY_PROMPT, isSafe, sanitizeUserText } from "../_shared/content-safety.ts";

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
    const { question: rawQuestion, postId } = await req.json();

    if (!question || typeof question !== "string" || question.length > 5000) {
      return new Response(
        JSON.stringify({ error: "Invalid question" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const question = sanitizeUserText(rawQuestion, 5000);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Determine the requester's subscription tier for priority handling.
    let tier = 0;
    try {
      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (token) {
        const supabaseAuth = createClient(supabaseUrl, serviceRoleKey);
        const { data: { user } } = await supabaseAuth.auth.getUser(token);
        if (user) {
          const { data: tierData } = await supabaseAuth.rpc("get_subscription_tier", {
            _user_id: user.id,
          });
          tier = typeof tierData === "number" ? tierData : 0;
        }
      }
    } catch (_e) {
      // Non-fatal: fall back to standard handling.
    }

    // Soulmate (tier 3) gets a stronger, priority model.
    const isPriority = tier >= 3;
    const model = isPriority ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
    const baseSystem = isPriority
      ? "You are a warm, empathetic, top-tier relationship expert giving priority, premium advice. Provide deeply thoughtful, personalized, and actionable guidance (3-5 paragraphs). Be supportive but honest, never judgmental. Format with markdown."
      : "You are a warm, empathetic relationship expert. Give thoughtful, balanced advice to relationship questions. Keep responses concise (2-4 paragraphs). Be supportive but honest. Never be judgmental. Format with markdown.";
    const systemContent = `${baseSystem} You are speaking with users aged 13 and older. ${SAFETY_PROMPT}`;

    const callAI = (extra: string) => fetch( = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemContent },
            { role: "user", content: question + extra },
          ],
        }),
      }
    );

    let response = await callAI("");

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

    const FALLBACK = "Thanks for asking. Healthy relationships are built on kindness, honest conversation, and respecting each other's boundaries. Try talking openly with your partner about how you both feel, and consider asking a trusted adult, parent, or school counselor for support.";
    let data = await response.json();
    let advice: string = data.choices?.[0]?.message?.content || "";
    if (!advice || !isSafe(advice)) {
      console.warn("Expert advice safety check failed; regenerating once");
      response = await callAI("\n\n(Answer in a fully wholesome, age 13+ appropriate way.)");
      advice = response.ok ? ((await response.json()).choices?.[0]?.message?.content || "") : "";
      if (!advice || !isSafe(advice)) advice = FALLBACK;
    }

    // If postId provided, insert AI reply server-side using service role
    if (postId && typeof postId === "string") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { error: insertError } = await supabase.from("expert_replies").insert({
        post_id: postId,
        user_id: null,
        content: advice,
        is_ai: true,
        anonymous_name: isPriority ? "AI Expert ⭐ (Priority)" : "AI Expert 🤖",
      });

      if (insertError) {
        console.error("Failed to insert AI reply:", insertError);
      }
    }

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("expert-advice error:", e);
    return new Response(
      JSON.stringify({ error: "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
