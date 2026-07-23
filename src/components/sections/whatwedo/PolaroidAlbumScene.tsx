'use client';

import React, { useEffect, useRef } from 'react';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export default function PolaroidAlbumScene({ progressRef }: { progressRef: React.RefObject<number> }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const rotatorRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const page3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let running = false;

    const draw = () => {
      const p = progressRef.current ?? 0;

      // Phase 1: The Morph (0 to 0.15)
      // The book is max 1280x360 (32:9). The cover is half of that: max 640x360 (a perfect 16:9).
      const vw = window.innerWidth;
      
      const coverW = Math.min(vw * 0.45, 640); // 45vw or 640px
      
      // To perfectly match the screenshot without cropping or squishing, we match the screen width exactly.
      const maxStartScale = vw / coverW;
      
      const morphProgress = smooth(0.0, 0.15, p);
      
      const scale = maxStartScale - morphProgress * (maxStartScale - 1.0);
      const tx = -25 + morphProgress * 25; // -25% -> 0% (centers the right half initially)
      
      if (scalerRef.current) {
        // Scaler ONLY applies the scale.
        scalerRef.current.style.transform = `scale(${scale.toFixed(3)})`;
      }
      
      const container = rootRef.current?.querySelector('.album-container') as HTMLElement;
      if (container) {
        if (p < 0.15) {
          // Force it perfectly flat to match the 2D screenshot, and rotate it exactly into the float animation!
          container.style.animation = 'none';
          container.style.transform = `rotateX(${morphProgress * 8}deg)`; 
        } else {
          // Resume 3D float animation seamlessly
          container.style.animation = ''; 
          container.style.transform = ''; 
        }
      }

      if (rotatorRef.current) {
        // Rotator is exactly centered mathematically
        rotatorRef.current.style.transform = `translateX(${tx.toFixed(1)}%)`;
      }

      // Add CSS filter degrade directly to the cover-front as it downsizes!
      const coverFront = coverRef.current?.querySelector('.cover-front') as HTMLElement;
      if (coverFront) {
        // Degrade colors as it shrinks
        const degrade = smooth(0.0, 0.2, p);
        coverFront.style.filter = `sepia(${Math.round(degrade * 50)}%) grayscale(${Math.round(degrade * 30)}%) contrast(${100 + degrade * 15}%)`;
      }

      // Phase 2: Map progress to page flips (shifted to happen after the downsize)
      const flipCover = smooth(0.30, 0.45, p) * -180;
      if (coverRef.current) coverRef.current.style.transform = `translateZ(6px) rotateY(${flipCover}deg)`;

      const flipP1 = smooth(0.50, 0.65, p) * -180;
      if (page1Ref.current) page1Ref.current.style.transform = `translateZ(4px) rotateY(${flipP1}deg)`;

      const flipP2 = smooth(0.70, 0.85, p) * -180;
      if (page2Ref.current) page2Ref.current.style.transform = `translateZ(2px) rotateY(${flipP2}deg)`;
      
      const flipP3 = smooth(0.90, 1.0, p) * -180;
      if (page3Ref.current) page3Ref.current.style.transform = `translateZ(0px) rotateY(${flipP3}deg)`;
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
        <div ref={rotatorRef} className="album-container-wrapper" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
          <div className="album-container">
        
        {/* Back Cover (static, right side) */}
        <div className="album-back-cover" />

        {/* Page 3 */}
        <div ref={page3Ref} className="album-page album-page-3">
          <div className="page-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/whatwedo/techinical.PNG" alt="Technical" className="polaroid-item pol-5" draggable={false} />
          </div>
          <div className="page-back"></div>
        </div>

        {/* Page 2 */}
        <div ref={page2Ref} className="album-page album-page-2">
          <div className="page-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/whatwedo/ml-android.webp" alt="ML & Android" className="polaroid-item pol-3" draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/whatwedo/design.webp" alt="Design" className="polaroid-item pol-4" draggable={false} />
          </div>
          <div className="page-back"></div>
        </div>

        {/* Page 1 */}
        <div ref={page1Ref} className="album-page album-page-1">
          <div className="page-front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/whatwedo/content.webp" alt="Content" className="polaroid-item pol-1" draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/whatwedo/community.webp" alt="Community" className="polaroid-item pol-2" draggable={false} />
          </div>
          <div className="page-back">
            <div className="memory-text">revisiting our memories...</div>
          </div>
        </div>

        {/* Cover */}
        <div ref={coverRef} className="album-cover">
          <div className="cover-front">
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
