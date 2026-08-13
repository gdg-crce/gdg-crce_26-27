/* -----------------------------------------------------------------------------
   THE COUNCIL ROSTER — single source of truth.

   Every surface that shows a council member reads from here: the TheFacebook
   archive (Y2KArchiveSystem), the XP photo gallery (WindowsPictureViewer), and
   the mobile card feed in EventsAndCouncilSection. Add a person to this array
   and they appear in all three; there is no second list to keep in sync.

   Photos live on ImageKit under /gdg-crce/images/ and are named after the
   person, so both photo URLs are derived from a slug rather than pasted per
   row — a typo'd URL is impossible by construction, and adding a size is a
   one-line change instead of fourteen.

   `avatarBg` and `avatarIcon` are NOT decoration — they are the fallback the
   photo sits on while it loads, and what shows if the fetch fails. Keep one
   per department so the fallback still reads as a team.
   -------------------------------------------------------------------------- */

const IMG_BASE = 'https://ik.imagekit.io/9yzb99hnu/gdg-crce/images';

/* Photos are `<name>.JPG` — the filename is the person.

   ALWAYS go through here, and always with a width. The source files are
   full-resolution camera JPEGs of 0.8–2.2MB; the gallery shows all fourteen at
   once, so serving them unsized is ~20MB of portraits on a page that already
   carries a video and two WebGL scenes. ImageKit resizes at the edge and
   `f-auto` negotiates WebP/AVIF: at w-320 a 1.39MB original comes back as
   7.5KB, at w-800 as 62KB. Measured, not estimated. */
const photoFor = (slug: string, width: number, quality: number) =>
  `${IMG_BASE}/${slug}.JPG?tr=w-${width},q-${quality},f-auto`;

/** Grid tiles, filmstrip frames, avatars — never larger than ~160 CSS px. */
const THUMB_W = 320;
/** The one photo on screen at full size: gallery preview and details pane. */
const FULL_W = 800;

export type Department = 'Technical' | 'Social Media' | 'Design' | 'Outreach' | 'Core Team';

export interface CouncilMember {
  id: number;
  name: string;
  /** Job title — shown as "Post" in the gallery's details pane. */
  role: string;
  team: Department;
  /** Full-size photograph — the gallery preview and the details pane. */
  photo: string;
  /** Same photograph at grid size. Use this anywhere many are on screen. */
  photoThumb: string;
  trackTitle: string;
  duration: string;
  bio: string;
  techStack: string[];
  avatarBg: string;
  avatarIcon: string;
  quote: string;
  socials: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    email?: string;
  };
}

/* Department styling, kept in one place so the fallback tile, the department
   chip and the gallery frame can never disagree about what "Design" looks
   like. */
const DEPT: Record<Department, { role: string; bg: string; icon: string; track: string }> = {
  Technical: {
    role: 'Technical Associate',
    bg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    icon: '💻',
    track: 'Technical',
  },
  'Social Media': {
    role: 'Social Media Associate',
    bg: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
    icon: '📸',
    track: 'Social Media',
  },
  Design: {
    role: 'Designer',
    bg: 'linear-gradient(135deg, #8e2de2 0%, #c04ac0 100%)',
    icon: '🎨',
    track: 'Design',
  },
  Outreach: {
    role: 'Outreach Associate',
    bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    icon: '📣',
    track: 'Outreach',
  },
  'Core Team': {
    role: 'Council Member',
    bg: 'linear-gradient(135deg, #3a4a5c 0%, #64748b 100%)',
    icon: '⭐',
    track: 'Core Team',
  },
};

/** One row per person. `slug` is both the photo filename and the display name. */
interface RosterEntry {
  slug: string;
  name: string;
  team: Department;
  /** Overrides DEPT[team].role when someone's title is not the default. */
  role?: string;
}

/* NOTE — the last four have no department on record yet, so they sit in
   'Core Team' as a holding bay rather than being guessed into a team they may
   not be on. Move them the moment the real assignment is known; nothing else
   needs editing. */
const ROSTER: RosterEntry[] = [
  { slug: 'movin', name: 'Movin', team: 'Technical' },
  { slug: 'manubav', name: 'Manubav', team: 'Technical' },

  { slug: 'heet', name: 'Heet', team: 'Social Media' },
  { slug: 'soham', name: 'Soham', team: 'Social Media' },
  { slug: 'tanisha', name: 'Tanisha', team: 'Social Media' },
  { slug: 'isaac', name: 'Isaac', team: 'Social Media' },

  { slug: 'kisha', name: 'Kisha', team: 'Design' },
  { slug: 'saumya', name: 'Saumya', team: 'Design' },

  { slug: 'neomy', name: 'Neomy', team: 'Outreach' },
  { slug: 'niya', name: 'Niya', team: 'Outreach' },

  { slug: 'astin', name: 'Astin', team: 'Core Team' },
  { slug: 'mehta', name: 'Mehta', team: 'Core Team' },
  { slug: 'joshua', name: 'Joshua', team: 'Core Team' },
  { slug: 'simardeep', name: 'Simardeep', team: 'Core Team' },

  { slug: 'aarav', name: 'Aarav Sharma', team: 'Core Team', role: 'Co-Lead & Strategy Head' },
  { slug: 'ananya', name: 'Ananya Iyer', team: 'Technical', role: 'AI & ML Lead' },
  { slug: 'karan', name: 'Karan Patel', team: 'Technical', role: 'App Development Lead' },
  { slug: 'priya', name: 'Priya Nair', team: 'Technical', role: 'Cloud & DevOps Lead' },
  { slug: 'sneha', name: 'Sneha Kulkarni', team: 'Design', role: 'UI/UX & Creative Head' },
  { slug: 'devraj', name: 'Devraj Singh', team: 'Design', role: '3D & Motion Specialist' },
  { slug: 'vikram', name: 'Vikram Deshmukh', team: 'Core Team', role: 'Events & Operations Lead' },
  { slug: 'nisha', name: 'Nisha Gupta', team: 'Core Team', role: 'Operations & Sponsorship Head' },
  { slug: 'aditya', name: 'Aditya Verma', team: 'Outreach', role: 'PR & Outreach Lead' },
  { slug: 'tanvi', name: 'Tanvi Joshi', team: 'Social Media', role: 'Social Media & Editorial Lead' },
  { slug: 'siddharth', name: 'Siddharth Rao', team: 'Technical', role: 'Open Source & Community Mentor' },
];

/* Bio / quote copy is deliberately factual and department-derived. These are
   real people — nothing here claims anything about them that was not supplied.
   Swap in real copy per person when it arrives; only `bio` and `quote` need
   touching. */
export const councilMembers: CouncilMember[] = ROSTER.map((entry, i) => {
  const d = DEPT[entry.team];
  return {
    id: i + 1,
    name: entry.name,
    role: entry.role ?? d.role,
    team: entry.team,
    photo: photoFor(entry.slug, FULL_W, 75),
    photoThumb: photoFor(entry.slug, THUMB_W, 70),
    trackTitle: d.track,
    duration: '3:30',
    bio: `${entry.name} is part of the ${entry.team} team at GDG on Campus · CRCE.`,
    techStack: [entry.team],
    avatarBg: d.bg,
    avatarIcon: d.icon,
    quote: `${entry.team} · GDG on Campus CRCE`,
    // Left empty on purpose: no invented handles for real people. Fill in as
    // the actual profiles are collected — the UI renders nothing for an empty
    // socials object, so partial data is safe.
    socials: {},
  };
});

export const teamsList = [
  'All Tracks',
  'Technical',
  'Social Media',
  'Design',
  'Outreach',
  'Core Team',
] as const;

/* -----------------------------------------------------------------------------
   Wall snapshots.

   The `facebook*.JPG` uploads are event/candid photos rather than portraits, so
   they are not people and must not go in the roster — they are the club's photo
   album, and they hang on the TheFacebook profile page.
   -------------------------------------------------------------------------- */
export interface WallPhoto {
  id: string;
  src: string;
  caption: string;
}

export const wallPhotos: WallPhoto[] = [
  { id: 'fb1', src: photoFor('facebook1', FULL_W, 75), caption: 'the council, assembled' },
  { id: 'fb2', src: photoFor('facebook2', FULL_W, 75), caption: 'session day' },
  { id: 'fb3', src: photoFor('facebook3', FULL_W, 75), caption: 'behind the scenes' },
  { id: 'fb4', src: photoFor('facebook4', FULL_W, 75), caption: 'after the event' },
];
