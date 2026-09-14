-- Reports of content or users
CREATE TABLE public.content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid(),
  reported_user_id uuid,
  content_type text NOT NULL,
  content_id uuid,
  content_snapshot text,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.content_reports TO authenticated;
GRANT ALL ON public.content_reports TO service_role;

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can file their own reports"
  ON public.content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view their own reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins can view all reports"
  ON public.content_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Blocked users
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL DEFAULT auth.uid(),
  blocked_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);

GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid() AND blocked_id <> auth.uid());

CREATE POLICY "Users can see their own blocks"
  ON public.blocked_users FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can remove their own blocks"
  ON public.blocked_users FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Admins can view all blocks"
  ON public.blocked_users FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Prevent linking with someone either side has blocked
CREATE OR REPLACE FUNCTION public.enforce_not_blocked()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = NEW.user1_id AND blocked_id = NEW.user2_id)
       OR (blocker_id = NEW.user2_id AND blocked_id = NEW.user1_id)
  ) THEN
    RAISE EXCEPTION 'USER_BLOCKED: these accounts cannot be linked';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_not_blocked() FROM PUBLIC;

CREATE TRIGGER enforce_not_blocked_trg
BEFORE INSERT OR UPDATE OF status, user1_id, user2_id ON public.partner_links
FOR EACH ROW EXECUTE FUNCTION public.enforce_not_blocked();