
-- Posts table for relationship questions
CREATE TABLE public.expert_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  anonymous_name TEXT NOT NULL DEFAULT 'Anonymous',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view all posts
CREATE POLICY "Anyone can view posts" ON public.expert_posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create posts" ON public.expert_posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own posts" ON public.expert_posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Replies table
CREATE TABLE public.expert_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.expert_posts(id) ON DELETE CASCADE,
  user_id UUID,
  content TEXT NOT NULL,
  is_ai BOOLEAN NOT NULL DEFAULT false,
  anonymous_name TEXT NOT NULL DEFAULT 'Anonymous',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expert_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view replies" ON public.expert_replies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create replies" ON public.expert_replies
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR is_ai = true);

CREATE POLICY "Users can delete own replies" ON public.expert_replies
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.expert_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expert_replies;
