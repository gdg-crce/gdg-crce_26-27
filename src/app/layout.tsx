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
  metadataBase: new URL('https://gdgcrce.com'),
  title: 'GDG CRCE — Google Developer Group | Fr. CRCE Mumbai',
  description: 'Official Google Developer Group and student technical council of Fr. Conceicao Rodrigues College of Engineering (CRCE), Mumbai. Fostering developer culture through workshops, hackathons, open-source initiatives, and technical excellence.',
  keywords: [
    'GDG',
    'GDG CRCE',
    'Google Developer Group',
    'Google Developer Groups',
    'GDG On Campus',
    'GDG CRCE Council',
    'Student Council',
    'Tech Council',
    'Developers Club',
    'Fr. Conceicao Rodrigues College of Engineering',
    'CRCE Mumbai',
    'Hackathons',
    'Workshops',
    'Open Source',
  ],
  authors: [{ name: 'GDG CRCE Student Council' }],
  creator: 'GDG CRCE Student Council',
  publisher: 'GDG CRCE',
  alternates: {
    canonical: 'https://gdgcrce.com',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/favicon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://gdgcrce.com',
    siteName: 'GDG CRCE Student Council',
    title: 'GDG CRCE — Google Developer Group | Fr. CRCE Mumbai',
    description: 'Official Google Developer Group and student technical council of Fr. Conceicao Rodrigues College of Engineering (CRCE), Mumbai. Fostering developer culture through workshops, hackathons, open-source initiatives, and technical excellence.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'GDG CRCE — Google Developer Group Student Council',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GDG CRCE — Google Developer Group | Fr. CRCE Mumbai',
    description: 'Official Google Developer Group and student technical council of Fr. Conceicao Rodrigues College of Engineering (CRCE), Mumbai. Fostering developer culture through workshops, hackathons, open-source initiatives, and technical excellence.',
    images: ['/og-image.png'],
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'GDG CRCE',
  alternateName: 'Google Developer Group CRCE',
  url: 'https://gdgcrce.com',
  logo: 'https://gdgcrce.com/icon.png',
  image: 'https://gdgcrce.com/og-image.png',
  description: 'Official Google Developer Group and student technical council of Fr. Conceicao Rodrigues College of Engineering (CRCE), Mumbai. Fostering developer culture through workshops, hackathons, open-source initiatives, and technical excellence.',
  parentOrganization: {
    '@type': 'CollegeOrUniversity',
    name: 'Fr. Conceicao Rodrigues College of Engineering',
    alternateName: 'Fr. CRCE',
  },
  sameAs: [
    'https://www.linkedin.com/company/gdgcrce',
    'https://www.instagram.com/gdgcrce',
  ],
};

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
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />
        <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {IMAGEKIT_ORIGIN && (
          <>
            <link rel="preconnect" href={IMAGEKIT_ORIGIN} />
            <link rel="dns-prefetch" href={IMAGEKIT_ORIGIN} />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col bg-[#23252C] selection:bg-red-800 selection:text-white">
        <SmoothScrollProvider>
          {children}
        </SmoothScrollProvider>
        <Analytics />
      </body>
    </html>
  );
}

