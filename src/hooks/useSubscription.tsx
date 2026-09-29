import { useEffect, useState } from "react";
import { getDemoTier } from "@/lib/demo";
import { tierForLevel } from "@/lib/tiers";

/**
 * DEMO BUILD — the plan comes from the "Demo tier" switcher in Settings.
 * No Stripe, App Store or Play Store logic runs here.
 */
export function useSubscription(_userId?: string | null) {
  const [tier, setTier] = useState<number>(() => getDemoTier());

  useEffect(() => {
    const handler = () => setTier(getDemoTier());
    window.addEventListener("demo-tier-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("demo-tier-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return {
    subscription: null,
    plan: null,
    planName: tier > 0 ? tierForLevel(tier).name : "Free",
    provider: null as string | null,
    isActive: tier > 0,
    tier,
    isPastDue: false,
    isTrialing: false,
    isCanceling: false,
    isYearly: false,
    isMonthly: tier > 0,
    trialDaysLeft: null as number | null,
    periodEnd: null as string | null,
    loading: false,
  };
}
