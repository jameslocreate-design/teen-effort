import type { UsageFeature } from "@/hooks/useUsage";

/**
 * Subscription tiers. Higher `level` = more access.
 * The most expensive tier (Soulmate) unlocks everything.
 */
export type BillingCycle = "monthly" | "yearly";

export interface Tier {
  level: number;
  id: string; // internal id
  name: string;
  priceId: string; // Stripe monthly price lookup key
  priceIdYearly: string; // Stripe yearly price lookup key
  price: string; // display monthly price
  priceYearly: string; // display yearly price
  priceAmount: number; // monthly in dollars
  priceAmountYearly: number; // yearly in dollars
  tagline: string;
  highlight?: boolean; // "most popular"
  trialDays?: number; // free trial length for new subscribers
  features: string[];
}

export const TIERS: Tier[] = [
  {
    level: 1,
    id: "spark",
    name: "Spark",
    priceId: "spark_monthly",
    priceIdYearly: "spark_yearly",
    price: "$4.99",
    priceYearly: "$49.99",
    priceAmount: 4.99,
    priceAmountYearly: 49.99,
    tagline: "Keep the dates coming.",
    features: [
      "Unlimited AI date ideas",
      "Unlimited special event reminders",
      "Advanced shared calendar",
      "Date streak tracking",
    ],
  },
  {
    level: 2,
    id: "romance",
    name: "Romance",
    priceId: "romance_monthly",
    priceIdYearly: "romance_yearly",
    price: "$9.99",
    priceYearly: "$99.99",
    priceAmount: 9.99,
    priceAmountYearly: 99.99,
    tagline: "Everything you need to wow them.",
    highlight: true,
    trialDays: 7,
    features: [
      "Everything in Spark",
      "Unlimited AI gift suggestions",
      "Save & organize gift ideas privately",
      "Date Roulette spin-the-wheel",
      "Smart Recommendations",
    ],
  },
  {
    level: 3,
    id: "soulmate",
    name: "Soulmate",
    priceId: "soulmate_monthly",
    priceIdYearly: "soulmate_yearly",
    price: "$19.99",
    priceYearly: "$199.99",
    priceAmount: 19.99,
    priceAmountYearly: 199.99,
    tagline: "Unlock absolutely everything.",
    trialDays: 7,
    features: [
      "Everything in Romance",
      "Priority Expert Forum AI replies",
      "Premium badge on your profile",
      "Earliest access to new features",
    ],
  },
];

/** Feature-by-tier comparison matrix for the pricing page. */
export const COMPARISON_FEATURES: { label: string; minLevel: number }[] = [
  { label: "Unlimited AI date ideas", minLevel: 1 },
  { label: "Unlimited event reminders", minLevel: 1 },
  { label: "Advanced shared calendar", minLevel: 1 },
  { label: "Date streak tracking", minLevel: 1 },
  { label: "Unlimited AI gift suggestions", minLevel: 2 },
  { label: "Save gift ideas privately", minLevel: 2 },
  { label: "Date Roulette", minLevel: 2 },
  { label: "Smart Recommendations", minLevel: 2 },
  { label: "Priority Expert AI replies", minLevel: 3 },
  { label: "Premium profile badge", minLevel: 3 },
  { label: "Earliest access to new features", minLevel: 3 },
];

/** Resolve the right Stripe price lookup key for a tier + billing cycle. */
export function priceIdFor(tier: Tier, cycle: BillingCycle): string {
  return cycle === "yearly" ? tier.priceIdYearly : tier.priceId;
}

/** Months free when paying yearly vs monthly. */
export function yearlySavingsMonths(tier: Tier): number {
  return Math.round((tier.priceAmount * 12 - tier.priceAmountYearly) / tier.priceAmount);
}

/** Minimum tier level that unlocks each gated feature. */
export const FEATURE_TIERS = {
  date_ideas: 1,
  gift_ideas: 2,
  smart_recommendations: 2,
  date_roulette: 2,
  saved_gifts: 2,
  expert_priority: 3,
  premium_badge: 3,
} as const;

export type GatedFeature = keyof typeof FEATURE_TIERS;

/** Required tier for a usage-metered feature (date_ideas / gift_ideas). */
export const USAGE_FEATURE_TIERS: Record<UsageFeature, number> = {
  date_ideas: FEATURE_TIERS.date_ideas,
  gift_ideas: FEATURE_TIERS.gift_ideas,
};

export function tierName(level: number): string {
  return TIERS.find((t) => t.level === level)?.name ?? "Free";
}

/** Smallest tier that satisfies a required level. */
export function tierForLevel(level: number): Tier {
  return TIERS.find((t) => t.level >= level) ?? TIERS[TIERS.length - 1];
}
