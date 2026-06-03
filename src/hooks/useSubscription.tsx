import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

interface SubscriptionRow {
  id: string;
  status: string;
  price_id: string | null;
  product_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  stripe_customer_id: string;
}

export function useSubscription(userId: string | null | undefined) {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const env = getStripeEnvironment();

    const fetchSub = async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .eq("environment", env)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) {
        setSubscription((data as SubscriptionRow) ?? null);
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
  const periodEndMs = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : null;

  const isActive = !!subscription && (
    ["active", "trialing", "past_due"].includes(subscription.status) ||
    (subscription.status === "canceled" && periodEndMs !== null && periodEndMs > now)
  );

  const PRICE_TIERS: Record<string, number> = {
    spark_monthly: 1,
    romance_monthly: 2,
    soulmate_monthly: 3,
    // Legacy full-access plans count as the top tier
    premium_monthly: 3,
    premium_yearly: 3,
  };

  const tier = isActive && subscription?.price_id
    ? (PRICE_TIERS[subscription.price_id] ?? 1)
    : 0;

  return { subscription, isActive, tier, loading };
}
