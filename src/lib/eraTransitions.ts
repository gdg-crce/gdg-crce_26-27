export interface EraColors {
  bg: string;
  primary: string;
  secondary: string;
  text: string;
}

export type EraName = '1970s' | '1980s' | '1990s' | '2000s';

export interface EraConfig {
  name: EraName;
  label: string;
  description: string;
  colors: EraColors;
  breakpoint: number; // scroll progress point (0 to 1) representing the peak of this section
}

export const eras: EraConfig[] = [
  {
    name: '1970s',
    label: 'Analog Origins',
    description: 'Warm film-grain, analog vinyl, and retro disco vibe.',
    colors: {
      bg: '#1A1512',      // Deep rust brown-black background
      primary: '#E8412A', // True disco red
      secondary: '#E0A526', // Warm mustard-gold
      text: '#E8D29F',    // Warm cream
    },
    breakpoint: 0.0,
  },
  {
    name: '1980s',
    label: 'Neon Arcade',
    description: 'Hot pink synthwave, arcade cabinets, and neon glowing scans.',
    colors: {
      bg: '#12111A',      // Near-black synthwave background
      primary: '#FF2E7E', // Hot magenta
      secondary: '#5A4FFF', // Electric indigo
      text: '#00E5C7',    // Neon teal
    },
    breakpoint: 0.25,
  },
  {
    name: '1990s',
    label: 'Grunge System',
    description: 'Muted Windows-95 desktop, pixelated grids, and zine markers.',
    colors: {
      bg: '#0D1420',      // Ink navy background
      primary: '#028A8A', // Windows-95 teal
      secondary: '#7B2FBF', // Signal purple
      text: '#E85D26',    // Safety-orange grunge accent
    },
    breakpoint: 0.5,
  },
  {
    name: '2000s',
    label: 'Glossy Cyber',
    description: 'Y2K optimistic glassmorphism, floating cyber nodes, and glossy forms.',
    colors: {
      bg: '#141C2E',      // Deep cyber navy background
      primary: '#00D4E8', // Y2K chrome cyan
      secondary: '#B4E600', // Hot lime
      text: '#FF3D9A',    // Magenta-pink
    },
    breakpoint: 0.75,
  },
];

// Helper to determine active era based on scroll progress
export function getActiveEra(scrollProgress: number): EraConfig {
  if (scrollProgress < 0.2) return eras[0];
  if (scrollProgress < 0.45) return eras[1];
  if (scrollProgress < 0.7) return eras[2];
  return eras[3];
}
