'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useMotionTemplate } from 'framer-motion';
import { TRACKS } from './aboutData';

export default function MobileAboutSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Wipes for Sticky Note Text
  // Phase 1: 0.15 to 0.4 (Section 1 -> Section 2)
  const wipe1 = useTransform(scrollYProgress, [0.15, 0.4], [0, 100]);
  // Phase 2: 0.6 to 0.85 (Section 2 -> Section 3)
  const wipe2 = useTransform(scrollYProgress, [0.6, 0.85], [0, 100]);

  const decOpacity = useTransform(scrollYProgress, [0.15, 0.3], [1, 0]);

  // Derived clip-paths
  // Track 0 (Section 1): Hides from left as wipe1 increases
  const clip0 = useMotionTemplate`inset(0 0 0 ${wipe1}%)`;
  
  // Track 1 (Section 2): Reveals from left as wipe1 increases, hides from left as wipe2 increases
  const right1 = useTransform(wipe1, (v) => 100 - v);
  const clip1 = useMotionTemplate`inset(0 ${right1}% 0 ${wipe2}%)`;

  // Track 2 (Section 3): Reveals from left as wipe2 increases
  const right2 = useTransform(wipe2, (v) => 100 - v);
  const clip2 = useMotionTemplate`inset(0 ${right2}% 0 0%)`;

  const clips = [clip0, clip1, clip2];

  // Vinyl transitions
  // Vinyl 1 & 2 is Theme (static base). Vinyl 3 is Vision (overlay).
  // Vision overlay reveals during wipe2.
  const visionVinylClip = useMotionTemplate`inset(0 ${right2}% 0 0%)`;

  return (
    <section ref={containerRef} className="md:hidden w-full h-[400vh] relative bg-[#111]">
      <div className="sticky top-0 w-full h-[100svh] overflow-hidden font-sans">
        
        {/* Full background image, fixed to viewport */}
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center pointer-events-none"
          style={{ backgroundImage: 'url("/record player/bg.jpeg")' }}
        >
          {/* Subtle overlay to ensure text contrast if needed */}
          <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
        </div>

        {/* Sticky Container for Content */}
        <div className="absolute inset-0 w-full h-full flex flex-col items-center pt-8 pb-8 z-10">
          
          {/* Header Label */}
          <div className="w-full px-6 flex items-center gap-2 pointer-events-none mb-4 mt-2">
            <span className="text-[#E8412A] text-xl font-bold">→</span>
            <h2 className="text-2xl text-white font-bold tracking-wide" style={{ fontFamily: 'var(--font-brush), cursive' }}>about us</h2>
          </div>

          {/* Top Half: Vinyl Player */}
          <div className="w-full flex-1 flex flex-col justify-center items-center relative z-10 min-h-0">
            <div className="relative w-[85%] max-w-[280px] aspect-square">
              
              {/* Base Static Vinyl (7.png - Our Theme) */}
              <div className="absolute inset-0 w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]">
                <img 
                  src="/record player/7.PNG" 
                  alt="Our Theme Vinyl" 
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              
              {/* Wiping overlay (2.png - Our Vision) */}
              <div 
                className="absolute inset-0 w-full h-full"
                style={{ 
                  // Only expose the inner text and label, completely hiding outer edges
                  maskImage: 'radial-gradient(circle at 50% 50%, black 0%, black 50%, transparent 54%)', 
                  WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 0%, black 50%, transparent 54%)' 
                }}
              >
                <motion.img 
                  src="/record player/2.PNG" 
                  alt="Our Vision Overlay" 
                  style={{ clipPath: visionVinylClip }}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>

              {/* Tonearm */}
              <div className="absolute top-[-10%] right-[-10%] w-[45%] pointer-events-none drop-shadow-2xl opacity-95 z-30">
                <img 
                  src="/record player/toneram.png" 
                  alt="Tonearm" 
                  className="w-full h-auto transform rotate-[15deg]"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          {/* Bottom Half: Sticky Note */}
          <div className="w-full flex-[1.2] flex flex-col items-center justify-start relative z-20 mt-4 min-h-0">
            <div className="relative w-[85%] max-w-[320px] aspect-[1/1.05] drop-shadow-2xl">
              
              {/* Base Sticky Note Paper (Static) */}
              <img 
                src="/record player/11.png" 
                alt="Sticky Note Base" 
                className="absolute inset-0 w-full h-full object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.6)]" 
                draggable={false}
              />

              {/* Decoration for Section 1 */}
              <motion.img 
                src="/record player/12.png" 
                alt="Sticky Note Decoration" 
                style={{ opacity: decOpacity }}
                className="absolute inset-0 w-full h-full object-contain z-10" 
                draggable={false}
              />

              {/* Container for HTML text */}
              <div className="absolute inset-0 pt-[22%] px-[12%] pb-[10%]">
                {TRACKS.map((track, i) => (
                  <motion.div 
                    key={`text-${i}`}
                    style={{ clipPath: clips[i] }}
                    className="absolute inset-0 pt-[20%] px-[12%] pb-[10%] flex flex-col items-center justify-center text-center bg-transparent z-20"
                  >
                    {track.brush && (
                      <h4 className="text-[2.2rem] leading-none text-[#d05c2a] font-bold pb-3 transform -rotate-2" style={{ fontFamily: 'var(--font-brush), cursive' }}>
                        {track.brush}
                      </h4>
                    )}
                    <p 
                      className={`text-[#5c3a21] uppercase ${track.brush ? 'text-[0.75rem]' : 'text-[0.7rem] sm:text-[0.75rem]'} leading-[1.6] font-bold tracking-[0.1em] transform -rotate-1 px-2`} 
                      style={{ fontFamily: 'var(--font-editorial-display), Georgia, serif', textShadow: '0px 0px 1px rgba(140,74,33,0.1)' }}
                    >
                      {track.lines.join(' ')}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="w-full flex justify-center items-center gap-2 text-white/60 animate-pulse pointer-events-none z-30 pb-4 mt-auto mb-4">
             <span className="text-xs font-mono tracking-widest uppercase drop-shadow-md">Scroll</span>
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="drop-shadow-md"><path d="M12 4v16m0 0l-4-4m4 4l4-4"/></svg>
          </div>

        </div>
      </div>
    </section>
  );
}
