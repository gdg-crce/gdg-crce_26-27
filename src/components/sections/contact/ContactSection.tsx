'use client';

import React from 'react';
import './contact.css';

/* -----------------------------------------------------------------------------
   CONTACT — the text-mode screen under the dead tube.

   Rendered INSIDE ShutdownTransition's overlay, on the black the CRT leaves
   behind. It is not a <footer> and it is not in the page flow: nothing follows
   the machine powering down, so there is nothing left to scroll into and no
   scroll-up to watch.

   Content rule: nothing invented. The address and the campus are the ones the
   site already carried. A channel whose URL is not on record renders as plain
   text saying so, rather than as a plausible-looking dead link.
   -------------------------------------------------------------------------- */

const EMAIL = 'gdg.crce@gmail.com';

interface Channel {
  key: string;
  label: string;
  /** Fill these in and the row becomes a live link automatically. */
  href: string;
}

const CHANNELS: Channel[] = [
  { key: 'mail', label: EMAIL, href: `mailto:${EMAIL}` },
  { key: 'github', label: 'github.com/gdgcrce', href: '' },
  { key: 'linkedin', label: 'linkedin.com/company/gdgcrce', href: '' },
  { key: 'twitter', label: 'x.com/gdgcrce', href: '' },
];

/**
 * The acts, in the order you walked through them.
 *
 * Deliberately NOT links. Two reasons, both hard:
 *
 *   · Every destination lives inside a ScrollTrigger-pinned section, where an
 *     element's document position has nothing to do with the scroll offset that
 *     puts it on screen. A native `#anchor` jump teleports to the wrong place.
 *     `#council` did not resolve at all — CouncilSection.tsx is dead code and
 *     is never imported, so that href pointed at nothing.
 *   · Anything here that scrolls the page back up is the one thing this ending
 *     exists to prevent. TopNav sits above this overlay at z-100000 and already
 *     navigates by measured scroll position; that is the way back.
 *
 * So this is a listing of where you have been, not a control.
 */
const MAP: Array<{ label: string; era: string }> = [
  { label: 'home', era: 'title card' },
  { label: 'about', era: '1970s' },
  { label: 'what we do', era: '1980s' },
  { label: 'events', era: '1990s' },
  { label: 'council', era: '2000s' },
  { label: 'contact', era: 'now' },
];

/* NOTE — deliberately no id="contact" on the root below. TopNav navigates by
   measured scroll offsets, not by anchors, and this element lives inside a
   position:fixed overlay, so its document offset moves with the scroll and
   would be meaningless as a target. */
export default function ContactSection() {
  return (
    <section className="ct-term" aria-label="Contact GDG on Campus CRCE">
      <div className="ct-inner">
        <div className="ct-head">
          <span>GDG on Campus · CRCE</span>
          <span>Council 2026&ndash;27</span>
        </div>
        <div className="ct-rule" />

        <h2 className="ct-title">Contact us</h2>
        <p className="ct-strap">
          The archive is closed. We are still here — building, teaching, and running
          this thing out of Fr. Conceicao Rodrigues College of Engineering, Bandra.
          If you build things, or want to learn how, get in touch.
        </p>

        <div className="ct-cols">
          <div>
            <p className="ct-colhead">{'// reach us'}</p>
            <ul className="ct-list">
              {CHANNELS.map((c) =>
                c.href ? (
                  <li key={c.key}>
                    <a
                      className="ct-row"
                      href={c.href}
                      {...(c.href.startsWith('mailto:')
                        ? {}
                        : { target: '_blank', rel: 'noopener noreferrer' })}
                    >
                      <span className="ct-key">{c.key}</span>
                      <span className="ct-val">{c.label}</span>
                    </a>
                  </li>
                ) : (
                  /* No URL on record — see the content rule above. */
                  <li key={c.key}>
                    <span className="ct-row is-pending">
                      <span className="ct-key">{c.key}</span>
                      <span className="ct-val">{c.label}</span>
                    </span>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <p className="ct-colhead">{'// where you have been'}</p>
            <ul className="ct-map">
              {MAP.map((m, i) => {
                const here = i === MAP.length - 1; // you are on this one
                return (
                  <li key={m.label}>
                    <span className="ct-branch">{here ? '└─ ' : '├─ '}</span>
                    <span className={here ? 'ct-here' : undefined}>{m.label}</span>
                    <span className="ct-era">{m.era}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="ct-foot">
          <span>Father Agnel Ashram, Bandra (W), Mumbai 400050</span>
          <span>
            Synécheia — what continues, becomes greater
            <i className="ct-caret" aria-hidden="true" />
          </span>
        </div>
      </div>
    </section>
  );
}
