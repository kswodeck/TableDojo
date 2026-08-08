import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { WakeNotice } from '@/components/wake-notice';

export const metadata: Metadata = {
  metadataBase: new URL('https://tabledojo.com'),
  title: {
    default: 'Table Dojo — learn and practise casino table games',
    template: '%s · Table Dojo',
  },
  description:
    'Learn blackjack, video poker and farkle the right way. Free practice modes with strategy guidance, then ranked play against the leaderboard. Play money only.',
  keywords: ['blackjack trainer', 'basic strategy', 'video poker', 'jacks or better', 'farkle', 'table games', 'card game practice'],
  authors: [{ name: 'Kris Swodeck' }],
  manifest: '/manifest.webmanifest',
  icons: { icon: '/images/casinocompetitor-favicon.png', apple: '/images/casinocompetitor-favicon.png' },
  openGraph: {
    type: 'website',
    siteName: 'Table Dojo',
    title: 'Table Dojo — learn and practise casino table games',
    description: 'Free practice with strategy guidance, then ranked play against the leaderboard.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#072019',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {/* The old layout had no skip link; keyboard users tabbed the whole nav on every page. */}
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-brass-500 focus:px-4 focus:py-2 focus:font-semibold focus:text-felt-950"
          >
            Skip to content
          </a>
          <SiteHeader />
          <WakeNotice />
          <main id="main" className="mx-auto w-full max-w-6xl px-4 py-10">
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
