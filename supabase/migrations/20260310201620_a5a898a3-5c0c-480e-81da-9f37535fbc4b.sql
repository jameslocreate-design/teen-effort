
-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid,
  referral_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT TO authenticated
  WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "Anyone can update referral on signup"
  ON public.referrals FOR UPDATE TO authenticated
  USING (true);

-- Date reviews (public, viewable by all authenticated users)
CREATE TABLE public.date_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  venue_name text NOT NULL,
  venue_type text,
  location text,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  date_type text,
  cost_range text,
  would_recommend boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.date_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON public.date_reviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create reviews"
  ON public.date_reviews FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reviews"
  ON public.date_reviews FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add referral_code to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE DEFAULT substr(md5((random())::text), 1, 6);
