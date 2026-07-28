import { AlertTriangle, Clock, Hourglass, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { openBillingPortal } from "@/lib/billing";
import { purchasesBlocked } from "@/lib/native";
import { format } from "date-fns";

/**
 * Lifecycle banner shown at the top of the app:
 *  - past_due   -> dunning prompt that opens the billing portal to fix payment
 *  - trialing   -> countdown of days left in the free trial
 *  - canceling  -> grace-period notice with access-until date + reactivate
 *  - monthly    -> gentle nudge to switch to yearly and save
 */
export function SubscriptionStatusBanner() {
  const { user } = useAuth();
  const { isActive, isPastDue, isTrialing, isCanceling, isMonthly, trialDaysLeft, periodEnd, loading } =
    useSubscription(user?.id);

  if (!user || loading) return null;
  // Apple bars external purchase/billing entry points inside the iOS app.
  if (purchasesBlocked()) return null;

  if (isPastDue) {
    return (
      <div className="flex items-center justify-center gap-2 bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-xs sm:text-sm text-destructive font-sans">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Your payment didn't go through.{" "}
          <button onClick={() => openBillingPortal()} className="underline font-semibold">
            Update your payment method
          </button>{" "}
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
          <button onClick={() => openBillingPortal()} className="underline font-semibold text-primary">
            Reactivate
          </button>
        </span>
      </div>
    );
  }

  if (isTrialing && trialDaysLeft !== null) {
    return (
      <div className="flex items-center justify-center gap-2 bg-primary/10 border-b border-primary/30 px-4 py-2 text-center text-xs sm:text-sm text-foreground font-sans">
        <Hourglass className="h-4 w-4 shrink-0 text-primary" />
        <span>
          {trialDaysLeft === 0
            ? "Your free trial ends today."
            : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your free trial.`}{" "}
          <Link to="/pricing" className="underline font-semibold text-primary">
            Manage plan
          </Link>
        </span>
      </div>
    );
  }

  if (isActive && isMonthly) {
    return (
      <div className="flex items-center justify-center gap-2 bg-accent/40 border-b border-border px-4 py-2 text-center text-xs sm:text-sm text-foreground font-sans">
        <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
        <span>
          Switch to yearly billing and get 2 months free.{" "}
          <Link to="/pricing" className="underline font-semibold text-primary">
            See yearly plans
          </Link>
        </span>
      </div>
    );
  }

  return null;
}

export default SubscriptionStatusBanner;
