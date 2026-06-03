import { Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { FEATURE_TIERS, tierName } from "@/lib/tiers";

interface PremiumBadgeProps {
  /** Tier level required to show the badge. Defaults to Soulmate. */
  minTier?: number;
  className?: string;
}

/**
 * Renders a premium badge for the signed-in user once they reach the
 * required tier. Soulmate members get the Crown badge by default.
 */
export function PremiumBadge({ minTier = FEATURE_TIERS.premium_badge, className }: PremiumBadgeProps) {
  const { user } = useAuth();
  const { tier, loading } = useSubscription(user?.id);

  if (loading || tier < minTier) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-primary font-sans ${className ?? ""}`}
      title={`${tierName(tier)} member`}
    >
      <Crown className="h-3 w-3" />
      {tierName(tier)}
    </span>
  );
}

export default PremiumBadge;
