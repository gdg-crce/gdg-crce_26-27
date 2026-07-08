'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useEra } from '../ui/EraContext';
import { fraunces, jakarta } from '@/lib/fonts';

function StatCounter({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const end = value;
    const totalFrames = Math.min(Math.floor(duration * 60), end);
    let frame = 0;

    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const easeProgress = progress * (2 - progress);
      const currentCount = Math.floor(easeProgress * end);
      
      setCount(currentCount);

      if (frame >= totalFrames) {
        setCount(end);
        clearInterval(counter);
      }
    }, 1000 / 60);

    return () => clearInterval(counter);
  }, [isInView, value, duration]);

  return <span ref={ref}>{count}</span>;
}

export default function About() {
  const { activeEra } = useEra();
  const sectionRef = useRef<HTMLElement>(null);
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });

  // Calculate 4 scrolling step opacities for the 4 era devices
  const vinylOpacity = useTransform(scrollYProgress, [0, 0.25, 0.35], [1, 1, 0]);
  const cassetteOpacity = useTransform(scrollYProgress, [0.25, 0.35, 0.5, 0.6], [0, 1, 1, 0]);
  const polaroidOpacity = useTransform(scrollYProgress, [0.5, 0.6, 0.75, 0.85], [0, 1, 1, 0]);
  const cdOpacity = useTransform(scrollYProgress, [0.75, 0.85, 1], [0, 1, 1]);

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative min-h-screen py-24 px-6 md:px-12 flex items-center justify-center overflow-hidden border-t border-white/5 bg-black/5"
    >
      <div className="max-w-[1280px] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center z-10 px-4 md:px-8">
        
        {/* Left Column: Mission Description & Core Values (Ideate, Communicate, Collaborate) */}
        <div className="lg:col-span-7 flex flex-col gap-8 justify-center h-full text-left">
          <div className="flex flex-col gap-2">
            <span className={`text-xs md:text-sm tracking-[0.3em] uppercase text-primary font-bold ${jakarta.className}`}>
              Who We Are
            </span>
            <h2 className={`text-3xl md:text-5xl font-bold tracking-tight ${fraunces.className}`}>
              Bridging Tech Eras, Building Futures
            </h2>
          </div>

          <p className={`text-sm md:text-base leading-relaxed opacity-85 ${jakarta.className}`}>
            Google Developer Group CRCE is a student tech community dedicated to fostering innovation, design thinking, and collaborative engineering. Our goal is to connect aspiring builders with tools, mentorship, and peers to build next-generation projects.
          </p>

          {/* Core Values: Ideate, Communicate & Collaborate */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
            
            {/* We Ideate */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-lg flex flex-col gap-2 backdrop-blur-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h3 className={`text-sm font-bold text-primary ${fraunces.className}`}>
                  We Ideate
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed opacity-75 font-sans">
                We brainstorm creative tech solutions and cultivate original ideas to solve real problems.
              </p>
            </div>

            {/* We Communicate */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-lg flex flex-col gap-2 backdrop-blur-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xl">💬</span>
                <h3 className={`text-sm font-bold text-primary ${fraunces.className}`}>
                  We Communicate
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed opacity-75 font-sans">
                We help to hone intelligent minds and develop a dynamic environment through dialogue.
              </p>
            </div>

            {/* We Collaborate */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 shadow-lg flex flex-col gap-2 backdrop-blur-sm hover:border-primary/40 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤝</span>
                <h3 className={`text-sm font-bold text-primary ${fraunces.className}`}>
                  We Collaborate
                </h3>
              </div>
              <p className="text-[11px] leading-relaxed opacity-75 font-sans">
                We work together on projects and empower the whole community.
              </p>
            </div>
            
          </div>

          {/* Scrolling Stats Section */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mt-4 pt-4 border-t border-white/5">
            <div className="flex flex-col">
              <span className={`text-3xl md:text-5xl font-extrabold text-primary ${fraunces.className}`}>
                <StatCounter value={1200} />+
              </span>
              <span className={`text-xs tracking-wider uppercase opacity-60 font-medium mt-1 ${jakarta.className}`}>
                Active Members
              </span>
            </div>

            <div className="flex flex-col">
              <span className={`text-3xl md:text-5xl font-extrabold text-primary ${fraunces.className}`}>
                <StatCounter value={60} />+
              </span>
              <span className={`text-xs tracking-wider uppercase opacity-60 font-medium mt-1 ${jakarta.className}`}>
                Events Hosted
              </span>
            </div>

            <div className="flex flex-col col-span-2 sm:col-span-1">
              <span className={`text-3xl md:text-5xl font-extrabold text-primary ${fraunces.className}`}>
                <StatCounter value={25} />+
              </span>
              <span className={`text-xs tracking-wider uppercase opacity-60 font-medium mt-1 ${jakarta.className}`}>
                Projects Shipped
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Morphing Media Icons */}
        <div className="lg:col-span-5 flex items-center justify-center relative min-h-[360px] h-full">
          
          {/* 70s Vinyl Record Image Slot */}
          <motion.div 
            style={{ opacity: vinylOpacity }}
            className="absolute flex flex-col items-center gap-4 w-72"
          >
            <div className="relative w-72 h-72 rounded-full border-2 border-dashed border-primary/40 bg-black/40 flex flex-col items-center justify-center p-4 shadow-xl">
              <img
                src="/elements/70s-vinyl-record.png"
                alt="1970s Vinyl Record"
                className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 rounded-full"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                <span className="text-4xl mb-2">💿</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">70s Vinyl Record</span>
                <span className="text-[9px] font-mono opacity-50 mt-1">[Image Placeholder Slot]</span>
              </div>
            </div>
            <span className={`text-[10px] tracking-[0.3em] uppercase opacity-45 font-bold ${jakarta.className}`}>
              1970s: Vinyl Record
            </span>
          </motion.div>

          {/* 80s Cassette Tape Image Slot */}
          <motion.div 
            style={{ opacity: cassetteOpacity }}
            className="absolute flex flex-col items-center gap-4 w-72"
          >
            <div className="relative w-72 h-72 rounded-2xl border-2 border-dashed border-primary/40 bg-black/40 flex flex-col items-center justify-center p-4 shadow-xl">
              <img
                src="/elements/80s-cassette-tape.png"
                alt="1980s Cassette Tape"
                className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 rounded-2xl"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                <span className="text-4xl mb-2">📼</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">80s Cassette Tape</span>
                <span className="text-[9px] font-mono opacity-50 mt-1">[Image Placeholder Slot]</span>
              </div>
            </div>
            <span className={`text-[10px] tracking-[0.3em] uppercase opacity-45 font-bold ${jakarta.className}`}>
              1980s: Cassette Tape
            </span>
          </motion.div>

          {/* 80s Polaroid Camera Image Slot */}
          <motion.div 
            style={{ opacity: polaroidOpacity }}
            className="absolute flex flex-col items-center gap-4 w-72"
          >
            <div className="relative w-72 h-72 rounded-2xl border-2 border-dashed border-primary/40 bg-black/40 flex flex-col items-center justify-center p-4 shadow-xl">
              <img
                src="/elements/80s-polaroid-camera.png"
                alt="1980s Polaroid Camera"
                className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 rounded-2xl"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                <span className="text-4xl mb-2">📸</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">80s Polaroid Camera</span>
                <span className="text-[9px] font-mono opacity-50 mt-1">[Image Placeholder Slot]</span>
              </div>
            </div>
            <span className={`text-[10px] tracking-[0.3em] uppercase opacity-45 font-bold ${jakarta.className}`}>
              1980s: Polaroid Camera
            </span>
          </motion.div>

          {/* 1990s CD Jewel Case Image Slot */}
          <motion.div 
            style={{ opacity: cdOpacity }}
            className="absolute flex flex-col items-center gap-4 w-72"
          >
            <div className="relative w-72 h-72 rounded-2xl border-2 border-dashed border-secondary/40 bg-black/40 flex flex-col items-center justify-center p-4 shadow-xl">
              <img
                src="/elements/90s-cd-jewel-case.png"
                alt="1990s CD Jewel Case"
                className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 rounded-2xl"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                <span className="text-4xl mb-2">💿</span>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-secondary">90s CD Jewel Case</span>
                <span className="text-[9px] font-mono opacity-50 mt-1">[Image Placeholder Slot]</span>
              </div>
            </div>
            <span className={`text-[10px] tracking-[0.3em] uppercase opacity-45 font-bold ${jakarta.className}`}>
              1990s: CD Jewel Case
            </span>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
