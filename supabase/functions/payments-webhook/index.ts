import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, getWebhookSecret } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function upsertSubscription(
  stripe: ReturnType<typeof createStripeClient>,
  subscriptionId: string,
  env: StripeEnv,
) {
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const customer = await stripe.customers.retrieve(sub.customer as string);
  const userId = (customer as any).metadata?.userId || (sub.metadata as any)?.userId;
  if (!userId) {
    console.warn("No userId on subscription/customer", subscriptionId);
    return;
  }

  const item = sub.items.data[0];
  const price = item.price;
  const periodEnd = (item as any).current_period_end ?? (sub as any).current_period_end;

  const { error } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      status: sub.status,
      price_id: (price as any).lookup_key || price.id,
      product_id: typeof price.product === "string" ? price.product : price.product.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: sub.cancel_at_period_end ?? false,
      environment: env,
      updated_at: new Date().toISOString(),
    }, { onConflict: "stripe_subscription_id" });

  if (error) console.error("upsert subscription error:", error);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const envParam = url.searchParams.get("env");
  if (envParam !== "sandbox" && envParam !== "live") {
    return new Response("Invalid env", { status: 400 });
  }
  const env = envParam as StripeEnv;

  try {
    const signature = req.headers.get("stripe-signature");
    if (!signature) return new Response("No signature", { status: 400 });

    const rawBody = await req.text();
    const stripe = createStripeClient(env);
    const webhookSecret = getWebhookSecret(env);

    const event = await stripe.webhooks.constructEventAsync(
      rawBody, signature, webhookSecret,
    );

    console.log("Webhook event:", event.type, "env:", env);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await upsertSubscription(stripe, sub.id, env);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as any;
        if (session.mode === "subscription" && session.subscription) {
          await upsertSubscription(stripe, session.subscription, env);
        }
        break;
      }
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("webhook error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
