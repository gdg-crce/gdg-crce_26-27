'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Power, Mail } from 'lucide-react';
import { GithubIcon as Github, LinkedinIcon as Linkedin, TwitterIcon as Twitter } from '../ui/BrandIcons';
import dynamic from 'next/dynamic';
import { useEra } from '../ui/EraContext';
import { orbitron, outfit } from '@/lib/fonts';

const CyberParticles3D = dynamic(() => import('../three/CyberParticles3D'), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-transparent -z-10" />,
});

export default function Footer() {
  const { activeEra } = useEra();
  const [formState, setFormState] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name || !formState.email || !formState.message) return;
    
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormState({ name: '', email: '', message: '' });
    }, 4500);
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer
      id="footer"
      className="relative py-12 px-6 md:px-12 flex flex-col items-center justify-between overflow-hidden border-t border-white/10 bg-[#141C2E]/80 z-10"
    >
      {/* R3F Cyber Particles background layer */}
      <CyberParticles3D />

      {/* Main Grid: Multi-Column layout with responsive wrapping */}
      <div className="max-w-[1280px] w-full grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start z-10 px-4 md:px-8">
        
        {/* Left Column: Brand & Info */}
        <div className="md:col-span-6 lg:col-span-4 flex flex-col gap-4 text-left">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full border border-primary flex items-center justify-center bg-black/50 shadow-[0_0_12px_rgba(var(--primary-rgb),0.25)] overflow-hidden p-1">
                <img src="/logo.png" alt="GDG CRCE" className="w-full h-full object-contain" />
              </div>
              <span className={`text-base font-bold tracking-[0.2em] ${orbitron.className}`}>
                GDG CRCE
              </span>
            </div>
            <p className="text-[11px] opacity-75 leading-relaxed font-sans mt-1">
              Google Developer Group chapter of Fr. Conceicao Rodrigues College of Engineering. Supporting student developers since the dawn of compilers.
            </p>
          </div>
          
          <div className="flex flex-col gap-1.5 text-xs text-left">
            <span className="font-semibold text-secondary uppercase tracking-widest text-[8px]">Transmission Node</span>
            <div className="flex items-center gap-2 font-mono opacity-90 text-[11px]">
              <Mail size={12} className="text-secondary" />
              <span className="hover:text-secondary transition-colors">gdg@crce.edu</span>
            </div>
          </div>
        </div>

        {/* Middle Column: Nav Map */}
        <div className="md:col-span-6 lg:col-span-3 flex flex-col gap-3 text-left">
          <span className="text-[9px] font-bold tracking-widest uppercase opacity-50 border-b border-white/5 pb-1">Directory Map</span>
          <div className="flex flex-col gap-2.5 text-[11px] font-semibold">
            <a href="#home" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <span>➔</span> Start Terminal
            </a>
            <a href="#about" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <span>➔</span> About Us
            </a>
            <a href="#what-we-do" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <span>➔</span> Verticals
            </a>
            <a href="#events" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <span>➔</span> Timeline Logs
            </a>
            <a href="#council" className="hover:text-primary transition-colors flex items-center gap-1.5">
              <span>➔</span> GDG CRCE Council
            </a>
          </div>
        </div>

        {/* Right Column: Compact Glossy Form */}
        <div className="md:col-span-12 lg:col-span-5 w-full mt-4 lg:mt-0">
          <div 
            className="w-full bg-black/40 border border-white/15 rounded-2xl p-5 md:p-6 relative shadow-2xl backdrop-blur-lg"
            style={{
              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.08)',
            }}
          >
            <h3 className={`text-[10px] font-bold tracking-widest text-white mb-4 uppercase ${orbitron.className}`}>
              Send Transmission
            </h3>

            {submitted ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-6 text-center gap-3"
              >
                <div className="w-10 h-10 rounded-full border border-secondary flex items-center justify-center text-secondary shadow-[0_0_12px_var(--secondary)]">
                  ✓
                </div>
                <span className="text-[10px] font-bold tracking-wider font-mono">TRANSMISSION SENT</span>
                <p className="text-[9px] opacity-70 max-w-[200px]">
                  Signal reached CRCE command core. Standby.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                  <input
                    type="text"
                    required
                    placeholder="NAME"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/35 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/25 transition-all font-mono shadow-inner"
                  />
                  <input
                    type="email"
                    required
                    placeholder="EMAIL"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/35 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/25 transition-all font-mono shadow-inner"
                  />
                </div>
                <textarea
                  rows={2}
                  required
                  placeholder="PAYLOAD MESSAGE..."
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  className="w-full bg-black/60 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/35 focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/25 transition-all font-mono resize-none shadow-inner"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-secondary hover:bg-secondary/95 text-black font-extrabold text-[9px] tracking-[0.25em] uppercase rounded-xl transition-all shadow-[0_2px_12px_rgba(0,212,232,0.3)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span>SEND SIGNAL</span>
                  <Send size={10} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Sub-Footer Directory (Tightened margins) */}
      <div className="w-full max-w-[1280px] border-t border-white/10 pt-6 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 px-4 md:px-8 z-10 text-[9px]">
        <div className="flex flex-col gap-0.5 md:text-left text-center opacity-65">
          <span className="font-bold tracking-wider font-mono">GDG CRCE // 2026</span>
          <span>Google Developer Group Fr. Conceicao Rodrigues College of Engineering. All rights reserved.</span>
        </div>

        {/* Standby Power Button (Center Anchor) */}
        <div className="flex flex-col items-center gap-1 order-first md:order-none">
          <button
            onClick={handleBackToTop}
            className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-all text-secondary hover:text-[#00ff88] group cursor-pointer"
            style={{
              boxShadow: '0 0 10px rgba(0,212,232,0.15), inset 0 1px 1px rgba(255,255,255,0.05)',
            }}
            aria-label="Back to top"
          >
            <Power 
              size={13} 
              className="group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300" 
            />
          </button>
          <span className="text-[6px] tracking-widest font-mono opacity-50 uppercase">STANDBY / TOP</span>
        </div>

        <div className="flex gap-4 items-center justify-center">
          {[
            { icon: Github, href: '#' },
            { icon: Linkedin, href: '#' },
            { icon: Twitter, href: '#' },
          ].map((soc, idx) => {
            const Icon = soc.icon;
            return (
              <a
                key={idx}
                href={soc.href}
                className="opacity-70 hover:opacity-100 hover:text-secondary transition-colors"
                aria-label="Social Link"
              >
                <Icon className="w-3.5 h-3.5" />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
