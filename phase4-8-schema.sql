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
