-- Fix 1: expert_replies INSERT policy - remove is_ai bypass
DROP POLICY IF EXISTS "Users can create replies" ON public.expert_replies;
CREATE POLICY "Users can create replies" ON public.expert_replies
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Fix 2: Add trigger to force is_ai = false on user inserts (service role bypasses RLS but not triggers, so we check role)
CREATE OR REPLACE FUNCTION public.enforce_ai_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only service_role can set is_ai = true
  IF NEW.is_ai = true AND current_setting('role') != 'service_role' THEN
    NEW.is_ai := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_ai_flag_trigger
  BEFORE INSERT ON public.expert_replies
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ai_flag();

-- Fix 3: date-photos storage - add ownership check on INSERT
DROP POLICY IF EXISTS "Authenticated users can upload date photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload date photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'date-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Fix 4: date-photos storage - add ownership check on DELETE
DROP POLICY IF EXISTS "Users can delete own date photos" ON storage.objects;
CREATE POLICY "Users can delete own date photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'date-photos' AND (storage.foldername(name))[1] = auth.uid()::text);