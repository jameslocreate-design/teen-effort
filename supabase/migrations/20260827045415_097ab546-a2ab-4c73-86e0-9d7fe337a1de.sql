-- 1. Pin search_path on the email-queue helpers
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2. Revoke public/anon/authenticated execute on all SECURITY DEFINER functions in public
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 3. Re-grant only the functions the signed-in app actually calls
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_export_table(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accepted_partner_link_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_user_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_usage(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_user_by_partner_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_tier(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;