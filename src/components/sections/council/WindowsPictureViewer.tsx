'use client';

/* -----------------------------------------------------------------------------
   Windows XP photo gallery.

   Default view is the thumbnail gallery — every picture laid out at once with
   its filename underneath, the way "My Pictures" opened in 2003. Clicking a
   picture slides open a details pane on the right; in the real shell that pane
   held dimensions and file size, here it holds who the person actually is.

   The command bar carries the Windows Picture and Fax Viewer button set in its
   real order — previous, next, best fit, actual size, slide show, zoom in, zoom
   out │ rotate CW, rotate CCW │ delete, print, copy to, open for editing │ help
   — drawn as Luna pictograms, with a Media Player transport at its centre:
   glossy blue orbs either side of the big play button, and a slider on the
   right where the volume used to be.

   Luna Blue system colours, verbatim: #ECE9D8 3D objects · #ACA899 control dark
   · #F1EFE2 control light · #316AC5 highlight · #0054E3 caption.
   -------------------------------------------------------------------------- */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CouncilMember, getMemberDepartments } from './councilData';
import MemberPhoto from './MemberPhoto';

interface WindowsPictureViewerProps {
  allMembers: CouncilMember[];
  onClose?: () => void;
  onMinimize?: () => void;
  scrollProgressRef?: React.RefObject<number>;
}

type ViewMode = 'gallery' | 'filmstrip';

/** Slideshow dwell per picture, in ms. */
const SLIDE_MS = 2800;

const FOLDER = 'Council 2026-27';
const ADDRESS = `C:\\Documents and Settings\\GDG CRCE\\My Documents\\My Pictures\\${FOLDER}`;

/* Captions are the PERSON, never the file.

   This used to decode the real filename off the CDN so the grid read like a
   folder listing. That worked while every upload happened to be `<name>.JPG`.
   The 2026-27 set is not: it holds `ll.jpeg`, `souymya.png`, `metha.png` and
   two raw `Screenshot 2026-08-16 125215.png` exports, so the "listing" was
   labelling people with a typo of someone else's nickname or with a screenshot
   timestamp. A caption that is wrong is worse than one that is unstylish —
   the caption is the only place most of these faces are named. */
const captionFor = (m: CouncilMember) => m.name;

/* -----------------------------------------------------------------------------
   Icons — 16×16 Luna pictograms. Flat fills, 1px outlines, no soft shadows:
   XP icons were drawn at this size, not scaled down from something larger.
   -------------------------------------------------------------------------- */

interface IconProps {
  size?: number;
}

const crisp = { shapeRendering: 'crispEdges' as const, xmlns: 'http://www.w3.org/2000/svg' };
const smooth = { xmlns: 'http://www.w3.org/2000/svg' };

/** The magnifier body shared by Actual Size / Zoom In / Zoom Out. */
function Magnifier({ size = 16, mark }: IconProps & { mark?: '+' | '-' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <line x1="9.6" y1="9.6" x2="14" y2="14" stroke="#3a4a5c" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="6.8" cy="6.8" r="4.9" fill="#EAF4FD" stroke="#2668AE" strokeWidth="1.5" />
      <path d="M3.6 5.2 A4.9 4.9 0 0 1 7.6 2.1" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
      {mark === '+' && <path d="M4.3 6.8 h5 M6.8 4.3 v5" stroke="#0B4C90" strokeWidth="1.6" strokeLinecap="round" />}
      {mark === '-' && <path d="M4.3 6.8 h5" stroke="#0B4C90" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function BestFitIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...crisp}>
      <rect x="1.5" y="2.5" width="13" height="11" fill="#FDFEFF" stroke="#2668AE" />
      <rect x="2.5" y="3.5" width="11" height="9" fill="#DCEDFB" />
      <g fill="#1B4F8C">
        <polygon points="3.6,4.6 8,4.6 3.6,9" />
        <polygon points="12.4,11.4 8,11.4 12.4,7" />
      </g>
    </svg>
  );
}

/** Rotate: a photo with a green arrow arcing over its top edge. */
function RotateIcon({ size = 16, cw = true }: IconProps & { cw?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <g transform={cw ? undefined : 'translate(16 0) scale(-1 1)'}>
        <rect x="2.5" y="7.5" width="8" height="7" fill="#FDFEFF" stroke="#8894A4" />
        <rect x="3.5" y="8.5" width="6" height="5" fill="#DCEDFB" />
        <path d="M3.4 6.4 A5.6 5.6 0 0 1 12.8 4.6" fill="none" stroke="#3D9B33" strokeWidth="2.1" strokeLinecap="round" />
        <polygon points="14.6,6.6 9.9,5.6 12.4,2.2" fill="#3D9B33" />
      </g>
    </svg>
  );
}

function DeleteIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <path
        d="M3.6 2.4 L8 6.5 L12.4 2.4 L14.2 4.4 L9.9 8 L14.2 11.6 L12.4 13.6 L8 9.5 L3.6 13.6 L1.8 11.6 L6.1 8 L1.8 4.4 Z"
        fill="#D42A20"
        stroke="#8E1109"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PrintIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...crisp}>
      <rect x="3.5" y="1.5" width="9" height="4" fill="#FDFEFF" stroke="#7B8797" />
      <path d="M1.5 5.5 h13 v5 h-13 Z" fill="#B9C2CF" stroke="#5C6675" />
      <rect x="2.5" y="6.5" width="11" height="3" fill="#D7DEE8" />
      <rect x="11.4" y="7.2" width="1.6" height="1.6" fill="#3D9B33" />
      <rect x="4" y="9.5" width="8" height="5" fill="#FDFEFF" stroke="#7B8797" />
      <path d="M5.4 11 h5.2 M5.4 12.6 h5.2" stroke="#9AA5B4" strokeWidth="0.9" />
    </svg>
  );
}

/** Copy To — a 3.5" floppy, which is what "save a copy" meant. */
function CopyToIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...crisp}>
      <path d="M1.5 1.5 h10.5 l2.5 2.5 v10.5 h-13 Z" fill="#2F5FA8" stroke="#183A72" />
      <rect x="4" y="1.5" width="6.5" height="4.5" fill="#DDE5F1" stroke="#183A72" />
      <rect x="8.4" y="2.4" width="1.6" height="2.8" fill="#5C6675" />
      <rect x="3.5" y="8.5" width="9" height="6" fill="#EEF2F8" stroke="#183A72" />
      <path d="M4.8 10 h6.4 M4.8 11.5 h6.4 M4.8 13 h4" stroke="#8894A4" strokeWidth="0.9" />
    </svg>
  );
}

/** Open for Editing — a photo with a pencil across its corner. */
function EditIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <rect x="1.5" y="2.5" width="10" height="8" fill="#FDFEFF" stroke="#7B8797" shapeRendering="crispEdges" />
      <rect x="2.5" y="3.5" width="8" height="6" fill="#CFE6FA" shapeRendering="crispEdges" />
      <polygon points="2.5,9.5 5.2,5.8 7,8 9,4.9 10.5,9.5" fill="#4E9E45" />
      <circle cx="8.8" cy="5.2" r="1.1" fill="#F5C324" />
      <polygon points="8.4,15 8.4,12.3 13.1,7.6 14.6,9.1 9.9,13.8" fill="#F5C324" stroke="#A67C10" strokeWidth="0.6" strokeLinejoin="round" />
      <polygon points="8.4,15 8.4,13.4 9.7,14.4" fill="#5C6675" />
    </svg>
  );
}

function HelpIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <circle cx="8" cy="8" r="7" fill="#2A6FB8" stroke="#123F74" />
      <path d="M3.2 6.4 A7 7 0 0 1 12.8 4.4" fill="none" stroke="#8FC4EE" strokeWidth="1.6" strokeLinecap="round" />
      <text x="8" y="11.7" textAnchor="middle" fontSize="10.5" fontWeight="700" fontFamily="Tahoma, sans-serif" fill="#ffffff">
        ?
      </text>
    </svg>
  );
}

/* --- Media Player transport glyphs (thin, blue, image-2 style) ------------ */

function ShuffleIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <g fill="none" stroke="#2A6FB8" strokeWidth="1.5" strokeLinecap="round">
        <path d="M1.5 4 H4 L11 12 H14" />
        <path d="M1.5 12 H4 L11 4 H14" />
      </g>
      <polygon points="12.6,2.2 15.4,4 12.6,5.8" fill="#2A6FB8" />
      <polygon points="12.6,10.2 15.4,12 12.6,13.8" fill="#2A6FB8" />
    </svg>
  );
}

function RepeatIcon({ size = 15 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <path d="M12.6 5.6 A5.4 5.4 0 1 0 13.2 9.4" fill="none" stroke="#2A6FB8" strokeWidth="1.6" strokeLinecap="round" />
      <polygon points="9.6,1.6 14,4.2 9.4,6.2" fill="#2A6FB8" />
    </svg>
  );
}

function StopIcon({ size = 13 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...crisp}>
      <rect x="3" y="3" width="10" height="10" rx="1" fill="#2F4256" />
    </svg>
  );
}

function SkipIcon({ size = 15, dir = 'prev' }: IconProps & { dir?: 'prev' | 'next' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <g fill="#2A6FB8">
        {dir === 'prev' ? (
          <>
            <rect x="2" y="3" width="2" height="10" rx="0.6" />
            <polygon points="14,3 14,13 5.4,8" />
          </>
        ) : (
          <>
            <polygon points="2,3 2,13 10.6,8" />
            <rect x="12" y="3" width="2" height="10" rx="0.6" />
          </>
        )}
      </g>
    </svg>
  );
}

/* --- Shell icons ---------------------------------------------------------- */

function NavArrowIcon({ size = 20, dir = 'back' }: IconProps & { dir?: 'back' | 'fwd' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...smooth}>
      <circle cx="8" cy="8" r="7.5" fill="#3F9E33" stroke="#1F5E1A" />
      <ellipse cx="8" cy="5.6" rx="6.2" ry="4.4" fill="#7FC86F" opacity="0.6" />
      <polygon
        points={dir === 'back' ? '3.4,8 8,3.4 8,6 12.2,6 12.2,10 8,10 8,12.6' : '12.6,8 8,3.4 8,6 3.8,6 3.8,10 8,10 8,12.6'}
        fill="#ffffff"
      />
    </svg>
  );
}

function UpIcon({ size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...crisp}>
      <path d="M1 4 h5 l1.4 1.6 H15 V14 H1 Z" fill="#F5C860" stroke="#9A7420" />
      <polygon points="8,2 12,6.5 9.6,6.5 9.6,10 6.4,10 6.4,6.5 4,6.5" fill="#3F9E33" stroke="#1F5E1A" />
    </svg>
  );
}

function FolderIcon({ size = 16, open = false }: IconProps & { open?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...crisp}>
      <path d="M1 3 h5 l1.4 1.6 H15 V13 H1 Z" fill={open ? '#FBE3A0' : '#F5C860'} stroke="#9A7420" />
      <path d="M1 5.6 H15 V13 H1 Z" fill={open ? '#F7D273' : '#EFB93F'} />
    </svg>
  );
}

function ViewsIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...crisp}>
      <rect x="1.5" y="2.5" width="5" height="5" fill="#CFE6FA" stroke="#2668AE" />
      <rect x="8.5" y="2.5" width="5" height="5" fill="#FDFEFF" stroke="#7B8797" />
      <rect x="1.5" y="9" width="5" height="5" fill="#FDFEFF" stroke="#7B8797" />
      <rect x="8.5" y="9" width="5" height="5" fill="#FDFEFF" stroke="#7B8797" />
    </svg>
  );
}

function ComputerIcon({ size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" {...crisp}>
      <rect x="1.5" y="2.5" width="13" height="8" fill="#8A9CB5" stroke="#3D4B5E" />
      <rect x="2.8" y="3.8" width="10.4" height="5.4" fill="#3E6FA8" />
      <rect x="5.5" y="11" width="5" height="2" fill="#B9C3D0" stroke="#3D4B5E" />
    </svg>
  );
}

/* --- Component ------------------------------------------------------------ */

export default function WindowsPictureViewer({
  allMembers,
  onClose,
  onMinimize,
  scrollProgressRef,
}: WindowsPictureViewerProps) {
  const members = allMembers;
  const total = members.length;
  const seniors = useMemo(() => members.filter((m) => m.tier === 'Senior Council'), [members]);
  const juniors = useMemo(() => members.filter((m) => m.tier === 'Junior Council'), [members]);

  const [index, setIndex] = useState(0);
  // Nothing is selected on open, so the gallery gets the full width — every
  // picture visible at once is the point of this view.
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('gallery');
  const [thumbScale, setThumbScale] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(true);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  const safeIndex = total > 0 ? Math.min(index, total - 1) : 0;
  const current = members[safeIndex];

  const select = useCallback((n: number) => {
    setIndex(n);
    setRotation(0);
    setPanelOpen(true);
  }, []);

  const step = useCallback(
    (delta: number) => {
      if (total === 0) return;
      setRotation(0);
      setIndex((i) => {
        if (shuffle && delta > 0) return Math.floor(Math.random() * total);
        const n = i + delta;
        if (!repeat && n >= total) return i;
        return ((n % total) + total) % total;
      });
    },
    [repeat, shuffle, total]
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  useEffect(() => {
    if (!playing || total < 2) return;
    const t = window.setInterval(() => step(1), SLIDE_MS);
    return () => window.clearInterval(t);
  }, [playing, step, total]);

  // Drive the grid container's scroll position based on scrollProgressRef
  useEffect(() => {
    if (!scrollProgressRef) return;
    let raf = 0;
    let lastP = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = scrollProgressRef.current ?? 0;
      if (p === lastP) return;
      lastP = p;
      const el = gridRef.current;
      if (!el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        el.scrollTop = p * maxScroll;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollProgressRef]);

  // Keep the current picture in view in whichever rail is on screen.
  useEffect(() => {
    const root = view === 'gallery' ? gridRef.current : stripRef.current;
    const sel = root?.querySelector<HTMLElement>('[data-selected="true"]');
    sel?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [safeIndex, view]);

  const folderSize = useMemo(() => `${(total * 0.16 + 0.42).toFixed(2)} MB`, [total]);

  if (!current) {
    return (
      <div className="xp-pv">
        <div className="xp-pv-empty">This folder is empty.</div>
      </div>
    );
  }

  const zoomIn = () => setThumbScale((s) => Math.min(s + 15, 190));
  const zoomOut = () => setThumbScale((s) => Math.max(s - 15, 60));
  const bestFit = () => {
    setThumbScale(100);
    setRotation(0);
  };

  return (
    <div
      className="xp-pv"
      style={{ ['--thumb' as string]: `${thumbScale / 100}` }}
      onClick={() => setMenuOpen(null)}
    >
      {/* ---- Luna title bar ---- */}
      <div className="xp-pv-titlebar">
        <div className="xp-pv-titlebar-left">
          <span className="xp-pv-titlebar-icon">
            <FolderIcon size={16} open />
          </span>
          <span className="xp-pv-titlebar-text">{FOLDER}</span>
        </div>
        <div className="xp-pv-titlebar-buttons">
          <button type="button" className="xp-pv-sysbtn" onClick={onMinimize} title="Minimize">
            <span className="xp-pv-sys-min" />
          </button>
          <button type="button" className="xp-pv-sysbtn" title="Restore Down" onClick={bestFit}>
            <span className="xp-pv-sys-max" />
          </button>
          <button type="button" className="xp-pv-sysbtn xp-pv-sysbtn-close" onClick={onClose} title="Close">
            <span className="xp-pv-sys-close">✕</span>
          </button>
        </div>
      </div>

      {/* ---- Menu bar ---- */}
      <div className="xp-pv-menubar">
        {['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'].map((label) => (
          <button
            type="button"
            key={label}
            className={`xp-pv-menu ${menuOpen === label ? 'xp-pv-menu-open' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((m) => (m === label ? null : label));
            }}
          >
            <span className="xp-pv-menu-key">{label[0]}</span>
            {label.slice(1)}
          </button>
        ))}
      </div>

      {/* ---- Standard Buttons toolbar ---- */}
      <div className="xp-pv-toolbar">
        <button type="button" className="xp-pv-tb" onClick={prev} title="Back">
          <NavArrowIcon dir="back" />
          <span className="xp-pv-tb-label">Back</span>
          <span className="xp-pv-tb-caret">▾</span>
        </button>
        <button type="button" className="xp-pv-tb xp-pv-tb-icon" onClick={next} title="Forward">
          <NavArrowIcon dir="fwd" />
        </button>
        <button
          type="button"
          className="xp-pv-tb xp-pv-tb-icon"
          onClick={() => {
            setView('gallery');
            setPanelOpen(false);
          }}
          title="Up"
        >
          <UpIcon />
        </button>
        <span className="xp-pv-tb-sep" />
        <button type="button" className="xp-pv-tb" onClick={() => setPanelOpen(true)} title="Search">
          <Magnifier />
          <span className="xp-pv-tb-label">Search</span>
        </button>
        <button type="button" className="xp-pv-tb" title="Folders">
          <FolderIcon />
          <span className="xp-pv-tb-label">Folders</span>
        </button>
        <span className="xp-pv-tb-sep" />
        <button
          type="button"
          className="xp-pv-tb"
          onClick={() => setView((v) => (v === 'gallery' ? 'filmstrip' : 'gallery'))}
          title={view === 'gallery' ? 'Views: Thumbnails' : 'Views: Filmstrip'}
        >
          <ViewsIcon />
          <span className="xp-pv-tb-caret">▾</span>
        </button>
      </div>

      {/* ---- Address bar ---- */}
      <div className="xp-pv-addressbar">
        <span className="xp-pv-address-label">Address</span>
        <div className="xp-pv-address-field">
          <FolderIcon size={14} open />
          <span className="xp-pv-address-text">{ADDRESS}</span>
          <span className="xp-pv-address-caret">▾</span>
        </div>
        <button type="button" className="xp-pv-go">
          <NavArrowIcon size={14} dir="fwd" />
          Go
        </button>
      </div>

      {/* ---- Client area ---- */}
      <main className="xp-pv-content">
          {view === 'gallery' ? (
            <div className="xp-pv-grid" ref={gridRef}>
              {/* Senior Council Group */}
              {seniors.length > 0 && (
                <>
                  <div className="xp-pv-group-title">Senior Council</div>
                  {seniors.map((m) => {
                    const originalIdx = members.findIndex((x) => x.id === m.id);
                    const on = panelOpen && originalIdx === safeIndex;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        data-selected={on ? 'true' : 'false'}
                        className={`xp-pv-tile ${on ? 'xp-pv-tile-selected' : ''}`}
                        onClick={() => select(originalIdx)}
                        title={`${m.name} — ${m.role}`}
                      >
                        <span className="xp-pv-tile-shell">
                          <MemberPhoto
                            member={m}
                            className="xp-pv-tile-photo"
                            style={{
                              transform: on && rotation ? `rotate(${rotation}deg)` : undefined,
                            }}
                          />
                        </span>
                        <span className="xp-pv-tile-name">{captionFor(m)}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Junior Council Group */}
              {juniors.length > 0 && (
                <>
                  <div className="xp-pv-group-title">Junior Council</div>
                  {juniors.map((m) => {
                    const originalIdx = members.findIndex((x) => x.id === m.id);
                    const on = panelOpen && originalIdx === safeIndex;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        data-selected={on ? 'true' : 'false'}
                        className={`xp-pv-tile ${on ? 'xp-pv-tile-selected' : ''}`}
                        onClick={() => select(originalIdx)}
                        title={`${m.name} — ${m.role}`}
                      >
                        <span className="xp-pv-tile-shell">
                          <MemberPhoto
                            member={m}
                            className="xp-pv-tile-photo"
                            style={{
                              transform: on && rotation ? `rotate(${rotation}deg)` : undefined,
                            }}
                          />
                        </span>
                        <span className="xp-pv-tile-name">{captionFor(m)}</span>
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            <div className="xp-pv-film">
              <div className="xp-pv-preview">
                <div className="xp-pv-photo-shell" style={{ transform: `rotate(${rotation}deg)` }}>
                  <MemberPhoto member={current} className="xp-pv-photo" size="full">
                    <span className="xp-pv-photo-team">
                      {current.name} — {current.role}
                    </span>
                  </MemberPhoto>
                </div>
              </div>
              <div className="xp-pv-strip" ref={stripRef}>
                {members.map((m, i) => (
                  <button
                    type="button"
                    key={m.id}
                    data-selected={i === safeIndex ? 'true' : 'false'}
                    className={`xp-pv-frame ${i === safeIndex ? 'xp-pv-frame-selected' : ''}`}
                    onClick={() => {
                      setIndex(i);
                      setRotation(0);
                    }}
                    title={`${m.name} — ${m.role}`}
                  >
                    <MemberPhoto member={m} className="xp-pv-frame-photo" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Details pane — the shell showed file properties here; this shows
              who the picture is of. */}
          {panelOpen && (
            <aside className="xp-pv-info">
              <div className="xp-pv-info-head">
                <span>Picture Details</span>
                <button
                  type="button"
                  className="xp-pv-info-close"
                  onClick={() => setPanelOpen(false)}
                  title="Close"
                >
                  ✕
                </button>
              </div>

              <div className="xp-pv-info-body">
                <div className="xp-pv-info-preview">
                  <MemberPhoto member={current} className="xp-pv-info-photo" size="full" />
                </div>
                {/* The headline under the preview is the full name and the post
                    — the two things the pane exists to answer. It used to be
                    the CDN filename, which named nobody. */}
                <div className="xp-pv-info-file">{current.name}</div>
                <div className="xp-pv-info-post">{current.role}</div>

                <dl className="xp-pv-info-fields">
                  <dt>Name</dt>
                  <dd>{current.name}</dd>
                  <dt>Post</dt>
                  <dd>{current.role}</dd>
                  <dt>Council</dt>
                  <dd>{current.tier}</dd>
                  <dt>Domains</dt>
                  <dd>{getMemberDepartments(current).join(' and ')}</dd>
                  <dt>Class</dt>
                  <dd>{current.branch}</dd>
                </dl>

                <div className="xp-pv-info-section">About</div>
                <p className="xp-pv-info-bio">{current.bio}</p>
              </div>
            </aside>
          )}
      </main>

      {/* ---- Command bar: Picture and Fax Viewer buttons, Media Player transport ---- */}
      <div className="xp-pv-cmdbar">
        <div className="xp-pv-cmd-left">
          {String(safeIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>

        <div className="xp-pv-cmd-center">
          <button
            type="button"
            className={`xp-pv-mini ${shuffle ? 'xp-pv-mini-on' : ''}`}
            onClick={() => setShuffle((v) => !v)}
            title="Shuffle"
          >
            <ShuffleIcon />
          </button>
          <button
            type="button"
            className={`xp-pv-mini ${repeat ? 'xp-pv-mini-on' : ''}`}
            onClick={() => setRepeat((v) => !v)}
            title="Repeat"
          >
            <RepeatIcon />
          </button>
          <button
            type="button"
            className="xp-pv-mini"
            onClick={() => {
              setPlaying(false);
              setIndex(0);
            }}
            title="Stop"
          >
            <StopIcon />
          </button>

          <button type="button" className="xp-pv-orb" onClick={prev} title="Previous Image (Left Arrow)">
            <SkipIcon size={16} dir="prev" />
          </button>

          <button
            type="button"
            className="xp-pv-orb xp-pv-orb-big"
            onClick={() => {
              setView('filmstrip');
              setPlaying((v) => !v);
            }}
            title={playing ? 'Pause Slide Show' : 'Start Slide Show (F11)'}
          >
            {playing ? (
              <svg width="17" height="17" viewBox="0 0 16 16" {...crisp}>
                <rect x="4" y="3" width="3" height="10" rx="0.6" fill="#ffffff" />
                <rect x="9" y="3" width="3" height="10" rx="0.6" fill="#ffffff" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 16 16" {...smooth}>
                <polygon points="5,3 13,8 5,13" fill="#ffffff" />
              </svg>
            )}
          </button>

          <button type="button" className="xp-pv-orb" onClick={next} title="Next Image (Right Arrow)">
            <SkipIcon size={16} dir="next" />
          </button>

          <span className="xp-pv-cmd-sep" />

          <button type="button" className="xp-pv-mini" onClick={bestFit} title="Best Fit (Ctrl+B)">
            <BestFitIcon />
          </button>
          <button type="button" className="xp-pv-mini" onClick={() => setThumbScale(100)} title="Actual Size (Ctrl+A)">
            <Magnifier />
          </button>
          <button type="button" className="xp-pv-mini" onClick={zoomIn} title="Zoom In (+)">
            <Magnifier mark="+" />
          </button>
          <button type="button" className="xp-pv-mini" onClick={zoomOut} title="Zoom Out (-)">
            <Magnifier mark="-" />
          </button>

          <span className="xp-pv-cmd-sep" />

          <button
            type="button"
            className="xp-pv-mini"
            onClick={() => setRotation((r) => (r + 90) % 360)}
            title="Rotate Clockwise (Ctrl+K)"
          >
            <RotateIcon cw />
          </button>
          <button
            type="button"
            className="xp-pv-mini"
            onClick={() => setRotation((r) => (r + 270) % 360)}
            title="Rotate Counter-clockwise (Ctrl+L)"
          >
            <RotateIcon cw={false} />
          </button>

          <span className="xp-pv-cmd-sep" />

          <button type="button" className="xp-pv-mini" title="Delete (Delete)">
            <DeleteIcon />
          </button>
          <button
            type="button"
            className="xp-pv-mini"
            onClick={() => typeof window !== 'undefined' && window.print()}
            title="Print (Ctrl+P)"
          >
            <PrintIcon />
          </button>
          <button type="button" className="xp-pv-mini" title="Copy To (Ctrl+S)">
            <CopyToIcon />
          </button>
          <button type="button" className="xp-pv-mini" onClick={() => setPanelOpen(true)} title="Open for Editing (Ctrl+E)">
            <EditIcon />
          </button>

          <span className="xp-pv-cmd-sep" />

          <button type="button" className="xp-pv-mini" title="Help (F1)">
            <HelpIcon />
          </button>
        </div>

        <div className="xp-pv-cmd-right">
          <span className="xp-pv-slider-icon">
            <Magnifier size={14} />
          </span>
          <input
            className="xp-pv-slider"
            type="range"
            min={60}
            max={190}
            step={5}
            value={thumbScale}
            onChange={(e) => setThumbScale(Number(e.target.value))}
            aria-label="Thumbnail size"
            style={{ ['--fill' as string]: `${((thumbScale - 60) / 130) * 100}%` }}
          />
        </div>
      </div>

      {/* ---- Status bar ---- */}
      <div className="xp-pv-statusbar">
        <span className="xp-pv-status-cell xp-pv-status-grow">
          {panelOpen ? `${current.name} — ${current.role}` : `${total} objects`}
        </span>
        <span className="xp-pv-status-cell">{folderSize}</span>
        <span className="xp-pv-status-cell xp-pv-status-place">
          <ComputerIcon size={13} /> My Computer
        </span>
      </div>
    </div>
  );
}
