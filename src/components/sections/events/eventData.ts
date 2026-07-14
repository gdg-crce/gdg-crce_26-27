export interface GDGEvent {
  id: string;
  title: string;
  subtitle: string;
  posterImage: string;
  /** [x, y, z] position on wall. z should be ~0.11 to sit proud of wall surface and high relief. */
  position: [number, number, number];
  /** Slight tilt in radians for organic wheat-paste feel */
  rotation: number;
  /** Poster size multiplier (1.0 = large ~3.1m billboard poster) */
  scale: number;
}

/**
 * Events are positioned along the X axis of the wall (-23 to 23).
 * Large proper posters clustered along the wall at natural eye level.
 */
export const events: GDGEvent[] = [
  {
    id: 'evt-1',
    title: 'CRCE HACK 2026',
    subtitle: 'Retro Tech Hackathon',
    posterImage: '/elements/poster-1.png',
    position: [-22.5, 2.4, 0.11],
    rotation: -0.02,
    scale: 1.05,
  },
  {
    id: 'evt-2',
    title: 'AGENT SESSIONS',
    subtitle: 'AI Workshop Series',
    posterImage: '/elements/poster-2.png',
    position: [-17.2, 2.3, 0.11],
    rotation: 0.025,
    scale: 0.98,
  },
  {
    id: 'evt-3',
    title: 'DEVFEST 2026',
    subtitle: 'Build the Future',
    posterImage: '/elements/poster-3.png',
    position: [-11.8, 2.5, 0.11],
    rotation: 0.015,
    scale: 1.1,
  },
  {
    id: 'evt-4',
    title: 'BYTE CLUB',
    subtitle: 'Weekly Code Jams',
    posterImage: '/elements/poster-4.png',
    position: [-6.5, 2.25, 0.11],
    rotation: -0.035,
    scale: 0.95,
  },
  {
    id: 'evt-5',
    title: 'PIXEL PARTY',
    subtitle: 'Design Workshop',
    posterImage: '/elements/poster-5.png',
    position: [-1.0, 2.45, 0.11],
    rotation: 0.02,
    scale: 1.02,
  },
  {
    id: 'evt-6',
    title: 'NEURAL NIGHTS',
    subtitle: 'ML / AI Deep Dives',
    posterImage: '/elements/poster-6.png',
    position: [4.5, 2.55, 0.11],
    rotation: -0.015,
    scale: 1.0,
  },
  {
    id: 'evt-7',
    title: 'OPEN SOURCE FEST',
    subtitle: 'Contribute & Learn',
    posterImage: '/elements/poster-3.png',
    position: [10.2, 2.3, 0.11],
    rotation: -0.028,
    scale: 1.06,
  },
  {
    id: 'evt-8',
    title: 'RETRO GAME JAM',
    subtitle: '48hr Game Dev Sprint',
    posterImage: '/elements/poster-5.png',
    position: [15.8, 2.48, 0.11],
    rotation: 0.018,
    scale: 1.0,
  },
  {
    id: 'evt-9',
    title: 'TECH TALKS',
    subtitle: 'Speaker Series',
    posterImage: '/elements/poster-4.png',
    position: [21.5, 2.35, 0.11],
    rotation: 0.01,
    scale: 1.04,
  },
];
