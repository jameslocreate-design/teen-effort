import { useCallback, useEffect, useState } from "react";
import {
  iapAvailable,
  initPurchases,
  currentIapTier,
  purchaseByPriceId,
  restorePurchases,
} from "@/lib/revenuecat";

/**
 * In-app purchase state for the native iOS shell. On web (and on iOS before a
 * RevenueCat key is configured) `available` is false and the UI keeps its
 * existing Stripe / read-only behaviour.
 */
export function useNativePurchases(userId?: string | null) {
  const available = iapAvailable();
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    (async () => {
      await initPurchases(userId ?? undefined);
      const t = await currentIapTier();
      if (!cancelled) {
        setTier(t);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [available, userId]);

  const purchase = useCallback(async (priceId: string) => {
    setBusy(true);
    try {
      const t = await purchaseByPriceId(priceId);
      setTier(t);
      return t;
    } finally {
      setBusy(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setBusy(true);
    try {
      const t = await restorePurchases();
      setTier(t);
      return t;
    } finally {
      setBusy(false);
    }
  }, []);

  return { available, ready, tier, busy, purchase, restore };
}
