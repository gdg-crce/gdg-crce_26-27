'use client';

import Image from 'next/image';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { orbitron, shareTechMono, specialElite } from '@/lib/fonts';

interface PreloaderProps {
  onComplete: () => void;
}

const dateFrames = ['2026', '2000s', '1990s', '1988', '1977', '1970s'];

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [progress, setProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const autoAdvanceRef = useRef<number | null>(null);

  const visual = useMemo(() => {
    const p = clamp(progress);
    const dateIndex = Math.min(dateFrames.length - 1, Math.floor(p * dateFrames.length));
    const stripExit = clamp((p - 0.52) / 0.28);
    const tapeIn = clamp((p - 0.36) / 0.38);
    const playback = clamp((p - 0.78) / 0.2);

    return {
      p,
      date: dateFrames[dateIndex],
      stripX: -12 - p * 46 + stripExit * 24,
      stripY: stripExit * 22,
      stripScale: 1 - stripExit * 0.55,
      stripOpacity: 1 - clamp((p - 0.82) / 0.16),
      tapeX: -112 + tapeIn * 112,
      tapeRotate: -7 + tapeIn * 7,
      tapeOpacity: clamp((p - 0.28) / 0.2),
      scanOpacity: clamp((p - 0.12) / 0.24) * (1 - playback * 0.5),
      glitchOpacity: clamp((p - 0.18) / 0.32),
      logoScale: 0.88 + playback * 0.16,
    };
  }, [progress]);

  const complete = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setCompleted(true);
    window.setTimeout(() => {
      document.body.style.overflow = '';
      onComplete();
    }, 520);
  }, [onComplete]);

  const advance = useCallback(
    (amount: number) => {
      setProgress((current) => {
        const next = clamp(current + amount);
        if (next >= 0.995) {
          window.setTimeout(complete, 120);
        }
        return next;
      });
    },
    [complete]
  );

  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const idleKick = window.setTimeout(() => {
      autoAdvanceRef.current = window.setInterval(() => advance(0.012), 90);
    }, 2200);

    return () => {
      document.body.style.overflow = '';
      window.clearTimeout(idleKick);
      if (autoAdvanceRef.current) window.clearInterval(autoAdvanceRef.current);
    };
  }, [advance]);

  const stopAutoAdvance = () => {
    if (autoAdvanceRef.current) {
      window.clearInterval(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    stopAutoAdvance();
    advance(Math.abs(event.deltaY) / 820 + 0.025);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    stopAutoAdvance();
    touchStartY.current = event.touches[0]?.clientY ?? null;
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartY.current;
    const current = event.touches[0]?.clientY;
    if (start === null || current === undefined) return;
    event.preventDefault();
    advance(Math.abs(start - current) / 620 + 0.018);
    touchStartY.current = current;
  };

  return (
    <AnimatePresence>
      {!completed && (
        <motion.div
          key="rewind-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(14px)', transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          className="fixed inset-0 z-[9999] isolate overflow-hidden bg-[#100f12] text-[#f8efe1] touch-none"
          role="status"
          aria-label="GDG CRCE rewind loader"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(232,65,42,0.22),transparent_34%),radial-gradient(circle_at_78%_70%,rgba(0,212,232,0.18),transparent_36%),linear-gradient(135deg,#17120f_0%,#101727_48%,#071a18_100%)]" />
          <div className="film-grain opacity-[0.09]" />
          <div className="preloader-vignette" />
          <div className="preloader-scanlines" style={{ opacity: visual.scanOpacity }} />

          <motion.div
            className="absolute left-1/2 top-[30%] h-[clamp(104px,17vw,184px)] w-[min(980px,122vw)] origin-center"
            style={{
              x: `${visual.stripX}%`,
              y: `${visual.stripY}vh`,
              scale: visual.stripScale,
              opacity: visual.stripOpacity,
              rotate: -2 + visual.p * 5,
            }}
          >
            <div className="relative h-full w-full rounded-sm border-[clamp(12px,1.55vw,20px)] border-[#0b0b0b] bg-[#111] shadow-[0_28px_90px_rgba(0,0,0,0.55)]">
              <div className="film-sprockets film-sprockets-top" />
              <div className="film-sprockets film-sprockets-bottom" />
              <div className="grid h-full grid-cols-3 gap-[clamp(8px,1.4vw,16px)] px-[clamp(8px,1.2vw,14px)] py-[clamp(20px,2.6vw,34px)]">
                {[0, 1, 2].map((cell) => (
                  <div key={cell} className="relative overflow-hidden rounded-[5px] border border-black/70 bg-[#f7efe0] shadow-inner">
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(232,65,42,0.13),transparent_38%,rgba(0,138,138,0.16)),radial-gradient(circle_at_68%_35%,rgba(224,165,38,0.22),transparent_32%)]" />
                    <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,rgba(0,0,0,0.15)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.10)_1px,transparent_1px)] [background-size:18px_18px]" />
                    {cell === 0 ? (
                      <motion.div
                        key={visual.date}
                        initial={{ y: 18, opacity: 0, skewX: -9 }}
                        animate={{ y: 0, opacity: 1, skewX: 0 }}
                        transition={{ duration: 0.16 }}
                        className={`${orbitron.className} absolute inset-0 flex items-center justify-center text-[clamp(1.7rem,6vw,5rem)] font-black tracking-[0.06em] text-[#111] mix-blend-multiply`}
                      >
                        {visual.date}
                      </motion.div>
                    ) : (
                      <div className={`${specialElite.className} absolute inset-0 flex items-center justify-center text-[clamp(0.72rem,1.35vw,1.1rem)] uppercase tracking-[0.22em] text-black/45`}>
                        SUNEKHEIA
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            className="absolute left-1/2 top-1/2 w-[min(920px,92vw)] -translate-y-1/2"
            style={{ x: `${visual.tapeX}%`, rotate: visual.tapeRotate, opacity: visual.tapeOpacity }}
          >
            <div className="vhs-shell relative aspect-[1.82/1] w-full rounded-[18px] border border-white/12 bg-[#151719] p-[clamp(12px,2.1vw,24px)] shadow-[0_32px_120px_rgba(0,0,0,0.72)]">
              <div className="absolute inset-x-[7%] top-[7%] h-[13%] rounded-sm bg-black/55 shadow-inner" />
              <div className="absolute inset-x-[6%] bottom-[7%] h-[11%] rounded-sm bg-black/60" />
              <div className="absolute left-[9%] top-[22%] h-[46%] w-[22%] rounded-full border-[clamp(8px,1.4vw,15px)] border-[#090909] bg-[#24272b] shadow-inner">
                <div className="vhs-reel" style={{ transform: `rotate(${visual.p * -980}deg)` }} />
              </div>
              <div className="absolute right-[9%] top-[22%] h-[46%] w-[22%] rounded-full border-[clamp(8px,1.4vw,15px)] border-[#090909] bg-[#24272b] shadow-inner">
                <div className="vhs-reel" style={{ transform: `rotate(${visual.p * 980}deg)` }} />
              </div>

              <div className="absolute left-1/2 top-[23%] flex h-[46%] w-[38%] -translate-x-1/2 flex-col items-center justify-center rounded-[4px] border border-black/30 bg-[#f3eee4] text-[#171412] shadow-[inset_0_0_22px_rgba(0,0,0,0.16)]">
                <div className={`${shareTechMono.className} text-[clamp(0.7rem,1.2vw,1rem)] uppercase tracking-[0.22em] text-black/55`}>
                  GDG FRCRCE
                </div>
                <div className="mt-[clamp(8px,1.3vw,14px)] flex items-center gap-[clamp(8px,1vw,12px)]">
                  <motion.div
                    className="relative grid size-[clamp(52px,8vw,86px)] place-items-center rounded-full border border-black/10 bg-white shadow-[0_14px_30px_rgba(0,0,0,0.22)]"
                    style={{ scale: visual.logoScale }}
                  >
                    <Image src="/logo.png" alt="GDG play button" width={96} height={96} priority className="h-[72%] w-[72%] object-contain" />
                  </motion.div>
                  <div className={`${orbitron.className} text-[clamp(1.1rem,2.4vw,2.6rem)] font-black tracking-[0.12em] text-black`}>
                    PLAY
                  </div>
                </div>
              </div>

              <div className="absolute inset-x-[28%] bottom-[22%] h-[8%] rounded-full bg-black/75" />
              <div className="absolute left-[3.5%] top-[8%] size-[clamp(8px,1.2vw,14px)] rounded-full bg-black/70" />
              <div className="absolute right-[3.5%] top-[8%] size-[clamp(8px,1.2vw,14px)] rounded-full bg-black/70" />
              <div className="absolute bottom-[8%] left-[4%] size-[clamp(8px,1.2vw,14px)] rounded-full bg-black/70" />
              <div className="absolute bottom-[8%] right-[4%] size-[clamp(8px,1.2vw,14px)] rounded-full bg-black/70" />
            </div>
          </motion.div>

          <div className="absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 overflow-hidden opacity-70 mix-blend-screen" style={{ opacity: visual.glitchOpacity }}>
            <div className="preloader-tracking" />
          </div>

          <div className="absolute bottom-8 left-1/2 h-1 w-[min(340px,62vw)] -translate-x-1/2 overflow-hidden rounded-full bg-white/10">
            <motion.div className="h-full rounded-full bg-[#00d4e8] shadow-[0_0_22px_rgba(0,212,232,0.8)]" style={{ width: `${visual.p * 100}%` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
