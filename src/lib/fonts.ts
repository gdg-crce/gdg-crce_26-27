import {
  Shrikhand,
  Plus_Jakarta_Sans,
  Righteous,
  Space_Grotesk,
  Special_Elite,
  Share_Tech_Mono,
  Orbitron,
  Outfit,
  Cormorant_Garamond,
  Inter,
  IBM_Plex_Mono,
} from 'next/font/google';

// 1970s Typography: Groovy Serif + Warm Sans
export const shrikhand = Shrikhand({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-70s-display',
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-70s-body',
});

// 1980s Typography: Retro Synth Display + Futuristic Tech Body
export const righteous = Righteous({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-88s-display',
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-88s-body',
});

// 1990s Typography: Grunge Typewriter + Mono Space System
export const specialElite = Special_Elite({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-90s-display',
});

export const shareTechMono = Share_Tech_Mono({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-90s-body',
});

// 2000s Typography: Cyber/Glossy Display + Clean Modern Sans
export const orbitron = Orbitron({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-00s-display',
});

export const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-00s-body',
});

// Premium Luxury Portfolio Typography
export const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-editorial-display',
});

export const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-editorial-body',
});

// Y2K Archive Typography: technical monospaced archive feel (IE6 / TheFacebook era)
export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
});

// Map of era fonts to make it easy to apply dynamically based on current era
export const eraFonts = {
  '1970s': {
    display: shrikhand.className,
    body: jakarta.className,
  },
  '1980s': {
    display: righteous.className,
    body: spaceGrotesk.className,
  },
  '1990s': {
    display: specialElite.className,
    body: shareTechMono.className,
  },
  '2000s': {
    display: orbitron.className,
    body: outfit.className,
  },
};
