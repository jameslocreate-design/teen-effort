
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  age INTEGER,
  gender TEXT,
  partner_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Partner links table
CREATE TABLE public.partner_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user2_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_link CHECK (user1_id != user2_id),
  CONSTRAINT unique_pair UNIQUE (user1_id, user2_id)
);

ALTER TABLE public.partner_links ENABLE ROW LEVEL SECURITY;

-- Shared calendar entries
CREATE TABLE public.calendar_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_link_id UUID REFERENCES public.partner_links(id) ON DELETE CASCADE NOT NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  estimated_cost TEXT,
  duration TEXT,
  vibe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_entries ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is in an accepted partner link
CREATE OR REPLACE FUNCTION public.get_accepted_partner_link_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.partner_links
  WHERE status = 'accepted'
    AND (_user_id = user1_id OR _user_id = user2_id)
  LIMIT 1;
$$;

-- Helper: get partner's user_id
CREATE OR REPLACE FUNCTION public.get_partner_user_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN user1_id = _user_id THEN user2_id
    ELSE user1_id
  END
  FROM public.partner_links
  WHERE status = 'accepted'
    AND (_user_id = user1_id OR _user_id = user2_id)
  LIMIT 1;
$$;

-- Trigger for auto-creating profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_links_updated_at
  BEFORE UPDATE ON public.partner_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies: profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid() OR user_id = public.get_partner_user_id(auth.uid()));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies: partner_links
CREATE POLICY "Users can view own links"
  ON public.partner_links FOR SELECT
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can create links as initiator"
  ON public.partner_links FOR INSERT
  WITH CHECK (user1_id = auth.uid());

CREATE POLICY "Users can update links they're part of"
  ON public.partner_links FOR UPDATE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can delete links they're part of"
  ON public.partner_links FOR DELETE
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

-- RLS Policies: calendar_entries
CREATE POLICY "Users can view shared calendar"
  ON public.calendar_entries FOR SELECT
  USING (partner_link_id = public.get_accepted_partner_link_id(auth.uid()));

CREATE POLICY "Users can add to shared calendar"
  ON public.calendar_entries FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND partner_link_id = public.get_accepted_partner_link_id(auth.uid())
  );

CREATE POLICY "Users can delete own calendar entries"
  ON public.calendar_entries FOR DELETE
  USING (added_by = auth.uid());
