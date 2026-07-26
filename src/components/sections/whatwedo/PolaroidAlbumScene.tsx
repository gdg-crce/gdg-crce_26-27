'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default function PolaroidAlbumScene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const rotatorRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let running = false;
    let lastP = -1;
    let lastVw = -1;
    let lastVh = -1;

    const draw = () => {
      const rawP = progressRef.current ?? 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      if (rawP === lastP && vw === lastVw && vh === lastVh) return;
      lastP = rawP; lastVw = vw; lastVh = vh;

      // The flip/morph animation runs from 0.0 to 0.80
      const p = Math.min(1, rawP / 0.80);
      // The deep dive zoom animation runs from 0.80 to 1.0
      const zoomP = Math.max(0, (rawP - 0.80) / 0.20);

      // Phase 1: The Morph (Extended to 0.20 for a luxurious, slow unraveling)
      const coverW = Math.min(vw * 0.85, 1300); // Reduced slightly from 0.90 for a better fit
      const coverH = Math.min(vw * 0.478125, 731.25); // 16:9 ratio
      
      const maxStartScale = Math.max(vw / coverW, vh / coverH);
      
      const morphProgress = smooth(0.0, 0.20, p);
      
      // Cinematic easing curve (Cubic in-out) for a magical, breathless float
      const easeInOutCubic = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      const cinematicMorph = easeInOutCubic(morphProgress);
      
      const morphScale = maxStartScale - cinematicMorph * (maxStartScale - 1.0);
      
      // Phase 3: The Deep Dive Zoom (runs concurrently after 0.80)
      const zoomCurve = zoomP * zoomP * zoomP; // Cubic ease-in for dramatic acceleration
      
      // Calculate precise scale needed to make the polaroid photo cover the screen (like object-fit: cover)
      const photoWidth = Math.min(vw * 0.75, 800) - 24; // 75% width, max 800px, minus 12px padding left/right
      const photoHeight = photoWidth * (9 / 16);
      // We perfectly match the max scale to the screen so it aligns flawlessly with the next section without overshooting
      const targetScale = Math.max(vw / photoWidth, vh / photoHeight);
      
      const finalScale = morphScale + zoomCurve * (targetScale - 1.0);
      
      if (scalerRef.current) {
        scalerRef.current.style.transform = `scale(${finalScale.toFixed(3)})`;
      }
      
      const container = rootRef.current?.querySelector('.album-container') as HTMLElement;
      if (container) {
        if (p < 0.20) {
          container.style.animation = 'none';
          // Add a subtle Y-axis tilt and Z-axis drop as it pulls away from the screen
          container.style.transform = `rotateX(${cinematicMorph * 8}deg) rotateY(${cinematicMorph * -3}deg) translateZ(${cinematicMorph * -60}px)`; 
        } else if (zoomP > 0) {
          container.style.animation = 'none';
          // Flatten out the default 5deg tilt during zoom so the polaroid is perfectly parallel to the screen
          container.style.transform = `rotateX(${(1 - zoomP) * 5}deg)`;
        } else {
          container.style.animation = ''; 
          container.style.transform = ''; 
        }
      }

      // Simulate the heavy drop-shadow via a hardware accelerated pseudo layer
      if (shadowRef.current) {
        if (p < 0.20) {
          const shadowScale = 1 - (cinematicMorph * 0.15);
          shadowRef.current.style.opacity = (cinematicMorph * 0.8).toString();
          shadowRef.current.style.transform = `translateY(10%) scale(${shadowScale})`;
        } else if (zoomP > 0) {
          shadowRef.current.style.opacity = (0.8 * (1 - zoomP)).toString();
        } else {
          shadowRef.current.style.opacity = '0.8';
        }
      }

      // The book is permanently centered. We don't shift it so the flipped page goes naturally out of screen.
      if (rotatorRef.current) {
        rotatorRef.current.style.transform = `translateX(0%)`;
      }

      // Dynamically fade in the dust, vignette, and the new spiral binder!
      const overlay = rootRef.current?.querySelector('.album-overlay') as HTMLElement;
      if (overlay) overlay.style.opacity = (cinematicMorph * (1 - zoomP)).toString();
      
      const binder = rootRef.current?.querySelector('.spiral-binder') as HTMLElement;
      if (binder) binder.style.opacity = (cinematicMorph * (1 - zoomP)).toString();

      // Dynamic background sizing to ensure a seamless pixel-perfect transition!
      const coverFront = coverRef.current?.querySelector('.cover-front') as HTMLElement;
      if (coverFront) {
        coverFront.style.filter = 'none';
        
        // Dynamically fade in the book shadow so it doesn't darken the initial screenshot
        const shadowAlpha = cinematicMorph * 0.6;
        const edgeAlpha = cinematicMorph * 0.1;
        coverFront.style.boxShadow = `inset -5px 0 20px rgba(0,0,0,${shadowAlpha.toFixed(2)}), inset 2px 0 5px rgba(255,255,255,${edgeAlpha.toFixed(2)})`;

        const bgW_start = vw / maxStartScale;
        const bgH_start = vh / maxStartScale;
        
        const bgW_target = Math.max(coverW, coverH * (vw / vh));
        const bgH_target = Math.max(coverH, coverW * (vh / vw));
        
        const curBgW = bgW_start + cinematicMorph * (bgW_target - bgW_start);
        const curBgH = bgH_start + cinematicMorph * (bgH_target - bgH_start);
        
        coverFront.style.backgroundSize = `${curBgW.toFixed(2)}px ${curBgH.toFixed(2)}px`;
        coverFront.style.backgroundPosition = 'center center';
        coverFront.style.backgroundRepeat = 'no-repeat';

        // Animate the dramatic light flare sweeping across the plastic cover
        const glare = coverFront.querySelector('.cover-glare') as HTMLElement;
        if (glare) {
          const glarePos = 200 - (cinematicMorph * 300); // Sweeps from 200% down to -100%
          glare.style.backgroundPosition = `${glarePos}% 0`;
          glare.style.opacity = (Math.sin(cinematicMorph * Math.PI) * 0.9).toString();
        }
      }

      // Phase 2: Upward Page Flips & Clean Fading!
      // Pages flip upwards around the X-axis (rotateX(180deg)). 
      // Flipped pages remain visible as the top half of the open notebook.
      const flipCover = smooth(0.35, 0.50, p) * 180;
      const zCover = 6 - (flipCover / 180) * 12; // Interpolates from 6 to -6
      if (coverRef.current) {
        coverRef.current.style.transform = `translateZ(${zCover}px) rotateX(${flipCover}deg)`;
        coverRef.current.style.opacity = '1'; 
        coverRef.current.style.pointerEvents = flipCover > 90 ? 'none' : 'auto';
      }

      const flipP1 = smooth(0.55, 0.70, p) * 180;
      const zP1 = 4 - (flipP1 / 180) * 8; 
      if (page1Ref.current) {
        page1Ref.current.style.transform = `translateZ(${zP1}px) rotateX(${flipP1}deg)`;
        page1Ref.current.style.opacity = '1';
        page1Ref.current.style.pointerEvents = flipP1 > 90 ? 'none' : 'auto';
      }

      const flipP2 = smooth(0.75, 0.90, p) * 180;
      const zP2 = 2 - (flipP2 / 180) * 4; 
      if (page2Ref.current) {
        page2Ref.current.style.transform = `translateZ(${zP2}px) rotateX(${flipP2}deg)`;
        page2Ref.current.style.opacity = '1';
        page2Ref.current.style.pointerEvents = flipP2 > 90 ? 'none' : 'auto';
      }
      
      const flipP3 = smooth(0.92, 1.0, p) * 180;
      if (page3Ref.current) {
        page3Ref.current.style.transform = `translateZ(0px) rotateX(${flipP3}deg)`;
        page3Ref.current.style.opacity = '1';
        page3Ref.current.style.pointerEvents = flipP3 > 90 ? 'none' : 'auto';
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
      { threshold: 0 }
    );
    if (rootRef.current) io.observe(rootRef.current);
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
  }, [progressRef]);

  return (
    <div ref={rootRef} className="album-scene-root">
      {/* Retro film grain and vignette overlay */}
      <div className="album-overlay">
        <div className="dust"></div>
      </div>
      
      {/* The 3D Book Container wrapped in scaler and rotator */}
      <div ref={scalerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', willChange: 'transform' }}>
        
        {/* Hardware-accelerated fake shadow that doesn't trigger layout repaints */}
        <div ref={shadowRef} style={{
          position: 'absolute',
          width: '75%', height: '42%',
          background: 'rgba(0, 0, 0, 1)',
          borderRadius: '40px',
          filter: 'blur(50px)',
          opacity: 0,
          pointerEvents: 'none',
          transform: 'translateY(10%)',
          willChange: 'opacity, transform'
        }}></div>

        <div ref={rotatorRef} className="album-container-wrapper" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
          <div className="album-container">
            
            {/* High-Definition Metallic Spiral Binder (Top Edge) */}
            <div className="spiral-binder" />

            {/* Back Cover (static base) */}
            <div className="album-back-cover">
              <div className="polaroid-frame final-event-photo">
                <Image src="/transition/event.png" alt="Event" width={1000} height={562} className="polaroid-image" draggable={false} priority />
              </div>
            </div>

            {/* Page 3 */}
            <div ref={page3Ref} className="album-page album-page-3">
              <div className="page-front">
                <div className="native-polaroid-container p3-1">
                  <Image src="/whatwedo/techinical.PNG" alt="Technical" width={800} height={800} className="native-polaroid-img" draggable={false} />
                </div>
                <div className="native-polaroid-container p3-2">
                  <Image src="/whatwedo/context-poloriod.png" alt="Context" width={800} height={800} className="native-polaroid-img" draggable={false} />
                </div>
                <div className="scrap-photo p3-3">
                  <Image src="/whatwedo/memories/memory-6.jpeg" alt="Memory" width={400} height={400} className="print-style" draggable={false} />
                </div>
              </div>
              <div className="page-back"></div>
            </div>

            {/* Page 2 */}
            <div ref={page2Ref} className="album-page album-page-2">
              <div className="page-front">
                <div className="native-polaroid-container p2-1">
                  <Image src="/whatwedo/design.webp" alt="Design" width={800} height={800} className="native-polaroid-img" draggable={false} />
                </div>
                <div className="scrap-photo p2-2">
                  <Image src="/whatwedo/memories/memory-3.jpeg" alt="Memory" width={400} height={400} className="print-style" draggable={false} />
                </div>
                <div className="scrap-photo p2-3">
                  <Image src="/whatwedo/memories/memory-5.jpeg" alt="Memory" width={400} height={400} className="print-style" draggable={false} />
                </div>
              </div>
              <div className="page-back"></div>
            </div>

            {/* Page 1 */}
            <div ref={page1Ref} className="album-page album-page-1">
              <div className="page-front">
                <div className="native-polaroid-container p1-1">
                  <Image src="/whatwedo/community.webp" alt="Community" width={800} height={800} className="native-polaroid-img" draggable={false} priority />
                </div>
                <div className="scrap-photo p1-2">
                  <Image src="/whatwedo/memories/memory-1.jpeg" alt="Memory" width={400} height={400} className="print-style" draggable={false} />
                </div>
                <div className="scrap-photo p1-3">
                  <Image src="/whatwedo/memories/memory-2.jpeg" alt="Memory" width={400} height={400} className="print-style" draggable={false} />
                </div>
              </div>
              <div className="page-back">
                <div className="memory-text">revisiting our memories...</div>
              </div>
            </div>

            {/* Cover */}
            <div ref={coverRef} className="album-cover">
              <div className="cover-front">
                {/* Cinematic light flare overlay */}
                <div className="cover-glare" style={{
                  position: 'absolute', inset: 0, 
                  background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.1) 45%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.1) 55%, transparent 70%)',
                  backgroundSize: '300% 100%',
                  mixBlendMode: 'overlay',
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
