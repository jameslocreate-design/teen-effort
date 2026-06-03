CREATE OR REPLACE FUNCTION public.get_subscription_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH active_subs AS (
    SELECT
      price_id,
      status,
      cancel_at_period_end,
      CASE price_id
        WHEN 'spark_monthly'    THEN 4.99
        WHEN 'spark_yearly'     THEN 49.99/12.0
        WHEN 'romance_monthly'  THEN 9.99
        WHEN 'romance_yearly'   THEN 99.99/12.0
        WHEN 'soulmate_monthly' THEN 19.99
        WHEN 'soulmate_yearly'  THEN 199.99/12.0
        WHEN 'premium_monthly'  THEN 19.99
        WHEN 'premium_yearly'   THEN 199.99/12.0
        ELSE 0
      END AS monthly_value,
      CASE
        WHEN price_id LIKE 'spark%'    THEN 'Spark'
        WHEN price_id LIKE 'romance%'  THEN 'Romance'
        WHEN price_id LIKE 'soulmate%' OR price_id LIKE 'premium%' THEN 'Soulmate'
        ELSE 'Other'
      END AS tier_name
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
    )
  ) INTO result
  FROM active_subs;

  RETURN result;
END;
$function$;