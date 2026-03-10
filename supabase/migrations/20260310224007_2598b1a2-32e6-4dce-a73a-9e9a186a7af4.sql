
-- Drop the old INSERT policy and create a new one that allows the link target to also insert (for auto-link via URL)
DROP POLICY IF EXISTS "Users can create links as initiator" ON public.partner_links;

CREATE POLICY "Users can create links"
ON public.partner_links
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user1_id OR auth.uid() = user2_id
);
