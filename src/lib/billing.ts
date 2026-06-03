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
