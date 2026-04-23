import kleur from 'kleur';

/**
 * Subtle ASCII banner. Shown once at the top of interactive sessions.
 * Kept small on purpose — 4 lines + tagline.
 * Font: figlet 'Mini' (baked in, no runtime dep).
 */
export function banner() {
  const lines = [
    ' ._ _  ._   _  ._ _   _. _|_ o  _ ',
    ' | (/_ |_) (_) | | | (_|  |_ | (_ ',
    '       |                          ',
  ];
  const tagline = kleur.dim(' spin up AI demo repos, fast');

  return '\n' + lines.map((l) => kleur.cyan(l)).join('\n') + '\n' + tagline + '\n';
}

const SUCCESS_LINES = [
  'Fresh as a daisy.',
  'Clean slate achieved.',
  'Rewound to zero.',
  'Ready for the encore.',
  'Back to square one.',
  'Like it never happened.',
  'Reset and raring to go.',
  'All systems nominal.',
];

const PROVISION_LINES = [
  'Your demo repo is up and running.',
  "You're good to go.",
  'Provisioned and primed.',
  'Fresh repo, fresh demo.',
  'One demo repo, hot off the press.',
];

export function pickSuccess(kind = 'generic') {
  const pool = kind === 'reset' ? SUCCESS_LINES : kind === 'provision' ? PROVISION_LINES : SUCCESS_LINES;
  return pool[Math.floor(Math.random() * pool.length)];
}
