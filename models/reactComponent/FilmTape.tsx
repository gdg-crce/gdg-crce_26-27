'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { orbitron, shareTechMono, specialElite } from '@/lib/fonts';

export type FilmTapeFrame = '2000x' | '90s' | '80s' | '70s';

interface FilmTapeProps {
  activeFrame: FilmTapeFrame;
  rewindIntensity: number;
}

const frames = [
  { era: '2000x', label: '2000', suffix: 'x', code: 'F26', stock: 'K-00' },
  { era: '2000x', label: '00s', code: 'F25', stock: 'Y2K' },
  { era: '2000x', label: 'OPEN', code: 'F24', stock: 'SRC' },
  { era: '90s', label: '90s', code: 'F18', stock: 'NET' },
  { era: '90s', label: 'www', code: 'F16', stock: 'LAB' },
  { era: '90s', label: 'LINK', code: 'F15', stock: 'COL' },
  { era: '80s', label: '80s', code: 'F09', stock: 'SYS' },
  { era: '80s', label: 'CRT', code: 'F08', stock: 'MAG' },
  { era: '80s', label: 'BOOT', code: 'F07', stock: 'ROM' },
  { era: '70s', label: '70s', code: 'F03', stock: 'ORG' },
  { era: '70s', label: 'IDEA', code: 'F02', stock: 'EXP' },
  { era: '70s', label: 'ROOT', code: 'F01', stock: 'GEN' },
  { era: '70s', label: 'START', code: 'A00', stock: 'SUN' },
  { era: '70s', label: '1970', code: 'A01', stock: 'OLD' },
] as const;

export default function FilmTape({ activeFrame, rewindIntensity }: FilmTapeProps) {
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
        <div className={`${shareTechMono.className} loader-film-code loader-film-code-top`}>CONTINUITY MASTER 26/27 / GDG CRCE / REWIND SOURCE STRIP</div>
        <div className={`${shareTechMono.className} loader-film-code loader-film-code-bottom`}>SUNEKHEIA ARCHIVE / 2000X TO 1970 / ANALOG FAST REWIND</div>

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
                  key={`${activeFrame}-${frame.code}`}
                  initial={{ opacity: 0.42, y: 10, filter: 'blur(5px)' }}
                  animate={{
                    opacity: isActive ? 0.92 : 0.46,
                    y: 0,
                    filter: isActive ? 'blur(1.4px)' : 'blur(3.1px)',
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
}
