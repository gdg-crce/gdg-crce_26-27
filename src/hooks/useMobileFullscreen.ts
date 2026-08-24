'use client';

import { useEffect } from 'react';

/**
 * Take the phone's whole screen, once, on the viewer's first touch.
 *
 * ── The problem ─────────────────────────────────────────────────────────────
 * A phone browser's viewport is not a fixed size. The URL bar collapses as you
 * scroll down and comes back as you scroll up, and on Android the system
 * navigation bar can appear and disappear underneath it. Every one of those is
 * a change to `window.innerHeight` MID-SCROLL.
 *
 * This site is full of full-viewport layers that are sized once and then
 * animated — pinned stages, fixed overlays, a scroll timeline measured in
 * viewport heights. When the viewport grows underneath one of those, whatever
 * is behind it shows through along the bottom edge: the black box.
 *
 * Fullscreen removes the cause rather than compensating for it. There is no
 * browser chrome left to collapse, so the viewport stops moving.
 *
 * ── Why it hangs off a gesture ──────────────────────────────────────────────
 * `requestFullscreen()` needs transient activation — it cannot be called on
 * load, and a page that tried would simply be rejected. The activation-granting
 * events are `keydown`, `mousedown`, `pointerdown`, `pointerup`, `touchend`;
 * scrolling does NOT grant it, and `touchmove` never will.
 *
 * `touchend` is the one that matters, and it is why this works in practice
 * without asking the viewer for anything: a touch scroll is
 * touchstart → touchmove → touchend, so the first flick anyone gives the page
 * ends in an activation. They are in fullscreen before the first act is over
 * and were never shown a button.
 *
 * ── What it deliberately does not do ────────────────────────────────────────
 * If the viewer leaves fullscreen — swipe down, back gesture, Esc — that is
 * their decision and this does not drag them back on the next tap. One entry
 * per page load.
 *
 * ── iOS ─────────────────────────────────────────────────────────────────────
 * iOS Safari does not implement the Fullscreen API for anything but a <video>.
 * There is no workaround and this hook cannot help there: it detects the
 * absence and does nothing rather than throwing. iPhones keep their moving
 * viewport, which is why the layers this protects must still be correct
 * WITHOUT it — see the visualViewport listener in EventsAndCouncilSection.
 * This is a second line of defence, not the only one.
 */

const MOBILE_QUERY = '(max-width: 767px)';

/** The events that grant transient activation, per the HTML spec's
 *  "activation triggering input event". Anything not on this list cannot
 *  authorise a fullscreen request no matter how deliberate it looks. */
const ACTIVATION_EVENTS = ['touchend', 'pointerup', 'click', 'keydown'] as const;

interface VendorElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}

interface VendorDocument extends Document {
  webkitFullscreenElement?: Element | null;
}

export default function useMobileFullscreen(): void {
  useEffect(() => {
    const root = document.documentElement as VendorElement;
    const doc = document as VendorDocument;

    // Nothing to do on a desktop, and nothing POSSIBLE on iOS Safari.
    if (!root.requestFullscreen && !root.webkitRequestFullscreen) return;
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const isFullscreen = () => Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);

    /* `navigationUI: 'hide'` is a request, not a command — it asks the browser
       to drop its own chrome as well as the system bars. Browsers that do not
       honour it ignore the key; browsers that do not know the options object
       are the prefixed ones, which take no arguments at all. */
    const requestFullscreen = (): Promise<void> => {
      if (root.requestFullscreen) {
        return root.requestFullscreen({ navigationUI: 'hide' });
      }
      return Promise.resolve(root.webkitRequestFullscreen?.());
    };

    let settled = false;

    const detach = () => {
      for (const type of ACTIVATION_EVENTS) {
        window.removeEventListener(type, attempt, true);
      }
    };

    function attempt() {
      if (settled || isFullscreen()) return;
      /* Not `settled = true` here. A request can be refused — an insecure
         context, a permissions policy, an activation the browser decided had
         already been consumed — and burning the one attempt on a refusal would
         mean the viewer never gets fullscreen for the rest of the session.
         Only a RESOLVED promise proves we are in. */
      requestFullscreen()
        .then(() => {
          settled = true;
          detach();
        })
        .catch(() => {});
    }

    /* The viewer's own exit. Once they have left, stop asking. */
    const onFullscreenChange = () => {
      if (isFullscreen()) {
        settled = true;
        detach();
      } else if (settled) {
        detach();
      }
    };

    for (const type of ACTIVATION_EVENTS) {
      window.addEventListener(type, attempt, { capture: true, passive: true });
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);

    return () => {
      detach();
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
    };
  }, []);
}
