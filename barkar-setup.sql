-- =============================================================================
-- 🧠 BARKAR OS — COMPLETE DATABASE SETUP (ONE FILE)
-- =============================================================================
-- Run this ENTIRE file ONCE in Supabase → SQL Editor.
-- It is idempotent: safe to re-run anytime (IF NOT EXISTS / DROP..CREATE / ON CONFLICT).
-- Prerequisite: the base schema (clients, team_members, user_roles, is_admin())
-- from database-backup.sql must already exist (your app already uses it).
-- Order: phase4-8 -> delete-user-fix -> contract-workflow -> ad-accounts -> workflow -> ai-tools
-- =============================================================================


-- ####################################################################### --
-- ##  SECTION: phase4-8-schema.sql
-- ####################################################################### --

-- =============================================================================
-- BARKAR. — PHASES 4 + 5 + 6 + 7 + 8 DATABASE SCHEMA
-- Safe to re-run multiple times (idempotent).
-- Run this on Supabase SQL Editor.
-- =============================================================================

-- =============================================================================
-- PHASE 4 — CONTENT OPERATIONS (Calendar + Files + Approvals + Comments)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.content_items (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title           text NOT NULL,
  caption         text,
  hashtags        text,
  platform        text NOT NULL,
  content_type    text DEFAULT 'post' CHECK (content_type IN ('post','story','reel','short','ad','carousel','video')),
  scheduled_date  date,
  scheduled_time  time,
  status          text DEFAULT 'draft' CHECK (status IN ('draft','review','approved','scheduled','published','rejected')),
  assigned_to     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           text,
  client_feedback text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS content_client_idx ON public.content_items(client_id);
CREATE INDEX IF NOT EXISTS content_scheduled_idx ON public.content_items(scheduled_date);
CREATE INDEX IF NOT EXISTS content_status_idx ON public.content_items(status);

CREATE TABLE IF NOT EXISTS public.content_files (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id    uuid REFERENCES public.content_items(id) ON DELETE CASCADE NOT NULL,
  file_url      text NOT NULL,
  storage_path  text,
  file_type     text,
  file_name     text,
  file_size     bigint,
  thumbnail_url text,
  uploaded_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS content_files_idx ON public.content_files(content_id);

CREATE TABLE IF NOT EXISTS public.content_comments (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id  uuid REFERENCES public.content_items(id) ON DELETE CASCADE NOT NULL,
  author_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text,
  message     text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS content_comments_idx ON public.content_comments(content_id, created_at DESC);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages content" ON public.content_items;
CREATE POLICY "Admin manages content" ON public.content_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manages content files" ON public.content_files;
CREATE POLICY "Admin manages content files" ON public.content_files FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manages content comments" ON public.content_comments;
CREATE POLICY "Admin manages content comments" ON public.content_comments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Client reads own content" ON public.content_items;
CREATE POLICY "Client reads own content" ON public.content_items
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
    AND status IN ('review','approved','scheduled','published','rejected')
  );

DROP POLICY IF EXISTS "Client approves own content" ON public.content_items;
CREATE POLICY "Client approves own content" ON public.content_items
  FOR UPDATE TO authenticated
  USING (
    client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
    AND status = 'review'
  );

DROP POLICY IF EXISTS "Client reads own content files" ON public.content_files;
CREATE POLICY "Client reads own content files" ON public.content_files
  FOR SELECT TO authenticated
  USING (content_id IN (
    SELECT id FROM public.content_items
    WHERE client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Client manages own content comments" ON public.content_comments;
CREATE POLICY "Client manages own content comments" ON public.content_comments
  FOR ALL TO authenticated
  USING (content_id IN (
    SELECT id FROM public.content_items
    WHERE client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  ))
  WITH CHECK (content_id IN (
    SELECT id FROM public.content_items
    WHERE client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid())
  ));

-- =============================================================================
-- PHASE 5 — TEAM PORTAL + TASKS + TIME TRACKING
-- =============================================================================

ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role IN ('admin','client','team'));

CREATE TABLE IF NOT EXISTS public.team_members (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id  uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name     text NOT NULL,
  role_title    text,
  email         text,
  phone         text,
  country       text,
  skills        text[] DEFAULT '{}',
  hourly_rate   numeric,
  status        text DEFAULT 'active' CHECK (status IN ('active','paused','offboarded')),
  joined_at     date DEFAULT CURRENT_DATE,
  notes         text,
  avatar_url    text,
  portfolio_url text,
  created_at    timestamptz DEFAULT now() NOT NULL,
  updated_at    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS team_status_idx ON public.team_members(status);

CREATE TABLE IF NOT EXISTS public.tasks (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  content_id      uuid REFERENCES public.content_items(id) ON DELETE SET NULL,
  assigned_to     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  type            text DEFAULT 'general' CHECK (type IN ('design','video','copy','seo','ads','social','strategy','development','general')),
  priority        text DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status          text DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done','blocked')),
  due_date        date,
  started_at      timestamptz,
  completed_at    timestamptz,
  estimated_hours numeric,
  actual_hours    numeric,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_client_idx ON public.tasks(client_id);

CREATE TABLE IF NOT EXISTS public.time_logs (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id           uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  team_member_id    uuid REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  start_time        timestamptz NOT NULL,
  end_time          timestamptz,
  duration_minutes  integer,
  notes             text,
  created_at        timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS time_logs_member_idx ON public.time_logs(team_member_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages team" ON public.team_members;
CREATE POLICY "Admin manages team" ON public.team_members FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Team reads own row" ON public.team_members;
CREATE POLICY "Team reads own row" ON public.team_members FOR SELECT TO authenticated USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Team updates own row" ON public.team_members;
CREATE POLICY "Team updates own row" ON public.team_members FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Public sees active team" ON public.team_members;
CREATE POLICY "Public sees active team" ON public.team_members
  FOR SELECT TO anon, authenticated
  USING (status = 'active');

DROP POLICY IF EXISTS "Team self-insert profile" ON public.team_members;
CREATE POLICY "Team self-insert profile" ON public.team_members
  FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Admin manages tasks" ON public.tasks;
CREATE POLICY "Admin manages tasks" ON public.tasks FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Team reads own tasks" ON public.tasks;
CREATE POLICY "Team reads own tasks" ON public.tasks FOR SELECT TO authenticated USING (assigned_to = auth.uid());

DROP POLICY IF EXISTS "Team updates own tasks" ON public.tasks;
CREATE POLICY "Team updates own tasks" ON public.tasks FOR UPDATE TO authenticated USING (assigned_to = auth.uid());

DROP POLICY IF EXISTS "Admin manages time logs" ON public.time_logs;
CREATE POLICY "Admin manages time logs" ON public.time_logs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Team manages own time" ON public.time_logs;
CREATE POLICY "Team manages own time" ON public.time_logs FOR ALL TO authenticated
  USING (team_member_id IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()))
  WITH CHECK (team_member_id IN (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid()));

-- Allow self-update of role to 'team' on signup (so client can become team)
DROP POLICY IF EXISTS "User sets own role" ON public.user_roles;
CREATE POLICY "User sets own role" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- PHASE 6 — CONTRACTS + INVOICES
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id                uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title                    text NOT NULL,
  type                     text DEFAULT 'retainer' CHECK (type IN ('retainer','project','one-time','custom')),
  content                  text,
  total_value              numeric,
  currency                 text DEFAULT 'USD',
  status                   text DEFAULT 'draft' CHECK (status IN ('draft','sent','signed','expired','cancelled')),
  sent_at                  timestamptz,
  signed_by_admin_at       timestamptz,
  signed_by_client_at      timestamptz,
  signature_admin_data     text,
  signature_client_data    text,
  signature_client_ip      text,
  pdf_url                  text,
  expires_at               date,
  created_at               timestamptz DEFAULT now() NOT NULL,
  updated_at               timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS contracts_client_idx ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS contracts_status_idx ON public.contracts(status);

CREATE TABLE IF NOT EXISTS public.invoices (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id       uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  contract_id     uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  invoice_number  text UNIQUE NOT NULL,
  amount          numeric NOT NULL,
  currency        text DEFAULT 'USD',
  description     text,
  due_date        date,
  status          text DEFAULT 'pending' CHECK (status IN ('draft','pending','paid','overdue','cancelled')),
  paid_at         timestamptz,
  payment_method  text,
  payment_proof   text,
  pdf_url         text,
  created_at      timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS invoices_client_idx ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON public.invoices(status);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages contracts" ON public.contracts;
CREATE POLICY "Admin manages contracts" ON public.contracts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Client reads own contracts" ON public.contracts;
CREATE POLICY "Client reads own contracts" ON public.contracts FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()) AND status IN ('sent','signed'));

DROP POLICY IF EXISTS "Client signs own contract" ON public.contracts;
CREATE POLICY "Client signs own contract" ON public.contracts FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Admin manages invoices" ON public.invoices;
CREATE POLICY "Admin manages invoices" ON public.invoices FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Client reads own invoices" ON public.invoices;
CREATE POLICY "Client reads own invoices" ON public.invoices FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));

-- =============================================================================
-- PHASE 8 — NOTIFICATIONS + AUDIT LOG
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type        text NOT NULL,
  title       text NOT NULL,
  message     text,
  link        text,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS notif_user_idx ON public.notifications(user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User reads own notifications" ON public.notifications;
CREATE POLICY "User reads own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "User updates own notifications" ON public.notifications;
CREATE POLICY "User updates own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin creates notifications" ON public.notifications;
CREATE POLICY "Admin creates notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  text,
  action      text NOT NULL,
  entity_type text,
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_user_idx ON public.audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_entity_idx ON public.audit_log(entity_type, entity_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin reads audit log" ON public.audit_log;
CREATE POLICY "Admin reads audit log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated writes audit log" ON public.audit_log;
CREATE POLICY "Authenticated writes audit log" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- DONE — Schema is now safe to re-run multiple times.
-- =============================================================================


-- ####################################################################### --
-- ##  SECTION: delete-user-fix.sql
-- ####################################################################### --

-- =============================================================================
-- Delete user completely (auth + roles + team + clients) — admin only
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_completely(target_email text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Only admins can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Find user
  SELECT id INTO v_user_id FROM auth.users WHERE email = target_email LIMIT 1;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Delete from app tables first (cascade will handle rest)
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  DELETE FROM public.team_members WHERE auth_user_id = v_user_id;
  DELETE FROM public.clients WHERE auth_user_id = v_user_id;

  -- Finally delete from auth
  DELETE FROM auth.users WHERE id = v_user_id;

  RETURN json_build_object('success', true, 'deleted_email', target_email);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_completely(text) TO authenticated;


-- ####################################################################### --
-- ##  SECTION: contract-workflow.sql
-- ####################################################################### --

-- =============================================================================
-- Barkar Contract Workflow — Schema Additions
-- =============================================================================
-- Run this in Supabase SQL Editor AFTER phase4-8-schema.sql
-- =============================================================================

-- 1. Add new columns to contracts table for the full workflow
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS services            jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS clauses             text,
  ADD COLUMN IF NOT EXISTS contract_number     text,
  ADD COLUMN IF NOT EXISTS client_full_name    text,
  ADD COLUMN IF NOT EXISTS client_id_number    text,
  ADD COLUMN IF NOT EXISTS client_address      text,
  ADD COLUMN IF NOT EXISTS client_phone        text,
  ADD COLUMN IF NOT EXISTS signed_pdf_url      text,
  ADD COLUMN IF NOT EXISTS client_acknowledgment text,
  ADD COLUMN IF NOT EXISTS is_unlocked         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS team_member_ids     jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS execution_unlocked  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_verified_at   timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes         text;

-- 2. Expand status check to support new states
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_status_check;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN (
    'draft',              -- being prepared by admin
    'sent',               -- sent to client (PDF emailed)
    'awaiting_upload',    -- client downloaded, hasn't uploaded signed copy yet
    'client_signed',      -- client uploaded signed PDF, awaiting admin verification
    'verified',           -- admin verified signed copy → portal unlocked
    'team_assigned',      -- client picked team, admin confirmed
    'active',             -- execution started
    'expired',
    'cancelled'
  ));

-- 3. Auto-generate contract_number on insert (BARK-2026-0001 style)
CREATE OR REPLACE FUNCTION public.set_contract_number()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_year text;
  v_count int;
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    v_year := to_char(now(), 'YYYY');
    SELECT COUNT(*) + 1 INTO v_count FROM public.contracts WHERE contract_number LIKE 'BARK-' || v_year || '-%';
    NEW.contract_number := 'BARK-' || v_year || '-' || lpad(v_count::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contracts_set_number ON public.contracts;
CREATE TRIGGER contracts_set_number
  BEFORE INSERT ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_contract_number();

-- 4. RLS: clients can read + update their own contracts (to upload signed PDF)
DROP POLICY IF EXISTS "Client reads own contracts" ON public.contracts;
CREATE POLICY "Client reads own contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Client uploads signed pdf" ON public.contracts;
CREATE POLICY "Client uploads signed pdf" ON public.contracts
  FOR UPDATE TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()))
  WITH CHECK (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));

-- 5. RLS: team members can read contracts where they're assigned
DROP POLICY IF EXISTS "Team reads assigned contracts" ON public.contracts;
CREATE POLICY "Team reads assigned contracts" ON public.contracts
  FOR SELECT TO authenticated
  USING (
    team_member_ids ? (SELECT id::text FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- 6. Storage bucket for contract PDFs (signed + unsigned)
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- 7. Storage RLS for the 'contracts' bucket
DROP POLICY IF EXISTS "Client uploads to own folder" ON storage.objects;
CREATE POLICY "Client uploads to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'contracts'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Authenticated read contracts bucket" ON storage.objects;
CREATE POLICY "Authenticated read contracts bucket" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contracts');

DROP POLICY IF EXISTS "Admin updates any contract file" ON storage.objects;
CREATE POLICY "Admin updates any contract file" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts' AND public.is_admin())
  WITH CHECK (bucket_id = 'contracts' AND public.is_admin());

DROP POLICY IF EXISTS "Admin deletes any contract file" ON storage.objects;
CREATE POLICY "Admin deletes any contract file" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contracts' AND public.is_admin());

-- Public read so PDF links emailed to clients work even if they're not logged in
DROP POLICY IF EXISTS "Public read contracts bucket" ON storage.objects;
CREATE POLICY "Public read contracts bucket" ON storage.objects
  FOR SELECT TO anon
  USING (bucket_id = 'contracts');

-- 8. Helper view for admin dashboard — contracts with client info
CREATE OR REPLACE VIEW public.contracts_full AS
  SELECT
    c.*,
    cl.business_name,
    cl.email AS client_email,
    cl.full_name AS client_default_name
  FROM public.contracts c
  LEFT JOIN public.clients cl ON cl.id = c.client_id;

GRANT SELECT ON public.contracts_full TO authenticated;


-- ####################################################################### --
-- ##  SECTION: ad-accounts-schema.sql
-- ####################################################################### --

-- =============================================================================
-- Barkar — Ad Accounts System (per-client, per-platform dashboards)
-- =============================================================================
-- Run this in Supabase SQL Editor AFTER phase4-8-schema.sql + contract-workflow.sql
-- =============================================================================

-- 1. AD_ACCOUNTS — every connected ad account (one per platform per client)
CREATE TABLE IF NOT EXISTS public.ad_accounts (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id           uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  platform            text NOT NULL CHECK (platform IN (
    'meta','google','tiktok','snapchat','x','linkedin','pinterest','youtube','other'
  )),
  account_name        text NOT NULL,
  external_account_id text,
  currency            text DEFAULT 'USD',
  status              text DEFAULT 'active' CHECK (status IN ('active','paused','disconnected','archived')),
  integration_type    text DEFAULT 'manual_import' CHECK (integration_type IN ('manual_import','csv_import','oauth','api_token','mcp')),
  team_member_ids     jsonb DEFAULT '[]'::jsonb,
  monthly_budget      numeric,
  notes               text,
  last_sync_at        timestamptz,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ad_accounts_client_idx ON public.ad_accounts(client_id);
CREATE INDEX IF NOT EXISTS ad_accounts_platform_idx ON public.ad_accounts(platform);

-- 2. AD_ACCOUNT_METRICS — daily metrics per ad account
CREATE TABLE IF NOT EXISTS public.ad_account_metrics (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_account_id     uuid REFERENCES public.ad_accounts(id) ON DELETE CASCADE NOT NULL,
  date              date NOT NULL,
  spend             numeric DEFAULT 0,
  impressions       bigint DEFAULT 0,
  reach             bigint DEFAULT 0,
  frequency         numeric,
  clicks            bigint DEFAULT 0,
  link_clicks       bigint DEFAULT 0,
  ctr               numeric,
  cpc               numeric,
  cpm               numeric,
  cpa               numeric,
  conversions       bigint DEFAULT 0,
  conversion_value  numeric DEFAULT 0,
  roas              numeric,
  video_views       bigint DEFAULT 0,
  engagements       bigint DEFAULT 0,
  campaign_name     text,
  ad_set_name       text,
  notes             text,
  source            text DEFAULT 'manual',
  imported_from     uuid,
  created_at        timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ad_metrics_account_date_idx ON public.ad_account_metrics(ad_account_id, date DESC);
CREATE INDEX IF NOT EXISTS ad_metrics_campaign_idx ON public.ad_account_metrics(ad_account_id, campaign_name);

-- 3. AD_ACCOUNT_IMPORTS — log every CSV import for audit
CREATE TABLE IF NOT EXISTS public.ad_account_imports (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_account_id      uuid REFERENCES public.ad_accounts(id) ON DELETE CASCADE NOT NULL,
  imported_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  imported_by_name   text,
  file_name          text,
  file_url           text,
  rows_imported      integer DEFAULT 0,
  rows_skipped       integer DEFAULT 0,
  date_range_start   date,
  date_range_end     date,
  total_spend        numeric DEFAULT 0,
  status             text DEFAULT 'success' CHECK (status IN ('processing','success','partial','failed')),
  error_message      text,
  raw_columns        jsonb,
  column_mapping     jsonb,
  created_at         timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ad_imports_account_idx ON public.ad_account_imports(ad_account_id, created_at DESC);

-- 4. ROW LEVEL SECURITY
ALTER TABLE public.ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_account_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_account_imports ENABLE ROW LEVEL SECURITY;

-- Admin full access
DROP POLICY IF EXISTS "Admin manages ad accounts" ON public.ad_accounts;
CREATE POLICY "Admin manages ad accounts" ON public.ad_accounts FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manages ad metrics" ON public.ad_account_metrics;
CREATE POLICY "Admin manages ad metrics" ON public.ad_account_metrics FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin manages ad imports" ON public.ad_account_imports;
CREATE POLICY "Admin manages ad imports" ON public.ad_account_imports FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Client read-only on their own ad accounts + metrics
DROP POLICY IF EXISTS "Client reads own ad accounts" ON public.ad_accounts;
CREATE POLICY "Client reads own ad accounts" ON public.ad_accounts FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));

DROP POLICY IF EXISTS "Client reads own ad metrics" ON public.ad_account_metrics;
CREATE POLICY "Client reads own ad metrics" ON public.ad_account_metrics FOR SELECT TO authenticated
  USING (ad_account_id IN (
    SELECT id FROM public.ad_accounts WHERE client_id IN (
      SELECT id FROM public.clients WHERE auth_user_id = auth.uid()
    )
  ));

-- Team members read accounts they're assigned to + insert/update metrics on those accounts
DROP POLICY IF EXISTS "Team reads assigned ad accounts" ON public.ad_accounts;
CREATE POLICY "Team reads assigned ad accounts" ON public.ad_accounts FOR SELECT TO authenticated
  USING (
    team_member_ids ? (SELECT id::text FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "Team reads assigned ad metrics" ON public.ad_account_metrics;
CREATE POLICY "Team reads assigned ad metrics" ON public.ad_account_metrics FOR SELECT TO authenticated
  USING (
    ad_account_id IN (
      SELECT id FROM public.ad_accounts
      WHERE team_member_ids ? (SELECT id::text FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Team inserts assigned ad metrics" ON public.ad_account_metrics;
CREATE POLICY "Team inserts assigned ad metrics" ON public.ad_account_metrics FOR INSERT TO authenticated
  WITH CHECK (
    ad_account_id IN (
      SELECT id FROM public.ad_accounts
      WHERE team_member_ids ? (SELECT id::text FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Team logs imports on assigned accounts" ON public.ad_account_imports;
CREATE POLICY "Team logs imports on assigned accounts" ON public.ad_account_imports FOR INSERT TO authenticated
  WITH CHECK (
    ad_account_id IN (
      SELECT id FROM public.ad_accounts
      WHERE team_member_ids ? (SELECT id::text FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

DROP POLICY IF EXISTS "Team reads imports on assigned accounts" ON public.ad_account_imports;
CREATE POLICY "Team reads imports on assigned accounts" ON public.ad_account_imports FOR SELECT TO authenticated
  USING (
    ad_account_id IN (
      SELECT id FROM public.ad_accounts
      WHERE team_member_ids ? (SELECT id::text FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    )
  );

-- 5. Helper view for admin dashboard — accounts with latest metric snapshot
CREATE OR REPLACE VIEW public.ad_accounts_with_summary AS
SELECT
  a.*,
  c.name AS client_name,
  c.contact_email AS client_email,
  COALESCE(s.total_spend, 0)        AS total_spend,
  COALESCE(s.total_conversions, 0)  AS total_conversions,
  COALESCE(s.total_revenue, 0)      AS total_revenue,
  s.first_metric_date,
  s.last_metric_date
FROM public.ad_accounts a
LEFT JOIN public.clients c ON c.id = a.client_id
LEFT JOIN LATERAL (
  SELECT
    SUM(spend)             AS total_spend,
    SUM(conversions)       AS total_conversions,
    SUM(conversion_value)  AS total_revenue,
    MIN(date)              AS first_metric_date,
    MAX(date)              AS last_metric_date
  FROM public.ad_account_metrics
  WHERE ad_account_id = a.id
) s ON true;

GRANT SELECT ON public.ad_accounts_with_summary TO authenticated;


-- ####################################################################### --
-- ##  SECTION: workflow-schema.sql
-- ####################################################################### --

-- =============================================================================
-- Barkar OS — Workflow Engine (Phase 2)
-- =============================================================================
-- The spine that links every marketing position together.
-- Each handoff = work delivered from one role to the next in the cycle.
-- Run AFTER phase4-8-schema.sql + contract-workflow.sql + ad-accounts-schema.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.workflow_handoffs (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id        uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  from_role        text,                       -- role key that delivered (nullable for first stage)
  to_role          text NOT NULL,              -- role key that receives the work
  from_member_id   uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  to_member_id     uuid REFERENCES public.team_members(id) ON DELETE SET NULL, -- optional specific assignee
  title            text NOT NULL,
  artifact_type    text DEFAULT 'custom' CHECK (artifact_type IN (
                     'strategy','brief','copy','calendar','assets','landing','store',
                     'organic','campaign','seo','report','custom')),
  artifact_ref     text,                       -- optional id/url to the actual record
  notes            text,
  status           text DEFAULT 'pending' CHECK (status IN (
                     'pending','in_progress','delivered','accepted','blocked')),
  priority         text DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  due_date         date,
  delivered_at     timestamptz,
  accepted_at      timestamptz,
  created_at       timestamptz DEFAULT now() NOT NULL,
  updated_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS wf_handoffs_client_idx  ON public.workflow_handoffs(client_id);
CREATE INDEX IF NOT EXISTS wf_handoffs_to_role_idx  ON public.workflow_handoffs(to_role, status);
CREATE INDEX IF NOT EXISTS wf_handoffs_status_idx   ON public.workflow_handoffs(status);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_wf_handoff()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := now();
  END IF;
  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    NEW.accepted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wf_handoffs_touch ON public.workflow_handoffs;
CREATE TRIGGER wf_handoffs_touch
  BEFORE UPDATE ON public.workflow_handoffs
  FOR EACH ROW EXECUTE FUNCTION public.touch_wf_handoff();

-- ROW LEVEL SECURITY
ALTER TABLE public.workflow_handoffs ENABLE ROW LEVEL SECURITY;

-- Admin: full control
DROP POLICY IF EXISTS "Admin manages handoffs" ON public.workflow_handoffs;
CREATE POLICY "Admin manages handoffs" ON public.workflow_handoffs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Team: read handoffs addressed to MY role OR sent FROM my role
DROP POLICY IF EXISTS "Team reads relevant handoffs" ON public.workflow_handoffs;
CREATE POLICY "Team reads relevant handoffs" ON public.workflow_handoffs FOR SELECT TO authenticated
  USING (
    to_role   = (SELECT role_title FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR from_role = (SELECT role_title FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR to_member_id   = (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR from_member_id = (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- Team: create a handoff (deliver to the next role)
DROP POLICY IF EXISTS "Team creates handoffs" ON public.workflow_handoffs;
CREATE POLICY "Team creates handoffs" ON public.workflow_handoffs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND status = 'active')
  );

-- Team: update a handoff that is addressed to my role (accept / progress / block)
DROP POLICY IF EXISTS "Team updates own-inbox handoffs" ON public.workflow_handoffs;
CREATE POLICY "Team updates own-inbox handoffs" ON public.workflow_handoffs FOR UPDATE TO authenticated
  USING (
    to_role   = (SELECT role_title FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR from_role = (SELECT role_title FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR to_member_id   = (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR from_member_id = (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    to_role   = (SELECT role_title FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR from_role = (SELECT role_title FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR to_member_id   = (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
    OR from_member_id = (SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1)
  );

-- Client: read-only view of their own project's handoffs (progress transparency)
DROP POLICY IF EXISTS "Client reads own handoffs" ON public.workflow_handoffs;
CREATE POLICY "Client reads own handoffs" ON public.workflow_handoffs FOR SELECT TO authenticated
  USING (client_id IN (SELECT id FROM public.clients WHERE auth_user_id = auth.uid()));

-- Admin overview: cycle health per client
CREATE OR REPLACE VIEW public.workflow_cycle_health AS
SELECT
  c.id                              AS client_id,
  c.name                            AS client_name,
  COUNT(h.id)                       AS total_handoffs,
  COUNT(h.id) FILTER (WHERE h.status IN ('pending','in_progress'))  AS open_handoffs,
  COUNT(h.id) FILTER (WHERE h.status = 'blocked')                   AS blocked_handoffs,
  COUNT(h.id) FILTER (WHERE h.status = 'accepted')                  AS done_handoffs,
  MAX(h.updated_at)                 AS last_activity,
  MIN(h.due_date) FILTER (WHERE h.status IN ('pending','in_progress','blocked')) AS next_due
FROM public.clients c
LEFT JOIN public.workflow_handoffs h ON h.client_id = c.id
GROUP BY c.id, c.name;

GRANT SELECT ON public.workflow_cycle_health TO authenticated;


-- ####################################################################### --
-- ##  SECTION: ai-tools-schema.sql
-- ####################################################################### --

-- =============================================================================
-- Barkar OS — AI Toolkit (Phase 3)
-- =============================================================================
-- Per-position AI tool launcher. Each tool maps to one or more role keys.
-- Run AFTER workflow-schema.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_tools (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text UNIQUE NOT NULL,
  name        text NOT NULL,
  url         text NOT NULL,
  icon        text DEFAULT '🤖',          -- emoji (logo_url optional later)
  logo_url    text,
  category    text,
  description text,
  roles       text[] DEFAULT '{}',         -- role keys this tool serves
  sort_order  int DEFAULT 100,
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS ai_tools_roles_idx ON public.ai_tools USING gin(roles);

-- Per-user favorites / quick access
CREATE TABLE IF NOT EXISTS public.user_tool_links (
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tool_id        uuid REFERENCES public.ai_tools(id) ON DELETE CASCADE NOT NULL,
  is_favorite    boolean DEFAULT true,
  last_opened_at timestamptz,
  PRIMARY KEY (user_id, tool_id)
);

-- RLS
ALTER TABLE public.ai_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tool_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone authenticated reads tools" ON public.ai_tools;
CREATE POLICY "Anyone authenticated reads tools" ON public.ai_tools
  FOR SELECT TO authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Admin manages tools" ON public.ai_tools;
CREATE POLICY "Admin manages tools" ON public.ai_tools
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "User manages own tool links" ON public.user_tool_links;
CREATE POLICY "User manages own tool links" ON public.user_tool_links
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- SEED — real tools per marketing position (idempotent via slug)
-- =============================================================================
INSERT INTO public.ai_tools (slug, name, url, icon, category, description, roles, sort_order) VALUES
-- Universal
('chatgpt','ChatGPT','https://chat.openai.com','💬','Assistant','General AI assistant — research, copy, analysis','{strategist,account_manager,copywriter,content_creator,seo_specialist,media_buyer,other}',1),
('claude','Claude','https://claude.ai','🧠','Assistant','Long-form reasoning, analysis, writing','{strategist,account_manager,copywriter,content_creator,web_developer,other}',2),
('perplexity','Perplexity','https://www.perplexity.ai','🔎','Research','AI search with sources — fast market research','{strategist,account_manager,seo_specialist,other}',3),
('notion-ai','Notion AI','https://www.notion.so/product/ai','📔','Productivity','Docs, notes, summaries inside Notion','{account_manager,content_creator,strategist,other}',4),

-- Strategist
('sparktoro','SparkToro','https://sparktoro.com','📡','Audience','Audience intelligence — where they hang out','{strategist}',10),
('answerthepublic','AnswerThePublic','https://answerthepublic.com','❓','Research','What people search around a topic','{strategist,seo_specialist,content_creator}',11),
('crayon','Crayon','https://www.crayon.co','🦎','Competitive','Competitive intelligence tracking','{strategist}',12),

-- Account Manager
('fireflies','Fireflies.ai','https://fireflies.ai','🔥','Meetings','AI meeting notes & action items','{account_manager}',20),
('fathom','Fathom','https://fathom.video','🎥','Meetings','Free AI meeting recorder & summary','{account_manager}',21),
('clickup-ai','ClickUp AI','https://clickup.com/ai','✅','PM','AI inside project management','{account_manager}',22),

-- Copywriter
('jasper','Jasper','https://www.jasper.ai','🟪','Copy','Marketing copy at scale','{copywriter,content_creator}',30),
('copyai','Copy.ai','https://www.copy.ai','✏️','Copy','Ad copy, emails, scripts','{copywriter}',31),
('grammarly','Grammarly','https://www.grammarly.com','🟢','Editing','Grammar, tone, clarity','{copywriter,content_creator,account_manager}',32),
('hemingway','Hemingway Editor','https://hemingwayapp.com','📕','Editing','Tighten & simplify writing','{copywriter}',33),
('writesonic','Writesonic','https://writesonic.com','🦅','Copy','SEO copy & articles','{copywriter,seo_specialist}',34),

-- Content Creator
('lately','Lately AI','https://www.lately.ai','🔁','Repurpose','Turn long content into social posts','{content_creator,social_media_specialist}',40),
('taplio','Taplio','https://taplio.com','🔷','Social','LinkedIn content engine','{content_creator,social_media_specialist}',41),

-- Graphic Designer
('midjourney','Midjourney','https://www.midjourney.com','🖼️','Image Gen','High-end AI image generation','{designer,photographer}',50),
('adobe-firefly','Adobe Firefly','https://www.adobe.com/products/firefly.html','🔥','Image Gen','Commercial-safe generative imaging','{designer,photographer}',51),
('canva','Canva Magic Studio','https://www.canva.com/magic','🎨','Design','Templates + AI design tools','{designer,content_creator,social_media_specialist}',52),
('leonardo','Leonardo.ai','https://leonardo.ai','🗡️','Image Gen','Game/ad-grade AI art','{designer}',53),
('recraft','Recraft','https://www.recraft.ai','✒️','Vector','AI vectors, icons, brand sets','{designer}',54),
('looka','Looka','https://looka.com','🅻','Branding','AI logo & brand kit','{designer}',55),
('khroma','Khroma','https://www.khroma.co','🌈','Color','AI color palette generator','{designer}',56),

-- Video Editor
('runway','Runway','https://runwayml.com','🎞️','Video Gen','AI video generation & editing','{video_editor}',60),
('capcut','CapCut','https://www.capcut.com','✂️','Editing','Fast social video editing','{video_editor,content_creator}',61),
('descript','Descript','https://www.descript.com','🎙️','Editing','Edit video by editing text','{video_editor}',62),
('opusclip','OpusClip','https://www.opus.pro','🔪','Repurpose','Long video → viral shorts','{video_editor,social_media_specialist}',63),
('veed','VEED','https://www.veed.io','🟣','Editing','Online video editor + subtitles','{video_editor}',64),
('heygen','HeyGen','https://www.heygen.com','🧑‍💼','Avatar','AI avatars & video translation','{video_editor}',65),
('pika','Pika','https://pika.art','✨','Video Gen','Text-to-video generation','{video_editor}',66),

-- Photographer
('lightroom','Adobe Lightroom','https://www.adobe.com/products/photoshop-lightroom.html','📷','Editing','AI photo editing & presets','{photographer}',70),
('topaz-photo','Topaz Photo AI','https://www.topazlabs.com/topaz-photo-ai','🦅','Enhance','AI upscale & denoise','{photographer}',71),
('luminar','Luminar Neo','https://skylum.com/luminar','🌅','Editing','AI-powered photo editor','{photographer}',72),
('removebg','remove.bg','https://www.remove.bg','🪄','Utility','Instant background removal','{photographer,designer}',73),
('magnific','Magnific AI','https://magnific.ai','🔬','Upscale','Extreme AI upscaler','{photographer,designer}',74),

-- Social Media Specialist
('vista-social','Vista Social','https://vistasocial.com','📲','Scheduling','Publish, schedule, analytics','{social_media_specialist,content_creator}',80),
('buffer','Buffer','https://buffer.com','📊','Scheduling','Simple social scheduling + AI','{social_media_specialist}',81),
('metricool','Metricool','https://metricool.com','📈','Analytics','Cross-platform analytics & planning','{social_media_specialist,media_buyer}',82),
('predis','Predis.ai','https://predis.ai','🎯','Content','AI social post generator','{social_media_specialist}',83),
('ocoya','Ocoya','https://www.ocoya.com','🐙','Content','AI content + scheduling','{social_media_specialist}',84),

-- SEO Specialist
('semrush','Semrush','https://www.semrush.com','🟧','SEO','Keyword, competitor, audit suite','{seo_specialist}',90),
('ahrefs','Ahrefs','https://ahrefs.com','🔵','SEO','Backlinks & keyword research','{seo_specialist}',91),
('surfer','Surfer SEO','https://surferseo.com','🏄','SEO','Content optimization by SERP','{seo_specialist,copywriter}',92),
('frase','Frase','https://www.frase.io','📝','SEO','SEO content briefs & writing','{seo_specialist,content_creator}',93),
('clearscope','Clearscope','https://www.clearscope.io','🔭','SEO','Content grading vs competitors','{seo_specialist}',94),
('screaming-frog','Screaming Frog','https://www.screamingfrog.co.uk/seo-spider','🐸','Technical','Technical site crawler','{seo_specialist,web_developer}',95),

-- Web Developer
('github-copilot','GitHub Copilot','https://github.com/features/copilot','🐙','Coding','AI pair programmer','{web_developer}',100),
('cursor','Cursor','https://cursor.com','🖱️','Coding','AI-first code editor','{web_developer}',101),
('v0','v0 by Vercel','https://v0.dev','▲','UI Gen','AI UI from a prompt','{web_developer}',102),
('lovable','Lovable','https://lovable.dev','💗','App Gen','Full app from prompt','{web_developer}',103),
('bolt','Bolt.new','https://bolt.new','⚡','App Gen','In-browser AI full-stack builder','{web_developer}',104),

-- Shopify Designer
('shopify-magic','Shopify Magic','https://www.shopify.com/magic','🛍️','E-com','AI inside Shopify admin','{shopify_designer}',110),
('pagefly','PageFly','https://pagefly.io','📄','Builder','Shopify page builder','{shopify_designer}',111),
('instant','Instant','https://instant.so','⚡','Builder','Visual Shopify section builder','{shopify_designer}',112),
('gempages','GemPages','https://gempages.net','💎','Builder','Shopify landing builder','{shopify_designer}',113),

-- WordPress Designer
('elementor-ai','Elementor AI','https://elementor.com/ai','🟥','Builder','AI inside Elementor','{wordpress_designer}',120),
('divi-ai','Divi AI','https://www.elegantthemes.com/documentation/divi/divi-ai','🟪','Builder','AI for Divi theme','{wordpress_designer}',121),
('10web','10Web','https://10web.io','🕸️','Builder','AI WordPress site builder','{wordpress_designer}',122),
('codewp','CodeWP','https://codewp.ai','⌨️','Coding','AI code for WordPress','{wordpress_designer,web_developer}',123),

-- Media Buyer
('meta-ads','Meta Ads Manager','https://www.facebook.com/adsmanager','🟦','Ads','Facebook & Instagram campaigns','{media_buyer}',130),
('google-ads','Google Ads','https://ads.google.com','🔵','Ads','Search, Display, YouTube, PMax','{media_buyer}',131),
('tiktok-ads','TikTok Ads Manager','https://ads.tiktok.com','⚫','Ads','TikTok campaign manager','{media_buyer}',132),
('madgicx','Madgicx','https://madgicx.com','🪄','Optimization','AI ad optimization for Meta','{media_buyer}',133),
('revealbot','Revealbot','https://revealbot.com','🤖','Automation','Auto scale/kill rules','{media_buyer}',134),
('adcreative','AdCreative.ai','https://www.adcreative.ai','🎨','Creative','AI ad creatives + scoring','{media_buyer,designer}',135),
('motion','Motion','https://motionapp.com','📐','Analytics','Creative analytics for ads','{media_buyer}',136),
('triple-whale','Triple Whale','https://www.triplewhale.com','🐳','Attribution','E-com profit & attribution','{media_buyer}',137)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, url=EXCLUDED.url, icon=EXCLUDED.icon,
  category=EXCLUDED.category, description=EXCLUDED.description,
  roles=EXCLUDED.roles, sort_order=EXCLUDED.sort_order, is_active=true;

