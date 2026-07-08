'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<'drawing' | 'countdown' | 'completed'>('drawing');
  const [countdownEra, setCountdownEra] = useState<'2000s' | '1990s' | '1980s' | '1970s' | null>(null);

  useEffect(() => {
    // Lock body scroll on mount
    document.body.style.overflow = 'hidden';
    
    // Phase 1: Logo Draw (2.5 seconds)
    const timer1 = setTimeout(() => {
      setPhase('countdown');
    }, 2500);

    return () => {
      clearTimeout(timer1);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return;

    // Phase 2: Rewind Countdown through eras
    const countdownSteps: { era: '2000s' | '1990s' | '1980s' | '1970s'; delay: number }[] = [
      { era: '2000s', delay: 0 },
      { era: '1990s', delay: 400 },
      { era: '1980s', delay: 800 },
      { era: '1970s', delay: 1200 },
    ];

    countdownSteps.forEach((step) => {
      setTimeout(() => {
        setCountdownEra(step.era);
      }, step.delay);
    });

    const completionTimer = setTimeout(() => {
      setPhase('completed');
      document.body.style.overflow = ''; // Release scroll
      onComplete();
    }, 1600);

    return () => clearTimeout(completionTimer);
  }, [phase, onComplete]);

  // Era color maps for countdown flash
  const eraColors = {
    '2000s': { bg: '#141C2E', text: '#00D4E8' },
    '1990s': { bg: '#0D1420', text: '#028A8A' },
    '1980s': { bg: '#12111A', text: '#FF2E7E' },
    '1970s': { bg: '#1A1512', text: '#E8412A' },
  };

  return (
    <AnimatePresence>
      {phase !== 'completed' && (
        <motion.div
          key="preloader"
          initial={{ opacity: 1, scale: 1 }}
          exit={{ 
            opacity: 0, 
            scale: 1.1, 
            filter: 'blur(20px)',
            transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] } 
          }}
          style={{
            backgroundColor: countdownEra ? eraColors[countdownEra].bg : '#100e12',
            color: countdownEra ? eraColors[countdownEra].text : '#FFFFFF',
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-colors duration-300"
        >
          <div className="relative flex flex-col items-center gap-6">
            {/* Animated Logo Image */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ 
                scale: [0.85, 1.05, 0.95, 1],
                opacity: 1,
              }}
              transition={{ 
                duration: 2.2, 
                ease: 'easeInOut',
              }}
              className="relative w-28 h-28 md:w-36 md:h-36 flex items-center justify-center rounded-full bg-black/30 border border-white/10 p-2 shadow-2xl overflow-hidden"
            >
              <div className="absolute inset-0 border-2 border-dashed border-primary/40 rounded-full animate-[spin_10s_linear_infinite]" />
              <img
                src="/logo.png"
                alt="GDG CRCE Logo"
                className="w-4/5 h-4/5 object-contain"
              />
            </motion.div>

            {/* Title / Countdown */}
            <div className="h-12 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                {phase === 'drawing' ? (
                  <motion.h1
                    key="drawing-text"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    className="text-lg md:text-xl font-bold tracking-[0.2em] uppercase text-white/80"
                  >
                    GDG CRCE
                  </motion.h1>
                ) : (
                  <motion.div
                    key={`countdown-${countdownEra}`}
                    initial={{ y: 30, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1.2 }}
                    exit={{ y: -30, opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="text-3xl md:text-4xl font-extrabold tracking-wider"
                  >
                    {countdownEra}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          {/* Progress gauge bar */}
          <div className="absolute bottom-12 left-12 right-12 md:left-24 md:right-24 h-0.5 bg-white/10 overflow-hidden">
            <motion.div 
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 4.1, ease: 'linear' }}
              className="h-full bg-current"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
