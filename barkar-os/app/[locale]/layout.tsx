import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n/request';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Barkar OS',
  description: 'Barkar Marketing Operating System'
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!(locales as readonly string[]).includes(locale)) notFound();
  const messages = await getMessages();
  const dir = locale === 'ar' ? 'rtl' : 'ltr'; // §16 RTL

  return (
    <html lang={locale} dir={dir}>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
