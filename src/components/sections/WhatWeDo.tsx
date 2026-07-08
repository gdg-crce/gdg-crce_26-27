'use client';

import React, { useRef, useState } from 'react';
import { motion as framerMotion } from 'framer-motion';
import { Cpu, PenTool, Palette, Users, Terminal } from 'lucide-react';
import { useEra } from '../ui/EraContext';
import { righteous, spaceGrotesk } from '@/lib/fonts';

const tracks = [
  {
    id: 1,
    icon: Cpu,
    title: 'ML & Android',
    tagline: 'INTELLIGENT MOBILE NODES',
    description: 'Developing neural networks, RAG pipelines, and native mobile interfaces using modern compiler architectures.',
    imagePath: '/elements/80s-crt-monitor.png',
    placeholderTitle: 'CRT Monitor',
    accent: 'primary',
  },
  {
    id: 2,
    icon: Terminal,
    title: 'Technology',
    tagline: 'COMPUTING FRAMEWORKS',
    description: 'Setting up core computing nodes, cluster distributions, command line compilers, and database networks.',
    imagePath: '/elements/80s-joystick.png',
    placeholderTitle: '80s Joystick',
    accent: 'secondary',
  },
  {
    id: 3,
    icon: PenTool,
    title: 'Content',
    tagline: 'TECHNICAL COPY & LOGS',
    description: 'Compiling structured developer docs, copy decks, tutorial sheets, and vintage zine collage logs.',
    imagePath: '/elements/80s-arcade-cabinet.png',
    placeholderTitle: 'Arcade Console',
    accent: 'primary',
  },
  {
    id: 4,
    icon: Palette,
    title: 'Design',
    tagline: 'GLASSMORPHIC VECTORS',
    description: 'Crafting decadal style variables, neon transitions, card border rules, and premium visual interfaces.',
    imagePath: '/elements/90s-zine-collage.png',
    placeholderTitle: 'Zine Artwork',
    accent: 'secondary',
  },
  {
    id: 5,
    icon: Users,
    title: 'Community',
    tagline: 'CAMPUS BUILDERS ORG',
    description: 'Orchestrating campus hackathons, local workshops, and student developer sprints to empower the tech ecosystem.',
    imagePath: '/elements/90s-gameboy.png',
    placeholderTitle: 'Gaming Deck',
    accent: 'primary',
  },
];

function TrackCard({ track }: { track: typeof tracks[0] }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = (e.clientX - rect.left) / width - 0.5;
    const mouseY = (e.clientY - rect.top) / height - 0.5;

    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    setTilt({
      x: -mouseY * 15,
      y: mouseX * 15,
    });
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const IconComponent = track.icon;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px' }}
      className="w-full flex"
    >
      <framerMotion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          boxShadow: hovered 
            ? track.accent === 'primary' 
              ? '0 15px 35px rgba(0,0,0,0.4), 0 0 20px var(--primary)' 
              : '0 15px 35px rgba(0,0,0,0.4), 0 0 20px var(--secondary)'
            : '0 4px 15px rgba(0,0,0,0.3)',
          borderColor: hovered 
            ? track.accent === 'primary' 
              ? 'var(--primary)' 
              : 'var(--secondary)'
            : 'rgba(255, 255, 255, 0.08)',
        }}
        className="w-full bg-[#1b2330]/40 backdrop-blur-md border rounded-2xl p-6 flex flex-col justify-between overflow-hidden relative group text-left min-h-[390px] flex-grow shadow-lg"
        style={{ borderWidth: '1.5px' }}
      >
        {/* Sheen Overlay */}
        {hovered && (
          <div
            className="absolute pointer-events-none -inset-px rounded-2xl opacity-15 transition-opacity duration-300"
            style={{
              background: `radial-gradient(150px circle at ${mousePos.x}px ${mousePos.y}px, var(--text), transparent)`,
            }}
          />
        )}

        <div className="absolute inset-0 dither-pattern pointer-events-none group-hover:opacity-20 transition-opacity" />

        <div className="flex flex-col gap-4 z-10">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 group-hover:border-primary transition-colors">
            <IconComponent 
              className={`w-6 h-6 transition-all duration-300 ${
                hovered 
                  ? 'animate-pulse text-primary' 
                  : 'text-white/70'
              }`} 
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <span className={`text-[9px] tracking-widest font-bold uppercase opacity-55 ${
              track.accent === 'primary' ? 'text-primary' : 'text-secondary'
            }`}>
              {track.tagline}
            </span>
            <h3 className={`text-lg font-bold tracking-wide ${righteous.className}`}>
              {track.title}
            </h3>
          </div>
          
          <p className={`text-xs md:text-sm leading-relaxed opacity-70 group-hover:opacity-95 transition-opacity font-sans`}>
            {track.description}
          </p>
        </div>

        {/* Embedded Image Slot with dashed border fallback */}
        <div className="relative w-full h-24 rounded-lg border border-dashed border-white/10 bg-black/30 flex flex-col items-center justify-center p-2 mt-4 overflow-hidden group-hover:border-primary/30 transition-colors z-10">
          <img
            src={track.imagePath}
            alt={track.placeholderTitle}
            className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 p-1"
            onLoad={(e) => (e.currentTarget.style.opacity = '0.7')}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <div className="flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white/55">{track.placeholderTitle}</span>
            <span className="text-[7px] font-mono opacity-30 mt-0.5">[Image Slot]</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5 z-10 text-[9px] font-mono">
          <span className="opacity-45">Track Module</span>
          <span className={`font-bold uppercase tracking-widest cursor-pointer ${
            track.accent === 'primary' ? 'text-primary' : 'text-secondary'
          }`}>
            Connect ➔
          </span>
        </div>
      </framerMotion.div>
    </div>
  );
}

const marqueeWords = [
  'ML & ANDROID', 'CORE TECHNOLOGY', 'CONTENT MODULE', 'DESIGN STACK', 'COMMUNITY RUNNERS', 'OPEN SOURCE', 
  'NEXT.JS APP ROUTER', 'GEMINI PRO', 'THREE.JS', 'RETRO FUTURE', 'KINETIC MOTION'
];

export default function WhatWeDo() {
  const { activeEra } = useEra();

  return (
    <section
      id="what-we-do"
      className="relative min-h-screen py-24 px-6 md:px-12 flex flex-col items-center justify-center overflow-hidden border-t border-white/5 bg-black/10"
    >
      <div className="crt-scanlines opacity-[0.2]" />

      <div className="max-w-[1280px] w-full flex flex-col gap-12 z-10 px-4 md:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-xl text-left">
            <span className={`text-xs md:text-sm tracking-[0.3em] uppercase text-primary font-bold ${spaceGrotesk.className}`}>
              Our Verticals
            </span>
            <h2 className={`text-3xl md:text-5xl font-bold tracking-tight ${righteous.className}`}>
              Insert Coin. Pick Your Track.
            </h2>
          </div>
          <p className={`text-sm md:text-base opacity-75 max-w-sm text-left md:text-right ${spaceGrotesk.className}`}>
            GDG CRCE teams cover all tech stacks. Pick your track, connect to our workspace modules, and drop code.
          </p>
        </div>

        {/* 5-column grid on desktop, fully responsive and spaced */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-stretch justify-items-center">
          {tracks.map((track) => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      </div>

      {/* Ticker at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 py-4 bg-black/60 border-t border-b border-white/5 overflow-hidden flex whitespace-nowrap z-10">
        <framerMotion.div
          animate={{ x: [0, -1200] }}
          transition={{
            ease: 'linear',
            duration: 30,
            repeat: Infinity,
          }}
          className={`flex gap-16 font-semibold tracking-[0.25em] text-xs text-primary ${righteous.className}`}
        >
          {[...marqueeWords, ...marqueeWords, ...marqueeWords].map((word, idx) => (
            <span key={idx} className="flex items-center gap-3">
              <span>★</span>
              <span>{word}</span>
            </span>
          ))}
        </framerMotion.div>
      </div>
    </section>
  );
}
