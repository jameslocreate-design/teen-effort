// Creates a fresh demo account (Soulmate tier) when the correct demo code is entered.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DEMO_CODE = "fall2026";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let code = "";
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code.trim().toLowerCase().slice(0, 64) : "";
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (code !== DEMO_CODE) return json({ error: "That demo code isn't valid." }, 403);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const email = `demo-${id}@demo.teeneffort.app`;
  const password = crypto.randomUUID() + crypto.randomUUID();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { demo_account: true },
  });
  if (error || !data.user) {
    console.error("demo user create failed", error);
    return json({ error: "Could not start the demo. Please try again." }, 500);
  }

  const { error: subErr } = await admin.from("subscriptions").insert({
    user_id: data.user.id,
    provider: "stripe",
    environment: "live",
    status: "active",
    tier_level: 3,
    billing_cycle: "monthly",
    price_id: "soulmate_demo",
    product_id: "soulmate_demo",
    stripe_subscription_id: `demo_${data.user.id}`,
    verified_at: new Date().toISOString(),
  });
  if (subErr) {
    console.error("demo subscription failed", subErr);
    await admin.auth.admin.deleteUser(data.user.id);
    return json({ error: "Could not start the demo. Please try again." }, 500);
  }

  return json({ email, password });
});
