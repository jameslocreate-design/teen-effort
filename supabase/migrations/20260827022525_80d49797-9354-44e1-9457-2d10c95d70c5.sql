ALTER TABLE public.date_reviews ADD COLUMN IF NOT EXISTS partner_link_id uuid;

UPDATE public.date_reviews
SET partner_link_id = public.get_accepted_partner_link_id(user_id)
WHERE partner_link_id IS NULL;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.date_reviews;
CREATE POLICY "Users can view own and partner reviews"
ON public.date_reviews FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (partner_link_id IS NOT NULL AND partner_link_id = public.get_accepted_partner_link_id(auth.uid()))
);

DROP POLICY IF EXISTS "Users can create reviews" ON public.date_reviews;
CREATE POLICY "Users can create reviews"
ON public.date_reviews FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (partner_link_id IS NULL OR partner_link_id = public.get_accepted_partner_link_id(auth.uid()))
);

DROP POLICY IF EXISTS "Anyone can view posts" ON public.expert_posts;
CREATE POLICY "Users can view own and partner posts"
ON public.expert_posts FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view replies" ON public.expert_replies;
CREATE POLICY "Users can view replies on own posts"
ON public.expert_replies FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.expert_posts p WHERE p.id = expert_replies.post_id AND p.user_id = auth.uid()));

REVOKE ALL ON public.date_reviews FROM anon;
REVOKE ALL ON public.expert_posts FROM anon;
REVOKE ALL ON public.expert_replies FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.date_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expert_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expert_replies TO authenticated;
GRANT ALL ON public.date_reviews TO service_role;
GRANT ALL ON public.expert_posts TO service_role;
GRANT ALL ON public.expert_replies TO service_role;