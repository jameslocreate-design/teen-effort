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

const APP_URL = "https://teen-effort.lovable.app";

/** Friendly plan + cycle from a Stripe price lookup key (e.g. "romance_monthly"). */
function describePlan(lookupKey?: string): { planName: string; cycle: string } {
  if (!lookupKey) return { planName: "Premium", cycle: "" };
  const cycle = lookupKey.endsWith("_yearly")
    ? "Yearly"
    : lookupKey.endsWith("_monthly")
    ? "Monthly"
    : "";
  const base = lookupKey.replace(/_(monthly|yearly)$/, "");
  const nameMap: Record<string, string> = {
    spark: "Spark",
    romance: "Romance",
    soulmate: "Soulmate",
    premium: "Premium",
  };
  const planName = nameMap[base] ?? base.charAt(0).toUpperCase() + base.slice(1);
  return { planName, cycle };
}

function formatMoney(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: (currency || "usd").toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

function formatDate(epochSeconds?: number | null): string | undefined {
  if (!epochSeconds) return undefined;
  return new Date(epochSeconds * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Fire-and-forget transactional email send. Never throws into webhook flow. */
async function sendEmail(
  templateName: string,
  recipientEmail: string | null | undefined,
  idempotencyKey: string,
  templateData: Record<string, unknown>,
) {
  if (!recipientEmail) {
    console.warn("Skipping email — no recipient", { templateName, idempotencyKey });
    return;
  }
  try {
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: { templateName, recipientEmail, idempotencyKey, templateData },
    });
    if (error) console.error("send-transactional-email error:", error);
  } catch (err) {
    console.error("Failed to invoke send-transactional-email:", err);
  }
}

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

/** Welcome email on first subscription creation. */
async function sendWelcomeEmail(
  stripe: ReturnType<typeof createStripeClient>,
  sub: any,
) {
  const customer = await stripe.customers.retrieve(sub.customer as string);
  const email = (customer as any).email as string | undefined;
  const name = (customer as any).name?.split(" ")?.[0] as string | undefined;
  const lookupKey = sub.items?.data?.[0]?.price?.lookup_key as string | undefined;
  const { planName } = describePlan(lookupKey);

  await sendEmail("subscription-welcome", email, `welcome-${sub.id}`, {
    name,
    planName,
    appUrl: APP_URL,
  });
}

/** Receipt email on each successful payment (initial + renewals). */
async function sendReceiptEmail(
  stripe: ReturnType<typeof createStripeClient>,
  invoice: any,
) {
  let email = invoice.customer_email as string | undefined;
  let name: string | undefined;
  if (invoice.customer) {
    try {
      const customer = await stripe.customers.retrieve(invoice.customer as string);
      email = email || ((customer as any).email as string | undefined);
      name = (customer as any).name?.split(" ")?.[0] as string | undefined;
    } catch (err) {
      console.warn("Could not retrieve customer for receipt", err);
    }
  }

  const line = invoice.lines?.data?.[invoice.lines.data.length - 1];
  const lookupKey = line?.price?.lookup_key as string | undefined;
  const { planName, cycle } = describePlan(lookupKey);

  await sendEmail("subscription-receipt", email, `receipt-${invoice.id}`, {
    name,
    planName: cycle ? `${planName} (${cycle})` : planName,
    billingCycle: cycle || undefined,
    amount: formatMoney(invoice.amount_paid ?? 0, invoice.currency),
    invoiceDate: formatDate(invoice.created),
    nextBillingDate: formatDate(invoice.lines?.data?.[0]?.period?.end ?? invoice.period_end),
  });
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
      case "customer.subscription.created": {
        const sub = event.data.object as any;
        await upsertSubscription(stripe, sub.id, env);
        await sendWelcomeEmail(stripe, sub);
        break;
      }
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
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as any;
        await sendReceiptEmail(stripe, invoice);
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
