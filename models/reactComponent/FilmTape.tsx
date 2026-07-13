'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { orbitron, shareTechMono, specialElite } from '@/lib/fonts';

export type FilmTapeFrame = '2020s' | '2000x' | '90s' | '80s' | '70s';

interface FilmTapeProps {
  activeFrame: FilmTapeFrame;
  rewindIntensity: number;
}

const frames = [
  { era: '2020s', label: '2026', suffix: 's', code: '▶ 24A', stock: 'KODAK 5219' },
  { era: '2020s', label: '20s', code: '▶ 23A', stock: 'SAFETY FILM' },
  { era: '2020s', label: 'NOW', code: '▶ 22A', stock: 'GDG FRCRCE' },
  { era: '90s', label: '90s', code: '▶ 18A', stock: 'EASTMAN 5247' },
  { era: '90s', label: 'www', code: '▶ 17A', stock: 'PANAVISION' },
  { era: '90s', label: 'LINK', code: '▶ 16A', stock: '35MM COLOR' },
  { era: '80s', label: '80s', code: '▶ 09A', stock: 'EASTMAN 5293' },
  { era: '80s', label: 'CRT', code: '▶ 08A', stock: 'MAGNETIC' },
  { era: '80s', label: 'BOOT', code: '▶ 07A', stock: 'ARCHIVE CH-1' },
  { era: '70s', label: '70s', code: '▶ 03A', stock: 'KODACHROME' },
  { era: '70s', label: 'IDEA', code: '▶ 02A', stock: 'REEL 01' },
  { era: '70s', label: 'ROOT', code: '▶ 01A', stock: 'ORIGIN NEG' },
  { era: '70s', label: 'START', code: '▶ 00A', stock: 'SYNC MASTER' },
  { era: '70s', label: '1970', code: '■ REC', stock: 'EST. 1970' },
] as const;

const FilmTape = React.memo(function FilmTape({ activeFrame, rewindIntensity }: FilmTapeProps) {
  return (
    <div className="loader-film-model" style={{ '--rewind': rewindIntensity } as React.CSSProperties}>
      <div className="loader-film-flex-shadow" />
      <div className="loader-film-thin-edge loader-film-thin-edge-back" />
      <div className="loader-film-body">
        <div className="loader-film-base-texture" />
        <div className="loader-film-edge loader-film-edge-top" />
        <div className="loader-film-edge loader-film-edge-bottom" />
        <div className="loader-film-sprockets loader-film-sprockets-top" />
        <div className="loader-film-sprockets loader-film-sprockets-bottom" />
        <div className="loader-film-soundtrack" />
        <div className={`${shareTechMono.className} loader-film-code loader-film-code-top`}>
          KODAK SAFETY FILM 5219 / 35MM CINEMA STRIP / CONTINUITY ARCHIVE 26-27
        </div>
        <div className={`${shareTechMono.className} loader-film-code loader-film-code-bottom`}>
          GDG FRCRCE ARCHIVE / REWINDING 2020s BACK TO 1970s / ANALOG HIGH SPEED
        </div>

        <div className="loader-film-cells">
          {frames.map((frame, index) => {
            const isActive = frame.era === activeFrame;
            const isOpeningFrame = index === 0;

            return (
              <div key={`${frame.code}-${index}`} className={`loader-film-cell ${isActive ? 'is-active' : ''} ${isOpeningFrame ? 'is-opening-frame' : ''}`}>
                <div className="loader-film-cell-exposure" />
                <div className="loader-film-cell-halation" />
                <div className="loader-film-cell-noise" />
                <div className={`${shareTechMono.className} loader-film-frame-code loader-film-frame-code-left`}>{frame.code}</div>
                <div className={`${shareTechMono.className} loader-film-frame-code loader-film-frame-code-right`}>{frame.stock}</div>
                <motion.div
                  animate={{
                    opacity: isActive ? 1 : 0.72,
                    filter: isActive ? 'blur(0px)' : 'blur(0.35px)',
                  }}
                  transition={{ duration: 0.12, ease: 'linear' }}
                  className={`${isOpeningFrame ? orbitron.className : specialElite.className} loader-film-year ${isOpeningFrame ? 'loader-film-year-opening' : ''}`}
                >
                  <span>{frame.label}</span>
                  {'suffix' in frame && frame.suffix && <span className={`${shareTechMono.className} loader-film-year-x`}>{frame.suffix}</span>}
                </motion.div>
                <div className="loader-film-gate-shadow" />
              </div>
            );
          })}
        </div>
      </div>
      <div className="loader-film-thin-edge loader-film-thin-edge-front" />
      <div className="loader-film-scratch loader-film-scratch-a" />
      <div className="loader-film-scratch loader-film-scratch-b" />
      <div className="loader-film-scratch loader-film-scratch-c" />
    </div>
  );
});

export default FilmTape;
