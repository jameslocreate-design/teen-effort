
-- Vision Board: shared pins for dreams, destinations, goals
CREATE TABLE public.vision_board_pins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_link_id uuid NOT NULL,
  added_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'dream_date',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vision_board_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared vision board"
  ON public.vision_board_pins FOR SELECT TO authenticated
  USING (partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can add to vision board"
  ON public.vision_board_pins FOR INSERT TO authenticated
  WITH CHECK (added_by = auth.uid() AND partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can delete own pins"
  ON public.vision_board_pins FOR DELETE TO authenticated
  USING (added_by = auth.uid());

-- Appreciation Prompts: track sent appreciations
CREATE TABLE public.appreciation_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_link_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  prompt_text text NOT NULL,
  response_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appreciation_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shared appreciations"
  ON public.appreciation_prompts FOR SELECT TO authenticated
  USING (partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can send appreciations"
  ON public.appreciation_prompts FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND partner_link_id = get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can delete own appreciations"
  ON public.appreciation_prompts FOR DELETE TO authenticated
  USING (sender_id = auth.uid());
