
CREATE TABLE public.date_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_link_id uuid NOT NULL,
  user_id uuid NOT NULL,
  idea_hash text NOT NULL,
  idea_data jsonb NOT NULL,
  vote text NOT NULL CHECK (vote IN ('like', 'dislike')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_link_id, user_id, idea_hash)
);

ALTER TABLE public.date_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own votes"
ON public.date_votes FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can view shared votes"
ON public.date_votes FOR SELECT TO authenticated
USING (partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can delete own votes"
ON public.date_votes FOR DELETE TO authenticated
USING (user_id = auth.uid());
