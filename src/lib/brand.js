import kleur from 'kleur';

/**
 * Subtle ASCII banner. Shown once at the top of interactive sessions.
 * Kept small on purpose — 4 lines + tagline.
 * Font: figlet 'Mini' (baked in, no runtime dep).
 */
export function banner() {
  const lines = [
    ' ██████╗ ███████╗██████╗  ██████╗ ███╗   ███╗ █████╗ ████████╗██╗ ██████╗ ',
    ' ██╔══██╗██╔════╝██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝██║██╔════╝ ',
    ' ██████╔╝█████╗  ██████╔╝██║   ██║██╔████╔██║███████║   ██║   ██║██║      ',
    ' ██╔══██╗██╔══╝  ██╔═══╝ ██║   ██║██║╚██╔╝██║██╔══██║   ██║   ██║██║      ',
    ' ██║  ██║███████╗██║     ╚██████╔╝██║ ╚═╝ ██║██║  ██║   ██║   ██║╚██████╗ ',
    ' ╚═╝  ╚═╝╚══════╝╚═╝      ╚═════╝ ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ',
  ];
  const palette = [kleur.cyan, kleur.blue, kleur.magenta, kleur.yellow, kleur.green, kleur.cyan];
  const topRule = kleur.dim('  ╭──────────────────────────────────────────────────────────────────────────╮');
  const bottomRule = kleur.dim('  ╰──────────────────────────────────────────────────────────────────────────╯');
  const tagline = `  ${kleur.bgCyan().black(' CONTROL CENTER ')} ${kleur.bold().white('AI Demo Repo Control Center')}`;
  const subline = `  ${kleur.dim('spin up, reset, and orchestrate polished demos')}`;

  return (
    '\n' +
    topRule +
    '\n' +
    lines.map((l, i) => palette[i % palette.length](l)).join('\n') +
    '\n' +
    bottomRule +
    '\n' +
    tagline +
    '\n' +
    subline +
    '\n'
  );
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
