CREATE TABLE public.saved_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost TEXT,
  where_to_buy TEXT,
  personalization_tip TEXT,
  vibe TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved gifts"
  ON public.saved_gifts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved gifts"
  ON public.saved_gifts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own saved gifts"
  ON public.saved_gifts FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());