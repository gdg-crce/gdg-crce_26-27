'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const WWD_DATA = [
  {
    bg: '/whatwedo/technical.png',
    title: 'Technical',
    text: 'Scalable web, mobile, and cloud solutions built with React, Node.js, Flutter, and modern DevOps, engineered for performance and digital transformation.',
    bgColor: 'rgba(168, 61, 40, 0.9)'
  },
  {
    bg: '/whatwedo/contentt.png',
    title: 'Content',
    text: 'Engaging technical content and educational resources, from blog posts to video tutorials — making complex topics accessible for everyone.',
    bgColor: 'rgba(212, 137, 43, 0.9)'
  },
  {
    bg: '/whatwedo/ML.png',
    title: 'ML & Android',
    text: 'Smart Android apps powered by machine learning — built with TensorFlow, Kotlin, and Google ML Kit to learn and adapt to user behavior.',
    bgColor: 'rgba(57, 107, 171, 0.9)'
  },
  {
    bg: '/whatwedo/comm.png',
    title: 'Communication',
    text: 'Organizing workshops, hackathons, and tech talks that foster innovation and collaboration among tech enthusiasts.',
    bgColor: 'rgba(189, 75, 127, 0.9)'
  },
  {
    bg: '/whatwedo/designn.png',
    title: 'Design',
    text: 'Intuitive interfaces, compelling visuals — designed with Figma, Adobe Creative Suite, and design thinking to create experiences users love',
    bgColor: 'rgba(75, 150, 105, 0.9)'
  }
];

// SVG for the decorative 3-star pattern (perfectly matching reference)
const StarPattern = () => (
  <svg viewBox="0 0 100 100" className="w-[16cqw] h-[16cqw] absolute bottom-[2cqw] right-[6cqw]" style={{ fill: '#E8412A' }}>
    <g transform="rotate(15 50 50)">
      {/* Large star */}
      <path d="M 30 10 L 36 24 L 52 26 L 40 37 L 43 52 L 30 44 L 17 52 L 20 37 L 8 26 L 24 24 Z" />
      {/* Medium star */}
      <path d="M 65 50 L 68 56 L 75 57 L 70 62 L 71 69 L 65 65 L 59 69 L 60 62 L 55 57 L 62 56 Z" transform="rotate(-20 65 60)" />
      {/* Small star */}
      <path d="M 50 70 L 52 74 L 56 74 L 53 78 L 54 82 L 50 79 L 46 82 L 47 78 L 44 74 L 48 74 Z" transform="rotate(10 50 75)" />
    </g>
  </svg>
);

export default function MobileWhatWeDoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  // Fades in the polaroids smoothly when entering the section
  const polaroidOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  // Moves the 500% wide container from 0% to -80% to slide through 5 items perfectly spaced.
  // This guarantees all 5 sections are visible and pause comfortably.
  const x = useTransform(
    scrollYProgress,
    [
      0.0, 0.15, // Slide 1 pause
      0.25, 0.35, // Slide 2 pause (Transition 0.15->0.25)
      0.45, 0.55, // Slide 3 pause (Transition 0.35->0.45)
      0.65, 0.75, // Slide 4 pause (Transition 0.55->0.65)
      0.85, 1.0  // Slide 5 pause (Transition 0.75->0.85)
    ],
    [
      '0%', '0%', 
      '-20%', '-20%', 
      '-40%', '-40%', 
      '-60%', '-60%', 
      '-80%', '-80%'
    ]
  );

  return (
    <section ref={containerRef} className="md:hidden w-full h-[600vh] relative bg-[#111]">
      <div className="sticky top-0 w-full h-[100svh] overflow-hidden flex flex-col items-center justify-start pt-[6vh]">
        
        {/* Fixed Camera at Top: strictly upper portion, acts as a header */}
        <div className="relative w-[85%] max-w-[280px] h-[32vh] z-20 flex-shrink-0 flex justify-center drop-shadow-2xl">
          <img 
            src="/whatwedo/poloroid-camera.png" 
            alt="Polaroid Camera" 
            className="w-full h-full object-contain object-bottom"
            draggable={false}
          />
        </div>

        {/* Scroll-Driven Polaroids Container: large enough for comfortable reading */}
        <motion.div 
          style={{ opacity: polaroidOpacity }}
          className="relative w-full h-[55vh] flex items-start justify-center z-10 mt-1"
        >
          {/* This wrapper slides horizontally and is 500% wide */}
          <motion.div 
            style={{ x }}
            className="w-[500%] h-full flex"
          >
            {WWD_DATA.map((item, i) => (
              <div key={i} className="w-1/5 h-full flex justify-center items-start">
                
                {/* 
                  Container Query applied to the Polaroid.
                  Maximizes height up to 100%, maintains 1/1.22 aspect ratio exactly as reference.
                */}
                <div 
                  className="relative h-full max-h-[100%] aspect-[1/1.22] shadow-2xl origin-top transform rotate-[1deg]"
                  style={{ containerType: 'inline-size' }}
                >
                  
                  {/* Polaroid Base Layout Image */}
                  <img 
                    src={item.bg} 
                    alt={`Polaroid ${item.title}`} 
                    className="absolute inset-0 w-full h-full object-fill drop-shadow-[0_20px_30px_rgba(0,0,0,0.8)]"
                    draggable={false}
                  />

                  {/* HTML Text Content overlaid on the photo area */}
                  <div className="absolute top-[8%] left-[7%] right-[7%] bottom-[24%] flex flex-col justify-end pointer-events-none z-10 p-[2cqw]">
                    <div className="text-right mt-auto mb-[2cqw]">
                      <span 
                        className="inline text-white/95 font-semibold tracking-wide uppercase"
                        style={{ 
                          // Responsive typography based on Container Width (cqw)
                          // Safely clamped for 320px up to 430px screens
                          fontSize: 'clamp(9px, 4cqw, 22px)',
                          lineHeight: '2.0',
                          padding: '0.4cqw 1.2cqw',
                          backgroundColor: item.bgColor, 
                          fontFamily: 'var(--font-ibm-plex-mono), monospace',
                          boxDecorationBreak: 'clone',
                          WebkitBoxDecorationBreak: 'clone',
                          textShadow: '0px 0px 1px rgba(255,255,255,0.2)'
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  </div>

                  {/* Title and Stars at the base */}
                  <div className="absolute bottom-0 left-[7%] right-[7%] h-[22%] flex items-center justify-between pointer-events-none z-10">
                    <span 
                      className="whitespace-nowrap overflow-hidden text-ellipsis"
                      style={{ 
                        fontFamily: 'Porcelain, var(--font-brush), cursive',
                        // Fixed size for title to avoid overlap, properly scales with container width
                        fontSize: 'clamp(20px, 11cqw, 55px)',
                        color: '#1a1a1a',
                        marginLeft: '1cqw',
                        paddingBottom: '2cqw'
                      }}
                    >
                      {item.title}
                    </span>
                  </div>
                  
                  {/* Overlay the stars */}
                  <StarPattern />

                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-2 w-full flex justify-center items-center gap-2 text-white/40 animate-pulse pointer-events-none z-30">
           <span className="text-[10px] font-mono tracking-widest uppercase drop-shadow-md">Scroll</span>
        </div>

      </div>
    </section>
  );
}
