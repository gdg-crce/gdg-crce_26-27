'use client';

import React, { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Cpu, PenTool, Palette, Users, Terminal } from 'lucide-react';
import { righteous, spaceGrotesk } from '@/lib/fonts';

const tracks = [
  {
    id: 1,
    icon: Cpu,
    title: 'ML & Android',
    tagline: 'Intelligent Mobile Nodes',
    description: 'Neural networks, RAG pipelines, and native mobile interfaces using modern compiler architectures.',
    imagePath: '/elements/80s-crt-monitor.png',
    accent: 'primary' as const,
  },
  {
    id: 2,
    icon: Terminal,
    title: 'Technology',
    tagline: 'Computing Frameworks',
    description: 'Core computing nodes, cluster distributions, command line compilers, and database networks.',
    imagePath: '/elements/80s-joystick.png',
    accent: 'secondary' as const,
  },
  {
    id: 3,
    icon: PenTool,
    title: 'Content',
    tagline: 'Technical Copy & Logs',
    description: 'Structured developer docs, copy decks, tutorial sheets, and vintage zine collage logs.',
    imagePath: '/elements/80s-arcade-cabinet.png',
    accent: 'primary' as const,
  },
  {
    id: 4,
    icon: Palette,
    title: 'Design',
    tagline: 'Glassmorphic Vectors',
    description: 'Decadal style variables, neon transitions, card border rules, and premium visual interfaces.',
    imagePath: '/elements/90s-zine-collage.png',
    accent: 'secondary' as const,
  },
  {
    id: 5,
    icon: Users,
    title: 'Community',
    tagline: 'Campus Builders Org',
    description: 'Campus hackathons, local workshops, and student developer sprints powering the tech ecosystem.',
    imagePath: '/elements/90s-gameboy.png',
    accent: 'primary' as const,
  },
];

function TrackCard({ track, index }: { track: typeof tracks[0]; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(cardRef, { once: true, amount: 0.3 });
  const [hovered, setHovered] = useState(false);

  const IconComponent = track.icon;
  const isPrimary = track.accent === 'primary';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{
        type: 'spring',
        stiffness: 80,
        damping: 18,
        delay: index * 0.08,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/[0.06]"
      style={{
        minHeight: '320px',
        boxShadow: hovered
          ? '0 20px 50px rgba(0,0,0,0.5)'
          : '0 4px 20px rgba(0,0,0,0.2)',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.img
          src={track.imagePath}
          alt={track.title}
          className="w-full h-full object-contain p-10 transition-all duration-700"
          style={{
            opacity: hovered ? 0.2 : 0.4,
            scale: hovered ? 1.1 : 1,
          }}
          animate={{
            scale: hovered ? 1.08 : 1,
            opacity: hovered ? 0.2 : 0.4,
          }}
          transition={{ duration: 0.5 }}
          draggable={false}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      </div>

      {/* Content — always visible at bottom */}
      <div className="absolute inset-0 z-10 flex flex-col justify-end p-5 sm:p-6">
        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10 transition-all duration-300"
            style={{
              background: hovered
                ? isPrimary
                  ? 'color-mix(in srgb, var(--primary) 20%, transparent)'
                  : 'color-mix(in srgb, var(--secondary) 20%, transparent)'
                : 'rgba(255,255,255,0.06)',
            }}
          >
            <IconComponent
              className="w-5 h-5 transition-colors duration-300"
              style={{
                color: hovered
                  ? isPrimary ? 'var(--primary)' : 'var(--secondary)'
                  : 'rgba(255,255,255,0.6)',
              }}
            />
          </div>
          <div>
            <span
              className={`text-[8px] tracking-[0.2em] uppercase font-bold block ${spaceGrotesk.className}`}
              style={{ color: isPrimary ? 'var(--primary)' : 'var(--secondary)' }}
            >
              {track.tagline}
            </span>
            <h3 className={`text-lg font-bold tracking-wide ${righteous.className}`}>
              {track.title}
            </h3>
          </div>
        </div>

        {/* Description — slides up on hover */}
        <motion.div
          initial={false}
          animate={{
            height: hovered ? 'auto' : 0,
            opacity: hovered ? 1 : 0,
            marginTop: hovered ? 8 : 0,
          }}
          transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="overflow-hidden"
        >
          <p className={`text-xs sm:text-sm leading-relaxed opacity-80 ${spaceGrotesk.className}`}>
            {track.description}
          </p>
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
            <span className="text-[9px] font-mono opacity-40">Track Module</span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: isPrimary ? 'var(--primary)' : 'var(--secondary)' }}
            >
              Connect →
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

const marqueeWords = [
  'ML & ANDROID', 'CORE TECHNOLOGY', 'CONTENT MODULE', 'DESIGN STACK', 'COMMUNITY RUNNERS', 'OPEN SOURCE',
  'NEXT.JS APP ROUTER', 'GEMINI PRO', 'THREE.JS', 'RETRO FUTURE', 'KINETIC MOTION'
];

export default function WhatWeDo() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, amount: 0.5 });

  return (
    <section
      id="what-we-do"
      className="relative py-24 lg:py-32 px-6 sm:px-10 md:px-16 flex flex-col items-center overflow-hidden"
    >
      <div className="crt-scanlines opacity-[0.12]" />

      <div className="max-w-[1100px] w-full flex flex-col gap-14 z-10">

        {/* Section Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div className="flex flex-col gap-2 max-w-xl text-left">
            <span
              className={`text-xs md:text-sm tracking-[0.3em] uppercase font-bold ${spaceGrotesk.className}`}
              style={{ color: 'var(--primary)' }}
            >
              Our Verticals
            </span>
            <h2 className={`text-3xl md:text-5xl font-bold tracking-tight leading-tight ${righteous.className}`}>
              Pick Your Track.
            </h2>
          </div>
          <p className={`text-sm md:text-base opacity-65 max-w-sm text-left md:text-right ${spaceGrotesk.className}`}>
            GDG CRCE teams cover all tech stacks. Pick your track, connect to our workspace, and ship code.
          </p>
        </motion.div>

        {/* Card Grid — 2-column on desktop, 1-column on mobile, last card spans full on odd count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
          {tracks.map((track, idx) => (
            <div
              key={track.id}
              className={idx === tracks.length - 1 && tracks.length % 2 !== 0 ? 'sm:col-span-2' : ''}
            >
              <TrackCard track={track} index={idx} />
            </div>
          ))}
        </div>
      </div>

      {/* Marquee Ticker */}
      <div className="absolute bottom-0 left-0 right-0 py-3.5 bg-black/60 border-t border-b border-white/5 overflow-hidden flex whitespace-nowrap z-10">
        <motion.div
          animate={{ x: [0, -1200] }}
          transition={{ ease: 'linear', duration: 30, repeat: Infinity }}
          className={`flex gap-14 font-semibold tracking-[0.25em] text-xs ${righteous.className}`}
          style={{ color: 'var(--primary)' }}
        >
          {[...marqueeWords, ...marqueeWords, ...marqueeWords].map((word, idx) => (
            <span key={idx} className="flex items-center gap-3">
              <span>★</span>
              <span>{word}</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
