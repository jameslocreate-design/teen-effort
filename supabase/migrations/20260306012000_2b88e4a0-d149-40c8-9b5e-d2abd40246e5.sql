
CREATE TABLE public.bucket_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_link_id UUID NOT NULL REFERENCES public.partner_links(id) ON DELETE CASCADE,
  added_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bucket_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared bucket list"
  ON public.bucket_list FOR SELECT
  TO authenticated
  USING (partner_link_id = public.get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can add to bucket list"
  ON public.bucket_list FOR INSERT
  TO authenticated
  WITH CHECK (added_by = auth.uid() AND partner_link_id = public.get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can update shared bucket list"
  ON public.bucket_list FOR UPDATE
  TO authenticated
  USING (partner_link_id = public.get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can delete from bucket list"
  ON public.bucket_list FOR DELETE
  TO authenticated
  USING (partner_link_id = public.get_accepted_partner_link_id(auth.uid()));
