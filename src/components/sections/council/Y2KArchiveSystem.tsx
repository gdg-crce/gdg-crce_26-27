'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import styles from './Y2KArchiveSystem.module.css';
import {
  councilMembers,
  teamsList,
  departmentsList,
  membersByTeam,
  leadOf,
  wallPhotos,
  groupPhoto,
  CouncilMember,
} from './councilData';
import MemberPhoto from './MemberPhoto';
import { COUNCIL_CLIPS } from '@/lib/media';
import { ik } from '@/lib/imagekit';

/* =============================================================================
   Y2KArchiveSystem
   A pixel-perfect Internet Explorer 6 (Windows XP, 2004) window rendering a
   browsable mid-2000s "TheFacebook" council archive.

   - Period IE6/XP chrome: Luna title bar, beveled Standard Buttons toolbar with
     aliased 16-bit icons + text labels, animated throbber, address bar, Links
     bar, and a status bar with a padlock + Internet zone.
   - A real-feeling thefacebook.com: top bar (search + logout + "online now"),
     a tab strip, a left mini-profile / quick-links / ad rail, and a footer.
   - Working navigation: tabs + a members directory + per-member profile pages.
     Back / Forward / Refresh / Stop, a per-view URL + window title, and a brief
     "Opening page…" load flash all behave like the real browser.

   Styles are encapsulated in Y2KArchiveSystem.module.css. Type: IBM Plex Mono.
   ========================================================================== */

interface Y2KArchiveSystemProps {
  onClose?: () => void;
  onMinimize?: () => void;
  /**
   * When true, drops the standalone green backdrop + outer padding and caps the
   * window height so it floats cleanly on a host surface (e.g. the XP desktop).
   */
  embedded?: boolean;
  /**
   * A ref holding a 0→1 scroll fraction. When provided, the browser page area
   * auto-scrolls to match, so the Facebook content scrolls down as the user
   * scrolls the main page rather than appearing as a static window.
   */
  scrollProgressRef?: React.RefObject<number>;
}

const HOST = 'http://www.GDGFRCRCE.com';

/* The profile's own artwork.
   Both go through ik(), so they pick up f-auto/q-auto and a width — the logo is
   a 1600² master and the mini avatar renders it at 42px, which is a 38x
   over-fetch if it is served raw. The logo's filename has spaces in it;
   `ik()` runs encodeURI, which is what turns those into %20 to match the
   uploaded path. */
const FB_BANNER = ik('/transition/3.png', 'w-1200');
const FB_LOGO_LG = ik('/transition/WhatsApp Image 2026-08-16 at 3.31.51 PM.jpeg', 'w-256');
const FB_LOGO_SM = ik('/transition/WhatsApp Image 2026-08-16 at 3.31.51 PM.jpeg', 'w-96');

/* -----------------------------------------------------------------------------
   16-bit pixel-art icons — drawn on a 16px grid with shapeRendering="crispEdges"
   so every diagonal renders as hard, non-smoothed stair-steps.
   -------------------------------------------------------------------------- */
type IconProps = { size?: number };

function IEIcon({ size = 17 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <circle cx="8" cy="8" r="7" fill="#1a5fb4" />
      <circle cx="8" cy="8" r="7" fill="none" stroke="#0b3d80" />
      <ellipse cx="8" cy="8" rx="7.5" ry="2.6" fill="none" stroke="#f2c200" strokeWidth="1.4" transform="rotate(-24 8 8)" />
      <text x="8" y="11.5" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fontWeight="700" fill="#fff">e</text>
    </svg>
  );
}

function ForwardIcon({ size = 18 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <circle cx="8" cy="8" r="7.5" fill="#2f8f3a" />
      <circle cx="8" cy="8" r="7.5" fill="none" stroke="#1c5f26" />
      <polygon points="13,8 8,3 8,6 4,6 4,10 8,10 8,13" fill="#fff" />
    </svg>
  );
}

function SearchIcon({ size = 16 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <circle cx="7" cy="7" r="4.5" fill="#cfe0f5" stroke="#1c66c9" strokeWidth="1.6" />
      <rect x="10.5" y="10.5" width="4.5" height="2" fill="#1c66c9" transform="rotate(45 11 11)" />
    </svg>
  );
}

function StarIcon({ size = 16 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,11.5 3.5,15 5,9.5 1,6 6,6" fill="#f2c200" stroke="#b58a00" />
    </svg>
  );
}

function FloppyIcon({ size = 14 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <polygon points="1,1 12,1 15,4 15,15 1,15" fill="#2f4f9f" stroke="#132a63" />
      <rect x="4" y="1" width="7" height="5" fill="#cdd6ea" />
      <rect x="8.5" y="2" width="2" height="3" fill="#2f4f9f" />
      <rect x="4" y="9" width="8" height="5" fill="#e8ecf6" stroke="#8a93b0" />
    </svg>
  );
}

function FolderIcon({ size = 14 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <polygon points="1,4 6,4 7.4,6 15,6 15,14 1,14" fill="#f2c14e" stroke="#a9821f" />
      <rect x="1" y="6" width="14" height="1" fill="#fff6df" />
    </svg>
  );
}

function CursorIcon({ size = 18 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <polygon points="2,1 2,13 5,10 7,15 9,14 7,9 11,9" fill="#fff" stroke="#111" strokeWidth="1" strokeLinejoin="miter" />
    </svg>
  );
}

function PageIcon({ size = 13 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <polygon points="2,1 10,1 14,5 14,15 2,15" fill="#fff" stroke="#5a6b8c" />
      <polygon points="10,1 10,5 14,5" fill="#c9d3e6" stroke="#5a6b8c" />
      <rect x="4" y="7" width="7" height="1" fill="#3b5998" />
      <rect x="4" y="9" width="7" height="1" fill="#3b5998" />
      <rect x="4" y="11" width="5" height="1" fill="#3b5998" />
    </svg>
  );
}

function GlobeIcon({ size = 12 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <circle cx="8" cy="8" r="6.5" fill="#7fb0e6" stroke="#2c5a92" />
      <path d="M1.6 8 H14.4 M8 1.5 V14.5 M3 4.5 H13 M3 11.5 H13" fill="none" stroke="#2c5a92" strokeWidth="0.8" />
    </svg>
  );
}

function PadlockIcon({ size = 12 }: IconProps) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <path d="M5 7 V5 A3 3 0 0 1 11 5 V7" fill="none" stroke="#9a8a2a" strokeWidth="1.6" />
      <rect x="3.5" y="7" width="9" height="7" fill="#f2c200" stroke="#9a8a2a" />
      <rect x="7.2" y="9" width="1.6" height="3" fill="#7d6a10" />
    </svg>
  );
}

/* A tiny colored square used as a social-link bullet. */
function PixelDot({ color, size = 10 }: { color: string; size?: number }) {
  return (
    <svg className={styles.pixel} width={size} height={size} viewBox="0 0 10 10" shapeRendering="crispEdges">
      <rect x="0" y="0" width="10" height="10" fill={color} />
      <rect x="0" y="0" width="10" height="2" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

/* -----------------------------------------------------------------------------
   Data helpers
   -------------------------------------------------------------------------- */
const memberById = (id: number): CouncilMember =>
  councilMembers.find((m) => m.id === id) as CouncilMember;

const teams = departmentsList;

/** Headline figures, counted rather than typed, so they cannot drift. */
const TOTAL_MEMBERS = councilMembers.length;
const TOTAL_TEAMS = teams.length;

const seniorCouncil = councilMembers.filter((m) => m.tier === 'Senior Council');
const juniorCouncil = councilMembers.filter((m) => m.tier === 'Junior Council');

const SOCIAL_META: Record<string, { label: string; color: string }> = {
  github: { label: 'github', color: '#2b2b2b' },
  linkedin: { label: 'linkedin', color: '#0e76a8' },
  instagram: { label: 'instagram', color: '#c13584' },
  email: { label: 'e-mail', color: '#3b5998' },
};

/* The "Pinned People" panel (top three of the Senior Council) is gone, as is
   the "Friends · The Wall" 2×2 grid of department leads that used to sit beside
   it. Both were picking three or four names out of a roster of twenty-two and
   presenting them as the headline — the members directory is one click away and
   shows everyone, in order, without playing favourites. The Wall is real posts
   now; see `renderWall`. */

/* -----------------------------------------------------------------------------
   Wall video post — a click-to-play FACADE, not a <video> tag.

   This is the only moving picture on a page that is already stacked on top of a
   live WebGL scene inside a pinned ScrollTrigger, so the cost model matters more
   than the markup:

   1. **Nothing is requested until the click.** Before `armed` there is no
      <video> element in the tree at all — not a hidden one, not one with
      `preload="none"`. A `preload="none"` element is cheap but not free (the
      browser still creates a media element and, on some versions, still opens a
      connection on first layout); no element is actually free. Both clips
      together are 5.2 MB, and on a visit where nobody presses play that is 0 KB
      and zero decoder allocations.
   2. **One clip decodes at a time.** `activeClip` below is module-level on
      purpose: pressing play on the second post pauses the first. Two <video>
      elements decoding simultaneously over a running three.js canvas is the
      specific thing that would drop frames here, and it is exactly what a user
      does when they want to compare two clips.
   3. **The poster and the video are the same picture, cropped the same way.**
      The facade shows the clip's own first frame (see COUNCIL_CLIPS), and both
      the <img> and the <video> get `object-fit: cover` with the SAME
      `--focus` object-position. That is what stops the frame sliding or
      resizing at the instant playback begins — the first video frame lands
      exactly where the poster already was. It also crops clip-1's baked-in
      black bars off both, so the placeholder is the footage rather than a
      letterbox. The frame's aspect is a constant, so it is laid out correctly
      on first paint and never reflows when metadata arrives — which matters
      inside a pinned section, where a late reflow fights ScrollTrigger's
      measurements.

   The <video> also carries `poster`, so on the slower clip the same still holds
   the frame while the first bytes arrive instead of flashing black.

   `muted` is enforced on the element rather than left to the attribute: React
   sets `muted` as a DOM property and it is the one media attribute that has
   historically failed to apply on mount. The clips are meant to be silent.
   -------------------------------------------------------------------------- */

/** The clip currently playing, so a second play() can pause the first. */
let activeClip: HTMLVideoElement | null = null;

interface WallVideoPostProps {
  src: string;
  poster: string;
  caption: string;
  focusY: number;
}

function WallVideoPost({ src, poster, caption, focusY }: WallVideoPostProps) {
  const [armed, setArmed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (armed && videoRef.current) videoRef.current.muted = true;
  }, [armed]);

  // Never leave a pointer to an unmounted element in the module-level slot.
  useEffect(() => {
    const el = videoRef.current;
    return () => {
      if (activeClip === el) activeClip = null;
    };
  }, [armed]);

  return (
    <article className={styles.wallPost}>
      <div className={styles.wallPostHead}>
        <span className={styles.wallPostAuthor}>GDG on Campus · CRCE</span>
        <span className={styles.wallPostMeta}>posted a video</span>
      </div>
      <p className={styles.wallPostText}>{caption}</p>

      <div
        className={styles.wallVideoFrame}
        style={{ ['--focus' as string]: `${(focusY * 100).toFixed(1)}%` }}
      >
        {armed ? (
          <video
            ref={videoRef}
            className={styles.wallVideo}
            src={src}
            poster={poster}
            muted
            playsInline
            autoPlay
            controls
            preload="auto"
            onPlay={() => {
              const el = videoRef.current;
              if (activeClip && activeClip !== el) activeClip.pause();
              activeClip = el;
            }}
          />
        ) : (
          <button
            type="button"
            className={styles.wallVideoFacade}
            onClick={() => setArmed(true)}
            aria-label={`Play video: ${caption}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.wallVideoPoster}
              src={poster}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
            />
            <span className={styles.wallVideoScrim} />
            <span className={styles.wallVideoPlay}>
              <svg width="46" height="46" viewBox="0 0 34 34" aria-hidden="true">
                <circle cx="17" cy="17" r="16" fill="rgba(59,89,152,0.92)" stroke="#fff" strokeWidth="1.5" />
                <polygon points="13,9 26,17 13,25" fill="#fff" />
              </svg>
            </span>
            <span className={styles.wallVideoLabel}>click to play · no sound</span>
          </button>
        )}
      </div>
    </article>
  );
}

/* -----------------------------------------------------------------------------
   Navigation model
   -------------------------------------------------------------------------- */
type ViewName = 'profile' | 'members' | 'member' | 'groups' | 'account';
interface Entry {
  view: ViewName;
  memberId?: number;
  team?: string;
}

const teamSlug = (t: string) => t.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '');

function describe(e: Entry): { url: string; title: string } {
  switch (e.view) {
    case 'members':
      return {
        url: `${HOST}/members.php${e.team && e.team !== 'All Tracks' ? `?net=${teamSlug(e.team)}` : ''}`,
        title: 'Members Directory',
      };
    case 'member': {
      const m = memberById(e.memberId ?? 1);
      return { url: `${HOST}/profile.php?id=${m.id}`, title: `${m.name} — Profile` };
    }
    case 'groups':
      return { url: `${HOST}/groups.php`, title: 'Groups' };
    case 'account':
      return { url: `${HOST}/account.php`, title: 'My Account' };
    case 'profile':
    default:
      return { url: `${HOST}/council_archive_2026`, title: 'GDG on Campus · CRCE' };
  }
}

export default function Y2KArchiveSystem({ onClose, onMinimize, embedded, scrollProgressRef }: Y2KArchiveSystemProps) {
  const [maximized, setMaximized] = useState(false);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  // Drive the page's scrollTop from the parent's scroll progress.
  // This makes the Facebook page scroll down organically as the user
  // scrolls the main page, instead of sitting statically.
  useEffect(() => {
    if (!scrollProgressRef) return;
    let raf = 0;
    let lastP = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const p = scrollProgressRef.current ?? 0;
      if (p === lastP) return;
      lastP = p;
      const el = pageRef.current;
      if (!el) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll > 0) {
        el.scrollTop = p * maxScroll;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollProgressRef]);

  // Browser history stack — kept so the address bar reflects where you are.
  const [stack, setStack] = useState<Entry[]>([{ view: 'profile' }]);
  const [idx, setIdx] = useState(0);
  const cur = stack[idx];

  const loadTimer = useRef<number | null>(null);
  const flash = useCallback(() => {
    setLoading(true);
    if (loadTimer.current) window.clearTimeout(loadTimer.current);
    loadTimer.current = window.setTimeout(() => setLoading(false), 680);
  }, []);

  const go = useCallback(
    (entry: Entry) => {
      setStack((s) => [...s.slice(0, idx + 1), entry]);
      setIdx((i) => i + 1);
      flash();
    },
    [idx, flash]
  );
  // The IE toolbar is gone, but the member-detail page still offers an in-page
  // "back to results" link, so the history stack keeps a back step.
  const back = useCallback(() => {
    setIdx((i) => (i > 0 ? i - 1 : i));
    flash();
  }, [flash]);

  const meta = describe(cur);
  const activeTab: ViewName = cur.view === 'member' ? 'members' : cur.view;

  /* ----- Small building blocks ---------------------------------------- */
  const SocialLinks = ({ m }: { m: CouncilMember }) => (
    <div className={styles.socialRow}>
      {(Object.keys(m.socials) as Array<keyof typeof m.socials>).map((k) => {
        const sm = SOCIAL_META[k];
        if (!sm || !m.socials[k]) return null;
        return (
          <span key={k} className={styles.socialLink} title={m.socials[k]}>
            <PixelDot color={sm.color} /> {sm.label}
          </span>
        );
      })}
    </div>
  );

  const MemberCard = ({ m }: { m: CouncilMember }) => (
    <button type="button" className={styles.memberCard} onClick={() => go({ view: 'member', memberId: m.id })}>
      <MemberPhoto member={m} className={styles.memberCardPhoto} />
      <div className={styles.memberCardBody}>
        <div className={styles.memberCardName}>{m.name}</div>
        <div className={styles.memberCardRole}>{m.role}</div>
        <div className={styles.memberCardTeam}>
          {m.team} · {m.branch}
        </div>
      </div>
      <span className={styles.memberCardView}>view profile ▸</span>
    </button>
  );

  /* ----- Views --------------------------------------------------------- */
  const renderProfile = () => (
    <>
      <div className={styles.profileHeader}>
        {/* The cover art carries its own typography — the GDG mark and
            "On Campus · Fr. Conceicao Rodrigues College of Engineering" are
            printed into it. The `bannerGrid` scanline overlay and the
            `bannerText` title block that used to sit on top are gone: the grid
            veiled the artwork, and the title landed straight across the logo
            while repeating what the identity block below already says. */}
        <div className={styles.banner} style={{ backgroundImage: `url(${FB_BANNER})` }}>
          {/* The profile photo lives INSIDE the banner now, hanging off its
              bottom edge, so it stays pinned to that edge whatever height the
              banner resolves to. It used to be a sibling at a hardcoded
              `top: 92px`, which only lined up while the banner was locked to
              150px — and the banner is now sized by the artwork's aspect. */}
          <div className={styles.profilePhoto}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={FB_LOGO_LG} alt="GDG on Campus CRCE" draggable={false} />
          </div>
          <span className={styles.bannerCursor}>
            <CursorIcon size={22} />
          </span>
        </div>
        <div className={styles.profileIdentity}>
          <div className={styles.identityName}>GDG on Campus · CRCE</div>
          <div className={styles.identityMeta}>
            Fr. Conceicao Rodrigues College of Engineering · Bandra, Mumbai
            <br />
            Student Developer Council — Class of 2026-27
          </div>
          <div className={styles.identityBadges}>
            <span className={styles.badge} onClick={() => go({ view: 'members', team: 'All Tracks' })} role="button">
              <FolderIcon /> View all {TOTAL_MEMBERS} members
            </span>
            <span className={styles.badge}>
              <FloppyIcon /> Save Profile
            </span>
            <span className={styles.badge}>Verified Archive · online now</span>
          </div>
        </div>
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>
            <PageIcon /> Account Info
          </span>
          <span className={styles.panelMeta}>last update: Jul 2026</span>
        </div>
        <div className={styles.acctGrid}>
          <div><span className={styles.acctKey}>Networks:</span> CRCE, Mumbai · GDG on Campus</div>
          <div><span className={styles.acctKey}>Members:</span> {TOTAL_MEMBERS} · {TOTAL_TEAMS} teams</div>
          <div><span className={styles.acctKey}>Council:</span> {seniorCouncil.length} senior · {juniorCouncil.length} junior</div>
          <div><span className={styles.acctKey}>Member since:</span> January 2026</div>
          <div><span className={styles.acctKey}>Status:</span> Compiling at 60 FPS</div>
        </div>
      </section>

      {/* The club's own photo album — candids, not portraits, so these come
          from wallPhotos rather than the roster. */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>
            <FolderIcon size={13} /> Photos
          </span>
          <span className={styles.panelMeta}>{wallPhotos.length} albums · uploaded 2026</span>
        </div>
        <div className={styles.photoStrip}>
          {wallPhotos.map((p) => (
            <figure key={p.id} className={styles.photoTile}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.caption} loading="lazy" decoding="async" draggable={false} />
              <figcaption>{p.caption}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* The Wall — actual posts. This replaced a 2×2 grid of department leads
          that duplicated Pinned People directly above it and the members
          directory one click away. */}
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>
            <CursorIcon size={13} /> The Wall
          </span>
          <span className={styles.panelMeta}>{1 + COUNCIL_CLIPS.length} posts</span>
        </div>

        <div className={styles.wallPosts}>
          <article className={styles.wallPost}>
            <div className={styles.wallPostHead}>
              <span className={styles.wallPostAuthor}>GDG on Campus · CRCE</span>
              <span className={styles.wallPostMeta}>wrote on the wall</span>
            </div>
            <p className={styles.wallPostText}>{groupPhoto.caption}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.wallPostPhoto}
              src={groupPhoto.src}
              alt={groupPhoto.caption}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </article>

          {COUNCIL_CLIPS.map((clip) => (
            <WallVideoPost
              key={clip.src}
              src={clip.src}
              poster={clip.poster}
              caption={clip.caption}
              focusY={clip.focusY}
            />
          ))}
        </div>
      </section>
    </>
  );

  const renderMembers = () => {
    const activeTeam = cur.team ?? 'All Tracks';
    const list =
      activeTeam === 'All Tracks' ? councilMembers : councilMembers.filter((m) => m.team === activeTeam);
    return (
      <>
        <div className={styles.dirHead}>
          <span className={styles.panelTitle}>
            <SearchIcon /> Members Directory
          </span>
          <span className={styles.dirCount}>{list.length} people found</span>
        </div>
        <div className={styles.dirFilter}>
          {teamsList.map((t) => (
            <button
              type="button"
              key={t}
              className={`${styles.dirFilterTab} ${activeTeam === t ? styles.dirFilterActive : ''}`}
              onClick={() => go({ view: 'members', team: t })}
            >
              {t}
            </button>
          ))}
        </div>
        <div className={styles.memberGrid}>
          {list.map((m) => (
            <MemberCard key={m.id} m={m} />
          ))}
        </div>
      </>
    );
  };

  const renderMemberDetail = () => {
    const m = memberById(cur.memberId ?? 1);
    const teammates = councilMembers.filter((x) => x.team === m.team && x.id !== m.id);
    return (
      <>
        <button type="button" className={styles.detailBack} onClick={back}>
          ‹ back to results
        </button>
        <div className={styles.detailTop}>
          <div className={styles.detailLeft}>
            <MemberPhoto member={m} className={styles.detailAvatar} />
            {/* No Poke / Message / Add to Friends row. They were period-correct
                set dressing, but they are buttons on a real person's page that
                do nothing when pressed — the profile is an archive card, not an
                account someone can be contacted through. */}
            <SocialLinks m={m} />
          </div>

          <div className={styles.detailRight}>
            <div className={styles.detailName}>{m.name}</div>
            <div className={styles.detailRole}>{m.role}</div>
            <div className={styles.detailMetaRow}>
              <span className={styles.teamBadge}>{m.team}</span>
              <span className={styles.detailMeta}>{m.branch}</span>
              <span className={styles.detailMeta}>{m.tier}</span>
              <span className={styles.detailMeta}>
                <span className={styles.onlineDot} /> online now
              </span>
            </div>

            <div className={styles.dPanel}>
              <div className={styles.dPanelHead}>Account Info</div>
              <div className={styles.dPanelBody}>
                <div><span className={styles.acctKey}>Post:</span> {m.role}</div>
                <div><span className={styles.acctKey}>Council:</span> {m.tier}</div>
                <div><span className={styles.acctKey}>Team:</span> {m.team}</div>
                <div><span className={styles.acctKey}>Class:</span> {m.branch}</div>
              </div>
            </div>

            <div className={styles.dPanel}>
              <div className={styles.dPanelHead}>The Skinny</div>
              <div className={styles.dPanelBody}>{m.bio}</div>
            </div>

            <div className={styles.dPanel}>
              <div className={styles.dPanelHead}>Groups</div>
              <div className={styles.dPanelBody}>
                <div className={styles.techChips}>
                  {m.techStack.map((t) => (
                    <span key={t} className={styles.techChip}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.quoteBox}>
              <span className={styles.quoteMark}>“</span>
              {m.quote}
            </div>
          </div>
        </div>

        {teammates.length > 0 && (
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>
                <FolderIcon size={13} /> Same Group · {m.team}
              </span>
              <span className={styles.panelMeta}>{teammates.length} teammates</span>
            </div>
            <div className={styles.teammates}>
              {teammates.map((t) => (
                <button type="button" key={t.id} className={styles.teammateChip} onClick={() => go({ view: 'member', memberId: t.id })}>
                  <MemberPhoto member={t} className={styles.teammateAvatar} />
                  {t.name}
                </button>
              ))}
            </div>
          </section>
        )}
      </>
    );
  };

  const renderGroups = () => (
    <>
      <div className={styles.dirHead}>
        <span className={styles.panelTitle}>
          <FolderIcon /> Groups
        </span>
        <span className={styles.dirCount}>{teams.length} groups</span>
      </div>
      <div className={styles.groupList}>
        {teams.map((t) => {
          const members = membersByTeam(t);
          const lead = leadOf(t);
          return (
            <div key={t} className={styles.groupItem}>
              <span className={styles.groupIcon}>
                <FolderIcon size={22} />
              </span>
              <div className={styles.groupInfo}>
                <div className={styles.groupName}>{t}</div>
                <div className={styles.groupCount}>
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                  {/* Events, Social Media and Outreach have no Senior Council
                      post on the roster, so this line reports that instead of
                      inventing one. */}
                  {lead ? ` · led by ${lead.name} (${lead.role})` : ' · junior-run'}
                </div>
                {/* Names, not just faces. A row of unlabelled 24px avatars told
                    you a group had six people and nothing about who they were,
                    which is the one thing a directory owes you. */}
                <div className={styles.groupRoster}>
                  {members.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      className={styles.groupMember}
                      onClick={() => go({ view: 'member', memberId: m.id })}
                      title={`${m.name} — ${m.role} · ${m.branch}`}
                    >
                      <MemberPhoto member={m} className={styles.groupAvatar} />
                      <span className={styles.groupMemberName}>{m.name}</span>
                      <span className={styles.groupMemberRole}>{m.role}</span>
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" className={styles.groupView} onClick={() => go({ view: 'members', team: t })}>
                view group ▸
              </button>
            </div>
          );
        })}
      </div>
    </>
  );

  const renderAccount = () => (
    <>
      <div className={styles.dirHead}>
        <span className={styles.panelTitle}>
          <PageIcon /> My Account
        </span>
        <span className={styles.dirCount}>council_archive_2026</span>
      </div>
      <div className={styles.dPanel}>
        <div className={styles.dPanelHead}>Account Information</div>
        <div className={styles.dPanelBody}>
          <div className={styles.acctGrid}>
            <div><span className={styles.acctKey}>Name:</span> GDG on Campus · CRCE</div>
            <div><span className={styles.acctKey}>Networks:</span> CRCE, Mumbai</div>
            <div><span className={styles.acctKey}>Member since:</span> January 2026</div>
            <div><span className={styles.acctKey}>Contact:</span> council@gdgfrcrce.com</div>
            <div><span className={styles.acctKey}>Registered:</span> {TOTAL_MEMBERS} members</div>
            <div><span className={styles.acctKey}>Screen name:</span> gdg_crce_2026</div>
          </div>
        </div>
      </div>
      <div className={styles.dPanel}>
        <div className={styles.dPanelHead}>Privacy Settings</div>
        <div className={styles.dPanelBody}>
          {[
            ['Allow anyone to poke me', true],
            ['Show my profile in the directory', true],
            ['Let friends write on my Wall', true],
            ['Receive an e-mail when poked', false],
          ].map(([label, on]) => (
            <label key={label as string} className={styles.acctCheckRow}>
              <input type="checkbox" defaultChecked={on as boolean} />
              {label as string}
            </label>
          ))}
        </div>
      </div>
      <div className={styles.acctNote}>
        <StarIcon /> This site is best viewed in Internet Explorer 6.0 at 800×600 or higher.
      </div>
    </>
  );

  const renderView = () => {
    switch (cur.view) {
      case 'members':
        return renderMembers();
      case 'member':
        return renderMemberDetail();
      case 'groups':
        return renderGroups();
      case 'account':
        return renderAccount();
      case 'profile':
      default:
        return renderProfile();
    }
  };

  const TABS: Array<{ key: ViewName; label: string; entry: Entry }> = [
    // No 'members' tab — the directory is reached from the profile and groups
    // pages instead, which keeps the strip down to the three top-level places.
    { key: 'profile', label: 'my profile', entry: { view: 'profile' } },
    { key: 'groups', label: 'groups', entry: { view: 'groups' } },
    { key: 'account', label: 'my account', entry: { view: 'account' } },
  ];

  return (
    <div className={`${styles.viewport} ${embedded ? styles.embedded : ''}`}>
      <div className={`${styles.ieWindow} ${maximized ? styles.maximized : ''}`}>
        {/* ---- Luna-blue title bar ---- */}
        <div className={styles.titleBar}>
          <div className={styles.titleLeft}>
            <IEIcon />
            <span className={styles.titleText}>{meta.title} — Microsoft Internet Explorer</span>
          </div>
          <div className={styles.titleButtons}>
            <button type="button" className={`${styles.winBtn} ${styles.winMin}`} title="Minimize" onClick={onMinimize}>
              _
            </button>
            <button
              type="button"
              className={`${styles.winBtn} ${styles.winMax}`}
              title={maximized ? 'Restore Down' : 'Maximize'}
              onClick={() => setMaximized((v) => !v)}
            >
              □
            </button>
            <button type="button" className={`${styles.winBtn} ${styles.winClose}`} title="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        {/* ---- Menu bar ---- */}
        <div className={styles.menuBar}>
          {['File', 'Edit', 'View', 'Favorites', 'Tools', 'Help'].map((label) => (
            <span key={label} className={styles.menuItem}>
              <span className={styles.menuUnderline}>{label[0]}</span>
              {label.slice(1)}
            </span>
          ))}
        </div>

        {/* ---- Address bar ---- */}
        <div className={styles.addressBar}>
          <span className={styles.addressLabel}>Address</span>
          <div className={styles.addressField}>
            <PageIcon />
            <input
              className={styles.addressInput}
              type="text"
              value={meta.url}
              readOnly
              spellCheck={false}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Address"
            />
          </div>
          <button type="button" className={styles.goBtn} onClick={flash}>
            <ForwardIcon size={13} />
            Go
          </button>
        </div>

        {/* ---- Links bar (default IE6 links) ---- */}
        <div className={styles.linksBar}>
          <span className={styles.linksBarLabel}>Links</span>
          {['Customize Links', 'Free Hotmail', 'Windows', 'Windows Media'].map((l) => (
            <span key={l} className={styles.linksBarItem}>
              <PageIcon size={11} /> {l}
            </span>
          ))}
        </div>

        {/* ================= BROWSER PAGE — TheFacebook document ================= */}
        <div ref={pageRef} className={styles.page} key={`${cur.view}-${cur.memberId ?? ''}-${cur.team ?? ''}`}>
          {/* thefacebook top bar */}
          <div className={styles.fbNav}>
            <button type="button" className={styles.fbWordmark} onClick={() => go({ view: 'profile' })}>
              <span className={styles.fbWordmarkThe}>the</span>facebook
            </button>
            <div className={styles.fbNavRight}>
              <span className={styles.fbOnline}>
                <span className={styles.onlineDot} /> online now
              </span>
              <span className={styles.fbUser}>Welcome, GDG CRCE</span>
              <span className={styles.fbLogout}>[ logout ]</span>
            </div>
          </div>

          {/* primary tab strip */}
          <div className={styles.fbTabs}>
            {TABS.map((t) => (
              <button
                type="button"
                key={t.key}
                className={`${styles.fbTab} ${activeTab === t.key ? styles.fbTabActive : ''}`}
                onClick={() => go(t.entry)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className={styles.fbBody}>
            <div className={styles.columns}>
              {/* Left rail: mini profile + quick links + period ad */}
              <aside className={styles.sidebar}>
                <div className={styles.miniProfile}>
                  <div className={styles.miniAvatar}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={FB_LOGO_SM} alt="" draggable={false} />
                  </div>
                  <div>
                    <div className={styles.miniName}>GDG · CRCE</div>
                    <div className={styles.miniStatus}>
                      <span className={styles.onlineDot} /> online now
                    </div>
                  </div>
                </div>

                <div className={styles.sideHead}>Quick Links</div>
                <div className={styles.quickLinks}>
                  <button
                    type="button"
                    className={`${styles.quickLink} ${activeTab === 'profile' ? styles.quickLinkActive : ''}`}
                    onClick={() => go({ view: 'profile' })}
                  >
                    <FolderIcon /> my profile
                  </button>
                </div>

                <div className={styles.adBox}>
                  <div className={styles.adTitle}>
                    <IEIcon size={13} /> GET INTERNET EXPLORER 6
                  </div>
                  <div className={styles.adText}>
                    Surf the web faster! Best viewed at 800×600.
                    <br />
                    56k modem friendly.
                  </div>
                  <div className={styles.hitCounter}>
                    <span>visitors</span>
                    <span className={styles.hitDigits}>0013370</span>
                  </div>
                </div>
              </aside>

              {/* Main content — switches by view */}
              <main className={styles.main}>{renderView()}</main>
            </div>

            {/* thefacebook footer */}
            <div className={styles.fbFooter}>
              <div className={styles.fbFooterProd}>a GDG CRCE production</div>
              <div className={styles.fbFooterLinks}>
                {['About', 'Contact', 'FAQ', 'Terms', 'Privacy'].map((l) => (
                  <span key={l}>{l}</span>
                ))}
                <span>© 2004 GDGFRCRCE.com</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- IE6 status bar ---- */}
        <div className={styles.statusBar}>
          <div className={styles.statusLeft}>
            <div className={`${styles.statusProgress} ${loading ? styles.statusProgressActive : ''}`} />
            <span style={{ position: 'relative' }}>{loading ? `Opening page ${meta.url}…` : 'Done'}</span>
          </div>
          <div className={styles.statusRight}>
            <span className={styles.statusPad}>
              <PadlockIcon />
            </span>
            <span className={styles.statusZone}>
              <GlobeIcon />
              <span>Internet</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
