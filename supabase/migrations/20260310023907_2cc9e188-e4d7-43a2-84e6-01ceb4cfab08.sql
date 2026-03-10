
-- Add rating and photo support to calendar entries
ALTER TABLE public.calendar_entries 
  ADD COLUMN user_rating integer NULL,
  ADD COLUMN is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN photo_urls text[] NULL DEFAULT '{}';

-- Create storage bucket for date photos
INSERT INTO storage.buckets (id, name, public) VALUES ('date-photos', 'date-photos', true);

-- Allow authenticated users to upload to date-photos bucket
CREATE POLICY "Authenticated users can upload date photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'date-photos');

-- Allow anyone to view date photos
CREATE POLICY "Public can view date photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'date-photos');

-- Allow users to delete their own date photos
CREATE POLICY "Users can delete own date photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'date-photos');

-- Add UPDATE policy for calendar entries (needed for rating, favorites, photos)
CREATE POLICY "Users can update shared calendar entries"
ON public.calendar_entries FOR UPDATE TO authenticated
USING (partner_link_id = get_accepted_partner_link_id(auth.uid()));
