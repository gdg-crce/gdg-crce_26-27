/**
 * What We Do — the photos the Polaroid prints (Act 2.5).
 *
 * One entry per polaroid the 3D camera ejects and develops. Content is
 * placeholder (Lorem Ipsum) per the current brief — swap the bodies for real
 * copy when it's ready; the scene prints whatever length this array is.
 *
 * `accent` tints each photo's exposure. The palette walks warm→cool to keep the
 * site's era-evolution (context/theme.md) reading through the section.
 */
export interface WhatWeDoItem {
  /** Two-digit frame number stamped in the corner (01, 02, …). */
  no: string;
  /** Handwritten header printed on the polaroid's chin (the Candice/Pacifico face). */
  title: string;
  /** Body copy under the header — one short paragraph. */
  body: string;
  /** Warm→cool accent that tints this photo's exposure + frame number. */
  accent: string;
}

export const whatWeDoItems: WhatWeDoItem[] = [
  {
    no: '01',
    title: 'Development',
    body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.',
    accent: '#E8412A',
  },
  {
    no: '02',
    title: 'Design',
    body: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.',
    accent: '#E0A526',
  },
  {
    no: '03',
    title: 'Research',
    body: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    accent: '#5A4FFF',
  },
];
