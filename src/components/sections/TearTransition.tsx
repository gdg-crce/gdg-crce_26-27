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
      scrub: 1.5,
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
           // 1. Crack opens slowly horizontally (0.0 to 0.15)
           const crackP = Math.min(1, p / 0.15);
           
           // 2. Left half peels off towards the user and falls (0.15 to 0.55)
           const leftP = Math.max(0, Math.min(1, (p - 0.15) / 0.40));
           
           // 3. Right half peels off towards the user and falls (0.55 to 0.95)
           const rightP = Math.max(0, Math.min(1, (p - 0.55) / 0.40));
           
           // Apply transformations
           // Crack expands up to 2vw on each side before falling.
           // When falling, we translate Z massively towards the camera, drop it Y, and tumble it.
           
           leftTearRef.current.style.transform = `
             translateX(${-crackP * 2 - leftP * 20}vw) 
             translateY(${leftP * 100}vh) 
             translateZ(${leftP * 800}px) 
             rotateX(${-leftP * 45}deg) 
             rotateY(${-leftP * 45}deg) 
             rotateZ(${-leftP * 20}deg)
           `;
           leftTearRef.current.style.opacity = `${1 - leftP}`;

           rightTearRef.current.style.transform = `
             translateX(${crackP * 2 + rightP * 20}vw) 
             translateY(${rightP * 100}vh) 
             translateZ(${rightP * 800}px) 
             rotateX(${-rightP * 45}deg) 
             rotateY(${rightP * 45}deg) 
             rotateZ(${rightP * 20}deg)
           `;
           rightTearRef.current.style.opacity = `${1 - rightP}`;
        }
      }
    });

    return () => st.kill();
  }, []);

  return (
    <>
      {/* Spacer in DOM that we scroll past while the fixed overlay is active */}
      <div ref={triggerRef} style={{ height: '1000px', width: '100%' }} />

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
