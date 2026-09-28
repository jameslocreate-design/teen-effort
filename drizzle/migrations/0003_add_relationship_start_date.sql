ALTER TABLE public.partner_links ADD COLUMN IF NOT EXISTS relationship_start_date date;

CREATE OR REPLACE FUNCTION public.validate_relationship_start_date()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.relationship_start_date IS NOT NULL
     AND NEW.relationship_start_date IS DISTINCT FROM OLD.relationship_start_date THEN
    -- allow +1 day slack for time zones ahead of UTC
    IF NEW.relationship_start_date > (now() AT TIME ZONE 'utc')::date + 1 THEN
      RAISE EXCEPTION 'START_DATE_IN_FUTURE: relationship start date cannot be in the future';
    END IF;
    IF NEW.relationship_start_date < DATE '1900-01-01' THEN
      RAISE EXCEPTION 'START_DATE_INVALID: relationship start date is too far in the past';
    END IF;
    IF NEW.status <> 'accepted' THEN
      RAISE EXCEPTION 'START_DATE_NOT_LINKED: only linked couples can set a start date';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_relationship_start_date ON public.partner_links;
CREATE TRIGGER trg_validate_relationship_start_date
BEFORE UPDATE OF relationship_start_date ON public.partner_links
FOR EACH ROW EXECUTE FUNCTION public.validate_relationship_start_date();