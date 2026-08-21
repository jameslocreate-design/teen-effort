import { useCallback, useEffect, useState } from "react";
import {
  iapAvailable,
  initPurchases,
  currentIapTier,
  purchaseByPriceId,
  restorePurchases,
  getPackages,
  findPackage,
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
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    if (!available) return;
    let cancelled = false;
    (async () => {
      await initPurchases(userId ?? undefined);
      const [t, pkgs] = await Promise.all([
        currentIapTier(),
        getPackages().catch(() => []),
      ]);
      if (!cancelled) {
        setTier(t);
        setPackages(pkgs);
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

  /** True when RevenueCat actually offers this plan on the store. */
  const hasProduct = useCallback(
    (priceId: string) => !!findPackage(packages, priceId),
    [packages],
  );

  /** Apple-localized price string for a plan, if the product loaded. */
  const storePrice = useCallback(
    (priceId: string): string | null => {
      const pkg: any = findPackage(packages, priceId);
      return pkg?.product?.priceString ?? null;
    },
    [packages],
  );

  return { available, ready, tier, busy, packages, purchase, restore, hasProduct, storePrice };
}
