
-- Create a secure function to look up a user_id by partner_code
-- This bypasses RLS safely since it only returns the user_id
CREATE OR REPLACE FUNCTION public.lookup_user_by_partner_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles
  WHERE partner_code = _code
  LIMIT 1;
$$;
