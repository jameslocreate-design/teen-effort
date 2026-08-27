import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";

/**
 * Opens the Stripe-hosted billing portal in a new tab so the user can
 * update their card, switch plans, or cancel. Portal URLs are one-time use.
 */
export async function openBillingPortal(returnPath = "/pricing") {
  const { data, error } = await supabase.functions.invoke("create-portal-session", {
    body: {
      returnUrl: `${window.location.origin}${returnPath}`,
      environment: getStripeEnvironment(),
    },
  });
  if (error || !data?.url) {
    toast.error("Couldn't open the billing portal. Please try again.");
    return;
  }
  window.open(data.url, "_blank");
}

/**
 * Asks the backend to re-verify this user's App Store / Google Play
 * subscription with RevenueCat and store the result in the database, so
 * server-side gating (usage limits, premium features) knows about it.
 * Returns the verified tier level, or null when it couldn't be checked.
 */
export async function syncStoreSubscription(): Promise<number | null> {
  const { data, error } = await supabase.functions.invoke("sync-iap-entitlement");
  if (error) return null;
  return typeof data?.tier === "number" ? data.tier : null;
}

export interface MyPlan {
  tier: number;
  plan: string;
  active: boolean;
  provider: string | null;
  status: string | null;
  billing_cycle: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trialing: boolean;
  past_due: boolean;
  environment: string | null;
}

/** Authoritative plan for the signed-in user, straight from the database. */
export async function fetchMyPlan(): Promise<MyPlan | null> {
  const { data, error } = await supabase.rpc("get_my_plan");
  if (error || !data) return null;
  return data as unknown as MyPlan;
}
