import { ik } from '@/lib/imagekit';

/* -----------------------------------------------------------------------------
   EVENT POSTERS — one set of artwork, two presentations.

   The alleyway wall (desktop) and the swipe carousel (mobile) read ONE list —
   `eventPosters`. They used to hold separate ones, so the same section showed
   different posters depending on your screen.

   Add an event here and it appears on the wall and in the carousel. Add a wall
   placement for it at the same time: it is one sheet per design now, and the
   dev-only check below will shout if the two lists drift apart.

   Artwork lives at `/posters/N.png` on ImageKit and is numbered; the number IS
   the running order. The earlier `/events/N.png` set (four portrait designs)
   and the `/elements/poster-N.png` placeholders before it are both unreferenced
   now — only `/events/eventsmobbg.png` survives, as the mobile background.
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

/* The seven real designs, in the order they were numbered. Order is the whole
   point here — the wall pastes them left to right in exactly this sequence, so
   `posters/3.png` is the third sheet you walk past.

   Titles and subtitles are READ OFF THE ARTWORK, not invented: each poster
   carries its own event name and tagline, and the HUD prints them beside the
   sheet the camera is centred on. If a poster is replaced, re-read the new one
   rather than leaving the old caption pointing at different art.

   The files are 1574×1574 — SQUARE, where the previous set was 1179×1579
   portrait. Both surfaces derive their box from the artwork now, so nothing
   here needs to know that; see the notes in EventPoster3D and on
   `.mobile-event-image-raw`. */
export const eventPosters: EventPoster[] = [
  {
    id: 'evt-1',
    title: 'GENESIS',
    subtitle: 'Where Legacies Find Their First Chapter',
    posterImage: '/posters/1.png',
  },
  {
    id: 'evt-2',
    title: 'FUTURE FORGE',
    subtitle: 'From Navigating College to Forging Your Future',
    posterImage: '/posters/2.png',
  },
  {
    id: 'evt-3',
    title: 'PITCH PERFECT',
    subtitle: 'Idea · Plan · Execute · Repeat',
    posterImage: '/posters/3.png',
  },
  {
    id: 'evt-4',
    title: 'WHAT IF?',
    subtitle: 'Step Into the World of Startups',
    posterImage: '/posters/4.png',
  },
  {
    id: 'evt-6',
    title: 'IDEA CAFE',
    subtitle: "Have an Idea? Let's Upscale",
    posterImage: '/posters/6.png',
  },
  {
    id: 'evt-7',
    title: 'BIT N BUILD',
    subtitle: 'International Hackathon',
    posterImage: '/posters/7.png',
  },
  {
    id: 'evt-5',
    title: 'UNPLUG',
    subtitle: 'By the Lake · 3-Day Startup Launchpad',
    posterImage: '/posters/5.png',
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
 * ONE PLACEMENT PER POSTER — seven slots, seven designs, nothing repeated.
 *
 * This was nine slots cycling four designs (`i % eventPosters.length`), so five
 * of the nine sheets were duplicates. The old note here argued that was good
 * bill-posting: a real crew does slap the same sheet up several times down a
 * run. That is true of a street, and it is not what this wall is for — it is a
 * gallery of the club's actual events, and showing GENESIS three times reads as
 * a bug, not as texture. The list is the source of truth for how many sheets
 * exist; the wall no longer invents extra ones.
 *
 * The span is unchanged and both ends are load-bearing:
 *  - the LAST poster must sit at x ≈ 21.5, because the camera walk ends at
 *    `LAST_POSTER_P = 0.968`, i.e. lerp(-24, 23, 0.968) = 21.5. Move it and the
 *    walk stops centred on bare plaster.
 *  - the FIRST stays at -22.5, just inside the walk's -24 start.
 *
 * Seven across that 44m span puts them ~7.3m apart against ~5.4m before. The
 * sheets got wider at the same time (the new art is square, so a 3.4m-tall
 * sheet is now 3.4m wide instead of 2.54m), which takes most of that back: the
 * gap between neighbours goes 2.9m -> 3.9m rather than doubling. Y, rotation
 * and scale keep the same jitter ranges as before so the run still reads as
 * hand-pasted rather than laid out on a grid.
 */
const WALL_PLACEMENTS: Array<Pick<GDGEvent, 'position' | 'rotation' | 'scale'>> = [
  { position: [-22.5, 2.4, 0.012], rotation: -0.02, scale: 1.05 },
  { position: [-15.4, 2.3, 0.012], rotation: 0.025, scale: 0.98 },
  { position: [-7.6, 2.5, 0.012], rotation: 0.015, scale: 1.06 },
  { position: [-0.5, 2.25, 0.012], rotation: -0.035, scale: 0.95 },
  { position: [7.1, 2.45, 0.012], rotation: 0.02, scale: 1.02 },
  { position: [14.0, 2.55, 0.012], rotation: -0.015, scale: 1.0 },
  { position: [21.5, 2.35, 0.012], rotation: 0.01, scale: 1.04 },
];

if (process.env.NODE_ENV !== 'production' && WALL_PLACEMENTS.length !== eventPosters.length) {
  // Cheap guard for the one mistake this file invites: adding a poster without
  // a slot for it (it silently never appears) or a slot without a poster (it
  // reads `undefined` and the sheet renders untextured).
  console.warn(
    `[eventData] ${eventPosters.length} posters but ${WALL_PLACEMENTS.length} wall placements — they must match, one sheet per design.`
  );
}

export const events: GDGEvent[] = WALL_PLACEMENTS.map((placement, i) => {
  const poster = eventPosters[i];
  return {
    id: `wall-${i + 1}`,
    title: poster.title,
    subtitle: poster.subtitle,
    // w-1024 stops the wall pulling the full 1574² original for a texture that
    // is never sampled above 1k. Seven sheets at ~240KB rather than ~500KB.
    posterImage: ik(poster.posterImage, 'w-1024'),
    ...placement,
  };
});
