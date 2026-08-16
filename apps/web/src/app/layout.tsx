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

export const metadata: Metadata = {
  title: en.app.name,
  description: en.app.tagline,
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
