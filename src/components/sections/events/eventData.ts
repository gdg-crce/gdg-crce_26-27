import { ik } from '@/lib/imagekit';

/* -----------------------------------------------------------------------------
   EVENT POSTERS — one set of artwork, two presentations.

   The alleyway wall (desktop) and the swipe carousel (mobile) used to hold
   separate poster lists: the wall pointed at six square `/elements/poster-N.png`
   placeholders while mobile showed the four real `/events/N.png` designs. Same
   section, different posters, depending on your screen. There is now one list —
   `eventPosters` — and both surfaces read from it.

   Add an event here and it appears on the wall and in the carousel.
   -------------------------------------------------------------------------- */

export interface EventPoster {
  id: string;
  title: string;
  subtitle: string;
  /**
   * Raw public path. The wall wraps this in ik(); mobile hands it straight to
   * next/image, whose loader appends its own transforms.
   */
  posterImage: string;
}

export const eventPosters: EventPoster[] = [
  {
    id: 'evt-1',
    title: 'CRCE HACK 2026',
    subtitle: 'Retro Tech Hackathon',
    posterImage: '/events/1.png',
  },
  {
    id: 'evt-2',
    title: 'AGENT SESSIONS',
    subtitle: 'AI Workshop Series',
    posterImage: '/events/2.png',
  },
  {
    id: 'evt-3',
    title: 'DEVFEST 2026',
    subtitle: 'Build the Future',
    posterImage: '/events/3.png',
  },
  {
    id: 'evt-4',
    title: 'BYTE CLUB',
    subtitle: 'Weekly Code Jams',
    posterImage: '/events/4.png',
  },
];

/** The mobile carousel shows the artwork one card at a time, unmodified. */
export const mobileEvents = eventPosters;

export interface GDGEvent {
  id: string;
  title: string;
  subtitle: string;
  posterImage: string;
  /**
   * [x, y, z] position on wall. z sits at 0.012 — 12mm, the thickness of paste
   * and paper. It was 0.11 (eleven centimetres) only to clear the wall's old
   * displacement map; with the wall flat, a poster that floats a hand's width
   * off the brick and casts a drop shadow is the loudest CG tell in the frame.
   */
  position: [number, number, number];
  /** Slight tilt in radians for organic wheat-paste feel */
  rotation: number;
  /**
   * Sheet size multiplier. 1.0 is a ~3.4m-TALL sheet — height is the fixed
   * dimension and width follows the artwork's own aspect, so swapping in a
   * poster of a different shape cannot squash it. See EventPoster3D.
   */
  scale: number;
}

/**
 * Where sheets are pasted along the wall's X axis (-23 to 23).
 *
 * Nine placements, four designs. They cycle, and that is deliberate on two
 * counts. Mechanically, the camera walk is choreographed against nine posters —
 * `LAST_POSTER_P = 0.968` centres the final one at x ≈ 21.5, and thinning the
 * wall to four would leave long dead stretches mid-walk. Visually, a bill
 * crew slaps the same sheet up three or four times down a run; a wall where
 * every poster is unique is the tell that nobody actually pasted it.
 *
 * Positions, rotations and scales are unchanged from when these were nine
 * separate placeholder events. Only the artwork on them has changed.
 */
const WALL_PLACEMENTS: Array<Pick<GDGEvent, 'position' | 'rotation' | 'scale'>> = [
  { position: [-22.5, 2.4, 0.012], rotation: -0.02, scale: 1.05 },
  { position: [-17.2, 2.3, 0.012], rotation: 0.025, scale: 0.98 },
  { position: [-11.8, 2.5, 0.012], rotation: 0.015, scale: 1.1 },
  { position: [-6.5, 2.25, 0.012], rotation: -0.035, scale: 0.95 },
  { position: [-1.0, 2.45, 0.012], rotation: 0.02, scale: 1.02 },
  { position: [4.5, 2.55, 0.012], rotation: -0.015, scale: 1.0 },
  { position: [10.2, 2.3, 0.012], rotation: -0.028, scale: 1.06 },
  { position: [15.8, 2.48, 0.012], rotation: 0.018, scale: 1.0 },
  { position: [21.5, 2.35, 0.012], rotation: 0.01, scale: 1.04 },
];

export const events: GDGEvent[] = WALL_PLACEMENTS.map((placement, i) => {
  const poster = eventPosters[i % eventPosters.length];
  return {
    // The wall slot is the identity here, not the event — the same event is up
    // on the wall more than once, so ids have to stay unique per sheet.
    id: `wall-${i + 1}`,
    title: poster.title,
    subtitle: poster.subtitle,
    // w-1024 is inert until NEXT_PUBLIC_IMAGEKIT_URL is set, at which point it
    // stops the wall pulling ~2.5MB PNGs for a texture that is never sampled
    // above 1k. The source art is 1179×1579.
    posterImage: ik(poster.posterImage, 'w-1024'),
    ...placement,
  };
});
