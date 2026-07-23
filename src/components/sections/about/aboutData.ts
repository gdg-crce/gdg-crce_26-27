export type Track = {
  key: string;
  word: string;
  brush?: string;
  lines: string[];
};

export const TRACKS: Track[] = [
  {
    key: 'theme',
    word: 'Theme',
    brush: 'Sunékheia:',
    lines: ['What continues,', 'becomes greater.'],
  },
  {
    key: 'vision',
    word: 'Vision',
    lines: [
      'To carry forward the',
      'foundation built by',
      'those before us,',
      'transforming their legacy',
      'into collective momentum',
      'as we learn, build, and',
      'shape what comes next.',
    ],
  },
  {
    key: 'mission',
    word: 'Mission',
    lines: [
      'To build in the open,',
      'to teach what we learn,',
      'and to leave this',
      'community further along',
      'than we found it — so',
      'every batch begins where',
      'the last one reached.',
    ],
  },
];
