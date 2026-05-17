import { getRequestConfig } from 'next-intl/server';

// Blueprint §16 — Arabic + English from Phase 0. Default locale: ar.
export const locales = ['ar', 'en'] as const;
export const defaultLocale = 'ar';
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => {
  const safe = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
  return {
    locale: safe,
    messages: (await import(`../messages/${safe}.json`)).default
  };
});
