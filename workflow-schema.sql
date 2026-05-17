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
