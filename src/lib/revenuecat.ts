import { isIOS, isNative } from "@/lib/native";

/**
 * RevenueCat configuration.
 *
 * Fill `IOS_PUBLIC_SDK_KEY` with the *public* Apple SDK key from
 * RevenueCat → Project settings → API keys (it starts with `appl_` and is safe
 * to ship in the client bundle). Until it is filled in, every helper below is a
 * no-op and the app falls back to the read-only "plans are informational"
 * screen we already show on iOS.
 */
export const IOS_PUBLIC_SDK_KEY =
  (import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined) ?? "";

/**
 * App Store Connect product identifiers, keyed by the same Stripe price
 * lookup keys the web app uses (`spark_monthly`, `soulmate_yearly`, …).
 * Create each of these as an auto-renewable subscription in App Store Connect
 * and attach them to the matching RevenueCat entitlement.
 */
export const APP_STORE_PRODUCT_IDS: Record<string, string> = {
  spark_monthly: "com.teeneffort.spark.monthly",
  spark_yearly: "com.teeneffort.spark.yearly",
  romance_monthly: "com.teeneffort.romance.monthly",
  romance_yearly: "com.teeneffort.romance.yearly",
  soulmate_monthly: "com.teeneffort.soulmate.monthly",
  soulmate_yearly: "com.teeneffort.soulmate.yearly",
};

/** RevenueCat entitlement identifier → tier level used across the app. */
export const ENTITLEMENT_TIERS: Record<string, number> = {
  spark: 1,
  romance: 2,
  soulmate: 3,
};

/** True when in-app purchases can actually run (native iOS + key configured). */
export const iapAvailable = () => isNative() && isIOS() && IOS_PUBLIC_SDK_KEY.length > 0;

let configured = false;

async function sdk() {
  const mod = await import("@revenuecat/purchases-capacitor");
  return mod;
}

/** Configures the SDK once, optionally identifying the signed-in user. */
export async function initPurchases(appUserId?: string | null) {
  if (!iapAvailable()) return false;
  const { Purchases, LOG_LEVEL } = await sdk();
  if (!configured) {
    await Purchases.setLogLevel({ level: LOG_LEVEL.ERROR });
    await Purchases.configure({
      apiKey: IOS_PUBLIC_SDK_KEY,
      ...(appUserId ? { appUserID: appUserId } : {}),
    });
    configured = true;
  } else if (appUserId) {
    await Purchases.logIn({ appUserID: appUserId }).catch(() => {});
  }
  return true;
}

export async function logOutPurchases() {
  if (!iapAvailable() || !configured) return;
  const { Purchases } = await sdk();
  await Purchases.logOut().catch(() => {});
}

/** Highest entitlement tier the App Store account currently owns (0 = none). */
export async function currentIapTier(): Promise<number> {
  if (!iapAvailable()) return 0;
  const { Purchases } = await sdk();
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    const active = Object.keys(customerInfo.entitlements.active ?? {});
    return active.reduce((max, id) => Math.max(max, ENTITLEMENT_TIERS[id] ?? 0), 0);
  } catch {
    return 0;
  }
}

/** All packages offered by the current RevenueCat offering. */
export async function getPackages() {
  if (!iapAvailable()) return [];
  const { Purchases } = await sdk();
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch {
    return [];
  }
}


/**
 * Buys the package matching a price lookup key (e.g. `romance_monthly`).
 * Returns the resulting entitlement tier, or throws with a readable message.
 */
export async function purchaseByPriceId(priceId: string): Promise<number> {
  if (!iapAvailable()) throw new Error("In-app purchases aren't available here.");
  const productId = APP_STORE_PRODUCT_IDS[priceId];
  if (!productId) throw new Error("This plan isn't available on iOS yet.");

  const { Purchases } = await sdk();
  const packages = await getPackages();
  const pkg = packages.find((p: any) => p.product?.identifier === productId);
  if (!pkg) throw new Error("This plan isn't available on the App Store yet.");

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  const active = Object.keys(customerInfo.entitlements.active ?? {});
  return active.reduce((max, id) => Math.max(max, ENTITLEMENT_TIERS[id] ?? 0), 0);
}

/** Apple requires a visible "Restore Purchases" action. */
export async function restorePurchases(): Promise<number> {
  if (!iapAvailable()) return 0;
  const { Purchases } = await sdk();
  const { customerInfo } = await Purchases.restorePurchases();
  const active = Object.keys(customerInfo.entitlements.active ?? {});
  return active.reduce((max, id) => Math.max(max, ENTITLEMENT_TIERS[id] ?? 0), 0);
}
