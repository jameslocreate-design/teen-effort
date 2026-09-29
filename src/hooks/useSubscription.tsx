import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { fetchMyPlan, syncStoreSubscription, type MyPlan } from "@/lib/billing";

interface SubscriptionRow {
  id: string;
  status: string;
  price_id: string | null;
  product_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string | null;
  provider?: string | null;
  tier_level?: number | null;
  billing_cycle?: string | null;
}

export function useSubscription(userId: string | null | undefined) {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [iapTier, setIapTier] = useState(0);
  const [plan, setPlan] = useState<MyPlan | null>(null);

  // App Store / Play entitlements: verify them server-side so the database
  // (and therefore usage limits and premium gating) knows about the purchase.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const { iapAvailable, initPurchases, currentIapTier } = await import("@/lib/revenuecat");
      if (!iapAvailable()) return;
      await initPurchases(userId);
      const local = await currentIapTier();
      if (!cancelled && local > 0) setIapTier(local);
      const verified = await syncStoreSubscription();
      if (!cancelled && verified !== null) setIapTier(verified);
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId]);



  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const env = getStripeEnvironment();

    const fetchSub = async () => {
      // Stripe/web billing row (used for the billing portal + receipts).
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("environment", env)
        .eq("provider", "stripe")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      // Authoritative plan across every store, computed in the database.
      const serverPlan = await fetchMyPlan();
      if (!cancelled) {
        setSubscription((data as SubscriptionRow) ?? null);
        setPlan(serverPlan);
        setLoading(false);
      }
    };

    fetchSub();

    const channel = supabase
      .channel(`subscriptions:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${userId}` },
        () => fetchSub(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const now = Date.now();
  const periodEndRaw = plan?.current_period_end ?? subscription?.current_period_end ?? null;
  const periodEndMs = periodEndRaw ? new Date(periodEndRaw).getTime() : null;

  // Tier comes from the database (covers Stripe, App Store and Play), with the
  // locally-read store entitlement as an offline-friendly floor.
  const tier = Math.max(plan?.tier ?? 0, iapTier);
  const isActive = tier > 0;

  const isPastDue = plan?.past_due ?? subscription?.status === "past_due";
  const isTrialing = plan?.trialing ?? subscription?.status === "trialing";
  const isCanceling =
    isActive && !!(plan?.cancel_at_period_end || plan?.status === "canceled" ||
      (!plan && (subscription?.cancel_at_period_end || subscription?.status === "canceled")));
  const periodEnd = periodEndRaw;

  const cycle = plan?.billing_cycle ??
    (subscription?.price_id?.endsWith("_yearly") ? "yearly"
      : subscription?.price_id?.endsWith("_monthly") ? "monthly" : null);
  const isYearly = cycle === "yearly";
  const isMonthly = cycle === "monthly";

  // Which store the active plan was bought through.
  const provider = plan?.provider ?? subscription?.provider ?? null;

  // Days left in the current trial (rounded up). null when not trialing.
  const trialDaysLeft =
    isTrialing && periodEndMs !== null
      ? Math.max(0, Math.ceil((periodEndMs - now) / (1000 * 60 * 60 * 24)))
      : null;


  return {
    subscription,
    plan,
    planName: plan?.plan ?? (tier > 0 ? "Spark" : "Free"),
    provider,
    isActive,
    tier,
    isPastDue,
    isTrialing,
    isCanceling,
    isYearly,
    isMonthly,
    trialDaysLeft,
    periodEnd,
    loading,
  };
}
