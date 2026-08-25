import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import {
  shrikhand,
  spaceGrotesk,
  specialElite,
  shareTechMono,
  orbitron,
  outfit,
  ibmPlexMono,
  cormorantGaramond,
  kaushanScript,
  pacifico,
  vt323,
  pressStart2P,
} from '@/lib/fonts';
import SmoothScrollProvider from '@/components/providers/SmoothScrollProvider';

export const metadata: Metadata = {
  title: 'GDG CRCE — Google Developer Group',
  description: 'Embark on a scrolling journey through college developer history with GDG CRCE: travel from the analog 1970s to the Y2K glossy cyber 2000s.',
  keywords: ['GDG', 'GDG CRCE', 'Google Developer Group', 'college tech council', 'developers club', 'programming'],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Origin of the ImageKit CDN, if configured. Used only to emit resource hints
// so the first image/video byte lands faster; null in the local-fallback mode.
const IMAGEKIT_ORIGIN = (() => {
  const url = process.env.NEXT_PUBLIC_IMAGEKIT_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${shrikhand.variable} ${spaceGrotesk.variable} ${specialElite.variable} ${shareTechMono.variable} ${orbitron.variable} ${outfit.variable} ${ibmPlexMono.variable} ${cormorantGaramond.variable} ${kaushanScript.variable} ${pacifico.variable} ${vt323.variable} ${pressStart2P.variable} h-full antialiased`}
    >
      {IMAGEKIT_ORIGIN && (
        <head>
          {/* Warm the ImageKit connection early. One preconnect, for images —
              the second (crossOrigin) one existed for hls.js segment fetches
              and opened a whole extra connection nothing uses now that video
              is local. */}
          <link rel="preconnect" href={IMAGEKIT_ORIGIN} />
          <link rel="dns-prefetch" href={IMAGEKIT_ORIGIN} />
        </head>
      )}
      <body className="min-h-full flex flex-col bg-[#23252C] selection:bg-red-800 selection:text-white">
        <SmoothScrollProvider>
          {children}
        </SmoothScrollProvider>
        <Analytics />
      </body>
    </html>
  );
}
