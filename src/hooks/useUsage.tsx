import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UsageFeature = "date_ideas" | "gift_ideas";

export const FREE_LIMITS: Record<UsageFeature, number> = {
  date_ideas: 5,
  gift_ideas: 2,
};

/**
 * Hook to read the signed-in user's current monthly usage for a feature.
 * For subscribers, callers should skip rendering the meter — this hook
 * always returns the raw count regardless of subscription status.
 */
export function useUsage(userId: string | null | undefined, feature: UsageFeature) {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCount(0);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("get_current_usage", {
      _user_id: userId,
      _feature: feature,
    });
    if (!error) setCount(typeof data === "number" ? data : 0);
    setLoading(false);
  }, [userId, feature]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Re-fetch when a generation completes
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { feature?: UsageFeature } | undefined;
      if (!detail?.feature || detail.feature === feature) refresh();
    };
    window.addEventListener("usage:updated", handler);
    return () => window.removeEventListener("usage:updated", handler);
  }, [refresh, feature]);

  const limit = FREE_LIMITS[feature];
  const remaining = Math.max(0, limit - count);

  return { count, limit, remaining, loading, refresh };
}

/** Dispatch after a successful generation to refresh meters in the UI. */
export function notifyUsageUpdated(feature: UsageFeature) {
  window.dispatchEvent(new CustomEvent("usage:updated", { detail: { feature } }));
}
