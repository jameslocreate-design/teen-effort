GRANT UPDATE ON public.content_reports TO authenticated;
CREATE POLICY "Admins can update reports" ON public.content_reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.list_my_blocked_users()
RETURNS TABLE(blocked_id uuid, name text, blocked_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.blocked_id, COALESCE(p.name, 'Blocked user'), b.created_at
  FROM public.blocked_users b LEFT JOIN public.profiles p ON p.user_id = b.blocked_id
  WHERE b.blocker_id = auth.uid()
  ORDER BY b.created_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.list_my_blocked_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_blocked_users() TO authenticated;