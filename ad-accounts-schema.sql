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
