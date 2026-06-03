-- Returns the highest subscription tier level a user holds (0 = none).
CREATE OR REPLACE FUNCTION public.get_subscription_tier(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MAX(
    CASE price_id
      WHEN 'spark_monthly' THEN 1
      WHEN 'romance_monthly' THEN 2
      WHEN 'soulmate_monthly' THEN 3
      ELSE 1 -- legacy premium_* plans count as full access
    END
  ), 0)
  FROM public.subscriptions
  WHERE user_id = _user_id
    AND environment IN ('sandbox', 'live')
    AND (
      status IN ('active', 'trialing', 'past_due')
      OR (status = 'canceled' AND current_period_end > now())
    )
    AND (current_period_end IS NULL OR current_period_end > now() OR status IN ('active','trialing'));
$function$;

-- Map legacy full-access plans to the highest tier so existing subscribers keep everything.
CREATE OR REPLACE FUNCTION public.get_subscription_tier(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(MAX(
    CASE price_id
      WHEN 'spark_monthly' THEN 1
      WHEN 'romance_monthly' THEN 2
      WHEN 'soulmate_monthly' THEN 3
      WHEN 'premium_monthly' THEN 3
      WHEN 'premium_yearly' THEN 3
      ELSE 1
    END
  ), 0)
  FROM public.subscriptions
  WHERE user_id = _user_id
    AND environment IN ('sandbox', 'live')
    AND (
      status IN ('active', 'trialing', 'past_due')
      OR (status = 'canceled' AND current_period_end > now())
    )
    AND (current_period_end IS NULL OR current_period_end > now() OR status IN ('active','trialing'));
$function$;

GRANT EXECUTE ON FUNCTION public.get_subscription_tier(uuid) TO authenticated, service_role;

-- Tier-aware usage check: a feature is unlocked once the user's tier meets its required tier.
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(_user_id uuid, _feature text, _limit integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _period DATE := date_trunc('month', now())::date;
  _new_count INTEGER;
  _tier INTEGER;
  _required_tier INTEGER;
BEGIN
  -- Minimum tier that unlocks unlimited use of this feature
  _required_tier := CASE _feature
    WHEN 'date_ideas' THEN 1
    WHEN 'gift_ideas' THEN 2
    ELSE 1
  END;

  _tier := public.get_subscription_tier(_user_id);

  -- Subscribers at or above the required tier bypass the limit entirely
  IF _tier >= _required_tier THEN
    RETURN json_build_object(
      'allowed', true,
      'subscribed', true,
      'count', 0,
      'remaining', NULL,
      'limit', _limit
    );
  END IF;

  -- Upsert and increment atomically
  INSERT INTO public.usage_limits (user_id, feature, period_start, count)
  VALUES (_user_id, _feature, _period, 1)
  ON CONFLICT (user_id, feature, period_start)
  DO UPDATE SET count = public.usage_limits.count + 1,
                updated_at = now()
  RETURNING count INTO _new_count;

  IF _new_count > _limit THEN
    UPDATE public.usage_limits
       SET count = _new_count - 1,
           updated_at = now()
     WHERE user_id = _user_id
       AND feature = _feature
       AND period_start = _period;

    RETURN json_build_object(
      'allowed', false,
      'subscribed', false,
      'count', _new_count - 1,
      'remaining', 0,
      'limit', _limit
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'subscribed', false,
    'count', _new_count,
    'remaining', _limit - _new_count,
    'limit', _limit
  );
END;
$function$;