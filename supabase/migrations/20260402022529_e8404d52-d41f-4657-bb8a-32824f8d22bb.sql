
CREATE TABLE public.love_letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_link_id UUID NOT NULL REFERENCES public.partner_links(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.love_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared love letters"
  ON public.love_letters FOR SELECT TO authenticated
  USING (partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can send love letters"
  ON public.love_letters FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can delete own love letters"
  ON public.love_letters FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Recipient can mark as read"
  ON public.love_letters FOR UPDATE TO authenticated
  USING (partner_link_id = get_accepted_partner_link_id(auth.uid()) AND sender_id != auth.uid());
