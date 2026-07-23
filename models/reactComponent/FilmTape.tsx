'use client';

import React from 'react';
import { orbitron, shareTechMono, specialElite } from '@/lib/fonts';

export type FilmTapeFrame = '2020s' | '2000x' | '90s' | '80s' | '70s';

interface FilmTapeProps {
  activeFrame?: FilmTapeFrame;
  rewindIntensity?: number;
  revealZoom?: number;
}

const EVENT_IMAGES = [
  { name: 'genesis', ext: 'jpg', alt: 'Genesis' },
  { name: 'unplug', ext: 'png', alt: 'Unplug' },
  { name: 'pitchperf', ext: 'png', alt: 'Pitch Perf' },
  { name: 'bnb', ext: 'png', alt: 'Bits & Bytes' },
  { name: 'whatif', ext: 'png', alt: 'What If' },
  { name: 'ideacafe1', ext: 'png', alt: 'Idea Cafe' },
  { name: 'futureforge', ext: 'png', alt: 'Future Forge' },
] as const;

export type TapeCell =
  | { kind: 'image'; era: FilmTapeFrame; code: string; stock: string; src: string; alt: string }
  | { kind: 'text'; era: FilmTapeFrame; label: string; suffix?: string; code: string; stock: string; isOpeningFrame?: boolean }
  | { kind: 'reveal'; code: string }
  | { kind: 'empty' };

const TEXT_CELLS: Omit<Extract<TapeCell, { kind: 'text' }>, 'kind'>[] = [
  { era: '2020s', label: '2026', suffix: 's', code: '▶ 24A', stock: 'GDG FRCRCE', isOpeningFrame: true },
  { era: '2020s', label: 'NOW', code: '▶ 22A', stock: 'KODAK 5219' },
  { era: '90s', label: '90s', code: '▶ 18A', stock: 'EASTMAN 5247' },
  { era: '90s', label: 'LINK', code: '▶ 16A', stock: '35MM COLOR' },
  { era: '80s', label: '80s', code: '▶ 09A', stock: 'EASTMAN 5293' },
  { era: '80s', label: 'BOOT', code: '▶ 07A', stock: 'ARCHIVE CH-1' },
  { era: '70s', label: '70s', code: '▶ 03A', stock: 'KODACHROME' },
  { era: '70s', label: 'ARCHIVE', code: '▶ 02A', stock: 'CONTINUITY' },
  { era: '70s', label: 'GDG', code: '▶ 01A', stock: 'FRCRCE 26-27' },
];

function buildFrames(): TapeCell[] {
  const cells: TapeCell[] = [];

  // 1. Initial 4 EMPTY film stock frames (Indices 0..3) so left edge is covered
  for (let i = 0; i < 4; i++) {
    cells.push({ kind: 'empty' });
  }
  // 2. All 7 Event images & alternating text cards (Indices 4..17)
  for (let i = 0; i < EVENT_IMAGES.length; i++) {
    const img = EVENT_IMAGES[i];
    const textCell = TEXT_CELLS[i] ?? TEXT_CELLS[TEXT_CELLS.length - 1];
    cells.push({
      kind: 'image',
      era: textCell.era,
      code: `▶ IMG-${String(i + 1).padStart(2, '0')}`,
      stock: img.name.toUpperCase(),
      src: `/preloader/${img.name}.${img.ext}`,
      alt: img.alt,
    });
    cells.push({ kind: 'text', ...textCell });
  }

  // 3. Index 18 (Reveal Frame): Transparent Reveal Window
  cells.push({ kind: 'reveal', code: '■ GDG FRCRCE' });

  // Extra filler text cards at the end of content (Indices 19..20)
  cells.push({ kind: 'text', ...TEXT_CELLS[7] });
  cells.push({ kind: 'text', ...TEXT_CELLS[8] });

  // 4. Trailing 4 EMPTY film stock frames (Indices 21..24) so right edge is covered
  for (let i = 0; i < 4; i++) {
    cells.push({ kind: 'empty' });
  }

  return cells;
}

export const FRAMES = buildFrames();
export const START_FRAME_INDEX = 4; // Index 4 = Genesis Image (dead-centered at start)
export const REVEAL_FRAME_INDEX = 18; // Index 18 = Reveal Window (dead-centered at stop)
export const TOTAL_FRAME_COUNT = FRAMES.length; // 25 total cells

const FilmTape = React.memo(function FilmTape({ activeFrame }: FilmTapeProps) {
  return (
    <div className="loader-film-model w-full h-full">
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

        {/* Flexbox layout guarantees all 50 cells have exact equal width W/50 and stretch height without grid wrapping */}
        <div
          className="loader-film-cells"
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            gap: '0.6%',
            transform: 'none', // COMPLETELY DISABLE Independent translation from globals.css
            zIndex: 15, // Ensure cells stack on top of body::after (z-index 8)
            left: 0,
            right: 0,
            width: '100%',
          }}
        >
          {FRAMES.map((frame, index) => {
            if (frame.kind === 'reveal') {
              return (
                <div
                  key="reveal-frame"
                  className="loader-film-cell loader-film-cell-reveal relative flex-1 overflow-hidden"
                  style={{ minWidth: 0, background: 'transparent', border: '2px solid rgba(251, 191, 36, 0.6)' }}
                >
                  <div className="loader-film-cell-reveal-frame pointer-events-none absolute inset-0" />
                </div>
              );
            }

            if (frame.kind === 'empty') {
              return (
                <div
                  key={`empty-${index}`}
                  className="loader-film-cell loader-film-cell-empty relative flex-1"
                  style={{ minWidth: 0, background: '#090807' }}
                >
                  <div className="loader-film-gate-shadow" />
                </div>
              );
            }

            if (frame.kind === 'image') {
              return (
                <div
                  key={`img-${index}`}
                  className="loader-film-cell loader-film-cell-image relative flex-1 overflow-hidden"
                  style={{ minWidth: 0, background: '#030303' }}
                >
                  <img
                    src={frame.src}
                    alt={frame.alt}
                    loading="eager"
                    decoding="async"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 10,
                      display: 'block',
                      border: '4px solid red', // DEBUG BORDER
                    }}
                  />
                  <div className={`${shareTechMono.className} loader-film-frame-code loader-film-frame-code-left`} style={{ zIndex: 20 }}>{frame.code}</div>
                  <div className={`${shareTechMono.className} loader-film-frame-code loader-film-frame-code-right`} style={{ zIndex: 20 }}>{frame.stock}</div>
                  <div className="loader-film-gate-shadow pointer-events-none" style={{ zIndex: 20 }} />
                </div>
              );
            }

            const isActive = frame.era === activeFrame;

            return (
              <div
                key={`txt-${index}`}
                className={`loader-film-cell relative flex-1 ${isActive ? 'is-active' : ''} ${frame.isOpeningFrame ? 'is-opening-frame' : ''}`}
                style={{ minWidth: 0 }}
              >
                <div className="loader-film-cell-exposure" />
                <div className="loader-film-cell-halation" />
                <div className="loader-film-cell-noise" />
                <div className={`${shareTechMono.className} loader-film-frame-code loader-film-frame-code-left`}>{frame.code}</div>
                <div className={`${shareTechMono.className} loader-film-frame-code loader-film-frame-code-right`}>{frame.stock}</div>
                <div
                  className={`${frame.isOpeningFrame ? orbitron.className : specialElite.className} loader-film-year ${frame.isOpeningFrame ? 'loader-film-year-opening' : ''}`}
                >
                  <span>{frame.label}</span>
                  {frame.suffix && <span className={`${shareTechMono.className} loader-film-year-x`}>{frame.suffix}</span>}
                </div>
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


