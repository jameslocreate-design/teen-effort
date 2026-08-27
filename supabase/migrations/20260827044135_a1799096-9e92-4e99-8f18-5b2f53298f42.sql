REVOKE ALL ON FUNCTION public.enforce_profile_birthday() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.age_years(date) FROM anon, public;