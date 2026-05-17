import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n/request';
import { updateSession } from './lib/supabase/middleware';

// Blueprint §6 (auth redirect) + §16 (locale prefix routing /ar /en).
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

export async function middleware(req: NextRequest) {
  // 1. i18n: ensure /ar or /en prefix
  const res = intlMiddleware(req);
  // 2. refresh Supabase session cookie + expose user for route guards
  return updateSession(req, res);
}

export const config = {
  // run on everything except static assets / api
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']
};
