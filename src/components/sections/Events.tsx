'use client';

import React, { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, useMotionValue, useAnimationFrame } from 'framer-motion';
import { Calendar } from 'lucide-react';
import { useEra } from '../ui/EraContext';
import { specialElite, shareTechMono } from '@/lib/fonts';

interface TimelineItem {
  id: number;
  type: 'event' | 'visual-gameboy' | 'visual-modem' | 'visual-cdcover';
  title?: string;
  date?: string;
  status?: 'Upcoming' | 'Completed';
  location?: string;
  description?: string;
  photoStyle?: string;
  posterPath?: string;
}

const timelineData: TimelineItem[] = [
  {
    id: 1,
    type: 'event',
    title: 'CRCE HACK 2026',
    date: 'OCTOBER 14-16, 2026',
    status: 'Upcoming',
    location: 'Main Campus Lab',
    description: '36-hour retro-computing hackathon. Build solutions honoring legacy frameworks.',
    photoStyle: 'from-orange-500/20 to-red-500/30 bg-orange-600',
    posterPath: '/elements/event-1-poster.png',
  },
  {
    id: 2,
    type: 'visual-gameboy',
  },
  {
    id: 3,
    type: 'event',
    title: 'AGENT SESSIONS',
    date: 'NOVEMBER 02, 2026',
    status: 'Upcoming',
    location: 'Cyber Auditorium',
    description: 'Deep dive into local LLM compilers, RAG setups, and multi-agent coordination.',
    photoStyle: 'from-blue-500/20 to-teal-500/30 bg-teal-700',
    posterPath: '/elements/event-3-poster.png',
  },
  {
    id: 4,
    type: 'visual-modem',
  },
  {
    id: 5,
    type: 'event',
    title: 'CLOUD DEPLOY',
    date: 'MARCH 19, 2026',
    status: 'Completed',
    location: 'Virtual Terminal',
    description: 'A hands-on sprint setting up Kubernetes namespaces and auto-scaling node groups.',
    photoStyle: 'from-gray-800 to-primary/40 bg-zinc-900',
    posterPath: '/elements/event-5-poster.png',
  },
  {
    id: 6,
    type: 'visual-cdcover',
  },
  {
    id: 7,
    type: 'event',
    title: 'RETRO SIMULATOR',
    date: 'DECEMBER 05, 2026',
    status: 'Completed',
    location: 'Gaming Lounge',
    description: 'Building classic 80s arcade simulators and retro gaming modules on modern web engines.',
    photoStyle: 'from-pink-500/20 to-purple-500/30 bg-pink-700',
    posterPath: '/elements/event-7-poster.png',
  },
  {
    id: 8,
    type: 'event',
    title: 'Y2K CYBER SUMMIT',
    date: 'JANUARY 22, 2027',
    status: 'Upcoming',
    location: 'Virtual Hub',
    description: 'Welcoming the new millennium stacks. Translucent Aqua UI setups and secure gateways.',
    photoStyle: 'from-cyan-500/20 to-blue-500/30 bg-cyan-700',
    posterPath: '/elements/event-8-poster.png',
  },
];

// Definition of 8 Unique Retro OS UI Themes
interface OSTheme {
  borderStyle: React.CSSProperties;
  titlebarStyle: React.CSSProperties;
  bodyStyle: React.CSSProperties;
  titleClass: string;
  closeOnLeft: boolean;
  buttonClass: string;
  systemButtons: (isActive?: boolean) => React.ReactNode;
}

const OSThemes: OSTheme[] = [
  // Theme 0: Windows XP Classic Blue
  {
    closeOnLeft: false,
    titleClass: 'text-white text-[11px] font-bold tracking-wide font-sans',
    borderStyle: {
      borderRadius: '7px 7px 0px 0px',
      border: '3px solid #0054e3',
      backgroundColor: '#0054e3',
      padding: '1px',
    },
    titlebarStyle: {
      background: 'linear-gradient(to bottom, #0058e6 0%, #3080ff 12%, #0058e6 88%, #002e99 100%)',
      borderBottom: '1px solid #002d96',
    },
    bodyStyle: {
      backgroundColor: '#ece9d8',
      borderTop: '2px solid #808080',
      borderLeft: '2px solid #808080',
      borderBottom: '2px solid #ffffff',
      borderRight: '2px solid #ffffff',
    },
    buttonClass: 'px-3 py-1 bg-[#ece9d8] text-black text-[9px] font-bold border-t border-l border-white border-b-2 border-r-2 border-gray-600 active:border-t-2 active:border-l-2 active:border-b active:border-r hover:outline hover:outline-1 hover:outline-[#e5973c]',
    systemButtons: (isActive) => (
      <div className="flex gap-[2px] items-center select-none">
        <div className="w-[16px] h-[16px] border border-b-[#002d96] border-r-[#002d96] border-t-white border-l-white flex items-end justify-center text-white font-extrabold text-[9px] rounded-[2px]" style={{ background: 'linear-gradient(to bottom, #3c8dff, #0a54c2)' }}>_</div>
        <div className="w-[16px] h-[16px] border border-b-[#002d96] border-r-[#002d96] border-t-white border-l-white flex items-center justify-center text-white font-bold text-[7px] rounded-[2px]" style={{ background: 'linear-gradient(to bottom, #3c8dff, #0a54c2)' }}>⬜</div>
        <div className="w-[16px] h-[16px] border border-b-[#7e1200] border-r-[#7e1200] border-t-white border-l-white flex items-center justify-center text-white font-black text-[9px] rounded-[2px]" style={{ background: 'linear-gradient(to bottom, #f35520, #b82800)' }}>✕</div>
      </div>
    ),
  },

  // Theme 1: MSN Messenger (Teal/Green border)
  {
    closeOnLeft: false,
    titleClass: 'text-[#1d4f6c] text-[11px] font-bold tracking-wide font-sans',
    borderStyle: {
      borderRadius: '6px 6px 0px 0px',
      border: '3px solid #00a8c6',
      backgroundColor: '#00a8c6',
      padding: '1px',
    },
    titlebarStyle: {
      background: 'linear-gradient(to bottom, #e0f2fe 0%, #bae6fd 100%)',
      borderBottom: '1px solid #0284c7',
    },
    bodyStyle: {
      backgroundColor: '#f0f9ff',
      borderTop: '1px solid #bae6fd',
      borderLeft: '1px solid #bae6fd',
      borderBottom: '1px solid #0284c7',
      borderRight: '1px solid #0284c7',
    },
    buttonClass: 'px-3 py-1 bg-[#bae6fd] text-[#1d4f6c] text-[9px] font-bold border border-[#0284c7] hover:bg-[#bae6fd]/80',
    systemButtons: () => (
      <div className="flex gap-[3px] items-center text-sky-800 font-bold text-[9px]">
        <span>🗕</span><span>🗖</span><span className="text-red-500">🗙</span>
      </div>
    ),
  },

  // Theme 2: Onyx (Industrial Yellow/Black warning)
  {
    closeOnLeft: false,
    titleClass: 'text-amber-400 text-[10px] font-black tracking-widest uppercase font-mono',
    borderStyle: {
      borderRadius: '0px',
      border: '3px solid #1f2937',
      backgroundColor: '#111827',
      padding: '1.5px',
    },
    titlebarStyle: {
      background: 'repeating-linear-gradient(45deg, #fbbf24, #fbbf24 8px, #000 8px, #000 16px)',
      borderBottom: '2px solid #fbbf24',
    },
    bodyStyle: {
      backgroundColor: '#1f2937',
      border: '1px solid #fbbf24',
      color: '#fff',
    },
    buttonClass: 'px-3 py-1 bg-[#fbbf24] text-black text-[9px] font-mono font-black uppercase border border-black hover:bg-yellow-300',
    systemButtons: () => (
      <div className="flex gap-[3px] items-center text-black font-black text-[8px] bg-white/80 px-1 border border-black">
        <span>MIN</span><span>MAX</span><span className="text-red-600">CLR</span>
      </div>
    ),
  },

  // Theme 3: System 7 Classic Macintosh (Close on left!)
  {
    closeOnLeft: true,
    titleClass: 'text-black text-[11px] font-bold font-mono tracking-wide',
    borderStyle: {
      borderRadius: '0px',
      border: '2px solid #000000',
      backgroundColor: '#ffffff',
      padding: '2px',
    },
    titlebarStyle: {
      background: 'repeating-linear-gradient(to bottom, #000, #000 1px, #fff 1px, #fff 4px)',
      borderBottom: '2.5px double #000000',
    },
    bodyStyle: {
      backgroundColor: '#ffffff',
      border: '1.5px solid #000000',
    },
    buttonClass: 'px-3 py-1 bg-white text-black text-[9px] font-mono font-bold border border-black shadow-[2px_2px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_#000]',
    systemButtons: () => null, // close box handles left side
  },

  // Theme 4: Scherze! (Retro Purple/Green Candy)
  {
    closeOnLeft: false,
    titleClass: 'text-yellow-300 text-[11px] font-black tracking-wider uppercase font-sans',
    borderStyle: {
      borderRadius: '4px',
      border: '3px solid #10b981',
      backgroundColor: '#6d28d9',
      padding: '1.5px',
    },
    titlebarStyle: {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
      borderBottom: '2px solid #10b981',
    },
    bodyStyle: {
      backgroundColor: '#f5f3ff',
      border: '2px dashed #8b5cf6',
    },
    buttonClass: 'px-3 py-1 bg-[#10b981] hover:bg-emerald-400 text-white text-[9px] font-bold rounded border border-purple-900',
    systemButtons: () => (
      <div className="w-[15px] h-[15px] rounded-full bg-[#10b981] border border-white flex items-center justify-center text-[7px] text-white">●</div>
    ),
  },

  // Theme 5: BeBox (Vintage Mac Gold progress)
  {
    closeOnLeft: false,
    titleClass: 'text-amber-900 text-[11px] font-extrabold font-mono',
    borderStyle: {
      borderRadius: '5px 5px 0 0',
      border: '3px solid #b45309',
      backgroundColor: '#f59e0b',
      padding: '1px',
    },
    titlebarStyle: {
      background: 'linear-gradient(to right, #fbbf24 0%, #f59e0b 100%)',
      borderBottom: '1.5px solid #b45309',
    },
    bodyStyle: {
      backgroundColor: '#fef3c7',
      borderTop: '2px solid #b45309',
      borderLeft: '2px solid #b45309',
      borderBottom: '2px solid #ffffff',
      borderRight: '2px solid #ffffff',
    },
    buttonClass: 'px-3 py-1 bg-[#f59e0b] text-amber-955 text-[9px] font-bold border border-[#b45309] shadow-[1px_1px_2px_rgba(0,0,0,0.15)]',
    systemButtons: () => (
      <div className="w-10 h-2 bg-blue-600 border border-blue-900 rounded-[2px]" />
    ),
  },

  // Theme 6: Antique Maroon Wood
  {
    closeOnLeft: false,
    titleClass: 'text-[#fdf8f6] text-[11px] font-bold font-sans tracking-wide',
    borderStyle: {
      borderRadius: '0px',
      border: '3px solid #4a1504',
      backgroundColor: '#7c2d12',
      padding: '1px',
    },
    titlebarStyle: {
      background: 'linear-gradient(to bottom, #7c2d12 0%, #451a03 100%)',
      borderBottom: '1px solid #4a1504',
    },
    bodyStyle: {
      backgroundColor: '#fdf8f6',
      borderTop: '2px solid #9a3412',
      borderLeft: '2px solid #9a3412',
      borderBottom: '2px solid #451a03',
      borderRight: '2px solid #451a03',
    },
    buttonClass: 'px-3 py-1 bg-[#7c2d12] hover:bg-[#9a3412] text-[#fdf8f6] text-[9px] font-bold border border-[#4a1504]',
    systemButtons: () => (
      <div className="flex gap-1">
        <div className="w-[12px] h-[12px] bg-[#451a03] border border-[#7c2d12]" />
        <div className="w-[12px] h-[12px] bg-[#451a03] border border-[#7c2d12]" />
      </div>
    ),
  },

  // Theme 7: Ice Glass (Translucent Cyans)
  {
    closeOnLeft: false,
    titleClass: 'text-cyan-200 text-[10px] font-bold tracking-widest font-mono uppercase',
    borderStyle: {
      borderRadius: '8px 8px 0px 0px',
      border: '2px solid rgba(255, 255, 255, 0.25)',
      backgroundColor: 'rgba(6, 182, 212, 0.35)',
      padding: '2px',
      backdropFilter: 'blur(4px)',
    },
    titlebarStyle: {
      background: 'rgba(6, 182, 212, 0.2)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    },
    bodyStyle: {
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      border: '1px solid rgba(6, 182, 212, 0.4)',
      color: '#22d3ee',
    },
    buttonClass: 'px-3 py-1 bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-300 text-[9px] font-bold border border-cyan-400/40 rounded-[4px] backdrop-blur-[2px]',
    systemButtons: () => (
      <div className="flex gap-[3px]">
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-cyan-400/40" />
        <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
      </div>
    ),
  },
];

function RetroWindowFrame({
  children,
  title,
  isActive,
  themeIndex
}: {
  children: React.ReactNode;
  title: string;
  isActive?: boolean;
  themeIndex: number;
}) {
  const theme = OSThemes[themeIndex % OSThemes.length];

  return (
    <div
      className="w-[230px] sm:w-[255px] flex flex-col justify-between select-none shadow-[0_20px_50px_rgba(0,0,0,0.65)]"
      style={{
        ...theme.borderStyle,
        backfaceVisibility: 'visible',
        WebkitBackfaceVisibility: 'visible',
      }}
    >
      {/* Title Bar */}
      <div
        className="flex items-center justify-between px-2 select-none mb-[2px] rounded-t-[5px] h-[25px] flex-shrink-0"
        style={theme.titlebarStyle}
      >
        {/* If Close button is on left (Mac System 7) */}
        {theme.closeOnLeft && (
          <div
            className="w-[13px] h-[13px] border border-black flex items-center justify-center text-black font-extrabold text-[8px] bg-white cursor-pointer select-none active:bg-gray-300"
            onClick={() => { }}
          >
            ✕
          </div>
        )}

        <span className={theme.titleClass}>
          {theme.closeOnLeft ? `  ${title}` : title}
        </span>

        {/* Render theme specific controls */}
        {!theme.closeOnLeft && theme.systemButtons(isActive)}
      </div>

      {/* Body Frame: Vertically smaller height */}
      <div
        className="p-2.5 flex flex-col gap-2 h-[260px] sm:h-[285px] overflow-hidden"
        style={theme.bodyStyle}
      >
        {children}
      </div>
    </div>
  );
}

// Local sub-component to handle modular event card state (e.g., custom poster manual uploads)
function EventCard({ item, idx, theme }: { item: TimelineItem; idx: number; theme: OSTheme }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isUpcoming = item.status === 'Upcoming';

  return (
    <RetroWindowFrame title={item.title || 'event.log'} themeIndex={idx} isActive={isUpcoming}>
      <div className="relative w-full h-full flex flex-col justify-between overflow-hidden rounded-b-[4px]">

        {/* Retro Paint/Viewer Title Toolbar when a custom manual poster is loaded */}
        {imageLoaded && (
          <div className="flex items-center justify-between px-1.5 py-0.5 bg-[#dcd9c9] border-b border-gray-400 text-[8px] font-mono text-black select-none flex-shrink-0">
            <span>Paint - {item.title?.toLowerCase().replace(/\s+/g, '_')}.bmp</span>
            <span className="opacity-60">100%</span>
          </div>
        )}

        <div className="relative flex-grow w-full h-full bg-black overflow-hidden flex items-center justify-center">

          {/* Custom Manual Upload Poster Image */}
          {item.posterPath && !hasError && (
            <img
              src={item.posterPath}
              alt={item.title}
              className={`w-full h-full object-cover absolute inset-0 z-10 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setHasError(true)}
            />
          )}

          {/* Fallback Retro Card UI (shown while loading or if poster is missing/fails) */}
          <div
            className={`absolute inset-0 flex flex-col justify-between p-2.5 text-left z-0 ${idx % OSThemes.length === 2 || idx % OSThemes.length === 7
              ? 'bg-zinc-950 text-white'
              : 'bg-white text-black'
              }`}
            style={{ display: imageLoaded ? 'none' : 'flex' }}
          >
            {/* Visual Dither Accent */}
            <div className="absolute inset-0 dither-pattern opacity-10 pointer-events-none" />

            {/* Event Status Photo Block */}
            <div className={`relative h-[85px] w-full border border-black overflow-hidden bg-gradient-to-tr ${item.photoStyle}`}>
              <div className="absolute inset-0 dither-pattern" />
              <div className="absolute bottom-1 left-1 bg-black px-1.5 py-0.5 border border-white text-[7px] font-mono font-bold text-white">
                {item.status}
              </div>
            </div>

            {/* Date and Location */}
            <div className="flex flex-col gap-0.5 text-[9px] font-mono font-bold opacity-75 mt-1.5">
              <div className="flex items-center gap-1">
                <Calendar size={9} />
                <span>{item.date}</span>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-xs font-black tracking-wide leading-tight mt-0.5 uppercase">
              {item.title}
            </h3>

            {/* Description */}
            <p className="text-[9.5px] leading-relaxed opacity-80 flex-grow mt-1 overflow-hidden h-[55px]">
              {item.description}
            </p>

            {/* Footer buttons */}
            <div className="mt-auto pt-1 flex justify-between items-center border-t border-dotted border-current/25">
              <span className="text-[8px] font-mono opacity-50 uppercase">{item.location}</span>
              <a
                href="#footer"
                className={theme.buttonClass}
              >
                RSVP
              </a>
            </div>
          </div>
        </div>
      </div>
    </RetroWindowFrame>
  );
}

interface CylinderCardProps {
  item: TimelineItem;
  idx: number;
  theta: number;
  radius: number;
  rotateY: any;
  theme: OSTheme;
}

function CylinderCard({ item, idx, theta, radius, rotateY, theme }: CylinderCardProps) {
  // Map rotation value to opacity for each card dynamically
  const cardOpacity = useTransform(rotateY, (latestY: number) => {
    const angleRad = ((latestY + theta) * Math.PI) / 180;
    const cosVal = Math.cos(angleRad);
    // 1.0 when facing front (cosVal = 1), 0.2 when facing back (cosVal = -1)
    return 0.2 + (cosVal + 1) * 0.4;
  });

  // Prevent back-facing cards from blocking click events on front cards
  const pointerEvents = useTransform(rotateY, (latestY: number) => {
    const angleRad = ((latestY + theta) * Math.PI) / 180;
    const cosVal = Math.cos(angleRad);
    return cosVal > 0.1 ? ('auto' as const) : ('none' as const);
  });

  let cardContent = null;

  if (item.type === 'visual-gameboy') {
    cardContent = (
      <RetroWindowFrame title="gameboy.sys" themeIndex={idx}>
        <div className="flex flex-col justify-between py-1 bg-white border border-gray-400 p-2 h-full flex-grow text-center">
          <div className="relative w-full h-[180px] border border-dashed border-gray-400 bg-gray-200 flex flex-col items-center justify-center p-1 overflow-hidden">
            <img
              src="/elements/90s-gameboy.png"
              alt="1990s Game Boy Handheld"
              className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 p-2"
              style={{ imageRendering: 'pixelated' }}
              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="flex flex-col items-center justify-center text-center pointer-events-none p-1 text-black">
              <span className="text-xl mb-1">🎮</span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-800">90s Game Boy</span>
            </div>
          </div>
          <span className="text-[9px] font-mono tracking-wider uppercase opacity-65 mt-1 text-black">1990s Console</span>
        </div>
      </RetroWindowFrame>
    );
  } else if (item.type === 'visual-modem') {
    cardContent = (
      <RetroWindowFrame title="modem.inf" themeIndex={idx}>
        <div className="flex flex-col justify-between py-1 bg-white border border-gray-400 p-2 h-full flex-grow text-center">
          <div className="relative w-full h-[180px] border border-dashed border-gray-400 bg-gray-200 flex flex-col items-center justify-center p-1 overflow-hidden">
            <img
              src="/elements/90s-dialup-modem.png"
              alt="1990s Dial-up Modem"
              className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 p-2"
              style={{ imageRendering: 'pixelated' }}
              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="flex flex-col items-center justify-center text-center pointer-events-none p-1 text-black">
              <span className="text-xl mb-1">📡</span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#1d4f6c]">56K Modem</span>
            </div>
          </div>
          <span className="text-[9px] font-mono tracking-wider uppercase opacity-65 mt-1 text-black">Dial-Up Modem</span>
        </div>
      </RetroWindowFrame>
    );
  } else if (item.type === 'visual-cdcover') {
    cardContent = (
      <RetroWindowFrame title="zine_collage.bmp" themeIndex={idx}>
        <div className="flex flex-col justify-between py-1 bg-white border border-gray-400 p-2 h-full flex-grow text-center">
          <div className="relative w-full h-[180px] border border-dashed border-gray-400 bg-gray-200 flex flex-col items-center justify-center p-1 overflow-hidden">
            <img
              src="/elements/90s-zine-collage.png"
              alt="1990s CD Zine Collage"
              className="w-full h-full object-contain opacity-0 transition-opacity duration-300 absolute inset-0 p-2"
              style={{ imageRendering: 'pixelated' }}
              onLoad={(e) => (e.currentTarget.style.opacity = '1')}
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <div className="flex flex-col items-center justify-center text-center pointer-events-none p-1 text-black">
              <span className="text-xl mb-1">💿</span>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-800">Zine Collage</span>
            </div>
          </div>
          <span className="text-[9px] font-mono tracking-wider uppercase opacity-65 mt-1 text-black">Grunge Zine Sheet</span>
        </div>
      </RetroWindowFrame>
    );
  } else {
    cardContent = (
      <EventCard item={item} idx={idx} theme={theme} />
    );
  }

  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) rotateY(${theta}deg) translateZ(${radius}px)`,
        transformStyle: 'preserve-3d',
        opacity: cardOpacity,
        pointerEvents,
      }}
    >
      {cardContent}
    </motion.div>
  );
}

export default function Events() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [radius, setRadius] = useState(485);
  const [offsetX, setOffsetX] = useState(140);
  const [titleOffsetX, setTitleOffsetX] = useState(-280);

  useEffect(() => {
    const handleResize = () => {
      setRadius(window.innerWidth < 640 ? 250 : 485);
      setOffsetX(window.innerWidth < 1024 ? 0 : 140);
      setTitleOffsetX(window.innerWidth < 1024 ? 0 : -Math.min(window.innerWidth * 0.22, 280));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Smooth Delta-Time Independent Rotation Lerp Implementation
  const rotateY = useMotionValue(0);
  const targetRotateY = useRef(0);

  useEffect(() => {
    // Standard subscription to scroll percentage
    const unsubscribe = scrollYProgress.on('change', (latest) => {
      // Apply quadratic ease-in-out to smooth the start and end of the scroll
      const eased = latest < 0.5 ? 2 * latest * latest : 1 - Math.pow(-2 * latest + 2, 2) / 2;
      targetRotateY.current = eased * 360; // Spin right (positive angle)
    });
    return unsubscribe;
  }, [scrollYProgress]);

  // RequestAnimationFrame loop maps scroll Y progress with inertia
  useAnimationFrame((time, delta) => {
    const current = rotateY.get();
    const target = targetRotateY.current;

    // Time-delta independent interpolation factor based on 60fps frame rate
    const baseLerp = 0.045; // Lower for more fluid, liquid inertia
    const clampedDelta = Math.min(delta, 50); // limit spikes on focus tab resume
    const lerpFactor = 1 - Math.pow(1 - baseLerp, clampedDelta / 16.67);

    const next = current + (target - current) * Math.min(lerpFactor, 1);

    if (Math.abs(target - next) < 0.01) {
      rotateY.set(target);
    } else {
      rotateY.set(next);
    }
  });

  return (
    <div
      ref={sectionRef}
      className="relative h-[260vh] bg-black/5"
    >
      {/* Sticky Viewport */}
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden py-16 px-6 md:px-12">
        <div className="max-w-[1280px] w-full flex flex-col gap-6 z-10 px-4 md:px-8 items-center text-center">

          {/* Section Header */}
          <motion.div
            style={{ x: titleOffsetX }}
            className="flex flex-col gap-1.5 max-w-xl items-center"
          >

            <h2 className={`text-3xl md:text-5xl font-bold tracking-tight ${specialElite.className}`}>
              Events
            </h2>

          </motion.div>

          {/* 3D Ring Viewport */}
          <div
            className="relative w-full h-[460px] flex items-center justify-center overflow-visible mt-4"
            style={{
              perspective: '1200px',
              perspectiveOrigin: '50% 50%',
            }}
          >
            {/* Parent Tilted Container: Flipped horizontally: tilts Z-axis like "\" and shifts to the right, translated slightly upwards */}
            <motion.div
              style={{
                rotateZ: -20, // Slanted like "\" where top of angle is on the left side
                x: offsetX, // Shifted to the right on desktop
                y: -10, // Translated slightly downwards compared to -40
                transformStyle: 'preserve-3d',
              }}
              className="relative w-full h-full flex items-center justify-center"
            >
              {/* Inner Rotating Container: spins Y in the tilted plane */}
              <motion.div
                style={{
                  rotateY,
                  transformStyle: 'preserve-3d',
                }}
                className="relative w-full h-full flex items-center justify-center"
              >
                {timelineData.map((item, idx) => {
                  const theta = (360 / timelineData.length) * idx;
                  const theme = OSThemes[idx % OSThemes.length];

                  return (
                    <CylinderCard
                      key={item.id}
                      item={item}
                      idx={idx}
                      theta={theta}
                      radius={radius}
                      rotateY={rotateY}
                      theme={theme}
                    />
                  );
                })}
              </motion.div>
            </motion.div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono opacity-50 border-t border-dotted border-white/10 pt-4 w-full">
            <span>DIRECTORY: [8/8] ITEMS</span>
            <span className="animate-pulse">SCROLL_PAGE_TO_ROTATE_3D_RING ⬇</span>
          </div>
        </div>
      </div>
    </div>
  );
}

