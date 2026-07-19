/**
 * What We Do — album-book spread content.
 *
 * One entry per right-hand page the book flips to. The palette walks from the
 * 70s warm accents inherited from AboutSection toward the 80s cool tones that
 * hand off to the 90s Events street — matching the site's era-evolution
 * philosophy (context/theme.md). All copy is written in an 80s liner-notes
 * voice; edit freely, the section renders whatever length this array is.
 */
export interface WhatWeDoSpread {
  /** Two-digit track number stamped on the page (01, 02, …). */
  no: string;
  /** Small uppercase kicker / "side" label. */
  tag: string;
  /** Headline. */
  title: string;
  /** Liner-notes body copy. */
  body: string;
  /** Warm→cool accent that tints this page's rule + number. */
  accent: string;
  /** Optional scrapbook prop pinned to the page (path under /public). */
  asset?: string;
  /** Rotation (deg) for the pinned prop, for a hand-placed feel. */
  assetTilt?: number;
}

export const whatWeDoSpreads: WhatWeDoSpread[] = [
  {
    no: '01',
    tag: 'Side A · Track 01',
    title: 'Workshops & Hands-on Labs',
    body:
      'We learn by building. Every workshop puts current Google tech — Android, Web, Cloud, AI — straight into your hands, so you leave with something that runs, not just notes.',
    accent: '#E8412A',
    asset: '/elements/80s-crt-monitor.png',
    assetTilt: -5,
  },
  {
    no: '02',
    tag: 'Side A · Track 02',
    title: 'Hackathons & Solution Challenge',
    body:
      'Ideas shipped under pressure. From overnight campus hacks to Google’s global Solution Challenge, we turn a weekend and a whiteboard into something the world can actually use.',
    accent: '#E0A526',
    asset: '/elements/80s-arcade-cabinet.png',
    assetTilt: 4,
  },
  {
    no: '03',
    tag: 'Side A · Track 03',
    title: 'Study Jams & Learning Tracks',
    body:
      'Nobody levels up alone. Cohort-based tracks move a whole batch forward together — Android, Cloud, Web, ML — and the notes, repos and habits pass down to the batch after.',
    accent: '#FF2E7E',
    asset: '/elements/80s-cassette.png',
    assetTilt: -8,
  },
  {
    no: '04',
    tag: 'Side B · Track 04',
    title: 'Speaker Sessions & Tech Talks',
    body:
      'The signal gets passed forward. Engineers, founders and alumni come back to share what they’re building and what they wish they’d known — so momentum carries between generations.',
    accent: '#5A4FFF',
    asset: '/elements/80s-polaroid.png',
    assetTilt: 6,
  },
  {
    no: '05',
    tag: 'Side B · Track 05',
    title: 'Design, Build & Community',
    body:
      'Design sprints, open-source afternoons, late-night debugging and the people who keep showing up. This is where the software gets made — and where the friendships that outlast it start.',
    accent: '#7B2FBF',
    asset: '/elements/80s-polaroid-camera.png',
    assetTilt: -4,
  },
];
