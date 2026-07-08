'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEra } from './EraContext';
import { eraFonts } from '@/lib/fonts';

export default function Navbar() {
  const { activeEra } = useEra();
  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(1200);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName !== 'A' && target.tagName !== 'IMG') {
      setIsOpen((prev) => !prev);
    }
  };

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <motion.div
      ref={navRef}
      onClick={handleToggle}
      layout
      style={{
        width: isOpen ? (windowWidth < 768 ? '94vw' : '780px') : '60px',
        borderRadius: '9999px',
        boxShadow: isOpen 
          ? '0 25px 50px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.18)' 
          : '0 5px 15px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.05)',
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 27,
      }}
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-between px-4 h-14 cursor-pointer select-none transition-colors duration-300 ${
        isOpen ? 'hover:bg-black/85' : 'hover:border-primary/50'
      }`}
    >
      {/* Left Menu Links */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-6 md:gap-10 pl-4 md:pl-8"
          >
            <a 
              href="#about" 
              onClick={handleLinkClick}
              className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest text-white/80 hover:text-primary transition-colors cursor-pointer"
            >
              About
            </a>
            <a 
              href="#what-we-do" 
              onClick={handleLinkClick}
              className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest text-white/80 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              What We Do
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Logo Mark (Direct Logo Image, Larger, No Circles) */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <motion.img 
          src="/logo.png" 
          alt="GDG CRCE" 
          className="h-10 w-auto object-contain hover:scale-110 transition-transform"
          animate={isOpen ? { scale: 1 } : { scale: [1, 1.06, 1] }}
          transition={isOpen ? {} : { repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        />
      </div>

      {/* Right Menu Links */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-6 md:gap-10 pr-4 md:pl-8"
          >
            <a 
              href="#events" 
              onClick={handleLinkClick}
              className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest text-white/80 hover:text-primary transition-colors cursor-pointer"
            >
              Events
            </a>
            <a 
              href="#council" 
              onClick={handleLinkClick}
              className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest text-white/80 hover:text-primary transition-colors cursor-pointer whitespace-nowrap"
            >
              GDG CRCE
            </a>
            <a 
              href="#footer" 
              onClick={handleLinkClick}
              className="text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest text-white/80 hover:text-primary transition-colors cursor-pointer"
            >
              Contact
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
