'use client';

import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './tear.css';

export default function TearTransition() {
  const triggerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const leftTearRef = useRef<HTMLDivElement>(null);
  const rightTearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    // The trigger is a 2000px tall invisible div in the normal document flow.
    const st = ScrollTrigger.create({
      trigger: triggerRef.current,
      // Start exactly when the top of this spacer enters the bottom of the viewport
      // (which is exactly when the WhatWeDoSection pin finishes and starts scrolling up)
      start: 'top bottom',
      // End exactly when the bottom of this spacer leaves the top of the viewport
      // (which means the Events section is now perfectly at the top of the viewport)
      end: 'bottom top', 
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress;
        
        if (overlayRef.current) {
          // Show overlay exactly while this trigger is active.
          // INSTANT opaque so we don't see the DOM scrolling underneath.
          if (p > 0 && p < 0.99) {
             overlayRef.current.style.visibility = 'visible';
             overlayRef.current.style.opacity = '1';
          } else {
             overlayRef.current.style.visibility = 'hidden';
          }
        }
        
        if (leftTearRef.current && rightTearRef.current) {
           // Peeling sequence
           // 0.00 to 0.10: Locked tight (no movement)
           // 0.10 to 0.50: Left half peels off
           // 0.50 to 0.90: Right half peels off
           // 0.90 to 1.00: Locked on event background

           const leftP = Math.max(0, Math.min(1, (p - 0.10) / 0.40));
           const rightP = Math.max(0, Math.min(1, (p - 0.50) / 0.40));
           
           // Left half peels away like a torn poster falling off
           leftTearRef.current.style.transform = `translate(${-leftP * 40}vw, ${leftP * 20}vh) rotate(${-leftP * 15}deg)`;
           leftTearRef.current.style.opacity = `${1 - leftP}`;

           // Right half peels away
           rightTearRef.current.style.transform = `translate(${rightP * 40}vw, ${rightP * 20}vh) rotate(${rightP * 15}deg)`;
           rightTearRef.current.style.opacity = `${1 - rightP}`;
        }
      }
    });

    return () => st.kill();
  }, []);

  return (
    <>
      {/* Spacer in DOM that we scroll past while the fixed overlay is active */}
      <div ref={triggerRef} style={{ height: '2000px', width: '100%' }} />

      {/* Fixed overlay that sits above the scrolling DOM */}
      <div ref={overlayRef} className="tear-fixed-overlay" aria-hidden="true">
        {/* The background revealed behind the tear */}
        <div className="tear-bg-event" />
        
        {/* The two halves of the WhatWeDo image */}
        <div ref={leftTearRef} className="tear-half tear-left" />
        <div ref={rightTearRef} className="tear-half tear-right" />
      </div>
    </>
  );
}
