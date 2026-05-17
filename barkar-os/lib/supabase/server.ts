import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Server-side Supabase client (RSC / Server Actions). Blueprint §12.
export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* called from RSC — safe to ignore, middleware refreshes */
          }
        }
      }
    }
  );
}
