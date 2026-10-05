CREATE OR REPLACE FUNCTION public.default_teen_location_precision()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.birthday IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.birthday IS NULL)
     AND public.age_years(NEW.birthday) < 18
     AND COALESCE(NEW.privacy_settings->>'precise_prompted','false') <> 'true' THEN
    NEW.privacy_settings := COALESCE(NEW.privacy_settings,'{}'::jsonb) || '{"location_precision":"zip"}'::jsonb;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_default_teen_location_precision ON public.profiles;
CREATE TRIGGER trg_default_teen_location_precision
BEFORE INSERT OR UPDATE OF birthday ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.default_teen_location_precision();