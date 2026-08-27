// Syncs App Store / Google Play subscriptions into the database.
//
// The phone never tells us what it owns: the client only says "please re-check
// me", and this function asks RevenueCat's REST API (with a secret key) what
// the store actually reports. That makes server-side gating — free usage
// limits, premium features, priority AI — trustworthy on native builds.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function tierFromProductId(productId: string): number {
  const id = productId.toLowerCase();
  if (id.includes("soulmate") || id.includes("premium")) return 3;
  if (id.includes("romance")) return 2;
  if (id.includes("spark")) return 1;
  return 1;
}

function cycleFromProductId(productId: string): string | null {
  const id = productId.toLowerCase();
  if (id.includes("year") || id.includes("annual") || id.includes("p1y")) return "yearly";
  if (id.includes("month") || id.includes("p1m")) return "monthly";
  return null;
}

function providerFromStore(store: string | undefined): string {
  switch ((store ?? "").toLowerCase()) {
    case "app_store":
    case "mac_app_store":
      return "app_store";
    case "play_store":
      return "play_store";
    default:
      return "app_store";
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const rcKey = Deno.env.get("REVENUECAT_SECRET_API_KEY");
    if (!rcKey) return json({ error: "RevenueCat is not configured" }, 500);

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    // RevenueCat is always keyed by the Supabase user id (see initPurchases).
    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${rcKey}`, "Content-Type": "application/json" } },
    );

    if (!rcRes.ok) {
      const body = await rcRes.text();
      console.error("RevenueCat lookup failed", rcRes.status, body);
      if (rcRes.status === 404) return json({ tier: 0, active: false, synced: false });
      return json({ error: "Could not verify your purchase right now." }, 502);
    }

    const rc = await rcRes.json();
    const subscriber = rc?.subscriber ?? {};
    const entitlements: Record<string, any> = subscriber.entitlements ?? {};
    const subscriptions: Record<string, any> = subscriber.subscriptions ?? {};

    const now = Date.now();
    let best: {
      tier: number;
      productId: string;
      provider: string;
      environment: string;
      periodEnd: string | null;
      status: string;
      cancelAtPeriodEnd: boolean;
    } | null = null;

    for (const ent of Object.values(entitlements)) {
      const expires = ent?.expires_date ? Date.parse(ent.expires_date) : null;
      const active = expires === null || expires > now;
      if (!active) continue;

      const productId = String(ent?.product_identifier ?? "");
      const sub = subscriptions[productId] ?? {};
      const gracePeriodEnd = sub?.grace_period_expires_date
        ? Date.parse(sub.grace_period_expires_date)
        : null;

      const tier = tierFromProductId(productId);
      const status =
        sub?.billing_issues_detected_at && (gracePeriodEnd === null || gracePeriodEnd > now)
          ? "past_due"
          : sub?.period_type === "trial" || sub?.period_type === "intro"
            ? "trialing"
            : sub?.unsubscribe_detected_at
              ? "canceled"
              : "active";

      const candidate = {
        tier,
        productId,
        provider: providerFromStore(sub?.store),
        environment: sub?.is_sandbox ? "sandbox" : "live",
        periodEnd: ent?.expires_date ?? null,
        status,
        cancelAtPeriodEnd: !!sub?.unsubscribe_detected_at,
      };

      if (!best || candidate.tier > best.tier) best = candidate;
    }

    if (!best) {
      // Nothing active on the store: expire any store rows we previously stored.
      await admin
        .from("subscriptions")
        .update({ status: "canceled", verified_at: new Date().toISOString() })
        .eq("user_id", userId)
        .in("provider", ["app_store", "play_store"]);
      return json({ tier: 0, active: false, synced: true });
    }

    const { error: upsertErr } = await admin
      .from("subscriptions")
      .upsert(
        {
          user_id: userId,
          provider: best.provider,
          environment: best.environment,
          status: best.status,
          tier_level: best.tier,
          billing_cycle: cycleFromProductId(best.productId),
          store_product_id: best.productId,
          store_app_user_id: userId,
          product_id: best.productId,
          current_period_end: best.periodEnd,
          cancel_at_period_end: best.cancelAtPeriodEnd,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,provider,environment" },
      );

    if (upsertErr) {
      console.error("subscription upsert failed", upsertErr);
      return json({ error: "Could not save your plan." }, 500);
    }

    return json({
      tier: best.tier,
      active: true,
      synced: true,
      provider: best.provider,
      status: best.status,
      billing_cycle: cycleFromProductId(best.productId),
      current_period_end: best.periodEnd,
    });
  } catch (e) {
    console.error("sync-iap-entitlement error", e);
    return json({ error: "An error occurred" }, 500);
  }
});
