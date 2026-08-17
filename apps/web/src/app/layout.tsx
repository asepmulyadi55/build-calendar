import type { Metadata } from 'next';
import { Archivo, IBM_Plex_Mono, Instrument_Sans } from 'next/font/google';
import { en } from '@/lib/i18n/en';
import './globals.css';

// The three families named in design/assets/ds.css. Self-hosted by next/font at
// build time, so no request leaves the browser for a font.
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-display-loaded',
  display: 'swap',
});

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body-loaded',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-loaded',
  display: 'swap',
});

/**
 * Defaults every page inherits. Individual pages override title and description;
 * everything else — site name, locale, canonical base — is set once here.
 *
 * `id_ID` is the locale even though the copy is English: the audience is
 * Indonesian and that is what a crawler and a share preview should report.
 */
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: `${en.app.name} — ${en.app.tagline}`,
    template: `%s — ${en.app.name}`,
  },
  description: en.app.description,
  applicationName: en.app.name,
  openGraph: {
    siteName: en.app.name,
    locale: 'id_ID',
    type: 'website',
    title: en.app.name,
    description: en.app.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: en.app.name,
    description: en.app.description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
