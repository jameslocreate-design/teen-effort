ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
UPDATE public.profiles SET display_name = name WHERE display_name IS NULL;
CREATE OR REPLACE FUNCTION public.sync_profile_display_name() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF TG_OP = 'INSERT' THEN
  NEW.display_name := COALESCE(NULLIF(NEW.display_name, ''), NEW.name);
 ELSIF NEW.name IS DISTINCT FROM OLD.name AND NEW.display_name IS NOT DISTINCT FROM OLD.display_name THEN
  NEW.display_name := NEW.name;
 ELSIF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
  NEW.name := COALESCE(NULLIF(NEW.display_name, ''), NEW.name);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER sync_profile_display_name BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_display_name();
CREATE TABLE public.apple_authorization_tokens (
 user_id uuid PRIMARY KEY,
 apple_sub text NOT NULL,
 client_id text NOT NULL,
 refresh_token text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.apple_authorization_tokens FROM anon, authenticated;
GRANT ALL ON public.apple_authorization_tokens TO service_role;
ALTER TABLE public.apple_authorization_tokens ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.apple_authorization_tokens IS 'Private Apple authorization tokens: service-role only, no client access.';