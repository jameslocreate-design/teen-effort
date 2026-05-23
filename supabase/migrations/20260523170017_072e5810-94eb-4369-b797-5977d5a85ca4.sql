-- Track monthly usage of AI generations per user per feature
CREATE TABLE public.usage_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature TEXT NOT NULL,
  period_start DATE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, period_start)
);

CREATE INDEX idx_usage_limits_user_period ON public.usage_limits (user_id, period_start);

ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
ON public.usage_limits
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Only the service role / security-definer functions write. No client write policies.

-- Atomic check + increment. Returns whether the call is allowed plus remaining count.
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  _user_id UUID,
  _feature TEXT,
  _limit INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _period DATE := date_trunc('month', now())::date;
  _new_count INTEGER;
  _is_subscribed BOOLEAN;
BEGIN
  -- Paid users bypass the limit entirely
  SELECT public.has_active_subscription(_user_id, 'sandbox')
      OR public.has_active_subscription(_user_id, 'live')
    INTO _is_subscribed;

  IF _is_subscribed THEN
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
    -- Roll back the increment so a blocked call doesn't consume a credit
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
$$;

-- Helper for the client hook: get current month's usage without writing
CREATE OR REPLACE FUNCTION public.get_current_usage(_user_id UUID, _feature TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT count FROM public.usage_limits
      WHERE user_id = _user_id
        AND feature = _feature
        AND period_start = date_trunc('month', now())::date),
    0
  );
$$;