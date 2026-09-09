ALTER TABLE public.partner_links
  ADD COLUMN IF NOT EXISTS user1_memories_ok boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS user2_memories_ok boolean NOT NULL DEFAULT false;