
CREATE TABLE public.saved_date_ideas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost TEXT,
  duration TEXT,
  vibe TEXT,
  distance_miles TEXT,
  yelp_rating NUMERIC,
  yelp_review_count INTEGER,
  yelp_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_date_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved ideas" ON public.saved_date_ideas FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own saved ideas" ON public.saved_date_ideas FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own saved ideas" ON public.saved_date_ideas FOR DELETE TO authenticated USING (user_id = auth.uid());
