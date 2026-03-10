
DROP POLICY "Anyone can update referral on signup" ON public.referrals;
CREATE POLICY "Users can claim referral"
  ON public.referrals FOR UPDATE TO authenticated
  USING (referred_id IS NULL OR referred_id = auth.uid());
