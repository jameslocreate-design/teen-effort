import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// return_url must send buyers back to this app, never to an arbitrary site.
const ALLOWED_RETURN_HOSTS = ["teeneffort.app", "www.teeneffort.app"];

function isAllowedReturnUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname;
    const isAppHost = ALLOWED_RETURN_HOSTS.includes(host);
    const isPreviewHost = host.endsWith(".lovable.app");
    const isLocalDev = host === "localhost" || host === "127.0.0.1";
    return (isAppHost || isPreviewHost || isLocalDev) && url.pathname.startsWith("/checkout/return");
  } catch {
    return false;
  }
}

class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Identity comes only from the signed-in user's session — never from the request body.
async function requireUser(req: Request) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) throw new HttpError("Sign in to check out", 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError("Sign in to check out", 401);
  return data.user;
}

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new HttpError("Invalid userId", 400);
  }
  if (options.userId) {
    const found = await stripe.customers.search({
      query: `metadata['userId']:'${options.userId}'`,
      limit: 1,
    });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const user = await requireUser(req);
    const body = await req.json();
    const { priceId, returnUrl, environment } = body;

    if (!priceId || !/^[a-zA-Z0-9_-]+$/.test(priceId)) throw new HttpError("Invalid priceId", 400);
    if (!returnUrl || !isAllowedReturnUrl(returnUrl)) throw new HttpError("Invalid returnUrl", 400);
    if (environment !== "sandbox" && environment !== "live") throw new HttpError("Invalid environment", 400);

    const env = environment as StripeEnv;
    const stripe = createStripeClient(env);

    const prices = await stripe.prices.list({ lookup_keys: [priceId] });
    if (!prices.data.length) throw new HttpError("Price not found", 400);
    const stripePrice = prices.data[0];
    const isRecurring = stripePrice.type === "recurring";

    // Use the session email only once the address is confirmed.
    const verifiedEmail = user.email && (user.email_confirmed_at || user.confirmed_at)
      ? user.email
      : undefined;
    const customerId = await resolveOrCreateCustomer(stripe, { userId: user.id, email: verifiedEmail });

    let productDescription: string | undefined;
    if (!isRecurring) {
      const productId = typeof stripePrice.product === "string"
        ? stripePrice.product
        : stripePrice.product.id;
      const product = await stripe.products.retrieve(productId);
      productDescription = product.name;
    }

    // Free trial for the higher tiers on new subscriptions.
    const TRIAL_DAYS: Record<string, number> = {
      romance_monthly: 7,
      romance_yearly: 7,
      soulmate_monthly: 7,
      soulmate_yearly: 7,
    };
    const trialDays = isRecurring ? TRIAL_DAYS[priceId] : undefined;

    const session = await stripe.checkout.sessions.create({
      // Single purchase only — quantity is never taken from the caller.
      line_items: [{ price: stripePrice.id, quantity: 1 }],
      mode: isRecurring ? "subscription" : "payment",
      ui_mode: "embedded_page",
      return_url: returnUrl,
      ...(customerId && { customer: customerId }),
      ...(!isRecurring && { payment_intent_data: { description: productDescription } }),
      managed_payments: { enabled: true },
      ...(isRecurring
        ? {
            subscription_data: {
              metadata: { userId: user.id },
              ...(trialDays && { trial_period_days: trialDays }),
            },
          }
        : {}),
      metadata: { userId: user.id },
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 400;
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
