'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { fraunces, jakarta } from '@/lib/fonts';

interface ValueData {
  label: string;
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';
}

const values: ValueData[] = [
  {
    label: 'We Ideate',
    title: 'Sparking Creative Solutions',
    description:
      'We brainstorm original ideas, explore emerging technologies, and cultivate creative thinking to solve real-world problems. From weekend hackathons to structured design sprints, every idea gets a chance to breathe.',
    imageSrc: '/elements/80s-crt-monitor.png',
    imageAlt: '1980s CRT Monitor',
    imagePosition: 'left',
  },
  {
    label: 'We Communicate',
    title: 'Building Bridges Through Dialogue',
    description:
      'We foster intelligent discourse and dynamic exchange through tech talks, workshops, and open forums. Knowledge flows freely — from senior mentors to first-year freshers — creating a culture of shared growth.',
    imageSrc: '/elements/80s-polaroid-camera.png',
    imageAlt: '1980s Polaroid Camera',
    imagePosition: 'right',
  },
  {
    label: 'We Collaborate',
    title: 'Stronger Together, Building Further',
    description:
      'We work side by side on projects that matter — open source contributions, campus-wide apps, and community-driven tools. Our teams span every discipline, united by a passion for building what\'s next.',
    imageSrc: '/elements/90s-gameboy.png',
    imageAlt: '1990s Game Boy',
    imagePosition: 'left',
  },
];

function ValuePanel({ value, index }: { value: ValueData; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.35 });

  const isImageLeft = value.imagePosition === 'left';

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6, delay: 0.1 }}
      className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full ${
        index > 0 ? 'mt-20 lg:mt-28' : ''
      }`}
    >
      {/* Image Side */}
      <motion.div
        initial={{ opacity: 0, x: isImageLeft ? -80 : 80, scale: 0.9 }}
        animate={isInView ? { opacity: 1, x: 0, scale: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`flex items-center justify-center relative ${!isImageLeft ? 'lg:order-2' : ''}`}
      >
        {/* Floating image with gentle bob */}
        <motion.div
          animate={{ y: [-8, 8, -8] }}
          transition={{ duration: 5 + index, repeat: Infinity, ease: 'easeInOut' }}
          className="relative"
        >
          <img
            src={value.imageSrc}
            alt={value.imageAlt}
            className="w-40 h-40 sm:w-52 sm:h-52 lg:w-64 lg:h-64 object-contain drop-shadow-2xl"
            style={{ filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.45))' }}
            draggable={false}
          />
          {/* Glow behind image */}
          <div
            className="absolute inset-0 rounded-full blur-[70px] -z-10 opacity-20"
            style={{ background: index % 2 === 0 ? 'var(--primary)' : 'var(--secondary)' }}
          />
        </motion.div>
      </motion.div>

      {/* Text Side */}
      <motion.div
        initial={{ opacity: 0, x: isImageLeft ? 50 : -50 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
        className={`flex flex-col gap-4 ${!isImageLeft ? 'lg:order-1 lg:text-right' : 'text-left'}`}
      >
        <span
          className={`text-[10px] sm:text-xs tracking-[0.4em] uppercase font-bold ${jakarta.className}`}
          style={{ color: 'var(--primary)' }}
        >
          {value.label}
        </span>
        <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight ${fraunces.className}`}>
          {value.title}
        </h3>
        <p className={`text-sm md:text-base leading-relaxed opacity-70 max-w-md ${
          !isImageLeft ? 'lg:ml-auto' : ''
        } ${jakarta.className}`}>
          {value.description}
        </p>
        <motion.div
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
          className="h-px w-20 mt-1 origin-left"
          style={{
            background: 'var(--primary)',
            alignSelf: !isImageLeft ? 'flex-end' : 'flex-start',
            transformOrigin: !isImageLeft ? 'right' : 'left',
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true, amount: 0.5 });

  return (
    <section
      ref={sectionRef}
      id="about"
      className="relative py-24 lg:py-32 px-6 sm:px-10 md:px-16 flex flex-col items-center overflow-hidden"
    >
      {/* Section Header */}
      <motion.div
        ref={headerRef}
        initial={{ opacity: 0, y: 30 }}
        animate={headerInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex flex-col items-center text-center gap-3 mb-16 lg:mb-24 max-w-2xl"
      >
        <span
          className={`text-[10px] sm:text-xs tracking-[0.4em] uppercase font-bold ${jakarta.className}`}
          style={{ color: 'var(--primary)' }}
        >
          Who We Are
        </span>
        <h2 className={`text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight ${fraunces.className}`}>
          Bridging Tech Eras, Building Futures
        </h2>
        <p className={`text-sm md:text-base opacity-65 mt-1 max-w-lg ${jakarta.className}`}>
          Google Developer Group CRCE is a student tech community dedicated to
          fostering innovation, design thinking, and collaborative engineering.
        </p>
      </motion.div>

      {/* Value Panels — Alternating image/text layout with scroll-triggered reveals */}
      <div className="max-w-[1100px] w-full flex flex-col">
        {values.map((value, idx) => (
          <ValuePanel key={idx} value={value} index={idx} />
        ))}
      </div>
    </section>
  );
}
