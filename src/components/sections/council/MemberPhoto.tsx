'use client';

import React from 'react';
import { CouncilMember } from './councilData';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/* -----------------------------------------------------------------------------
   One member's photograph, everywhere.

   Every avatar in the council surfaces — TheFacebook archive, the XP gallery,
   the mobile feed — goes through here, so loading and failure behaviour is
   defined once instead of at sixteen call sites.

   ── The placeholder is the background colour, and nothing else ──────────────
   This used to render `member.avatarIcon` — a camera emoji — in a <span> under
   the photo. Three things were wrong with it:

     1. You SAW it. These are ~1MB camera JPEGs, so on a cold load every tile
        showed a camera glyph for a beat before the portrait covered it. A
        placeholder that announces itself is worse than no placeholder.
     2. It was painted for every avatar on every one of those call sites and
        then immediately covered — a full text/emoji raster (emoji are colour
        bitmap glyphs, not cheap) thrown away on the next frame.
     3. It was an extra element and an extra layout pass per avatar, purely to
        show something we did not want shown.

   The department colour already fills the frame, costs one paint of a solid
   fill, and degrades exactly the same way if the fetch fails outright: a
   department-coloured tile, never a broken-image icon. That is the whole
   placeholder now.

   Styling is inline rather than a class because the call sites are split
   between global CSS (council.css) and CSS modules, and a shared class would
   have to exist in both.
   -------------------------------------------------------------------------- */

interface MemberPhotoProps {
  member: CouncilMember;
  /** The caller's own frame class — sizing and borders stay with the caller. */
  className?: string;
  style?: React.CSSProperties;
  /**
   * Which CDN variant to fetch. Defaults to the 320px thumbnail, because most
   * call sites are grids and rails where many are on screen at once — only the
   * one photo actually being looked at large should ask for 'full'.
   */
  size?: 'thumb' | 'full';
  /** Rendered above the photo — slot badges, team tags, hover chrome. */
  children?: React.ReactNode;
  title?: string;
}

export default function MemberPhoto({
  member,
  className,
  style,
  size = 'thumb',
  children,
  title,
}: MemberPhotoProps) {
  return (
    <span
      className={className}
      title={title}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: member.avatarBg,
        ...style,
      }}
    >
      {/* Plain <img>, not next/image: these are remote ImageKit URLs that would
          otherwise need a remotePatterns entry, and ImageKit is already doing
          the format negotiation via ?tr=f-auto. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={size === 'full' ? member.photo : member.photoThumb}
        alt={member.name}
        loading="lazy"
        decoding="async"
        draggable={false}
        // Drop the element on failure so the department tile below is what
        // shows, rather than the browser's broken-image glyph.
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
        // Refresh ScrollTrigger when images load to update heights and avoid trigger offset shifts on mobile
        onLoad={() => {
          if (typeof window !== 'undefined') {
            const timer = (window as any)._stRefreshTimer;
            if (timer) clearTimeout(timer);
            (window as any)._stRefreshTimer = setTimeout(() => {
              ScrollTrigger.refresh();
            }, 150);
          }
        }}
        // Absolute, not static: the call sites size their own frames in wildly
        // different ways (fixed px, aspect-ratio, flex child), and taking the
        // photo out of flow is what lets one component serve all of them.
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
      {children}
    </span>
  );
}
