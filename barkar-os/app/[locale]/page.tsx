import { redirect } from 'next/navigation';

// Root of the OS → send to login. Middleware (lib/supabase/middleware.ts)
// routes authenticated users to their role dashboard. Blueprint §6.
export default function Home({ params: { locale } }: { params: { locale: string } }) {
  redirect(`/${locale}/login`);
}
