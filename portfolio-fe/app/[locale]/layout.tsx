import type { Metadata } from 'next';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/lib/i18n/routing';
import { QueryProvider } from '@/components/providers/query-provider';
import { CursorGlowProvider } from '@/components/providers/CursorGlowProvider';
import { LenisProvider } from '@/components/providers/LenisProvider';
import { AnalyticsProvider } from '@/components/providers/AnalyticsProvider';
import { Navbar } from '@/components/ui/Navbar';
import { Toaster } from 'sonner';
import '../globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Developer Portfolio | Premium 3D Experience',
    template: '%s | Developer Portfolio',
  },
  description:
    'A premium developer portfolio showcasing interactive 3D experiences, cutting-edge projects, and full-stack expertise.',
  keywords: ['developer', 'portfolio', 'full-stack', 'react', 'nextjs', '3d', 'typescript'],
  authors: [{ name: 'Trương Việt' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: 'Developer Portfolio',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale (Req 19.1)
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Load messages for the current locale (Req 19.3)
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full antialiased" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground overflow-x-hidden"
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages} locale={locale}>
          <QueryProvider>
            <LenisProvider>
            <AnalyticsProvider>
            <CursorGlowProvider>
              {/* Skip to main content link for keyboard/screen reader users (Req 25.2) */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-background focus:font-semibold"
              >
                Skip to main content
              </a>

              {/* Navbar landmark */}
              <Navbar />

              {/* Main content landmark (Req 25.5) */}
              <main id="main-content" className="flex-1">
                {children}
              </main>

              {/* Footer landmark */}
              <footer
                role="contentinfo"
                className="border-t border-border py-8 px-6 text-center"
              >
                <p className="text-muted text-sm">
                  © {new Date().getFullYear()} Trương Việt. Built with Next.js, React Three Fiber &amp; GSAP.
                </p>
              </footer>

              {/* Toast notifications (Req 12.9) */}
              <Toaster
                position="bottom-right"
                toastOptions={{
                  style: {
                    background: '#080a12',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e6edf3',
                  },
                }}
              />
            </CursorGlowProvider>
            </AnalyticsProvider>
            </LenisProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
