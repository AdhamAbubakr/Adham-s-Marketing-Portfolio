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
