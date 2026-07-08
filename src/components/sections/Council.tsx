'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { GithubIcon as Github, LinkedinIcon as Linkedin, TwitterIcon as Twitter } from '../ui/BrandIcons';
import { useEra } from '../ui/EraContext';
import { orbitron, outfit } from '@/lib/fonts';

interface SeniorMember {
  id: number;
  name: string;
  role: string;
  avatarLetter: string;
  github: string;
  linkedin: string;
  twitter: string;
  colorClass: string;
}

interface JuniorMember {
  id: number;
  name: string;
  role: string;
  avatarLetter: string;
  colorClass: string;
}

const seniorCouncil: SeniorMember[] = [
  {
    id: 1,
    name: 'ROHAN SHARMA',
    role: 'PRESIDENT / AI RESEARCH',
    avatarLetter: 'R',
    github: '#',
    linkedin: '#',
    twitter: '#',
    colorClass: 'from-orange-500/20 to-red-500/30',
  },
  {
    id: 2,
    name: 'ANANYA SEN',
    role: 'VICE PRESIDENT / WEB LEAD',
    avatarLetter: 'A',
    github: '#',
    linkedin: '#',
    twitter: '#',
    colorClass: 'from-blue-500/20 to-teal-500/30',
  },
  {
    id: 3,
    name: 'KABIR MEHRA',
    role: 'TECHNICAL DIRECTOR / CLOUD',
    avatarLetter: 'K',
    github: '#',
    linkedin: '#',
    twitter: '#',
    colorClass: 'from-indigo-500/20 to-purple-500/30',
  },
  {
    id: 4,
    name: 'SARA KHAN',
    role: 'DESIGN HEAD / CREATIVE',
    avatarLetter: 'S',
    github: '#',
    linkedin: '#',
    twitter: '#',
    colorClass: 'from-pink-500/20 to-orange-500/30',
  },
  {
    id: 5,
    name: 'DEV PATEL',
    role: 'PROJECTS COMPILER LEAD',
    avatarLetter: 'D',
    github: '#',
    linkedin: '#',
    twitter: '#',
    colorClass: 'from-teal-500/20 to-emerald-500/30',
  },
  {
    id: 6,
    name: 'RIYA SINGHAL',
    role: 'EDITORIAL & COPY HEAD',
    avatarLetter: 'R',
    github: '#',
    linkedin: '#',
    twitter: '#',
    colorClass: 'from-yellow-500/20 to-amber-500/30',
  },
  {
    id: 7,
    name: 'AYAAN QURESHI',
    role: 'WEB CORE ARCHITECT',
    avatarLetter: 'A',
    github: '#',
    linkedin: '#',
    twitter: '#',
    colorClass: 'from-cyan-500/20 to-blue-500/30',
  },
  {
    id: 8,
    name: 'MEERA JOSHI',
    role: 'PR & BRAND MARKETING',
    avatarLetter: 'M',
    github: '#',
    linkedin: '#',
    twitter: '#',
    colorClass: 'from-red-500/20 to-pink-500/30',
  },
];

const juniorCouncil: JuniorMember[] = [
  { id: 1, name: 'Aryan Shah', role: 'Tech Associate', avatarLetter: 'AS', colorClass: 'from-orange-500/10 to-red-500/20' },
  { id: 2, name: 'Diya Verma', role: 'Web Associate', avatarLetter: 'DV', colorClass: 'from-blue-500/10 to-teal-500/20' },
  { id: 3, name: 'Neel Kothari', role: 'Design Associate', avatarLetter: 'NK', colorClass: 'from-pink-500/10 to-orange-500/20' },
  { id: 4, name: 'Simran Gill', role: 'PR Associate', avatarLetter: 'SG', colorClass: 'from-yellow-500/10 to-amber-500/20' },
  { id: 5, name: 'Hrithik Roy', role: 'Projects Associate', avatarLetter: 'HR', colorClass: 'from-indigo-500/10 to-purple-500/20' },
  { id: 6, name: 'Yash Malhotra', role: 'Tech Associate', avatarLetter: 'YM', colorClass: 'from-teal-500/10 to-emerald-500/20' },
  { id: 7, name: 'Tanvi Rao', role: 'Web Associate', avatarLetter: 'TR', colorClass: 'from-cyan-500/10 to-blue-500/20' },
  { id: 8, name: 'Ishaan Gupta', role: 'Design Associate', avatarLetter: 'IG', colorClass: 'from-red-500/10 to-pink-500/20' },
  { id: 9, name: 'Kirti Bhatia', role: 'PR Associate', avatarLetter: 'KB', colorClass: 'from-orange-500/10 to-red-500/20' },
  { id: 10, name: 'Rohan Deshmukh', role: 'Projects Associate', avatarLetter: 'RD', colorClass: 'from-indigo-500/10 to-purple-500/20' },
  { id: 11, name: 'Zoya Ahmed', role: 'Tech Associate', avatarLetter: 'ZA', colorClass: 'from-blue-500/10 to-teal-500/20' },
  { id: 12, name: 'Varun Nair', role: 'Web Associate', avatarLetter: 'VN', colorClass: 'from-teal-500/10 to-emerald-500/20' },
  { id: 13, name: 'Neha Kamath', role: 'Design Associate', avatarLetter: 'NK', colorClass: 'from-yellow-500/10 to-amber-500/20' },
  { id: 14, name: 'Samarth Sen', role: 'PR Associate', avatarLetter: 'SS', colorClass: 'from-pink-500/10 to-orange-500/20' },
  { id: 15, name: 'Pooja Hegde', role: 'Projects Associate', avatarLetter: 'PH', colorClass: 'from-cyan-500/10 to-blue-500/20' },
];

function SeniorCard({ member }: { member: SeniorMember }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -y * 0.12,
      y: x * 0.12,
    });
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px' }}
      className="w-full flex"
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          borderColor: hovered ? 'var(--secondary)' : 'rgba(255, 255, 255, 0.08)',
          boxShadow: hovered 
            ? '0 20px 40px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.2)' 
            : '0 4px 15px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.05)',
        }}
        className="w-full bg-[#1b2330]/45 backdrop-blur-md border rounded-2xl p-6 flex flex-col items-center justify-between gap-5 relative overflow-hidden group shadow-2xl flex-grow text-center min-h-[290px]"
        style={{ borderWidth: '1.5px' }}
      >
        <motion.div
          initial={{ x: '-150%' }}
          animate={hovered ? { x: '150%' } : { x: '-150%' }}
          transition={{ duration: 0.75, ease: 'easeInOut' }}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0) 30%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 70%)',
          }}
        />

        <div className={`relative w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-tr ${member.colorClass} border border-white/20 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-300`}>
          <span className={`text-2xl font-extrabold text-white/95 ${orbitron.className}`}>
            {member.avatarLetter}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1.5 z-10">
          <h3 className={`text-xs md:text-sm font-bold tracking-widest ${orbitron.className}`}>
            {member.name}
          </h3>
          <span className={`text-[10px] md:text-xs tracking-[0.2em] font-semibold text-secondary`}>
            {member.role}
          </span>
        </div>

        <div className="flex gap-4 items-center justify-center z-10">
          {[
            { icon: Github, link: member.github },
            { icon: Linkedin, link: member.linkedin },
            { icon: Twitter, link: member.twitter },
          ].map((social, sIdx) => {
            const Icon = social.icon;
            return (
              <a
                key={sIdx}
                href={social.link}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:border-secondary hover:bg-white/10 transition-all text-white/70 hover:text-white"
              >
                <Icon className="w-3.5 h-3.5" />
              </a>
            );
          })}
        </div>

        <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-white/20 rounded-full" />
        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-white/20 rounded-full" />
      </motion.div>
    </div>
  );
}

function JuniorCard({ member }: { member: JuniorMember }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setTilt({
      x: -y * 0.1,
      y: x * 0.1,
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      style={{ perspective: '800px' }}
      className="w-full flex"
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          borderColor: hovered ? 'var(--primary)' : 'rgba(255, 255, 255, 0.08)',
          boxShadow: hovered 
            ? '0 15px 30px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.15)' 
            : '0 3px 10px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.05)',
        }}
        className="w-full bg-[#1b2330]/30 backdrop-blur-md border rounded-xl p-5 flex flex-col items-center justify-between gap-4 relative overflow-hidden group shadow-xl flex-grow text-center min-h-[220px]"
        style={{ borderWidth: '1px' }}
      >
        <div className={`relative w-14 h-14 rounded-full flex items-center justify-center bg-gradient-to-tr ${member.colorClass} border border-white/15 overflow-hidden shadow-inner group-hover:scale-105 transition-transform duration-300`}>
          <span className="text-xs font-bold text-white/90">{member.avatarLetter}</span>
        </div>
        
        <div className="flex flex-col gap-1 z-10 mt-1">
          <h4 className="text-xs font-bold tracking-widest text-white">{member.name.toUpperCase()}</h4>
          <span className="text-[10px] tracking-wider text-white/50">{member.role}</span>
        </div>

        <div className="absolute top-2 left-2 w-1 h-1 bg-white/10 rounded-full" />
        <div className="absolute top-2 right-2 w-1 h-1 bg-white/10 rounded-full" />
      </motion.div>
    </div>
  );
}

export default function Council() {
  return (
    <section
      id="council"
      className="relative min-h-screen py-24 px-6 md:px-12 flex flex-col items-center justify-center overflow-hidden border-t border-white/5 bg-black/5"
    >
      <div className="max-w-[1280px] w-full flex flex-col gap-16 z-10 px-4 md:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col items-center text-center gap-2 max-w-2xl mx-auto">
          <span className={`text-xs md:text-sm tracking-[0.3em] uppercase text-primary font-bold ${outfit.className}`}>
            The Council
          </span>
          <h2 className={`text-3xl md:text-5xl font-bold tracking-tight ${orbitron.className}`}>
            Meet The Command Core
          </h2>
          <p className={`text-sm opacity-75 mt-2 ${outfit.className}`}>
            The organizers running operations, managing workshops, and helping developers connect.
          </p>
        </div>

        {/* Senior Council Grid: 8 members -> 4 per row, exactly 2 rows */}
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <span className="h-px flex-grow bg-white/10" />
            <h3 className={`text-xs md:text-sm tracking-[0.25em] uppercase text-secondary font-bold ${orbitron.className}`}>Senior Council</h3>
            <span className="h-px flex-grow bg-white/10" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 items-stretch justify-items-center">
            {seniorCouncil.map((member) => (
              <SeniorCard key={member.id} member={member} />
            ))}
          </div>
        </div>

        {/* Junior Council Grid: 15 members -> 5 per row, exactly 3 rows */}
        <div className="flex flex-col gap-8 mt-6">
          <div className="flex items-center gap-4">
            <span className="h-px flex-grow bg-white/10" />
            <h3 className={`text-xs md:text-sm tracking-[0.25em] uppercase text-primary font-bold ${orbitron.className}`}>Junior Council</h3>
            <span className="h-px flex-grow bg-white/10" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-stretch justify-items-center">
            {juniorCouncil.map((member) => (
              <JuniorCard key={member.id} member={member} />
            ))}
          </div>
        </div>

        {/* Y2K Hardware Accents Row */}
        <div className="flex flex-col gap-6 mt-12">
          <div className="flex items-center gap-4">
            <span className="h-px flex-grow bg-white/10" />
            <h3 className={`text-[10px] tracking-[0.25em] uppercase text-secondary font-bold ${orbitron.className}`}>2000s Hardware Nodes</h3>
            <span className="h-px flex-grow bg-white/10" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-xl mx-auto w-full">
            {/* iPod Card */}
            <div className="relative h-24 border border-dashed border-white/10 rounded-xl bg-black/35 flex flex-col items-center justify-center p-2">
              <img
                src="/elements/00s-ipod-wheel.png"
                alt="Y2K iPod"
                className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 p-1"
                onLoad={(e) => (e.currentTarget.style.opacity = '0.6')}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl">🎧</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/55">iPod Click-Wheel</span>
                <span className="text-[8px] font-mono opacity-30 mt-0.5">[Image Slot]</span>
              </div>
            </div>
            
            {/* Flip Phone Card */}
            <div className="relative h-24 border border-dashed border-white/10 rounded-xl bg-black/35 flex flex-col items-center justify-center p-2">
              <img
                src="/elements/00s-flip-phone.png"
                alt="Y2K Flip Phone"
                className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 p-1"
                onLoad={(e) => (e.currentTarget.style.opacity = '0.6')}
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-xl">📱</span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/55">Y2K Flip Phone</span>
                <span className="text-[8px] font-mono opacity-30 mt-0.5">[Image Slot]</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
