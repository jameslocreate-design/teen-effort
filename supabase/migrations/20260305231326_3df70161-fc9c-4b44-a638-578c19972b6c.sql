
-- Table for recurring/special events (anniversaries, birthdays, etc.)
CREATE TABLE public.special_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_link_id uuid NOT NULL REFERENCES public.partner_links(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  title text NOT NULL,
  event_date date NOT NULL,
  recurring boolean NOT NULL DEFAULT true,
  event_type text NOT NULL DEFAULT 'custom',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.special_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared special events"
  ON public.special_events FOR SELECT TO authenticated
  USING (partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can add special events"
  ON public.special_events FOR INSERT TO authenticated
  WITH CHECK (added_by = auth.uid() AND partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can delete own special events"
  ON public.special_events FOR DELETE TO authenticated
  USING (added_by = auth.uid());
