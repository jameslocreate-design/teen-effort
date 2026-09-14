CREATE OR REPLACE FUNCTION public.enforce_partner_age_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dob1 date;
  dob2 date;
  minor1 boolean;
  minor2 boolean;
BEGIN
  SELECT birthday INTO dob1 FROM public.profiles WHERE user_id = NEW.user1_id LIMIT 1;
  SELECT birthday INTO dob2 FROM public.profiles WHERE user_id = NEW.user2_id LIMIT 1;

  IF dob1 IS NULL OR dob2 IS NULL THEN
    RETURN NEW;
  END IF;

  minor1 := public.age_years(dob1) < 18;
  minor2 := public.age_years(dob2) < 18;

  IF minor1 <> minor2 THEN
    RAISE EXCEPTION 'AGE_GROUP_MISMATCH: minors cannot link with adults';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_partner_age_group_trg ON public.partner_links;

CREATE TRIGGER enforce_partner_age_group_trg
BEFORE INSERT OR UPDATE OF status, user1_id, user2_id ON public.partner_links
FOR EACH ROW
EXECUTE FUNCTION public.enforce_partner_age_group();