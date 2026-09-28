ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_city text,
  ADD COLUMN IF NOT EXISTS home_lat numeric(5,2),
  ADD COLUMN IF NOT EXISTS home_lng numeric(5,2);

CREATE OR REPLACE FUNCTION public.normalize_home_city()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.home_city IS NULL OR NEW.home_lat IS NULL OR NEW.home_lng IS NULL THEN
    NEW.home_city := NULL; NEW.home_lat := NULL; NEW.home_lng := NULL;
  ELSE
    IF NEW.home_lat < -90 OR NEW.home_lat > 90 OR NEW.home_lng < -180 OR NEW.home_lng > 180 THEN
      RAISE EXCEPTION 'HOME_CITY_INVALID';
    END IF;
    NEW.home_city := left(trim(NEW.home_city), 120);
    NEW.home_lat := round(NEW.home_lat, 2);
    NEW.home_lng := round(NEW.home_lng, 2);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_home_city ON public.profiles;
CREATE TRIGGER trg_normalize_home_city
BEFORE INSERT OR UPDATE OF home_city, home_lat, home_lng ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_home_city();