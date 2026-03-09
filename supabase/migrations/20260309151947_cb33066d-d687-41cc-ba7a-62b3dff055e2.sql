
-- Allow admins to view all profiles for user management
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any expert post for moderation
CREATE POLICY "Admins can delete any post"
ON public.expert_posts
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete any expert reply for moderation
CREATE POLICY "Admins can delete any reply"
ON public.expert_replies
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
