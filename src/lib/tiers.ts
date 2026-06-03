import type { UsageFeature } from "@/hooks/useUsage";

/**
 * Subscription tiers. Higher `level` = more access.
 * The most expensive tier (Soulmate) unlocks everything.
 */
export interface Tier {
  level: number;
  id: string; // internal id
  name: string;
  priceId: string; // Stripe price lookup key
  price: string; // display price
  priceAmount: number; // monthly in dollars
  tagline: string;
  highlight?: boolean; // "most popular"
  features: string[];
}

export const TIERS: Tier[] = [
  {
    level: 1,
    id: "spark",
    name: "Spark",
    priceId: "spark_monthly",
    price: "$4.99",
    priceAmount: 4.99,
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
    price: "$9.99",
    priceAmount: 9.99,
    tagline: "Everything you need to wow them.",
    highlight: true,
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
    price: "$19.99",
    priceAmount: 19.99,
    tagline: "Unlock absolutely everything.",
    features: [
      "Everything in Romance",
      "Priority Expert Forum AI replies",
      "Premium badge on your profile",
      "Earliest access to new features",
    ],
  },
];

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
