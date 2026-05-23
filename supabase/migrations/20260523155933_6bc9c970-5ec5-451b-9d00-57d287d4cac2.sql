
-- Subscriptions table for Stripe payments
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  status TEXT NOT NULL,
  price_id TEXT,
  product_id TEXT,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_env ON public.subscriptions(user_id, environment);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON public.subscriptions(stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription rows (across both envs - hook filters by env)
CREATE POLICY "Users can view their own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (webhook) can insert/update/delete
CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: does this user have an active subscription in the given env?
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID, _environment TEXT DEFAULT 'sandbox')
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND environment = _environment
      AND (
        status IN ('active', 'trialing', 'past_due')
        OR (status = 'canceled' AND current_period_end > now())
      )
      AND (current_period_end IS NULL OR current_period_end > now() OR status IN ('active','trialing'))
  );
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
