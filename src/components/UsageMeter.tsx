import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsage, type UsageFeature } from "@/hooks/useUsage";

interface UsageMeterProps {
  feature: UsageFeature;
  label: string; // e.g. "date generations"
}

export function UsageMeter({ feature, label }: UsageMeterProps) {
  const { user } = useAuth();
  const { isActive } = useSubscription(user?.id);
  const { count, limit, remaining, loading } = useUsage(user?.id, feature);

  if (!user || loading || isActive) return null;

  const pct = Math.min(100, (count / limit) * 100);
  const exhausted = remaining === 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">
          {exhausted ? (
            <span className="text-foreground font-medium">No free {label} left this month</span>
          ) : (
            <>
              <span className="text-foreground font-medium">{remaining}</span>{" "}
              of {limit} free {label} left this month
            </>
          )}
        </span>
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1 text-primary font-medium hover:underline whitespace-nowrap"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Upgrade
        </Link>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
