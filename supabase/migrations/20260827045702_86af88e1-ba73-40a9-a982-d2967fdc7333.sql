-- 1. Extend subscriptions to cover App Store / Play purchases
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS tier_level integer,
  ADD COLUMN IF NOT EXISTS billing_cycle text,
  ADD COLUMN IF NOT EXISTS store_app_user_id text,
  ADD COLUMN IF NOT EXISTS store_product_id text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;

ALTER TABLE public.subscriptions ALTER COLUMN stripe_customer_id DROP NOT NULL;

-- Validation via trigger (time/enum-safe)
CREATE OR REPLACE FUNCTION public.validate_subscription_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.provider NOT IN ('stripe', 'app_store', 'play_store') THEN
    RAISE EXCEPTION 'Invalid subscription provider: %', NEW.provider;
  END IF;

  IF NEW.billing_cycle IS NOT NULL AND NEW.billing_cycle NOT IN ('monthly', 'yearly') THEN
    RAISE EXCEPTION 'Invalid billing cycle: %', NEW.billing_cycle;
  END IF;

  -- Derive tier level / cycle from the price or store product id when missing
  IF NEW.tier_level IS NULL THEN
    NEW.tier_level := CASE
      WHEN lower(coalesce(NEW.price_id, '') || coalesce(NEW.store_product_id, '')) LIKE '%soulmate%' THEN 3
      WHEN lower(coalesce(NEW.price_id, '') || coalesce(NEW.store_product_id, '')) LIKE '%premium%'  THEN 3
      WHEN lower(coalesce(NEW.price_id, '') || coalesce(NEW.store_product_id, '')) LIKE '%romance%'  THEN 2
      WHEN lower(coalesce(NEW.price_id, '') || coalesce(NEW.store_product_id, '')) LIKE '%spark%'    THEN 1
      ELSE 1
    END;
  END IF;

  IF NEW.billing_cycle IS NULL THEN
    NEW.billing_cycle := CASE
      WHEN lower(coalesce(NEW.price_id, '') || coalesce(NEW.store_product_id, '')) LIKE '%year%'
        OR lower(coalesce(NEW.price_id, '') || coalesce(NEW.store_product_id, '')) LIKE '%annual%' THEN 'yearly'
      WHEN lower(coalesce(NEW.price_id, '') || coalesce(NEW.store_product_id, '')) LIKE '%month%' THEN 'monthly'
      ELSE NULL
    END;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_subscription_row() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_subscription_row_trigger ON public.subscriptions;
CREATE TRIGGER validate_subscription_row_trigger
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.validate_subscription_row();

-- Backfill tier_level / billing_cycle for existing rows
UPDATE public.subscriptions SET
  tier_level = CASE
    WHEN price_id LIKE 'soulmate%' OR price_id LIKE 'premium%' THEN 3
    WHEN price_id LIKE 'romance%' THEN 2
    WHEN price_id LIKE 'spark%' THEN 1
    ELSE 1
  END,
  billing_cycle = CASE
    WHEN price_id LIKE '%yearly' THEN 'yearly'
    WHEN price_id LIKE '%monthly' THEN 'monthly'
    ELSE NULL
  END
WHERE tier_level IS NULL;

-- One row per user per store per environment
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_provider_env_idx
  ON public.subscriptions (user_id, provider, environment);

CREATE INDEX IF NOT EXISTS subscriptions_store_app_user_idx
  ON public.subscriptions (store_app_user_id) WHERE store_app_user_id IS NOT NULL;

-- 2. Plan checks now count every provider and use tier_level
CREATE OR REPLACE FUNCTION public.get_subscription_tier(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(
    COALESCE(tier_level, CASE
      WHEN price_id LIKE 'soulmate%' OR price_id LIKE 'premium%' THEN 3
      WHEN price_id LIKE 'romance%' THEN 2
      ELSE 1
    END)
  ), 0)
  FROM public.subscriptions
  WHERE user_id = _user_id
    AND environment IN ('sandbox', 'live')
    AND (
      status IN ('active', 'trialing', 'past_due')
      OR (status = 'canceled' AND current_period_end > now())
    )
    AND (current_period_end IS NULL OR current_period_end > now() OR status IN ('active','trialing'));
$$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid, _environment text DEFAULT 'sandbox'::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _user_id
      AND (_environment IS NULL OR environment = _environment OR provider <> 'stripe')
      AND (
        status IN ('active', 'trialing', 'past_due')
        OR (status = 'canceled' AND current_period_end > now())
      )
      AND (current_period_end IS NULL OR current_period_end > now() OR status IN ('active','trialing'))
  );
$$;

-- 3. Single source of truth the client can read for the signed-in user
CREATE OR REPLACE FUNCTION public.get_my_plan()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row record;
  _level integer;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('tier', 0, 'plan', 'Free', 'active', false);
  END IF;

  _level := public.get_subscription_tier(_uid);

  SELECT * INTO _row
  FROM public.subscriptions
  WHERE user_id = _uid
    AND (
      status IN ('active', 'trialing', 'past_due')
      OR (status = 'canceled' AND current_period_end > now())
    )
  ORDER BY COALESCE(tier_level, 1) DESC, updated_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'tier', _level,
    'plan', CASE _level WHEN 3 THEN 'Soulmate' WHEN 2 THEN 'Romance' WHEN 1 THEN 'Spark' ELSE 'Free' END,
    'active', _level > 0,
    'provider', _row.provider,
    'status', _row.status,
    'billing_cycle', _row.billing_cycle,
    'current_period_end', _row.current_period_end,
    'cancel_at_period_end', COALESCE(_row.cancel_at_period_end, false),
    'trialing', _row.status = 'trialing',
    'past_due', _row.status = 'past_due',
    'environment', _row.environment
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_plan() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated, service_role;

-- 4. Admin revenue stats: add per-store breakdown
CREATE OR REPLACE FUNCTION public.get_subscription_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH active_subs AS (
    SELECT
      provider,
      status,
      cancel_at_period_end,
      COALESCE(tier_level, 1) AS lvl,
      COALESCE(billing_cycle, 'monthly') AS cycle,
      CASE COALESCE(tier_level, 1)
        WHEN 3 THEN CASE WHEN billing_cycle = 'yearly' THEN 199.99/12.0 ELSE 19.99 END
        WHEN 2 THEN CASE WHEN billing_cycle = 'yearly' THEN 99.99/12.0  ELSE 9.99 END
        ELSE        CASE WHEN billing_cycle = 'yearly' THEN 49.99/12.0  ELSE 4.99 END
      END AS monthly_value,
      CASE COALESCE(tier_level, 1) WHEN 3 THEN 'Soulmate' WHEN 2 THEN 'Romance' ELSE 'Spark' END AS tier_name
    FROM public.subscriptions
    WHERE status IN ('active', 'trialing', 'past_due')
       OR (status = 'canceled' AND current_period_end > now())
  )
  SELECT json_build_object(
    'mrr', COALESCE(ROUND(SUM(monthly_value)::numeric, 2), 0),
    'active_subscribers', COUNT(*),
    'trialing', COUNT(*) FILTER (WHERE status = 'trialing'),
    'past_due', COUNT(*) FILTER (WHERE status = 'past_due'),
    'canceling', COUNT(*) FILTER (WHERE cancel_at_period_end = true OR status = 'canceled'),
    'by_tier', (
      SELECT COALESCE(json_object_agg(tier_name, cnt), '{}'::json)
      FROM (SELECT tier_name, COUNT(*) AS cnt FROM active_subs GROUP BY tier_name) t
    ),
    'by_provider', (
      SELECT COALESCE(json_object_agg(provider, cnt), '{}'::json)
      FROM (SELECT provider, COUNT(*) AS cnt FROM active_subs GROUP BY provider) p
    ),
    'by_cycle', (
      SELECT COALESCE(json_object_agg(cycle, cnt), '{}'::json)
      FROM (SELECT cycle, COUNT(*) AS cnt FROM active_subs GROUP BY cycle) c
    )
  ) INTO result
  FROM active_subs;

  RETURN result;
END;
$$;