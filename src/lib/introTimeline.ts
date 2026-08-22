/**
 * The intro scroll timeline — one shared ruler for the three components that
 * animate over the first few screens of scroll.
 *
 * `HeroVideoSection` (the iris), `HomeSection` (the title + its knockout zoom)
 * and `AboutSection` (which is revealed *through* that knockout) all read their
 * phase boundaries from here, so none of them can drift out of step. Every
 * number is a multiple of the viewport height, measured in pixels of scroll
 * from the top of the document.
 *
 *   iris   the last frame of the hero video closes to black through a circular
 *          iris — the screen shuts like a camera shutter, from the edges in
 *   title  black screen; "GDG CRCE" fades up
 *   hold   a beat on the title, so the fade has somewhere to land
 *   zoom   the title's letters turn transparent — the About section shows
 *          through them — and the whole thing pushes in until the letters have
 *          swallowed the frame
 *
 * `AboutSection` owns the scroll *after* `total`: it starts its turntable
 * playback at exactly that pixel, so extending any phase here automatically
 * pushes the record back rather than eating into it.
 */

/**
 * Phase lengths, in viewport heights.
 *
 * Kept tight on purpose. An earlier cut ran 0.9/0.8/0.4/1.7 — 3.8 screens, and
 * the knockout did not begin until 2.1 of them had gone by, with a dead 0.4
 * screen of hold in the middle where nothing on screen changed at all. A
 * Tuned for a cinematic, unhurried feel. Each phase now gets enough scroll
 * distance that the viewer can register and enjoy the transition before the
 * next one begins. The total intro is 4.5 screens of scroll.
 */
const IRIS_VH = 0.8;
const TITLE_VH = 0.4;
const HOLD_VH = 0.4;
const ZOOM_VH = 2.0;

export interface IntroPhase {
  start: number;
  end: number;
}

export interface IntroPhases {
  iris: IntroPhase;
  title: IntroPhase;
  hold: IntroPhase;
  zoom: IntroPhase;
  /** Scroll position, in px, where the intro is over and About takes the wheel. */
  total: number;
}

/** Resolve the timeline against a viewport height (px). */
export function introPhases(vh: number): IntroPhases {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const irisVh = isMobile ? 0.6 : IRIS_VH;
  const titleVh = isMobile ? 0.3 : TITLE_VH;
  const holdVh = isMobile ? 0.3 : HOLD_VH;
  const zoomVh = isMobile ? 1.4 : ZOOM_VH; // Smooth zoom on mobile
  const iris = { start: 0, end: irisVh * vh };
  const title = { start: iris.end, end: iris.end + titleVh * vh };
  const hold = { start: title.end, end: title.end + holdVh * vh };
  const zoom = { start: hold.end, end: hold.end + zoomVh * vh };
  return { iris, title, hold, zoom, total: zoom.end };
}

/** Timeline for the current viewport. Safe to call inside a scroll callback —
 *  it is four multiplications, no layout read beyond `innerHeight`.
 *
 *  The `|| 900` is load-bearing, not defensive dressing: a viewport of 0 makes
 *  every phase zero-length, and the first thing a consumer does with a phase is
 *  divide by its length. One frame measured at 0 (a display that has not been
 *  composited yet, a pane opening at zero size) would otherwise write NaN into
 *  a transform and leave the intro stuck there, because NaN never compares its
 *  way back out. */
export function currentIntroPhases(): IntroPhases {
  const vh = typeof window === 'undefined' ? 900 : window.innerHeight;
  return introPhases(vh > 0 ? vh : 900);
}

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Eased ramp: 0 below `a`, 1 above `b`, smoothstep between. */
export const ramp = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
