REVOKE EXECUTE ON FUNCTION public.check_and_increment_usage(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_current_usage(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_usage(UUID, TEXT) TO authenticated;