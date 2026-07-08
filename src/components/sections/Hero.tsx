'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useSpring } from 'framer-motion';
import { fraunces, jakarta } from '@/lib/fonts';

const words = ['build', 'innovate', 'lead'];

// Floating retro objects — positioned to AVOID the center text zone
const floatingObjects = [
  {
    src: '/elements/70s-vinyl-record.png',
    alt: 'Vinyl Record',
    className: 'top-[8%] left-[3%] w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40',
    parallaxSpeed: 0.3,
    spin: true,
    spinDuration: 14,
    delay: 0.2,
    floatAmp: 12,
    floatDur: 6,
  },
  {
    src: '/elements/70s-boombox.png',
    alt: 'Boombox',
    className: 'top-[6%] right-[3%] w-20 h-20 sm:w-28 sm:h-28 lg:w-36 lg:h-36',
    parallaxSpeed: 0.5,
    spin: false,
    spinDuration: 0,
    delay: 0.4,
    floatAmp: 18,
    floatDur: 7,
  },
  {
    src: '/elements/70s-lava-lamp.png',
    alt: 'Lava Lamp',
    className: 'bottom-[18%] left-[4%] w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28',
    parallaxSpeed: 0.7,
    spin: false,
    spinDuration: 0,
    delay: 0.6,
    floatAmp: 10,
    floatDur: 5,
  },
  {
    src: '/elements/80s-cassette-tape.png',
    alt: 'Cassette Tape',
    className: 'bottom-[18%] right-[4%] w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28',
    parallaxSpeed: 0.45,
    spin: false,
    spinDuration: 0,
    delay: 0.8,
    floatAmp: 14,
    floatDur: 8,
  },
];

export default function Hero() {
  const [wordIdx, setWordIdx] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIdx((prev) => (prev + 1) % words.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Mouse-reactive tilt
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  const tiltX = useSpring(0, { stiffness: 60, damping: 20 });
  const tiltY = useSpring(0, { stiffness: 60, damping: 20 });

  useEffect(() => {
    tiltX.set(mousePos.y * -3);
    tiltY.set(mousePos.x * 3);
  }, [mousePos, tiltX, tiltY]);

  return (
    <section
      ref={sectionRef}
      id="home"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 sm:px-10 md:px-16"
    >
      {/* Atmospheric Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="film-grain opacity-[0.04]" />
        <div className="absolute inset-0 dither-pattern opacity-[0.03]" />

        <motion.div
          animate={{
            scale: [1, 1.3, 0.9, 1],
            x: [0, 100, -80, 0],
            y: [0, -60, 50, 0],
            opacity: [0.12, 0.22, 0.12],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[450px] h-[450px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{
            scale: [1.2, 0.9, 1.2, 1.2],
            x: [0, -80, 100, 0],
            y: [0, 80, -50, 0],
            opacity: [0.1, 0.18, 0.1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full blur-[160px]"
          style={{ background: 'radial-gradient(circle, var(--secondary) 0%, transparent 70%)' }}
        />
      </div>

      {/* Floating Objects — Positioned in corners, AWAY from text */}
      {floatingObjects.map((obj, idx) => {
        const yOffset = useTransform(scrollYProgress, [0, 1], [0, -180 * obj.parallaxSpeed]);
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.4, y: 60 }}
            animate={{ opacity: 0.85, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 70, damping: 14, delay: obj.delay }}
            style={{ y: yOffset }}
            className={`absolute ${obj.className} z-[1] pointer-events-none`}
          >
            <motion.div
              animate={{ y: [-obj.floatAmp, obj.floatAmp, -obj.floatAmp] }}
              transition={{ duration: obj.floatDur, repeat: Infinity, ease: 'easeInOut' }}
            >
              <img
                src={obj.src}
                alt={obj.alt}
                className="w-full h-full object-contain drop-shadow-2xl select-none"
                style={{
                  animation: obj.spin ? `spin ${obj.spinDuration}s linear infinite` : undefined,
                  filter: 'drop-shadow(0 15px 30px rgba(0,0,0,0.4))',
                }}
                draggable={false}
              />
            </motion.div>
          </motion.div>
        );
      })}

      {/* 3D Perspective Content Wrapper */}
      <motion.div
        style={{ perspective: 1200, rotateX: tiltX, rotateY: tiltY }}
        className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl py-24"
      >
        {/* Subtitle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className={`text-[10px] sm:text-xs md:text-sm tracking-[0.4em] uppercase font-bold mb-6 ${jakarta.className}`}
          style={{ color: 'var(--primary)' }}
        >
          Google Developer Group — CRCE
        </motion.div>

        {/* Main Headline — words separated with real spacing */}
        <h1
          className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black leading-[1.1] tracking-tight text-center ${fraunces.className}`}
          style={{ wordSpacing: '0.12em' }}
        >
          {['Where', 'college', 'builders', 'begin', 'their'].map((word, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + 0.06 * idx, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="inline"
            >
              {word}{' '}
            </motion.span>
          ))}

          {/* Cycling Verb */}
          <span className="block mt-2 sm:mt-3 h-[1.15em] overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.span
                key={words[wordIdx]}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute inset-0 font-black uppercase text-center"
                style={{
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {words[wordIdx]}.
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className={`text-sm md:text-base lg:text-lg leading-relaxed opacity-70 max-w-xl mt-8 text-center ${jakarta.className}`}
        >
          A student tech community bridging analog origins to digital futures.
          Journey through 1970s warmth, 1980s neon, 1990s grunge, and Y2K gloss.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 1.0 }}
          className="flex flex-wrap gap-4 mt-8 justify-center"
        >
          <a
            href="#about"
            className="px-7 py-3 rounded-full text-sm font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 hover:shadow-lg"
            style={{
              background: 'var(--primary)',
              color: 'var(--bg)',
              boxShadow: '0 0 25px color-mix(in srgb, var(--primary) 30%, transparent)',
            }}
          >
            Explore
          </a>
          <a
            href="#what-we-do"
            className="px-7 py-3 rounded-full text-sm font-bold tracking-wider uppercase border transition-all duration-300 hover:scale-105"
            style={{
              borderColor: 'color-mix(in srgb, var(--text) 25%, transparent)',
              color: 'var(--text)',
            }}
          >
            Our Tracks
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll Cue */}
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 1, repeat: Infinity, repeatType: 'reverse' }}
        className="absolute bottom-8 flex flex-col items-center gap-1.5 cursor-pointer z-20"
        onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
      >
        <span className={`text-[9px] tracking-[0.3em] uppercase opacity-50 ${jakarta.className}`}>
          Scroll
        </span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-50">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </motion.div>
    </section>
  );
}
