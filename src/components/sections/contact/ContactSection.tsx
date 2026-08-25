'use client';

import React from 'react';
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

const EMAIL = 'gdgcrce@gmail.com';

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
    id: 'instagram',
    label: 'Instagram',
    value: 'instagram.com/gdg_crce',
    href: 'https://www.instagram.com/gdg_crce/',
    help: 'Official Instagram profile. Event highlights, announcements, and story updates.',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    value: 'linkedin.com/company/gdsc-crce',
    href: 'https://www.linkedin.com/company/gdsc-crce/posts/?feedView=all',
    help: 'Official LinkedIn page. Council announcements and event write-ups.',
  },
];

/** Read-only firmware-detected values. A BIOS screen always has a block. */
const SYSTEM: Array<{ label: string; value: string }> = [
  { label: 'Chapter', value: 'GDG on Campus · CRCE' },
  { label: 'Institute', value: 'Fr. C. Rodrigues College of Engineering' },
  { label: 'Location', value: 'Bandra (W), Mumbai 400050' },
  { label: 'Council Term', value: '2026 - 27' },
];

/* There was a `MENU` const here — a Home/About/What We Do/… bar drawn as the
   setup utility's menu strip. It is removed rather than left unrendered: it had
   sat here unused (and in the lint output) for a while, and it is not wanted on
   this screen. `DEFAULT_HELP` went the same way; the right-hand column is the
   Location Map, which needs no instructions. */

/* NOTE — deliberately no id="contact" on the root below. TopNav navigates by
   measured scroll offsets, not by anchors, and this element lives inside a
   position:fixed overlay, so its document offset moves with the scroll and
   would be meaningless as a target. */
interface ContactSectionProps {
  isMobile?: boolean;
}

export default function ContactSection({ isMobile = false }: ContactSectionProps) {
  return (
    <section className={`ct-term ${isMobile ? 'ct-term-mobile' : ''}`} aria-label="Contact GDG on Campus CRCE">
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

            {/* Firmware-detected block. Also written and never rendered — this
                is the real content that belongs in the empty half of this
                column, rather than stretching four rows to fill it. Read-only,
                so the values carry no brackets and no hover state. */}
            <h2 className="bios-group">System Information</h2>
            <ul className="bios-fields">
              {SYSTEM.map((s) => (
                <li key={s.label}>
                  <span className="bios-row is-readonly">
                    <span className="bios-label">{s.label}</span>
                    <span className="bios-dots" aria-hidden="true" />
                    <span className="bios-value">{s.value}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bios-help">
            <div className="bios-help-title">Location Map</div>
            <div className="bios-help-map">
              <iframe
                src="https://maps.google.com/maps?q=Fr.%20Conceicao%20Rodrigues%20College%20of%20Engineering,%20Bandra%20West,%20Mumbai&t=m&z=16&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>

        {/* CC BY-SA 4.0 on the Web437 IBM BIOS face requires a visible credit.
            Styled as the copyright line a real setup utility prints along the
            bottom, so it reads as BIOS chrome rather than as a footnote. It is
            a licence term — moving it is fine, deleting it is not. */}
        <div className="bios-copyright">
          <div className="bios-font-credit">Web437 IBM BIOS font &copy; VileR &middot; CC BY-SA 4.0 &middot; int10h.org</div>
          <div className="bios-credits">
            Designed by Niya and made by Movin & Abhishek.
          </div>
        </div>
      </div>
    </section>
  );
}
