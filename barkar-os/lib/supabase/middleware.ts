import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';

// Refreshes the Supabase auth session on every request + role-based redirect.
// Blueprint §6 (admin→/admin, team_member→/team/{role}, client→/client) + §12.
export async function updateSession(req: NextRequest, res: NextResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;
  const locale = path.split('/')[1] || 'ar';
  const isAuthPage = /\/(login|signup)$/.test(path);
  const isDashboard = /\/(admin|team|client|hr|director|manager)(\/|$)/.test(path);

  // Not logged in + trying to reach a dashboard → send to login
  if (!user && isDashboard) {
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  // Logged in + on auth page → route by user_type
  if (user && isAuthPage) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, role')
      .eq('id', user.id)
      .single();
    const t = profile?.user_type;
    const dest =
      t === 'admin' ? `/${locale}/admin`
      : t === 'client' ? `/${locale}/client`
      : `/${locale}/team/${profile?.role ?? 'other'}`;
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return res;
}
