import { AlertTriangle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { format } from "date-fns";

/**
 * Lifecycle banner shown at the top of the app:
 *  - past_due  -> dunning prompt to update payment
 *  - canceling -> grace-period notice with access-until date
 */
export function SubscriptionStatusBanner() {
  const { user } = useAuth();
  const { isPastDue, isCanceling, periodEnd, loading } = useSubscription(user?.id);

  if (!user || loading) return null;

  if (isPastDue) {
    return (
      <div className="flex items-center justify-center gap-2 bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-xs sm:text-sm text-destructive font-sans">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Your payment didn't go through.{" "}
          <Link to="/pricing" className="underline font-semibold">
            Update your payment method
          </Link>{" "}
          to keep your perks.
        </span>
      </div>
    );
  }

  if (isCanceling) {
    const until = periodEnd ? format(new Date(periodEnd), "MMM d, yyyy") : null;
    return (
      <div className="flex items-center justify-center gap-2 bg-primary/10 border-b border-primary/30 px-4 py-2 text-center text-xs sm:text-sm text-foreground font-sans">
        <Clock className="h-4 w-4 shrink-0 text-primary" />
        <span>
          Your plan is set to cancel{until ? ` — access until ${until}` : ""}.{" "}
          <Link to="/pricing" className="underline font-semibold text-primary">
            Reactivate
          </Link>
        </span>
      </div>
    );
  }

  return null;
}

export default SubscriptionStatusBanner;
