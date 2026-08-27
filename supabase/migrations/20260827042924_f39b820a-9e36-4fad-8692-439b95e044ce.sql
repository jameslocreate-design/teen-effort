DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd IN ('SELECT','ALL')
      AND (COALESCE(qual,'') LIKE '%date-photos%' OR COALESCE(qual,'') LIKE '%avatars%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Date photos viewable by owner and linked partner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'date-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = public.get_partner_user_id(auth.uid())::text
  )
);

CREATE POLICY "Avatars viewable by owner and linked partner"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = public.get_partner_user_id(auth.uid())::text
  )
);

CREATE POLICY "Users can delete their own date photos v2"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'date-photos' AND (storage.foldername(name))[1] = auth.uid()::text);