/**
 * The page's one scroll lock.
 *
 * ── Why `document.body.style.overflow = 'hidden'` is not a scroll lock here ──
 * It looks like one and it is what every act used to write directly, but this
 * page is scrolled by **Lenis**, and the two do not meet:
 *
 *   - `overflow: hidden` stops the *user* scrolling a box. It does NOT stop the
 *     box being scrolled **programmatically** — a hidden-overflow box is still
 *     a scroll container, and `scrollTo()` / `scrollTop` still move it.
 *   - Lenis never scrolls natively. It listens for `wheel`/`touchmove`,
 *     integrates them into a virtual target, and then *programmatically*
 *     scrolls the document from its rAF loop.
 *
 * So the wheel keeps firing, Lenis keeps integrating, and it scrolls the page
 * straight through the "lock". Measured, not theorised: with
 * `body { overflow: hidden }` set for the whole preloader, six wheel ticks
 * during the loader put `window.scrollY` at 720 — far enough past the hero's
 * `IRIS_VH` (0.8 x vh) that the intro's iris ScrollTrigger had already run to
 * progress 1 and set the hero `visibility: hidden` *before the loader's zoom
 * had even landed*. The film then played its full 18.1s into a hidden element,
 * which is the "the video is blank after the zoom" bug.
 *
 * A real lock therefore has to do both things:
 *   - `lenis.stop()`  — Lenis then `preventDefault()`s wheel/touch and drops
 *                       it, so nothing accumulates while the lock is held, and
 *                       `start()` calls `reset()`, which snaps its virtual
 *                       target back onto the real scroll position. No queued
 *                       momentum is released at the moment of unlock.
 *   - `overflow: hidden` — still needed, because Lenis does not own the
 *                       keyboard (space, PageDown, arrows) or the scrollbar.
 *
 * ── Why it is owner-counted ─────────────────────────────────────────────────
 * Two components want the lock at overlapping times, and the naive version had
 * them writing the same one global string: the hero set
 * `overflow = 'hidden'` when the film started, and 60ms later the preloader
 * unmounted and its cleanup ran `overflow = ''`, wiping a lock it did not take.
 * Locks are keyed by owner, and the page stays locked until the last owner
 * lets go.
 */

interface Scroller {
  start(): void;
  stop(): void;
  scrollTo(
    target: number | string | HTMLElement,
    options?: {
      immediate?: boolean;
      force?: boolean;
      lock?: boolean;
      duration?: number;
      easing?: (t: number) => number;
      onComplete?: () => void;
    },
  ): void;
}

let scroller: Scroller | null = null;
const owners = new Set<string>();

/** Previous inline value, so unlocking restores rather than blanks it. */
let previousOverflow: string | null = null;

function apply() {
  if (typeof document === 'undefined') return;

  if (owners.size > 0) {
    if (previousOverflow === null) previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    scroller?.stop();
    return;
  }

  if (previousOverflow !== null) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = null;
  }
  scroller?.start();
}

/**
 * Hand the page's smooth-scroll instance to the lock.
 *
 * Called from `SmoothScrollProvider`, whose effect runs *after* its children's
 * — React commits child effects first — so the preloader has usually taken the
 * lock before this runs. `apply()` therefore re-runs on registration rather
 * than assuming an unlocked page.
 */
export function registerScroller(instance: Scroller | null) {
  scroller = instance;
  apply();
}

export function lockScroll(owner: string) {
  owners.add(owner);
  apply();
}

/**
 * Release one owner's lock.
 *
 * `resetToTop` snaps the page (and Lenis's virtual target with it) to 0 before
 * the lock comes off. The intro needs that: it is the moment the loader hands
 * over to a film that must start from a page that has not moved.
 */
export function unlockScroll(owner: string, resetToTop = false) {
  owners.delete(owner);
  if (resetToTop && owners.size === 0 && typeof window !== 'undefined') {
    window.scrollTo(0, 0);
    scroller?.scrollTo(0, { immediate: true, force: true });
  }
  apply();
}

/**
 * Animate the page to `y` — the programmatic counterpart of a user scroll.
 *
 * Goes through the registered scroller rather than `window.scrollTo`, for the
 * same reason the lock does: Lenis owns a *virtual* scroll position and
 * rewrites the real one from its rAF loop every frame, so a native smooth
 * scroll would be overwritten before it was visible.
 *
 * `force: true` is set because callers here are transitions, not navigation:
 * the intro can be mid-lock when the film ends, and a reveal that silently
 * does nothing because someone else holds the lock is worse than one that
 * runs.
 *
 * Returns a **cancel** function. Call it the moment the user takes over.
 *
 * Cancelling is not cosmetic, and the reason is narrower than it looks. A wheel
 * takes care of itself: Lenis's own wheel handler starts a fresh `scrollTo`,
 * which replaces the running animation. But Lenis does not own the **keyboard**
 * or a **native touch scroll** (`syncTouch` is off here) — and a running Lenis
 * animation rewrites the document's scroll position every single frame, so
 * those inputs get overwritten as fast as the browser applies them and the page
 * simply refuses to move.
 *
 * ── and cancelling has exactly one working spelling ─────────────────────────
 * The obvious `scrollTo(animatedScroll, { immediate: true })` is a **no-op**,
 * measured: for a *programmatic* scroll Lenis does not park `targetScroll` at
 * the destination, it rewrites `targetScroll = animatedScroll = value` on every
 * frame of the animation. So asking it to jump to `animatedScroll` trips its
 * own `if (target === this.targetScroll) return` guard, which sits **above** the
 * `immediate` branch — it returns having stopped nothing, and the reveal drives
 * serenely on over the top of the user.
 *
 * `stop()` is the one that lands: it goes through `reset()`, which calls
 * `animate.stop()` and snaps Lenis's bookkeeping onto `actualScroll` — the
 * pixel the document is genuinely at, so nothing moves. `apply()` then puts the
 * scroller back into whatever state the *lock* says it should be in, rather
 * than assuming it should be running.
 */
export function smoothScrollTo(
  y: number,
  {
    duration = 2,
    easing,
    onComplete,
  }: { duration?: number; easing?: (t: number) => number; onComplete?: () => void } = {},
): () => void {
  if (typeof window === 'undefined') return () => {};

  const instance = scroller;
  if (instance) {
    instance.scrollTo(y, { duration, easing, force: true, onComplete });
    return () => {
      instance.stop();
      apply();
    };
  }

  // No scroller registered yet (the provider mounts after its children). Native
  // smooth scroll is the honest fallback; an instant scrollTo cancels it.
  window.scrollTo({ top: y, behavior: 'smooth' });
  return () => window.scrollTo(window.scrollX, window.scrollY);
}
