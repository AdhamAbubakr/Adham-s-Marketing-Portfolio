-- =============================================================================
-- Barkar OS — Team access to Content pipeline (Phase 5)
-- =============================================================================
-- Lets active team members see + work the content pipeline in their portal.
-- Single-tenant agency model: the agency's own active team collaborates on content.
-- Run AFTER knowledge-base-schema.sql (additive, idempotent).
-- =============================================================================

-- helper: is the current user an active team member?
CREATE OR REPLACE FUNCTION public.is_active_team()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE auth_user_id = auth.uid() AND status = 'active'
  );
$$;

-- ---- content_items ----
DROP POLICY IF EXISTS "Team reads content" ON public.content_items;
CREATE POLICY "Team reads content" ON public.content_items FOR SELECT TO authenticated
  USING (public.is_active_team());

DROP POLICY IF EXISTS "Team updates content" ON public.content_items;
CREATE POLICY "Team updates content" ON public.content_items FOR UPDATE TO authenticated
  USING (public.is_active_team()) WITH CHECK (public.is_active_team());

DROP POLICY IF EXISTS "Team creates content" ON public.content_items;
CREATE POLICY "Team creates content" ON public.content_items FOR INSERT TO authenticated
  WITH CHECK (public.is_active_team());

-- ---- content_files (creative roles attach assets) ----
DROP POLICY IF EXISTS "Team reads content files" ON public.content_files;
CREATE POLICY "Team reads content files" ON public.content_files FOR SELECT TO authenticated
  USING (public.is_active_team());

DROP POLICY IF EXISTS "Team adds content files" ON public.content_files;
CREATE POLICY "Team adds content files" ON public.content_files FOR INSERT TO authenticated
  WITH CHECK (public.is_active_team());

-- ---- content_comments (collaboration notes) ----
DROP POLICY IF EXISTS "Team reads content comments" ON public.content_comments;
CREATE POLICY "Team reads content comments" ON public.content_comments FOR SELECT TO authenticated
  USING (public.is_active_team());

DROP POLICY IF EXISTS "Team adds content comments" ON public.content_comments;
CREATE POLICY "Team adds content comments" ON public.content_comments FOR INSERT TO authenticated
  WITH CHECK (public.is_active_team());
