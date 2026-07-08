'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useScroll, useTransform, useMotionValueEvent, motion } from 'framer-motion';
import { eras, getActiveEra, EraName, EraConfig } from '@/lib/eraTransitions';
import { eraFonts } from '@/lib/fonts';

interface EraContextType {
  activeEra: EraName;
  activeConfig: EraConfig;
  scrollProgress: number;
}

const EraContext = createContext<EraContextType | undefined>(undefined);

export function useEra() {
  const context = useContext(EraContext);
  if (!context) {
    throw new Error('useEra must be used within an EraProvider');
  }
  return context;
}

export function EraProvider({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const [activeEra, setActiveEra] = useState<EraName>('1970s');
  const [scrollProgressVal, setScrollProgressVal] = useState(0);

  // Set up 5-point color transform array mapping to the 4 era colors
  const breakpoints = [0.0, 0.25, 0.5, 0.75, 1.0];
  const bgColors = [
    eras[0].colors.bg,
    eras[1].colors.bg,
    eras[2].colors.bg,
    eras[3].colors.bg,
    eras[3].colors.bg
  ];
  const primaryColors = [
    eras[0].colors.primary,
    eras[1].colors.primary,
    eras[2].colors.primary,
    eras[3].colors.primary,
    eras[3].colors.primary
  ];
  const secondaryColors = [
    eras[0].colors.secondary,
    eras[1].colors.secondary,
    eras[2].colors.secondary,
    eras[3].colors.secondary,
    eras[3].colors.secondary
  ];
  const textColors = [
    eras[0].colors.text,
    eras[1].colors.text,
    eras[2].colors.text,
    eras[3].colors.text,
    eras[3].colors.text
  ];

  const bg = useTransform(scrollYProgress, breakpoints, bgColors);
  const primary = useTransform(scrollYProgress, breakpoints, primaryColors);
  const secondary = useTransform(scrollYProgress, breakpoints, secondaryColors);
  const text = useTransform(scrollYProgress, breakpoints, textColors);

  // Apply colors directly to CSS custom properties in the DOM
  useMotionValueEvent(bg, 'change', (latest) => {
    if (rootRef.current) rootRef.current.style.setProperty('--bg', latest);
  });
  useMotionValueEvent(primary, 'change', (latest) => {
    if (rootRef.current) rootRef.current.style.setProperty('--primary', latest);
  });
  useMotionValueEvent(secondary, 'change', (latest) => {
    if (rootRef.current) rootRef.current.style.setProperty('--secondary', latest);
  });
  useMotionValueEvent(text, 'change', (latest) => {
    if (rootRef.current) rootRef.current.style.setProperty('--text', latest);
  });

  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      setScrollProgressVal(latest);
      const active = getActiveEra(latest);
      setActiveEra(active.name);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const activeConfig = eras.find((e) => e.name === activeEra) || eras[0];

  return (
    <EraContext.Provider value={{ activeEra, activeConfig, scrollProgress: scrollProgressVal }}>
      <div
        ref={rootRef}
        id="era-root"
        style={{
          // Seed initial colors as CSS variables
          '--bg': eras[0].colors.bg,
          '--primary': eras[0].colors.primary,
          '--secondary': eras[0].colors.secondary,
          '--text': eras[0].colors.text,
        } as React.CSSProperties}
        className={`min-h-screen bg-era-bg text-era-text transition-all duration-300 ${eraFonts[activeEra].body}`}
      >
        {children}

        {/* Live Swatch Timeline Debugger - Visible only in Development */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="fixed bottom-6 left-6 z-50 pointer-events-none bg-black/80 backdrop-blur-md border border-white/10 rounded-xl p-4 flex flex-col gap-2 text-[10px] font-mono text-white/90 shadow-2xl max-w-[200px]">
            <div className="font-bold border-b border-white/10 pb-1 text-primary tracking-wider">ERA SYSTEM DEBUG</div>
            <div className="flex justify-between">
              <span>Scroll Y:</span>
              <span className="text-secondary">{(scrollProgressVal * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Active Era:</span>
              <span className="font-bold">{activeEra}</span>
            </div>
            <div className="mt-1 flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full border border-white/25" 
                  style={{ backgroundColor: 'var(--bg)' }}
                />
                <span>--bg (base)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full border border-white/25" 
                  style={{ backgroundColor: 'var(--primary)' }}
                />
                <span>--primary</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div 
                  className="w-3 h-3 rounded-full border border-white/25" 
                  style={{ backgroundColor: 'var(--secondary)' }}
                />
                <span>--secondary</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Floating Era Indicator Badge */}
        <div className="fixed bottom-6 right-6 z-50 pointer-events-none md:pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="flex items-center gap-4 px-4 py-3 rounded-xl border bg-black/40 backdrop-blur-md shadow-2xl border-white/10 text-xs font-semibold"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] tracking-widest uppercase opacity-50">Current Era</span>
              <motion.span 
                key={activeEra}
                initial={{ opacity: 0, scale: 0.9, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`text-lg font-bold tracking-wide ${eraFonts[activeEra].display}`}
              >
                {activeEra}
              </motion.span>
            </div>
            
            <div className="h-8 w-px bg-white/10" />

            <div className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest uppercase opacity-50">Aesthetic</span>
              <span className="text-white/80 font-medium">{activeConfig.label}</span>
            </div>

            <div className="h-8 w-px bg-white/10" />

            {/* Visual Dot Timeline */}
            <div className="flex gap-1.5 items-center">
              {eras.map((era) => {
                const isActive = era.name === activeEra;
                return (
                  <div
                    key={era.name}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      isActive 
                        ? 'bg-primary ring-2 ring-primary/40 scale-125' 
                        : 'bg-white/20'
                    }`}
                    title={era.name}
                  />
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </EraContext.Provider>
  );
}
