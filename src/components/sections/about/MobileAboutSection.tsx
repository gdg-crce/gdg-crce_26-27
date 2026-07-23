'use client';

import React from 'react';
import { TRACKS } from './aboutData';

export default function MobileAboutSection() {
  return (
    <section className="md:hidden w-full bg-[#f4ebd9] text-[#1A1A1A] py-12 px-6 overflow-hidden relative font-sans">
      {/* Header */}
      <div className="flex items-center gap-3 mb-10">
        <span className="text-[#E8412A] text-2xl font-bold">→</span>
        <h2 className="text-[2.5rem] font-bold tracking-wide" style={{ fontFamily: 'var(--font-brush), cursive' }}>about us</h2>
      </div>

      {/* Vinyl Player (Static) */}
      <div className="relative w-full aspect-[4/5] max-w-[340px] mx-auto border-2 border-[#1A1A1A] rounded-2xl bg-transparent mb-16 flex flex-col items-center justify-center pt-8">
        
        <div className="relative w-[85%] aspect-square">
          {/* Vinyl Disc */}
          <img 
            src="/record%20player/actual.png" 
            alt="Vinyl Record" 
            className="w-full h-full object-cover rounded-full shadow-[0_15px_35px_rgba(0,0,0,0.5)] border-[3px] border-[#0a0a0a]"
            draggable={false}
          />
          
          {/* Label */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32%] aspect-square bg-[#f4ebd9] rounded-full flex flex-col items-center justify-center border-2 border-[#1A1A1A] shadow-inner">
            <span className="text-[10px] font-black tracking-widest text-[#1A1A1A]">GDG CRCE</span>
            <div className="w-2.5 h-2.5 bg-[#1A1A1A] rounded-full my-1.5 border border-white/50 shadow-inner" />
            <span className="text-[9px] font-bold font-mono">'26</span>
          </div>
        </div>

        {/* Stitched Box Decoration from mockup (Functionia style) */}
        <div className="mt-8 mb-6 w-[85%] border-2 border-dashed border-[#1A1A1A] rounded-lg p-4 flex flex-col gap-3">
            <span className="text-3xl text-[#d05c2a]" style={{ fontFamily: 'var(--font-brush), cursive' }}>legacy</span>
            <div className="w-[80%] h-[3px] bg-[#d05c2a] rounded-full opacity-80" />
            <div className="w-[90%] h-[3px] bg-[#d05c2a] rounded-full opacity-80" />
            <div className="w-[70%] h-[3px] bg-[#d05c2a] rounded-full opacity-80" />
        </div>

        {/* Tonearm */}
        <div 
          className="absolute top-[-25px] left-[-35px] w-[58%] pointer-events-none drop-shadow-2xl" 
          style={{ filter: 'drop-shadow(6px 12px 16px rgba(0,0,0,0.6))' }}
        >
          <img 
            src="/record%20player/toneram.png" 
            alt="Tonearm" 
            className="w-full h-auto transform -rotate-[15deg]"
            draggable={false}
          />
        </div>
        
        {/* Side decorative bolts */}
        <div className="absolute top-[40%] -left-5 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-[#1A1A1A] bg-[#f4ebd9] flex items-center justify-center shadow-md">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <div className="absolute top-[40%] -right-5 -translate-y-1/2 w-10 h-10 rounded-full border-2 border-[#1A1A1A] bg-[#f4ebd9] flex items-center justify-center shadow-md">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
      </div>

      {/* Background card container for carousel */}
      <div className="w-[calc(100%+3rem)] -ml-6 bg-[#ecd8b6] pt-10 pb-8 px-6 rounded-t-3xl relative">
        {/* Cards Carousel */}
        <div className="flex overflow-x-auto snap-x snap-mandatory pb-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {TRACKS.map((t, idx) => (
            <div key={t.key} className="snap-center min-w-[92%] sm:min-w-[85%] mr-4 flex-shrink-0 relative">
              <h3 className="text-[2.2rem] text-[#1E4D8C] mb-5 tracking-wide" style={{ fontFamily: 'var(--font-brush), cursive' }}>
                {t.word.toLowerCase()} ?
              </h3>
              
              {t.brush && <div className="text-xl text-[#E8412A] mb-3 font-bold" style={{ fontFamily: 'var(--font-brush), cursive' }}>{t.brush}</div>}
              
              <p className="text-[#2a2a2a] text-[16px] leading-relaxed font-medium" style={{ fontFamily: 'var(--font-editorial-display), Georgia, serif' }}>
                {t.lines.join(' ')}
              </p>
              
              <div className="mt-8 pt-2">
                <span className="text-[#D35A24] text-xl cursor-pointer block w-fit" style={{ fontFamily: 'var(--font-brush), cursive' }}>
                  know more →
                  <div className="h-[2px] bg-[#D35A24] w-full mt-1 opacity-60 rounded-full" />
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots (Static visual matching mockup) */}
        <div className="flex justify-center gap-3 mt-4">
          <div className="w-3 h-3 rounded-full bg-[#1E4D8C]" />
          <div className="w-3 h-3 rounded-full bg-black/20" />
          <div className="w-3 h-3 rounded-full bg-black/20" />
        </div>

        {/* Swipe Indicator */}
        <div className="text-center mt-8 text-[#1E4D8C] text-[1.4rem] flex flex-col items-center justify-center gap-1" style={{ fontFamily: 'var(--font-brush), cursive' }}>
          <span>← swipe left to explore more</span>
          <div className="w-[75%] h-[2px] bg-[#1E4D8C]/80 rounded-full" />
        </div>
      </div>

    </section>
  );
}
