-- Fix 1: Tighten referrals UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "Users can claim referral" ON public.referrals;
CREATE POLICY "Users can claim referral" ON public.referrals
  FOR UPDATE TO authenticated
  USING ((referred_id IS NULL) OR (referred_id = auth.uid()))
  WITH CHECK (referred_id = auth.uid());

-- Fix 2: Create a view that hides user_id from expert_posts for anonymity
CREATE OR REPLACE VIEW public.expert_posts_public AS
SELECT id, content, anonymous_name, created_at,
  CASE WHEN user_id = auth.uid() THEN user_id ELSE NULL END AS user_id
FROM public.expert_posts;