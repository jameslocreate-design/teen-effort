DROP VIEW IF EXISTS public.expert_posts_public;
CREATE VIEW public.expert_posts_public
WITH (security_invoker = true) AS
SELECT id, content, anonymous_name, created_at,
  CASE WHEN user_id = auth.uid() THEN user_id ELSE NULL END AS user_id
FROM public.expert_posts;