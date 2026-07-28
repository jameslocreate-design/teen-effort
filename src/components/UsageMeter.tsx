import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage, type UsageFeature } from "@/hooks/useUsage";
import { USAGE_FEATURE_TIERS } from "@/lib/tiers";
import { purchasesBlocked } from "@/lib/native";

interface UsageMeterProps {
  feature: UsageFeature;
  label: string; // e.g. "date generations"
}

export function UsageMeter({ feature, label }: UsageMeterProps) {
  const { user } = useAuth();
  const { tier } = useSubscription(user?.id);
  const { count, limit, remaining, loading } = useUsage(user?.id, feature);

  // Hide the meter once the user's tier unlocks unlimited use of this feature.
  if (!user || loading || tier >= USAGE_FEATURE_TIERS[feature]) return null;

  const pct = Math.min(100, (count / limit) * 100);
  const exhausted = remaining === 0;
  const nearLimit = !exhausted && pct >= 80;

  const accent = exhausted || nearLimit ? "text-primary" : "text-muted-foreground";
  const barColor = exhausted ? "bg-destructive" : nearLimit ? "bg-primary" : "bg-primary/70";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        nearLimit || exhausted ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card/60"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={accent}>
          {exhausted ? (
            <span className="text-foreground font-medium">No free {label} left this month</span>
          ) : nearLimit ? (
            <span className="text-foreground font-medium">
              Only {remaining} free {label} left this month
            </span>
          ) : (
            <>
              <span className="text-foreground font-medium">{remaining}</span>{" "}
              of {limit} free {label} left this month
            </>
          )}
        </span>
        {!purchasesBlocked() && (
          <Link
            to="/pricing"
            className="inline-flex items-center gap-1 text-primary font-medium hover:underline whitespace-nowrap"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade
          </Link>
        )}
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {nearLimit && (
        <p className="mt-2 text-xs text-muted-foreground">
          You're almost out — upgrade for unlimited {label}.
        </p>
      )}
    </div>
  );
}
