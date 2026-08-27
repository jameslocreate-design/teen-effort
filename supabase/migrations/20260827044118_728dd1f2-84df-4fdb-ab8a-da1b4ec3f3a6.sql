CREATE OR REPLACE FUNCTION public.age_years(_dob date)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT date_part('year', age(_dob))::int;
$$;

CREATE OR REPLACE FUNCTION public.enforce_profile_birthday()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.birthday IS NOT NULL
     AND NEW.birthday IS DISTINCT FROM OLD.birthday THEN
    RAISE EXCEPTION 'Birthdate cannot be changed once set';
  END IF;

  IF NEW.birthday IS NOT NULL THEN
    IF NEW.birthday > current_date THEN
      RAISE EXCEPTION 'Invalid birthdate';
    END IF;
    IF NEW.birthday < date '1900-01-01' THEN
      RAISE EXCEPTION 'Invalid birthdate';
    END IF;
    IF public.age_years(NEW.birthday) < 13 THEN
      RAISE EXCEPTION 'You must be at least 13 years old to use Teen Effort';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_birthday_trigger ON public.profiles;
CREATE TRIGGER enforce_profile_birthday_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_birthday();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dob date;
  _raw text;
BEGIN
  _raw := NULLIF(NEW.raw_user_meta_data->>'birthday', '');

  IF _raw IS NOT NULL THEN
    BEGIN
      _dob := _raw::date;
    EXCEPTION WHEN OTHERS THEN
      _dob := NULL;
    END;
  END IF;

  IF _dob IS NOT NULL AND public.age_years(_dob) < 13 THEN
    RAISE EXCEPTION 'You must be at least 13 years old to use Teen Effort';
  END IF;

  INSERT INTO public.profiles (user_id, birthday)
  VALUES (NEW.id, _dob);

  RETURN NEW;
END;
$$;