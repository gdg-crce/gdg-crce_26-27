'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/* The album's interior leaves, in the order you turn them. The cover and the
   back cover are NOT in here — they are the book's boards, not photo pages,
   and they carry the seam into this act and the hand-off out of it.
   Add a URL and the page appears; the flip schedule below is derived from the
   list's length, so nothing else needs touching. */
const PAGE_PHOTOS = [
  'https://ik.imagekit.io/9yzb99hnu/gdg-crce/transition/1.png?tr=f-auto,q-auto',
  'https://ik.imagekit.io/9yzb99hnu/gdg-crce/transition/2.png?tr=f-auto,q-auto',
  'https://ik.imagekit.io/9yzb99hnu/gdg-crce/transition/31.png',
  // The last leaf you turn — it lies directly on the back board, so this and
  // FINAL_PHOTO below are the two frames the hand-off to the events act is cut
  // between. Was whatwedo/tech (4).png.
  'https://ik.imagekit.io/9yzb99hnu/gdg-crce/transition/4.png?tr=f-auto,q-auto',
  'https://ik.imagekit.io/9yzb99hnu/gdg-crce/transition/5.png?tr=f-auto,q-auto',
];

/* The final frame — the album's back board, and the shot the deep-dive zoom
   flies INTO to hand over to the events act.

   Its real pixel size lives here because two places need to agree about it and
   they were previously allowed to disagree: the <Image> that renders it, and
   the `targetScale` maths in the frame loop, which works out how far to zoom so
   the photo exactly covers the viewport at the moment the next section takes
   over.

   That maths used a hardcoded 9/16 while the artwork has never been 16:9 — the
   previous file was 2.090:1, this one is 2.196:1. Because the photo is much
   wider than 16:9, its real height is much smaller than the maths assumed, so
   the computed scale fell short: measured at 1280×720, 1920×1080 and 1440×900,
   the photo reached only 81% of the viewport height at the hand-off — a strip
   of album cover left showing along the top and bottom at the exact moment the
   events act is supposed to take over. Driving it from the aspect below puts
   that at 1.000 on every one of those viewports. */
const FINAL_PHOTO = {
  src: '/transition/image.png',
  width: 1915,
  height: 872,
};
const FINAL_PHOTO_ASPECT = FINAL_PHOTO.width / FINAL_PHOTO.height;

/* Flip cascade, in units of `p` (the 0 → 0.80 morph/flip phase remapped to
   0 → 1). FLIP_START clears the opening morph, which owns 0 → 0.20. The
   stagger is whatever is left over once the last leaf's own travel is
   reserved, divided between the pages — so the book always finishes turning
   exactly as the deep-dive zoom begins, at any page count. */
const FLIP_START = 0.2;
const FLIP_SPAN = 0.24;
const Z_STEP = 2;
const flipStagger = (1 - FLIP_START - FLIP_SPAN) / PAGE_PHOTOS.length;

interface PolaroidAlbumSceneProps {
  progressRef: React.RefObject<number>;
  /**
   * The in-flow spacer section, for the frame loop's IntersectionObserver.
   *
   * It cannot observe its own root: this scene lives inside a `position: fixed;
   * inset: 0` overlay, so its root intersects the viewport permanently and the
   * observer said "visible" from first paint to last — the loop ran for the
   * whole session. The spacer is the only element whose position actually
   * tracks where this act is in the page.
   */
  observeRef?: React.RefObject<HTMLElement | null>;
}

export default function PolaroidAlbumScene({ progressRef, observeRef }: PolaroidAlbumSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const rotatorRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  // One slot per photo page, in reading order. An array rather than a ref each,
  // so the page count follows PAGE_PHOTOS instead of the markup.
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const backCoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let running = false;
    let lastP = -1;
    let lastVw = -1;
    let lastVh = -1;

    // Cache the animated DOM nodes ONCE. They were re-queried 5×/frame before —
    // pure waste on the scroll hot path. They are static for the scene's life.
    const root = rootRef.current;
    const container = root?.querySelector('.album-container') as HTMLElement | null;
    const overlay = root?.querySelector('.album-overlay') as HTMLElement | null;
    const binder = root?.querySelector('.spiral-binder') as HTMLElement | null;
    const coverFront = coverRef.current?.querySelector('.cover-front') as HTMLElement | null;
    const glare = coverFront?.querySelector('.cover-glare') as HTMLElement | null;
    // Only touch container.style.animation when the phase actually changes.
    let animState = '';
    let lastShadow = '';

    if (coverFront) coverFront.style.filter = 'none';

    /* The book's laid-out size, measured rather than re-derived.
       This used to be `Math.min(vw * 0.95, 1600) × Math.min(vw * 0.534375, 900)`
       — the stylesheet's formula, copied. Two copies of a layout rule drift the
       moment either is touched, and every frame of the opening morph is built
       on this number: get it wrong and the cover does not start exactly full
       screen, which is precisely the seam the viewer is not supposed to notice.
       offsetWidth/Height ignore the scale transform above it, so this is the
       CSS box itself. */
    let boxW = 1;
    let boxH = 1;
    const measure = () => {
      const wrap = rotatorRef.current;
      if (!wrap) return;
      boxW = wrap.offsetWidth || 1;
      boxH = wrap.offsetHeight || 1;
    };
    measure();

    const draw = () => {
      const rawP = progressRef.current ?? 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (rawP === lastP && vw === lastVw && vh === lastVh) return;
      if (vw !== lastVw || vh !== lastVh) measure();
      lastP = rawP; lastVw = vw; lastVh = vh;

      // The flip/morph animation runs from 0.0 to 0.80
      const p = Math.min(1, rawP / 0.80);
      // The deep dive zoom animation runs from 0.80 to 1.0
      const zoomP = Math.max(0, (rawP - 0.80) / 0.20);

      // Phase 1: The Morph (Extended to 0.20 for a luxurious, slow unraveling)
      // Scale that makes the closed book exactly cover the viewport — the frame
      // the still has to arrive on. The book's ratio is the still's ratio, so
      // this crops rather than stretches.
      const maxStartScale = Math.max(vw / boxW, vh / boxH);

      const morphProgress = smooth(0.0, 0.20, p);

      // Cinematic easing curve (Cubic in-out) for a magical, breathless float
      const easeInOutCubic = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const cinematicMorph = easeInOutCubic(morphProgress);

      const morphScale = maxStartScale - cinematicMorph * (maxStartScale - 1.0);

      // Phase 3: The Deep Dive Zoom (runs concurrently after 0.80)
      const zoomCurve = zoomP * zoomP * zoomP; // Cubic ease-in for dramatic acceleration

      // Calculate precise scale needed to make the image cover the screen (like object-fit: cover)
      const photoWidth = Math.min(vw * 0.85, 1000); // 85% width, max 1000px — matches .final-event-photo
      const photoHeight = photoWidth / FINAL_PHOTO_ASPECT;
      // We perfectly match the max scale to the screen so it aligns flawlessly with the next section without overshooting
      const targetScale = Math.max(vw / photoWidth, vh / photoHeight);

      const finalScale = morphScale + zoomCurve * (targetScale - 1.0);

      if (scalerRef.current) {
        scalerRef.current.style.transform = `scale(${finalScale.toFixed(3)})`;
      }

      if (container) {
        if (p < 0.20) {
          if (animState !== 'none') { container.style.animation = 'none'; animState = 'none'; }
          // Add a subtle Y-axis tilt and Z-axis drop as it pulls away from the screen
          container.style.transform = `rotateX(${cinematicMorph * 8}deg) rotateY(${cinematicMorph * -3}deg) translateZ(${cinematicMorph * -60}px)`;
        } else if (zoomP > 0) {
          if (animState !== 'none') { container.style.animation = 'none'; animState = 'none'; }
          // Flatten out the default 5deg tilt during zoom so the polaroid is perfectly parallel to the screen
          container.style.transform = `rotateX(${(1 - zoomP) * 5}deg)`;
        } else {
          if (animState !== '') { container.style.animation = ''; animState = ''; }
          container.style.transform = '';
        }
      }

      // Simulate the heavy drop-shadow via a hardware accelerated pseudo layer
      if (shadowRef.current) {
        if (p < 0.20) {
          const shadowScale = 1 - (cinematicMorph * 0.15);
          shadowRef.current.style.opacity = (cinematicMorph * 0.8).toString();
          shadowRef.current.style.transform = `translateY(10%) scale(${shadowScale})`;
          shadowRef.current.style.display = 'block';
        } else if (zoomP > 0) {
          // Disable the extremely expensive blur filter during zoom to save GPU fill rate
          shadowRef.current.style.opacity = (0.8 * (1 - zoomP)).toString();
          if (zoomP > 0.2) shadowRef.current.style.display = 'none';
        } else {
          shadowRef.current.style.opacity = '0.8';
          shadowRef.current.style.display = 'block';
        }
      }

      // Hide heavy back-cover shadows during zoom to prevent massive GPU lag
      if (backCoverRef.current) {
        if (zoomP > 0.1) {
          backCoverRef.current.style.boxShadow = 'none';
        } else {
          backCoverRef.current.style.boxShadow = ''; // restore css
        }
      }

      // The book is permanently centered. We don't shift it so the flipped page goes naturally out of screen.
      if (rotatorRef.current) {
        rotatorRef.current.style.transform = `translateX(0%)`;
      }

      // Dynamically fade in the dust, vignette, and the new spiral binder!
      if (overlay) overlay.style.opacity = (cinematicMorph * (1 - zoomP)).toString();

      if (binder) binder.style.opacity = (cinematicMorph * (1 - zoomP)).toString();

      if (coverFront) {
        /* NOTHING here touches background-size any more, and that is the fix.
           This block used to interpolate the cover photo's background-size from
           "stretched to the viewport" to "cover the 16:9 book" across the
           morph. Two things were wrong with it. The still is 1917×917 and the
           box was 16:9, so both ends of that interpolation distorted it — and
           because the size changed every frame, the picture was visibly
           re-scaling *inside* its own frame while it was impersonating the page
           you had just been looking at. The book is now the still's own ratio,
           so the stylesheet's `100% 100%` is simultaneously exact and
           undistorted at every scale, and the cover simply shrinks.
           It is also four fewer style writes and one fewer background
           re-rasterisation per frame. */

        // Fade the book's own inner shadow in, so it does not darken the still
        // while the still is still pretending to be the previous section.
        const shadowAlpha = cinematicMorph * 0.6;
        const edgeAlpha = cinematicMorph * 0.1;
        const shadow =
          zoomP > 0.1
            ? 'none'
            : `inset -5px 0 20px rgba(0,0,0,${shadowAlpha.toFixed(2)}), inset 2px 0 5px rgba(255,255,255,${edgeAlpha.toFixed(2)})`;
        if (shadow !== lastShadow) {
          coverFront.style.boxShadow = shadow;
          lastShadow = shadow;
        }

        // Animate the dramatic light flare sweeping across the plastic cover
        if (glare) {
          const glarePos = 200 - (cinematicMorph * 300); // Sweeps from 200% down to -100%
          glare.style.backgroundPosition = `${glarePos}% 0`;
          glare.style.opacity = (Math.sin(cinematicMorph * Math.PI) * 0.9).toString();
        }
      }

      /* Phase 2: Upward Page Flips & Clean Fading!
         The cascade is derived from the page count, not hand-tuned per leaf, so
         adding a photo to PAGE_PHOTOS re-times the whole book automatically.
         Every flip keeps FLIP_SPAN of travel and they overlap by roughly half
         of it — that overlap is what stops the turn reading as stop-and-start.
         The last leaf lands exactly on p = 1.0, the frame the deep-dive zoom
         takes over.

         Each leaf starts one step higher in Z than the one beneath and travels
         to the mirror of that height, so the stack stays physically ordered
         all the way through the turn instead of z-fighting at the halfway
         point where two pages are edge-on to each other. */
      const flipEach = (el: HTMLDivElement | null, from: number, z0: number) => {
        if (!el) return;
        const flip = smooth(from, from + FLIP_SPAN, p) * 180;
        el.style.transform = `translateZ(${z0 - (flip / 180) * z0 * 2}px) rotateX(${flip}deg)`;
        el.style.opacity = '1';
        el.style.pointerEvents = flip > 90 ? 'none' : 'auto';
      };

      flipEach(coverRef.current, FLIP_START, (PAGE_PHOTOS.length + 1) * Z_STEP);
      for (let i = 0; i < PAGE_PHOTOS.length; i++) {
        flipEach(
          pageRefs.current[i],
          FLIP_START + (i + 1) * flipStagger,
          (PAGE_PHOTOS.length - i) * Z_STEP
        );
      }
    };

    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && document.visibilityState !== 'hidden') start();
        else stop();
      },
      // Watch the in-flow spacer, not this scene's own root — see `observeRef`.
      // The margin wakes the loop a screen early so the book is already at its
      // opening pose on the frame the overlay becomes visible.
      { threshold: 0, rootMargin: '900px 0px' }
    );
    const watched = observeRef?.current ?? rootRef.current;
    if (watched) io.observe(watched);
    const onVis = () => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', onVis);

    draw();
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      stop();
    };
  }, [progressRef, observeRef]);

  return (
    <div ref={rootRef} className="album-scene-root">
      {/* Retro film grain and vignette overlay */}
      <div className="album-overlay">
        <div className="dust"></div>
      </div>

      {/* The 3D Book Container wrapped in scaler and rotator */}
      <div ref={scalerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', willChange: 'transform' }}>

        {/* Hardware-accelerated fake shadow that doesn't trigger layout repaints or expensive SVG filters */}
        <div ref={shadowRef} style={{
          position: 'absolute',
          width: '70%', height: '30%',
          backgroundColor: 'transparent',
          borderRadius: '40px',
          boxShadow: '0 40px 100px 40px rgba(0, 0, 0, 0.9)',
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translateY(20%)',
          willChange: 'opacity, transform'
        }}></div>

        <div ref={rotatorRef} className="album-container-wrapper" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
          <div className="album-container">

            {/* High-Definition Metallic Spiral Binder (Top Edge) */}
            <div className="spiral-binder" />

            {/* Back Cover (static base) */}
            <div ref={backCoverRef} className="album-back-cover">
              {/* No `priority`. This is the last frame of an act ~15,000px down
                  the page; preloading it put a 1900px photo in front of the
                  hero video in the network queue on first paint. The overlay is
                  fixed and full-viewport, so the lazy loader fetches it early
                  regardless — we just stop it competing with the opening. */}
              <Image
                src={FINAL_PHOTO.src}
                alt="Event"
                /* The artwork's real pixels. These were 1000×562 (16:9), which
                   matched neither this file nor the one before it. It did not
                   distort anything — the browser lays the box out from the
                   image's natural aspect regardless, measured at 1000×455
                   either way — but it reserved the wrong space before the image
                   decoded, and it was the number someone would reach for when
                   they needed the aspect. Which is exactly what happened in the
                   zoom maths below. */
                width={FINAL_PHOTO.width}
                height={FINAL_PHOTO.height}
                className="final-event-photo"
                draggable={false}
              />
            </div>

            {/* Photo pages. Rendered deepest-first so the DOM order matches the
                Z stack: the last photo is the leaf furthest down in the book,
                and the first is the one lying right under the cover. */}
            {PAGE_PHOTOS.map((_, i) => {
              const idx = PAGE_PHOTOS.length - 1 - i;
              const src = PAGE_PHOTOS[idx];
              return (
                <div
                  key={src}
                  ref={(el) => {
                    pageRefs.current[idx] = el;
                  }}
                  className={`album-page album-page-${idx + 1}`}
                >
                  <div className="page-front" style={{ backgroundImage: `url('${src}')` }} />
                  <div className="page-back">
                    {idx === 0 && <div className="memory-text">revisiting our memories...</div>}
                  </div>
                </div>
              );
            })}

            {/* Cover */}
            <div ref={coverRef} className="album-cover">
              <div className="cover-front">
                {/* Cinematic light flare overlay */}
                <div className="cover-glare" style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.05) 45%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.05) 55%, transparent 70%)',
                  backgroundSize: '300% 100%',
                  pointerEvents: 'none',
                  opacity: 0
                }} />
                <h2 className="cover-title">What We Do</h2>
                <div className="cover-subtitle">GDG CRCE</div>
              </div>
              <div className="cover-back"></div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
