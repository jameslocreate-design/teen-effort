
CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_link_id uuid NOT NULL REFERENCES public.partner_links(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Users can add to their own wishlist
CREATE POLICY "Users can insert own wishlist items"
  ON public.wishlists FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND partner_link_id = get_accepted_partner_link_id(auth.uid()));

-- Users can view their own items AND their partner's items (the secret viewing)
CREATE POLICY "Users can view shared wishlists"
  ON public.wishlists FOR SELECT TO authenticated
  USING (partner_link_id = get_accepted_partner_link_id(auth.uid()));

-- Users can delete their own items
CREATE POLICY "Users can delete own wishlist items"
  ON public.wishlists FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Store quiz answers
CREATE TABLE public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  partner_link_id uuid NOT NULL REFERENCES public.partner_links(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, partner_link_id)
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own quiz answers"
  ON public.quiz_answers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can update own quiz answers"
  ON public.quiz_answers FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view shared quiz answers"
  ON public.quiz_answers FOR SELECT TO authenticated
  USING (partner_link_id = get_accepted_partner_link_id(auth.uid()));
