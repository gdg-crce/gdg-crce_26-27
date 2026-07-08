'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useEra } from '../ui/EraContext';
import { fraunces, jakarta } from '@/lib/fonts';

const Vinyl3D = dynamic(() => import('../three/Vinyl3D'), {
  ssr: false,
  loading: () => (
    <div className="w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] flex items-center justify-center">
      <div className="w-28 h-28 rounded-full bg-neutral-900 border-4 border-dashed border-primary/40 animate-spin" />
    </div>
  ),
});

const words = ['build', 'innovate', 'lead'];

export default function Hero() {
  const { activeEra } = useEra();
  const [wordIdx, setWordIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % words.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const headlineText = "Where college builders begin their";

  return (
    <section 
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-40 pb-24 overflow-hidden text-left"
    >
      {/* Visual Dither Grid Accent */}
      <div className="absolute inset-0 dither-pattern opacity-[0.04] pointer-events-none" />
      <div className="film-grain opacity-[0.05]" />

      {/* Iridescent background "Orb" effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <motion.div
          animate={{
            scale: [1, 1.25, 0.9, 1],
            x: [0, 80, -60, 0],
            y: [0, -50, 40, 0],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -left-20 w-[450px] h-[450px] rounded-full blur-[130px]"
          style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{
            scale: [1.2, 0.95, 1.15, 1.2],
            x: [0, -60, 80, 0],
            y: [0, 70, -40, 0],
            opacity: [0.12, 0.2, 0.12],
          }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, var(--secondary) 0%, transparent 70%)' }}
        />
      </div>

      <div className="max-w-[1280px] w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center z-10 px-4 md:px-8">
        
        {/* Kinetic Text Column */}
        <div className="lg:col-span-7 flex flex-col gap-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className={`text-xs md:text-sm tracking-[0.35em] uppercase text-primary font-bold ${jakarta.className}`}
          >
            Google Developer Group — CRCE
          </motion.div>

          <h1 className={`text-4xl md:text-6xl lg:text-7.5xl font-black leading-[1.1] tracking-tight ${fraunces.className}`}>
            {headlineText.split(' ').map((word, idx) => (
              <motion.span
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05 * idx, ease: 'easeOut' }}
                className="inline-block mr-3"
              >
                {word}
              </motion.span>
            ))}
            
            <span className="block mt-4 h-16 md:h-24 overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.span
                  key={words[wordIdx]}
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -40, opacity: 0 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                  className="absolute left-0 right-0 text-primary font-black uppercase text-glow"
                >
                  {words[wordIdx]}.
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className={`text-sm md:text-base leading-relaxed opacity-80 max-w-lg font-sans`}
          >
            Welcome to the command hub of Fr. Conceicao Rodrigues College of Engineering's tech council. Journey through 1970s analog, 1980s synth, 1990s desktop frames, and Y2K cyber gloss.
          </motion.p>
        </div>

        {/* 3D Vinyl & 70s Elements Column */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center gap-8 relative">
          
          {/* Main Spin vinyl mesh */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex items-center justify-center w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] drop-shadow-2xl"
          >
            {/* Turntable circle outline backplate */}
            <div className="absolute w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] rounded-full border border-white/10 bg-black/35 backdrop-blur-[3px] shadow-[inset_0_2px_4px_rgba(255,255,255,0.05)]" />
            <Vinyl3D />
          </motion.div>

          {/* 70s Boombox & Lava Lamp side-by-side image slots */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-[380px] mt-2">
            
            {/* Boombox Slot */}
            <div className="relative h-24 border-2 border-dashed border-primary/30 rounded-2xl bg-black/45 flex flex-col items-center justify-center p-2 hover:border-primary/50 transition-colors">
              <img
                src="/elements/70s-boombox.png"
                alt="1970s Boombox"
                className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 p-1"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col items-center justify-center text-center pointer-events-none p-1 text-primary">
                <span className="text-xl">📻</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">70s Boombox</span>
                <span className="text-[7px] font-mono opacity-40 mt-0.5">[Image Slot]</span>
              </div>
            </div>

            {/* Lava Lamp Slot */}
            <div className="relative h-24 border-2 border-dashed border-primary/30 rounded-2xl bg-black/45 flex flex-col items-center justify-center p-2 hover:border-primary/50 transition-colors">
              <img
                src="/elements/70s-lava-lamp.png"
                alt="1970s Lava Lamp"
                className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 p-1"
                onLoad={(e) => (e.currentTarget.style.opacity = '1')}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col items-center justify-center text-center pointer-events-none p-1 text-primary">
                <span className="text-xl">💡</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider">70s Lava Lamp</span>
                <span className="text-[7px] font-mono opacity-40 mt-0.5">[Image Slot]</span>
              </div>
            </div>
            
          </div>
        </div>
      </div>

      {/* Scroll Cue */}
      <motion.div 
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute bottom-6 flex flex-col items-center gap-1 cursor-pointer z-10"
        onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className="text-[9px] tracking-[0.25em] uppercase opacity-65 font-sans">
          Scroll Down
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary mt-1">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </motion.div>
    </section>
  );
}
