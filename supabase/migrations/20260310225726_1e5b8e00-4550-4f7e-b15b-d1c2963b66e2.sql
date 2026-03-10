
CREATE OR REPLACE FUNCTION public.get_admin_stats()
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

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_partner_links', (SELECT COUNT(*) FROM public.partner_links WHERE status = 'accepted'),
    'total_calendar_entries', (SELECT COUNT(*) FROM public.calendar_entries),
    'total_bucket_items', (SELECT COUNT(*) FROM public.bucket_list),
    'total_saved_gifts', (SELECT COUNT(*) FROM public.saved_gifts),
    'total_expert_posts', (SELECT COUNT(*) FROM public.expert_posts),
    'total_expert_replies', (SELECT COUNT(*) FROM public.expert_replies),
    'total_favorites', (SELECT COUNT(*) FROM public.calendar_entries WHERE is_favorite = true),
    'total_rated_dates', (SELECT COUNT(*) FROM public.calendar_entries WHERE user_rating IS NOT NULL),
    'avg_date_rating', (SELECT COALESCE(ROUND(AVG(user_rating)::numeric, 1), 0) FROM public.calendar_entries WHERE user_rating IS NOT NULL),
    'total_photos', (SELECT COALESCE(SUM(array_length(photo_urls, 1)), 0) FROM public.calendar_entries WHERE photo_urls IS NOT NULL AND array_length(photo_urls, 1) > 0),
    'total_special_events', (SELECT COUNT(*) FROM public.special_events),
    'total_wishlists', (SELECT COUNT(*) FROM public.wishlists),
    'total_referrals', (SELECT COUNT(*) FROM public.referrals),
    'completed_referrals', (SELECT COUNT(*) FROM public.referrals WHERE status = 'completed'),
    'total_date_reviews', (SELECT COUNT(*) FROM public.date_reviews),
    'total_quiz_answers', (SELECT COUNT(*) FROM public.quiz_answers),
    'users_this_week', (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'users_this_month', (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
    'recent_signups', (
      SELECT json_agg(row_to_json(p))
      FROM (SELECT name, created_at, zipcode, gender FROM public.profiles ORDER BY created_at DESC LIMIT 10) p
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_export_table(_table_name text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF _table_name NOT IN ('profiles', 'partner_links', 'calendar_entries', 'bucket_list', 'saved_gifts', 'expert_posts', 'expert_replies', 'special_events', 'user_roles', 'wishlists', 'referrals', 'date_reviews', 'quiz_answers') THEN
    RAISE EXCEPTION 'Invalid table name';
  END IF;

  EXECUTE format('SELECT json_agg(row_to_json(t)) FROM public.%I t', _table_name) INTO result;
  
  RETURN COALESCE(result, '[]'::json);
END;
$function$;
