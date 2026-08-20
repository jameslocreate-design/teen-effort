import { isIOS, isNative } from "@/lib/native";

/**
 * RevenueCat configuration.
 *
 * Keys are *public* SDK keys and are safe to ship in the client bundle:
 *  - `appl_…` → real Apple App Store purchases (production)
 *  - `test_…` → RevenueCat Test Store (sandbox products, no StoreKit)
 *
 * Override per-environment with `VITE_REVENUECAT_IOS_KEY`.
 */
const FALLBACK_SDK_KEY = "appl_kIFQhizreANRdjaodstcwVfzVgU";

export const IOS_PUBLIC_SDK_KEY =
  ((import.meta.env.VITE_REVENUECAT_IOS_KEY as string | undefined) || FALLBACK_SDK_KEY).trim();

/** True when the configured key targets RevenueCat's Test Store, not the App Store. */
export const isTestStoreKey = () => IOS_PUBLIC_SDK_KEY.startsWith("test_");

/**
 * App Store Connect product identifiers, keyed by the same Stripe price
 * lookup keys the web app uses (`spark_monthly`, `soulmate_yearly`, …).
 * Create each of these as an auto-renewable subscription in App Store Connect
 * and attach them to the matching RevenueCat entitlement.
 */
export const APP_STORE_PRODUCT_IDS: Record<string, string> = {
  // Production App Store products (must match App Store Connect exactly).
  spark_monthly: "com.teeneffort.app.spark.monthly.v2",
  romance_monthly: "com.teeneffort.app.romance.monthly.v2",
  soulmate_monthly: "com.teeneffort.app.soulmate.monthly.v2",
  // NOTE: yearly products are not created in RevenueCat yet; leave unmapped
  // so the UI shows "not available" until they are added.
};

// RevenueCat Test Store uses generic product IDs.
const TEST_STORE_PRODUCT_IDS: Record<string, string> = {
  spark_monthly: "monthly",
  romance_monthly: "monthly",
  soulmate_monthly: "monthly",
  spark_yearly: "yearly",
  romance_yearly: "yearly",
  soulmate_yearly: "yearly",
};

/** Resolve the App Store / Test Store product ID for a given price lookup key. */
export function appStoreProductId(priceId: string): string | undefined {
  if (isTestStoreKey()) {
    return TEST_STORE_PRODUCT_IDS[priceId];
  }
  return APP_STORE_PRODUCT_IDS[priceId];
}

/** RevenueCat entitlement identifier → tier level used across the app. */
export const ENTITLEMENT_TIERS: Record<string, number> = {
  spark: 1,
  romance: 2,
  soulmate: 3,
};

const VALID_KEY = /^(appl_|test_)/.test(IOS_PUBLIC_SDK_KEY) && IOS_PUBLIC_SDK_KEY.length > 10;

/** True when in-app purchases can actually run (native iOS + key configured). */
export const iapAvailable = () => isNative() && isIOS() && VALID_KEY;


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

  const { Purchases } = await sdk();
  const packages = await getPackages();
  if (packages.length === 0) {
    throw new Error("No subscriptions are configured yet. Please try again later.");
  }

  // Match on the store product id first, then on the RevenueCat package
  // identifier (Test Store products use different identifiers).
  const pkg =
    packages.find((p: any) => p.product?.identifier === productId) ??
    packages.find((p: any) => p.identifier === priceId) ??
    packages.find((p: any) => String(p.product?.identifier ?? "").includes(priceId.split("_")[0]));
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
