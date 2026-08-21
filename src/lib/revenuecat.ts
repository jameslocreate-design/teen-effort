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
 * Known App Store product identifiers, keyed by the price lookup keys the web
 * app uses (`spark_monthly`, `soulmate_yearly`, …).
 *
 * These are only *hints*: matching falls back to scanning the live RevenueCat
 * offerings for a product whose identifier mentions the tier and the billing
 * period, so renaming products in App Store Connect won't break purchases.
 */
export const APP_STORE_PRODUCT_IDS: Record<string, string> = {
  spark_monthly: "com.teeneffort.app.spark.monthly.v2",
  romance_monthly: "com.teeneffort.app.romance.monthly.v2",
  soulmate_monthly: "com.teeneffort.app.soulmate.monthly.v2",
  spark_yearly: "com.teeneffort.app.spark.yearly.v2",
  romance_yearly: "com.teeneffort.app.romance.yearly.v2",
  soulmate_yearly: "com.teeneffort.app.soulmate.yearly.v2",
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

/** Resolve the expected App Store / Test Store product ID for a price key. */
export function appStoreProductId(priceId: string): string | undefined {
  if (isTestStoreKey()) return TEST_STORE_PRODUCT_IDS[priceId];
  return APP_STORE_PRODUCT_IDS[priceId];
}

/** Tier slug → level. Used to read a tier out of a product identifier. */
export const TIER_LEVELS: Record<string, number> = {
  spark: 1,
  romance: 2,
  soulmate: 3,
};

/**
 * Optional entitlement → tier mapping. Only needed when you use one
 * entitlement per tier. With a single shared entitlement (e.g.
 * "teen effort pro") the tier is derived from the purchased product instead.
 */
export const ENTITLEMENT_TIERS: Record<string, number> = {
  spark: 1,
  romance: 2,
  soulmate: 3,
};

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[\s_-]+/g, "");

/** Reads a tier level out of any product / entitlement identifier. */
function tierFromIdentifier(identifier: unknown): number {
  const id = norm(identifier);
  if (!id) return 0;
  if (id.includes("soulmate")) return 3;
  if (id.includes("romance")) return 2;
  if (id.includes("spark")) return 1;
  return 0;
}

/**
 * Highest tier represented by the active entitlements. Works with either
 * per-tier entitlements or one shared entitlement, because we also inspect the
 * product identifier that unlocked the entitlement.
 */
export function tierFromCustomerInfo(customerInfo: any): number {
  const active = Object.values(customerInfo?.entitlements?.active ?? {}) as any[];
  let level = 0;
  for (const ent of active) {
    const fromProduct = tierFromIdentifier(ent?.productIdentifier);
    const fromEntitlement =
      ENTITLEMENT_TIERS[String(ent?.identifier ?? "")] ?? tierFromIdentifier(ent?.identifier);
    // A shared entitlement with an unrecognised product still grants tier 1.
    level = Math.max(level, fromProduct, fromEntitlement, 1);
  }
  return level;
}

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
    return tierFromCustomerInfo(customerInfo);
  } catch {
    return 0;
  }
}

/** Every package across every offering (current offering first). */
export async function getPackages() {
  if (!iapAvailable()) return [];
  const { Purchases } = await sdk();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current?.availablePackages ?? [];
  const all = Object.values(offerings.all ?? {}).flatMap(
    (o: any) => o?.availablePackages ?? [],
  );
  const seen = new Set<string>();
  return [...current, ...all].filter((p: any) => {
    const key = `${p?.identifier}:${p?.product?.identifier}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const YEARLY_HINTS = ["year", "annual", "12month"];
const MONTHLY_HINTS = ["month", "1month"];

function periodMatches(pkg: any, cycle: "monthly" | "yearly") {
  const hay = `${norm(pkg?.identifier)}${norm(pkg?.product?.identifier)}${norm(
    pkg?.packageType,
  )}${norm(pkg?.product?.subscriptionPeriod)}`;
  const yearly = YEARLY_HINTS.some((h) => hay.includes(h)) || hay.includes("p1y");
  if (cycle === "yearly") return yearly;
  return !yearly && (MONTHLY_HINTS.some((h) => hay.includes(h)) || hay.includes("p1m"));
}

/** Finds the RevenueCat package that corresponds to a price lookup key. */
export function findPackage(packages: any[], priceId: string) {
  const [tierSlug, cycleRaw] = priceId.split("_");
  const cycle: "monthly" | "yearly" = cycleRaw === "yearly" ? "yearly" : "monthly";
  const wantLevel = TIER_LEVELS[tierSlug] ?? 0;
  const expectedId = appStoreProductId(priceId);

  return (
    // 1. Exact expected store product id.
    packages.find((p) => expectedId && p?.product?.identifier === expectedId) ??
    // 2. Product identifier mentions the tier and the right billing period.
    packages.find(
      (p) =>
        tierFromIdentifier(p?.product?.identifier) === wantLevel && periodMatches(p, cycle),
    ) ??
    // 3. Package identifier mentions the tier and period (offering-per-tier setups).
    packages.find(
      (p) => tierFromIdentifier(p?.identifier) === wantLevel && periodMatches(p, cycle),
    ) ??
    // 4. Any package for the tier, ignoring the period.
    packages.find((p) => tierFromIdentifier(p?.product?.identifier) === wantLevel) ??
    null
  );
}

/** Human-readable diagnostics for why purchasing may be unavailable. */
export async function purchaseDiagnostics() {
  if (!iapAvailable()) return { ok: false, reason: "IAP not available on this build." };
  const { Purchases } = await sdk();
  try {
    const offerings = await Purchases.getOfferings();
    const packages = await getPackages();
    return {
      ok: packages.length > 0,
      currentOffering: offerings.current?.identifier ?? null,
      offerings: Object.keys(offerings.all ?? {}),
      products: packages.map((p: any) => p.product?.identifier),
    };
  } catch (e: any) {
    return { ok: false, reason: e?.message ?? String(e) };
  }
}

/**
 * Buys the plan matching a price lookup key (e.g. `romance_yearly`).
 * Returns the resulting entitlement tier, or throws with a readable message.
 */
export async function purchaseByPriceId(priceId: string): Promise<number> {
  if (!iapAvailable()) throw new Error("In-app purchases aren't available here.");
  const { Purchases } = await sdk();

  let packages: any[] = [];
  try {
    packages = await getPackages();
  } catch (e: any) {
    throw new Error(`Couldn't load subscriptions from the App Store: ${e?.message ?? e}`);
  }

  const pkg = findPackage(packages, priceId);
  if (pkg) {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    return tierFromCustomerInfo(customerInfo);
  }

  // No matching package: try buying the raw store product directly.
  const productId = appStoreProductId(priceId);
  if (productId) {
    try {
      const { products } = await Purchases.getProducts({ productIdentifiers: [productId] });
      const product = products?.[0];
      if (product) {
        const { customerInfo } = await Purchases.purchaseStoreProduct({ product });
        return tierFromCustomerInfo(customerInfo);
      }
    } catch (e: any) {
      throw new Error(`App Store couldn't load "${productId}": ${e?.message ?? e}`);
    }
  }

  throw new Error(
    packages.length === 0
      ? "No subscription products loaded from RevenueCat. Check that your offerings have packages attached and the products are approved in App Store Connect."
      : `This plan isn't in your RevenueCat offerings yet. Loaded: ${packages
          .map((p: any) => p.product?.identifier)
          .join(", ")}`,
  );
}

/** Apple requires a visible "Restore Purchases" action. */
export async function restorePurchases(): Promise<number> {
  if (!iapAvailable()) return 0;
  const { Purchases } = await sdk();
  const { customerInfo } = await Purchases.restorePurchases();
  return tierFromCustomerInfo(customerInfo);
}
