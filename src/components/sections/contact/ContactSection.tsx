'use client';

import React, { useState } from 'react';
import './contact.css';

/* -----------------------------------------------------------------------------
   CONTACT — the BIOS setup utility.

   Rendered INSIDE ShutdownTransition's overlay, on the black the CRT leaves
   behind. It is not a <footer> and it is not in the page flow: nothing follows
   the machine powering down, so there is nothing left to scroll into and no
   scroll-up to watch.

   Why BIOS, and not a footer or the amber directory listing this used to be:
   the shutdown ends with a tube discharging to nothing. The only thing that
   ever came after that, on that machine, was the machine coming back — and the
   first screen it draws is firmware, before any operating system exists to have
   an era. That is the one screen on the whole site that belongs to no decade,
   which is exactly what the ending needs.

   It also happens to be the right FORM for this content. A BIOS setup screen is
   already a menu bar (the navigational map), a field list (the contact details)
   and an Item Specific Help panel (what each one is), laid out in a grid. None
   of that had to be invented, only filled in.

   TWO HARD CONSTRAINTS, both easy to break by accident:

   · It must fit in ONE viewport. This is drawn at the very bottom of the
     document, where there is no scroll left by design — anything that overflows
     is simply unreachable. Keep the row count down and the type on clamp().

   · Nothing here may be a link that scrolls the page. The menu bar is chrome,
     not navigation; TopNav sits above this overlay and is the way back.

   Content rule: nothing invented. A channel whose URL is not on record renders
   as a plain, unclickable value and says so in the help panel, rather than as a
   plausible-looking dead link.
   -------------------------------------------------------------------------- */

const EMAIL = 'gdg.crce@gmail.com';

interface Field {
  id: string;
  label: string;
  value: string;
  /** Fill this in and the row becomes selectable and live automatically. */
  href: string;
  help: string;
}

const FIELDS: Field[] = [
  {
    id: 'mail',
    label: 'E-Mail Address',
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    help: 'Primary channel. Goes to the council inbox — events, collaborations, speaking, sponsorship, or joining a track.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    value: 'linkedin.com/company/gdgcrce',
    href: '',
    help: 'Chapter page. Council announcements and event write-ups. No URL on record yet, so this field is display only.',
  },
  {
    id: 'github',
    label: 'GitHub',
    value: 'github.com/gdgcrce',
    href: '',
    help: 'Workshop material and project source. No URL on record yet, so this field is display only.',
  },
  {
    id: 'x',
    label: 'X / Twitter',
    value: 'x.com/gdgcrce',
    href: '',
    help: 'Short-form updates and event-day posts. No URL on record yet, so this field is display only.',
  },
];

/** Read-only firmware-detected values. A BIOS screen always has a block. */
const SYSTEM: Array<{ label: string; value: string }> = [
  { label: 'Chapter', value: 'GDG on Campus · CRCE' },
  { label: 'Institute', value: 'Fr. C. Rodrigues College of Engineering' },
  { label: 'Location', value: 'Bandra (W), Mumbai 400050' },
  { label: 'Council Term', value: '2026 - 27' },
];

/**
 * The navigational map, as the setup utility's menu bar.
 *
 * Deliberately NOT links — the same rule the rest of this ending runs on. Every
 * destination lives inside a ScrollTrigger-pinned section, where an element's
 * document position has nothing to do with the scroll offset that puts it on
 * screen, so an anchor jump lands in the wrong place; and anything here that
 * scrolls the page back up is the one thing this ending exists to prevent.
 * It is a "you are here", drawn the way firmware draws one.
 */
const MENU = ['Home', 'About', 'What We Do', 'Events', 'Council', 'Contact'];

const DEFAULT_HELP =
  'Use the pointer to select a field. Fields shown in full brightness are live; dimmed fields have no address on record yet.';

/* NOTE — deliberately no id="contact" on the root below. TopNav navigates by
   measured scroll offsets, not by anchors, and this element lives inside a
   position:fixed overlay, so its document offset moves with the scroll and
   would be meaningless as a target. */
export default function ContactSection() {
  return (
    <section className="ct-term" aria-label="Contact GDG on Campus CRCE">
      <div className="bios">
        <div className="bios-title">GDG CRCE BIOS Setup Utility</div>

        <div className="bios-body">
          <div className="bios-main">
            <h2 className="bios-group">Contact Us</h2>
            <ul className="bios-fields">
              {FIELDS.map((f) => {
                const live = Boolean(f.href);
                const row = (
                  <>
                    <span className="bios-label">{f.label}</span>
                    <span className="bios-dots" aria-hidden="true" />
                    <span className="bios-value">[{f.value}]</span>
                  </>
                );
                return (
                  <li key={f.id}>
                    {live ? (
                      <a
                        className="bios-row"
                        href={f.href}
                        {...(f.href.startsWith('mailto:')
                          ? {}
                          : { target: '_blank', rel: 'noopener noreferrer' })}
                      >
                        {row}
                      </a>
                    ) : (
                      <span className="bios-row is-unset">
                        {row}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="bios-help">
            <div className="bios-help-title">Location Map</div>
            <div className="bios-help-map" style={{ width: '100%', height: '100%', minHeight: '350px' }}>
              <iframe 
                src="https://maps.google.com/maps?q=Fr.%20C.%20Rodrigues%20College%20of%20Engineering&t=k&z=16&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="100%" 
                style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(1.2)' }} 
                allowFullScreen 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade" 
              />
            </div>
          </div>
        </div>

        <div className="bios-legend" aria-hidden="true">
          <div className="bios-legend-row">
            <span>
              <b>F1</b> Help
            </span>
            <span>
              <b>↑↓</b> Select Item
            </span>
            <span>
              <b>Enter</b> Open
            </span>
          </div>
          <div className="bios-legend-row">
            <span>
              <b>Esc</b> Exit
            </span>
            <span>
              <b>←→</b> Select Menu
            </span>
            <span>
              <b>F10</b> Save and Exit
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
