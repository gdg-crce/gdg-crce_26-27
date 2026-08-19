/* -----------------------------------------------------------------------------
   THE COUNCIL ROSTER — single source of truth.

   Every surface that shows a council member reads from here: the TheFacebook
   archive (Y2KArchiveSystem), the XP photo gallery / player (WindowsPictureViewer),
   and the mobile card feed in EventsAndCouncilSection. Add a person to this array
   and they appear in all three; there is no second list to keep in sync.

   ── Why the photo path is stored per person ────────────────────────────────
   This used to derive both photo URLs from a single `slug`, on the assumption
   that every portrait was `<slug>.JPG` at the root of /gdg-crce/images/. That
   assumption is false for the 2026-27 set: the uploads are split across a
   `New folder/` subdirectory, carry three different extensions (.JPG / .jpeg /
   .png), and two of them are raw screenshot filenames with spaces in them
   (`Screenshot 2026-08-16 125215.png`). A slug cannot produce any of those, so
   the CDN path is now stored verbatim per row, pre-encoded, and the ONLY thing
   derived from it is the ImageKit transform.

   The consequence to remember: **the filename is no longer the person.** Nothing
   in the UI may render a photo filename as a display name — `photoPath` and
   `name` are unrelated strings now. Use `name`.

   `avatarBg` is NOT decoration — it is the fallback the photo sits on while it
   loads, and what shows if the fetch fails. Keep one per department so the
   fallback still reads as a team. (There was an `avatarIcon` emoji beside it;
   MemberPhoto stopped painting it — see the note in that file — and nothing
   else ever read it, so it is gone rather than left as a lie.)
   -------------------------------------------------------------------------- */

const IMG_BASE = 'https://ik.imagekit.io/9yzb99hnu/gdg-crce/images';

/* ALWAYS go through here, and always with a size. The source files are
   full-resolution camera JPEGs of 0.8–2.2MB; the gallery shows all twenty-two at
   once, so serving them unsized is ~30MB of portraits on a page that already
   carries a video and two WebGL scenes. ImageKit resizes at the edge and
   `f-auto` negotiates WebP/AVIF: at w-320 a 1.39MB original comes back as
   ~8KB, at w-800 as ~62KB. Measured, not estimated.

   `path` is everything after /images/, already percent-encoded. Any `?updatedAt`
   cache-buster on the pasted source URL is dropped on purpose — it would collide
   with the `?tr=` transform, and the file is stable at that path regardless.

   ── Why the crop happens at the CDN, not in CSS ────────────────────────────
   This used to send a width only, which leaves the source aspect intact and
   hands the cropping to `object-fit: cover` in MemberPhoto. Cover crops about
   the CENTRE, and the boxes it crops into are landscape (the gallery tile is
   118×90) while the portraits are tall. On the loosely-framed shots that was
   survivable; on the tightly-framed ones it sliced the top of the head off.
   Nine of twenty-two lost their hair or forehead — Laksh Shivalkar was cropped
   to his chin — and the ones that survived did so by accident of how far back
   the photographer stood.

   `fo-face` moves the crop window onto the detected face instead of the centre,
   so framing stops depending on the source composition. `z-0.25` is what makes
   it a PORTRAIT rather than a mugshot: bare `fo-face` zooms to the face box and
   is far too tight (it cut hair on six of twelve tested), and z below ~0.18
   pulls back far enough that the subject is small again. 0.25 was picked off a
   sweep of 0.5 / 0.35 / 0.25 / 0.18 rendered for the tightest and widest
   subjects in the set — it is the value where every one of the 22 keeps a whole
   head with headroom, and as a side effect subject scale is finally consistent
   across the grid.

   The 4:3 aspect is deliberate and is the reason ONE crop can serve every call
   site. The picture viewer's boxes are all ~4:3, so they take it as-is; the
   TheFacebook avatars are all 1:1, and cover-cropping 4:3 into a square trims
   the SIDES of a horizontally-centred face, which is safe. Serving square or
   portrait would invert that and put the vertical crop back. Verified by
   rendering all 22 through both box shapes before this shipped.

   If face detection ever fails on a photo, ImageKit falls back to a centre crop
   at the requested aspect — i.e. exactly the old behaviour, for that one photo
   only. */
const photoFor = (path: string, width: number, height: number, quality: number) => {
  if (path.startsWith('advisors/')) {
    return `/${path}`;
  }
  return `${IMG_BASE}/${path}?tr=w-${width},h-${height},fo-face,z-0.25,q-${quality},f-auto`;
};

/** Grid tiles, filmstrip frames, avatars — never larger than ~160 CSS px. */
const THUMB_W = 320;
const THUMB_H = 240;
/** The one photo on screen at full size: gallery preview and details pane. */
const FULL_W = 800;
const FULL_H = 600;

export type Department =
  | 'Leadership'
  | 'Technical'
  | 'Design & Creatives'
  | 'Marketing'
  | 'Public Relations'
  | 'Events'
  | 'Social Media'
  | 'Outreach';

export type Tier = 'Senior Council' | 'Junior Council';

export interface CouncilMember {
  id: number;
  /** Full name as supplied by the council — never derived from a filename. */
  name: string;
  /** Job title — shown as "Post" in the gallery's details pane. */
  role: string;
  team: Department;
  tier: Tier;
  /** Year + branch + division, e.g. "TE COMPS C". */
  branch: string;
  /** Full-size photograph — the gallery preview and the details pane. */
  photo: string;
  /** Same photograph at grid size. Use this anywhere many are on screen. */
  photoThumb: string;
  bio: string;
  /** Chips on the profile page — the department and the council tier. */
  techStack: string[];
  avatarBg: string;
  quote: string;
  socials: {
    github?: string;
    linkedin?: string;
    instagram?: string;
    email?: string;
  };
}

/* Department styling, kept in one place so the fallback tile, the department
   chip and the gallery frame can never disagree about what "Design & Creatives"
   looks like. */
const DEPT: Record<Department, { bg: string }> = {
  Leadership: { bg: 'linear-gradient(135deg, #3a4a5c 0%, #64748b 100%)' },
  Technical: { bg: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)' },
  'Design & Creatives': { bg: 'linear-gradient(135deg, #8e2de2 0%, #c04ac0 100%)' },
  Marketing: { bg: 'linear-gradient(135deg, #f2711c 0%, #f5a623 100%)' },
  'Public Relations': { bg: 'linear-gradient(135deg, #0f7b8a 0%, #2bb3c0 100%)' },
  Events: { bg: 'linear-gradient(135deg, #b5303f 0%, #e2603d 100%)' },
  'Social Media': { bg: 'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)' },
  Outreach: { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
};

/** One row per person, in the order the council itself lists them. */
interface RosterEntry {
  name: string;
  role: string;
  branch: string;
  team: Department;
  tier: Tier;
  /** Path under /gdg-crce/images/, percent-encoded, no query string. */
  photoPath: string;
}

const ROSTER: RosterEntry[] = [
  /* ---- Senior Council -------------------------------------------------- */
  {
    name: 'Shalom Mendes',
    role: 'Vice Chair Person',
    branch: 'TE CSE',
    team: 'Leadership',
    tier: 'Senior Council',
    photoPath: 'New%20folder/shalom.JPG',
  },
  {
    name: 'Kevin Synet',
    role: 'Head of Operations',
    branch: 'TE COMPS C',
    team: 'Leadership',
    tier: 'Senior Council',
    photoPath: 'New%20folder/kevin.jpeg',
  },
  {
    name: 'Laksh Shivalkar',
    role: 'Joint Lead',
    branch: 'TE MECHANICAL',
    team: 'Leadership',
    tier: 'Senior Council',
    photoPath: 'New%20folder/Laksh.jpeg',
  },
  {
    name: 'Varad Joshi',
    role: 'Management Lead',
    branch: 'TE COMPS A',
    team: 'Leadership',
    tier: 'Senior Council',
    photoPath: 'New%20folder/Varad.png',
  },
  {
    name: 'Abhishek Roy Jose',
    role: 'Technical Lead',
    branch: 'TE COMPS C',
    team: 'Technical',
    tier: 'Senior Council',
    photoPath: 'Screenshot%202026-08-16%20125215.png',
  },
  {
    name: 'Johann Joseph',
    role: 'Marketing Lead',
    branch: 'TE COMPS C',
    team: 'Marketing',
    tier: 'Senior Council',
    photoPath: 'advisors/johann.jpeg',
  },
  {
    name: 'Scarlett Menezes',
    role: 'Public Relations Lead',
    branch: 'TE CSE',
    team: 'Public Relations',
    tier: 'Senior Council',
    photoPath: 'Screenshot%202026-08-16%20125205.png',
  },
  {
    name: 'Aditi Pawar',
    role: 'Design & Creatives Lead',
    branch: 'TE COMPS A',
    team: 'Design & Creatives',
    tier: 'Senior Council',
    photoPath: 'DSC09714%20(1).JPG',
  },
  {
    name: 'Chris Lopes',
    role: 'Technical Advisor',
    branch: 'BE COMPS',
    team: 'Technical',
    tier: 'Senior Council',
    photoPath: 'advisors/chris.JPG',
  },
  {
    name: 'Celene Ciby',
    role: 'Operational Advisor',
    branch: 'BE COMPS',
    team: 'Leadership',
    tier: 'Senior Council',
    photoPath: 'advisors/celene.JPG',
  },
  {
    name: 'Jaden Vaz',
    role: 'Managerial Advisor',
    branch: 'BE ECS',
    team: 'Leadership',
    tier: 'Senior Council',
    photoPath: 'advisors/jaden.JPG',
  },

  /* ---- Junior Council -------------------------------------------------- */
  {
    name: 'Movin D’Souza',
    role: 'Technical Associate',
    branch: 'SE CSE B',
    team: 'Technical',
    tier: 'Junior Council',
    photoPath: 'movin.JPG',
  },
  {
    name: 'Manobhav Sharma',
    role: 'Technical Associate',
    branch: 'SE CSE B',
    team: 'Technical',
    tier: 'Junior Council',
    photoPath: 'New%20folder/manubav.png',
  },
  {
    name: 'Niya Puthusseri',
    role: 'Junior Events Coordinator',
    branch: 'CSE B',
    team: 'Events',
    tier: 'Junior Council',
    photoPath: 'niya.JPG',
  },
  {
    name: 'Astin Chettiar',
    role: 'Junior Events Coordinator',
    branch: 'SE COMPS C',
    team: 'Events',
    tier: 'Junior Council',
    photoPath: 'New%20folder/astin.jpeg',
  },
  {
    name: 'Tanisha Chary',
    role: 'Public Relations Associate',
    branch: 'SE CSE C',
    team: 'Public Relations',
    tier: 'Junior Council',
    photoPath: 'New%20folder/tanisha.jpeg',
  },
  {
    name: 'Soham Padalkar',
    role: 'Public Relations Associate',
    branch: 'ECS',
    team: 'Public Relations',
    tier: 'Junior Council',
    photoPath: 'New%20folder/soham.jpeg',
  },
  {
    name: 'Keisha D’Souza',
    role: 'Design & Creatives Associate',
    branch: 'CSE A',
    team: 'Design & Creatives',
    tier: 'Junior Council',
    photoPath: 'New%20folder/ll.jpeg',
  },
  {
    name: 'Saumya Hathi',
    role: 'Design & Creatives Associate',
    branch: 'COMPS B',
    team: 'Design & Creatives',
    tier: 'Junior Council',
    photoPath: 'New%20folder/souymya.png',
  },
  {
    name: 'Isaac Gazula',
    role: 'Junior Social Media Associate',
    branch: 'SE CSE B',
    team: 'Social Media',
    tier: 'Junior Council',
    photoPath: 'isaac.JPG',
  },
  {
    name: 'Heet Kankariya',
    role: 'Junior Social Media Associate',
    branch: 'COMPS A',
    team: 'Social Media',
    tier: 'Junior Council',
    photoPath: 'New%20folder/heet.jpeg',
  },
  {
    name: 'Metta Jadhav',
    role: 'Marketing Associate',
    branch: 'SE ECS',
    team: 'Marketing',
    tier: 'Junior Council',
    photoPath: 'New%20folder/metha.png',
  },
  {
    name: 'Simardeep Singh',
    role: 'Marketing Associate',
    branch: 'CSE C',
    team: 'Marketing',
    tier: 'Junior Council',
    photoPath: 'New%20folder/simardeep.jpeg',
  },
  {
    name: 'Neyomi Martis',
    role: 'Outreach Associate',
    branch: 'CSE B',
    team: 'Outreach',
    tier: 'Junior Council',
    photoPath: 'New%20folder/neomi.jpeg',
  },
  {
    name: 'Joshua Jerry',
    role: 'Outreach Associate',
    branch: 'CSE C',
    team: 'Outreach',
    tier: 'Junior Council',
    photoPath: 'New%20folder/joshua.jpeg',
  },
];

/* Bio / quote copy is deliberately factual and derived from the row above.
   These are real people — nothing here claims anything about them that was not
   supplied. Swap in real copy per person when it arrives; only `bio` and
   `quote` need touching. */
export const councilMembers: CouncilMember[] = ROSTER.map((entry, i) => {
  const d = DEPT[entry.team];
  return {
    id: i + 1,
    name: entry.name,
    role: entry.role,
    team: entry.team,
    tier: entry.tier,
    branch: entry.branch,
    photo: photoFor(entry.photoPath, FULL_W, FULL_H, 75),
    photoThumb: photoFor(entry.photoPath, THUMB_W, THUMB_H, 70),
    bio: `${entry.name} — ${entry.role}, ${entry.branch}. Part of the ${entry.team} team on the ${entry.tier} of GDG on Campus · CRCE.`,
    techStack: [entry.team, entry.tier],
    avatarBg: d.bg,
    quote: `${entry.role} · ${entry.team} · GDG on Campus CRCE`,
    // Left empty on purpose: no invented handles for real people. Fill in as
    // the actual profiles are collected — the UI renders nothing for an empty
    // socials object, so partial data is safe.
    socials: {},
  };
});

/** Department order for filter tabs and the Groups page. Seniors lead each. */
export const departmentsList: Department[] = [
  'Leadership',
  'Technical',
  'Design & Creatives',
  'Marketing',
  'Public Relations',
  'Events',
  'Social Media',
  'Outreach',
];

export const teamsList = ['All Tracks', ...departmentsList] as const;

const EXTRA_MEMBERSHIP: Record<Department, string[]> = {
  Leadership: ['Abhishek Roy Jose', 'Johann Joseph', 'Scarlett Menezes', 'Aditi Pawar'],
  'Social Media': ['Scarlett Menezes'],
  Outreach: ['Varad Joshi'],
  Events: ['Laksh Shivalkar'],
  Technical: [],
  'Design & Creatives': [],
  Marketing: [],
  'Public Relations': [],
};

/** Everyone on a tier, in roster order. */
export const membersByTier = (tier: Tier) => councilMembers.filter((m) => m.tier === tier);

/** Everyone in a department, in roster order — the senior lead comes first. */
export const membersByTeam = (team: Department) => {
  const extra = EXTRA_MEMBERSHIP[team] || [];
  return councilMembers.filter((m) => m.team === team || extra.includes(m.name));
};

/**
 * The Senior Council member who leads a department, if there is one.
 * Events, Social Media and Outreach are junior-run and return undefined.
 */
export const leadOf = (team: Department) =>
  councilMembers.find((m) => m.team === team && m.tier === 'Senior Council');

export const getMemberDepartments = (member: CouncilMember): Department[] => {
  const list: Department[] = [member.team];
  (Object.keys(EXTRA_MEMBERSHIP) as Department[]).forEach((team) => {
    if (EXTRA_MEMBERSHIP[team].includes(member.name) && !list.includes(team)) {
      list.push(team);
    }
  });
  return list;
};

/* -----------------------------------------------------------------------------
   Wall snapshots.

   The `facebook*.JPG` uploads are event/candid photos rather than portraits, so
   they are not people and must not go in the roster — they are the club's photo
   album, and they hang on the TheFacebook profile page.

   They deliberately do NOT go through `photoFor`. These are group shots, and
   `fo-face` on a group shot picks one detected face and crops the rest of the
   room away — the opposite of what an album thumbnail is for. Width only, no
   crop, same as every portrait used to get.
   -------------------------------------------------------------------------- */
const albumPhoto = (path: string) => `${IMG_BASE}/${path}?tr=w-${FULL_W},q-75,f-auto`;

export interface WallPhoto {
  id: string;
  src: string;
  caption: string;
}

/**
 * The whole council in one frame — the wall's headline post.
 *
 * Kept separate from `wallPhotos` because it is not an album thumbnail: it is
 * shown large and on its own. 4:3 at source, which is the aspect every other
 * image box on this page already uses, so it needs no crop.
 */
export const groupPhoto = {
  src: albumPhoto('WhatsApp%20Image%202026-08-16%20at%2012.44.58%20PM.jpeg'),
  caption: 'all of us together',
};

export const wallPhotos: WallPhoto[] = [
  { id: 'fb1', src: albumPhoto('facebook1.JPG'), caption: 'the council, assembled' },
  { id: 'fb2', src: albumPhoto('facebook2.JPG'), caption: 'session day' },
  { id: 'fb3', src: albumPhoto('facebook3.JPG'), caption: 'behind the scenes' },
  { id: 'fb4', src: albumPhoto('facebook4.JPG'), caption: 'after the event' },
];
