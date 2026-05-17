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
-- NOTE: clients table columns are name / contact_email / contact_name
DROP VIEW IF EXISTS public.contracts_full;
CREATE VIEW public.contracts_full AS
  SELECT
    c.*,
    cl.name           AS business_name,
    cl.contact_email  AS client_email,
    cl.contact_name   AS client_default_name
  FROM public.contracts c
  LEFT JOIN public.clients cl ON cl.id = c.client_id;

GRANT SELECT ON public.contracts_full TO authenticated;
