'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { currentIntroPhases } from '@/lib/introTimeline';
import './top-nav.css';

/** Warm amber, borrowed from the archive palette the rest of the site uses. */
const ACCENT = '#E9A23B';

/**
 * The capsule sits open by itself only while you are on the home act, and
 * closes into the mark for the rest of the page.
 *
 * "The home act" is not the top 70px — it is the hero film plus the title card,
 * everything up to the moment the title's letters start pushing through into
 * the turntable. That instant is `zoom.start`, so the nav is open for exactly
 * the stretch that is still Home and has folded away before the reveal begins.
 */
function autoOpenLimit() {
  return currentIntroPhases().hold.end;
}

/** Radius of the progress ring, in the 58px mark's own coordinate space. */
const RING_R = 26.5;
const RING_C = 2 * Math.PI * RING_R;

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'what-we-do', label: 'What We Do' },
  { id: 'events', label: 'Events' },
  { id: 'council', label: 'Council' },
  { id: 'contact', label: 'Contact' },
];

/**
 * TopNav — a floating capsule that collapses into the GDG mark.
 *
 * Three things worth knowing.
 *
 * **It opens on click, not on hover.** A capsule that unfurls whenever the
 * pointer crosses the top of the screen fires constantly by accident on a site
 * you navigate by scrolling. Clicking the mark opens it; clicking a link,
 * clicking away, Escape, or scrolling closes it again. Keyboard focus still
 * opens it, because a tab stop you cannot see is not a tab stop.
 *
 * **Scroll positions, not anchors.** `scrollIntoView` is wrong on this site.
 * Four of the six destinations live inside ScrollTrigger-pinned sections, where
 * an element's position in the document has nothing to do with the scroll
 * offset that puts it on screen — "Council" in particular is a window that
 * opens partway through the Events section's pin, inside an element that never
 * moves. So each entry owns a measured scroll range, and navigation, the active
 * highlight and the progress ring all read from the same measurement.
 *
 * **Nothing on the scroll path touches React state except the two things that
 * are genuinely discrete.** The ring is written straight to an attribute; only
 * `collapsed` and the active id can change a render, and both are latched.
 */
export default function TopNav({ ready }: { ready: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState('home');
  /** Opened deliberately — by clicking the mark, or by keyboard focus. */
  const [held, setHeld] = useState(false);

  const ringRef = useRef<SVGCircleElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const targetsRef = useRef<{ id: string; at: number }[]>([]);
  const collapsedRef = useRef(false);
  const activeRef = useRef('home');

  /* ── where each entry lives on the scrollbar ─────────────────────────── */
  const measure = useCallback(() => {
    const vh = window.innerHeight;
    const top = (sel: string) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      return el ? el.getBoundingClientRect().top + window.scrollY : null;
    };

    const intro = currentIntroPhases().total;
    const wwd = top('#what-we-do');
    const events = top('#events');
    const contact = top('#contact');
    const maxScroll = document.documentElement.scrollHeight - vh;

    // WhatWeDo and Events engage when their spacers reach the viewport bottom /
    // top — the same offsets their own triggers use.
    const wwdAt = wwd === null ? intro + 3250 : wwd - vh;
    const eventsAt = events === null ? wwdAt + 5000 : events;
    // Nearly a full screen of lead: the footer is the last thing on the page,
    // so it should light up as it comes into view rather than once it is
    // already most of the way up the screen — at 0.6 it only took over in the
    // final 2% of the scrollbar.
    const contactAt = contact === null ? maxScroll : Math.min(contact - vh * 0.85, maxScroll);
    // The council window opens partway through the Events pin. Expressed as a
    // fraction of that pin rather than its hard-coded length, so retuning the
    // section cannot silently desync the highlight.
    const councilAt = eventsAt + (contactAt - eventsAt) * 0.52;

    targetsRef.current = [
      { id: 'home', at: 0 },
      { id: 'about', at: intro },
      { id: 'what-we-do', at: wwdAt },
      { id: 'events', at: eventsAt },
      { id: 'council', at: councilAt },
      { id: 'contact', at: contactAt },
    ];
  }, []);

  /* ── reveal, once the preloader has actually gone ────────────────────── */
  useEffect(() => {
    if (!ready) return;
    // Short beat so it arrives after the loader's exit fade rather than during
    // it. Measurement waits for the same beat: ScrollTrigger builds its pin
    // spacers on mount, and the section offsets are meaningless before that.
    const t = window.setTimeout(() => {
      measure();
      setMounted(true);
    }, 420);
    return () => window.clearTimeout(t);
  }, [ready, measure]);

  /* ── scroll ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mounted) return;

    const onScroll = () => {
      const y = window.scrollY;

      const shouldCollapse = y > autoOpenLimit();
      if (shouldCollapse !== collapsedRef.current) {
        collapsedRef.current = shouldCollapse;
        setCollapsed(shouldCollapse);
      }

      // Scrolling puts the capsule away again. Without this, opening it and
      // then scrolling leaves it unfurled across the film indefinitely.
      if (shouldCollapse) setHeld(false);

      // Progress ring — straight to the attribute, never through React.
      const ring = ringRef.current;
      if (ring) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
        ring.setAttribute('stroke-dashoffset', String(RING_C * (1 - p)));
      }

      let current = 'home';
      for (const t of targetsRef.current) if (y >= t.at - 2) current = t.id;
      if (current !== activeRef.current) {
        activeRef.current = current;
        setActive(current);
      }
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, [mounted, measure]);

  /* ── click-to-open needs click-away-to-close ─────────────────────────── */
  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHeld(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const nav = navRef.current;
      if (nav && !nav.contains(e.target as Node)) setHeld(false);
    };
    window.addEventListener('keydown', onKey);
    // Capture: the site swallows pointer events in places (the pinned acts sit
    // under their own overlays), and a listener that waits for the bubble phase
    // would never hear about a click on those.
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [mounted]);

  const go = useCallback(
    (id: string) => {
      measure();
      const target = targetsRef.current.find((t) => t.id === id);
      if (!target) return;
      setHeld(false);
      window.scrollTo({ top: Math.max(0, Math.round(target.at)), behavior: 'smooth' });
    },
    [measure]
  );

  if (!mounted) return null;

  const isCollapsed = collapsed && !held;

  return (
    <div
      className="tnav-shell"
      data-collapsed={isCollapsed ? 'true' : 'false'}
      style={{ ['--tnav-accent' as string]: ACCENT }}
    >
      {/* Handlers belong on the capsule, not the shell: the shell is
          `pointer-events: none` so it never covers the film underneath — which
          also means it never receives a pointer event, so anything bound there
          is silently dead. */}
      <nav
        ref={navRef}
        className="tnav"
        aria-label="Primary"
        onFocus={() => setHeld(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHeld(false);
        }}
      >
        <button
          type="button"
          className="tnav-mark"
          // Closed: open it. Open because it was clicked open: close it again —
          // otherwise the only way out is to scroll or click away, and a
          // toggle that will not untoggle is the classic click-nav annoyance.
          // Open because we are on Home: it is a "back to top" button.
          onClick={() => {
            if (isCollapsed) setHeld(true);
            else if (held) setHeld(false);
            else go('home');
          }}
          aria-label={isCollapsed ? 'Open navigation' : held ? 'Close navigation' : 'Back to top'}
          aria-expanded={!isCollapsed}
        >
          <Image src="/logo.png" alt="GDG CRCE" width={60} height={40} draggable={false} priority />
          <svg className="tnav-ring" viewBox="0 0 58 58" aria-hidden="true">
            <circle className="tnav-ring-track" cx="29" cy="29" r={RING_R} />
            <circle
              ref={ringRef}
              className="tnav-ring-fill"
              cx="29"
              cy="29"
              r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C}
            />
          </svg>
        </button>

        <div className="tnav-links">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className="tnav-link"
              aria-current={active === item.id ? 'true' : undefined}
              // Nothing to tab to while it is a circle.
              tabIndex={isCollapsed ? -1 : 0}
              onClick={() => go(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
