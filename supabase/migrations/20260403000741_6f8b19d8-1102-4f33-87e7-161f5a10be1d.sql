
CREATE TABLE public.roulette_date_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost TEXT,
  duration TEXT,
  vibe TEXT,
  yelp_url TEXT,
  yelp_rating NUMERIC,
  yelp_review_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.roulette_date_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roulette ideas" ON public.roulette_date_ideas FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can add roulette ideas" ON public.roulette_date_ideas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete roulette ideas" ON public.roulette_date_ideas FOR DELETE TO authenticated USING (user_id = auth.uid());
