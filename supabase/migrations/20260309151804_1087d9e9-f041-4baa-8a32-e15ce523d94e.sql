
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: Only admins can view user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin stats view for dashboard analytics
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_partner_links', (SELECT COUNT(*) FROM public.partner_links WHERE status = 'accepted'),
    'total_calendar_entries', (SELECT COUNT(*) FROM public.calendar_entries),
    'total_bucket_items', (SELECT COUNT(*) FROM public.bucket_list),
    'total_saved_gifts', (SELECT COUNT(*) FROM public.saved_gifts),
    'total_expert_posts', (SELECT COUNT(*) FROM public.expert_posts),
    'total_expert_replies', (SELECT COUNT(*) FROM public.expert_replies),
    'users_this_week', (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '7 days'),
    'users_this_month', (SELECT COUNT(*) FROM public.profiles WHERE created_at > now() - interval '30 days'),
    'recent_signups', (
      SELECT json_agg(row_to_json(p))
      FROM (SELECT name, created_at, zipcode, gender FROM public.profiles ORDER BY created_at DESC LIMIT 10) p
    )
  ) INTO result;

  RETURN result;
END;
$$;
