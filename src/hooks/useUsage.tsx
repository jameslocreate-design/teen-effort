import { useEffect, useState, useCallback } from "react";
import { DEMO_DAILY_AI_LIMIT, getDemoAiCount } from "@/lib/demo";

export type UsageFeature = "date_ideas" | "gift_ideas";

export const FREE_LIMITS: Record<UsageFeature, number> = {
  date_ideas: DEMO_DAILY_AI_LIMIT,
  gift_ideas: DEMO_DAILY_AI_LIMIT,
};

/**
 * DEMO BUILD — idea generations are counted per device per day in
 * localStorage. Nothing is read from or written to any backend.
 */
export function useUsage(_userId: string | null | undefined, feature: UsageFeature) {
  const [count, setCount] = useState<number>(() => getDemoAiCount());

  const refresh = useCallback(() => setCount(getDemoAiCount()), []);

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener("usage:updated", handler);
    return () => window.removeEventListener("usage:updated", handler);
  }, [refresh]);

  const limit = FREE_LIMITS[feature];
  const remaining = Math.max(0, limit - count);

  return { count, limit, remaining, loading: false, refresh };
}

/** Dispatch after a successful generation to refresh meters in the UI. */
export function notifyUsageUpdated(_feature: UsageFeature) {
  window.dispatchEvent(new CustomEvent("usage:updated"));
}
