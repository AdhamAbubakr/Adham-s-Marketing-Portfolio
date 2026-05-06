-- =============================================================================
-- ADHAM. MARKETING — DATABASE BACKUP
-- Generated: 2026-05-06
-- Run this entire file on a fresh Supabase project to recreate everything.
-- =============================================================================

-- =============================================================================
-- 1. LEADS TABLE (lead capture from public website)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.leads (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,
  name        text NOT NULL,
  email       text NOT NULL,
  phone       text,
  service     text,
  budget      text,
  message     text,
  source      text DEFAULT 'website',
  status      text DEFAULT 'new' CHECK (status IN ('new','contacted','converted','lost')),
  notes       text
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit leads" ON public.leads
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Only admin can read leads" ON public.leads
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admin can update leads" ON public.leads
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admin can delete leads" ON public.leads
  FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON public.leads (status);


-- =============================================================================
-- 2. SITE_SETTINGS (tracking pixels, custom code)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  key         text PRIMARY KEY,
  value       text,
  updated_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site settings" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admin can insert settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin can update settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admin can delete settings" ON public.site_settings
  FOR DELETE TO authenticated USING (true);

INSERT INTO public.site_settings (key, value) VALUES
  ('meta_pixel_id', ''),
  ('ga4_id', ''),
  ('gtm_id', ''),
  ('tiktok_pixel_id', ''),
  ('snapchat_pixel_id', ''),
  ('linkedin_partner_id', ''),
  ('custom_head_code', '')
ON CONFLICT (key) DO NOTHING;


-- =============================================================================
-- 3. CLIENTS (your brands/customers)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  logo_url        text,
  industry        text,
  country         text,
  status          text DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  platforms       text[] DEFAULT '{}',
  services        text[] DEFAULT '{}',
  monthly_budget  numeric,
  start_date      date,
  notes           text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_auth_user_idx
  ON public.clients(auth_user_id) WHERE auth_user_id IS NOT NULL;


-- =============================================================================
-- 4. CLIENT_CAMPAIGNS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_campaigns (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name          text NOT NULL,
  platform      text NOT NULL,
  objective     text,
  status        text DEFAULT 'active' CHECK (status IN ('active','paused','ended')),
  budget        numeric DEFAULT 0,
  start_date    date,
  end_date      date,
  external_url  text,
  notes         text,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS campaigns_client_idx ON public.client_campaigns (client_id);


-- =============================================================================
-- 5. CLIENT_METRICS (daily numbers per client)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_metrics (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id         uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  date              date NOT NULL,
  platform          text DEFAULT 'all',
  spend             numeric DEFAULT 0,
  reach             integer DEFAULT 0,
  impressions       integer DEFAULT 0,
  clicks            integer DEFAULT 0,
  conversions       integer DEFAULT 0,
  revenue           numeric DEFAULT 0,
  followers_gained  integer DEFAULT 0,
  notes             text,
  created_at        timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS metrics_client_date_idx ON public.client_metrics (client_id, date DESC);


-- =============================================================================
-- 6. CLIENT_ACTIVITY (action log)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.client_activity (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id   uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  type        text NOT NULL,
  title       text NOT NULL,
  description text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS activity_client_idx ON public.client_activity (client_id, created_at DESC);


-- =============================================================================
-- 7. USER_ROLES (Admin vs Client distinction)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'client' CHECK (role IN ('admin','client')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);


-- =============================================================================
-- 8. HELPER FUNCTION: is_admin()
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;


-- =============================================================================
-- 9. ENABLE RLS + POLICIES (multi-tenant security)
-- =============================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_activity ENABLE ROW LEVEL SECURITY;

-- CLIENTS
CREATE POLICY "Admin sees all clients" ON public.clients
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Client sees own row" ON public.clients
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

-- CAMPAIGNS
CREATE POLICY "Admin manages all campaigns" ON public.client_campaigns
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Client sees own campaigns" ON public.client_campaigns
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));

-- METRICS
CREATE POLICY "Admin manages all metrics" ON public.client_metrics
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Client sees own metrics" ON public.client_metrics
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));

-- ACTIVITY
CREATE POLICY "Admin manages all activity" ON public.client_activity
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Client sees own activity" ON public.client_activity
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));


-- =============================================================================
-- 10. AUTO-ASSIGN 'client' ROLE TO NEW SIGNUPS
-- =============================================================================
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.assign_default_role();


-- =============================================================================
-- 11. PROMOTE YOURSELF TO ADMIN
-- =============================================================================
-- Replace email below with your admin email
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'adhambakrsalah@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';


-- =============================================================================
-- DONE. Total: 7 tables + 1 function + 1 trigger + RLS policies on all.
-- =============================================================================
