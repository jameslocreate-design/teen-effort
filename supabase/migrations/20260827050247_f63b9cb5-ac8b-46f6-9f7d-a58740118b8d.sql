DROP INDEX IF EXISTS public.subscriptions_user_provider_env_idx;

-- Store plans are keyed per user/store/environment; Stripe rows stay keyed by
-- their Stripe subscription id so upgrades don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_store_user_env_idx
  ON public.subscriptions (user_id, provider, environment)
  WHERE provider <> 'stripe';