import kleur from 'kleur';

const WIDTH = 68;

function line(char = '─') {
  return char.repeat(WIDTH);
}

function pad(text, indent = 2) {
  return `${' '.repeat(indent)}${text}`;
}

export function sectionHeader(title, subtitle = '') {
  const titleLine = kleur.bold().white(title);
  const subtitleLine = subtitle ? `\n${pad(kleur.dim(subtitle))}` : '';
  return `\n${kleur.dim(line())}\n${pad(titleLine)}${subtitleLine}\n${kleur.dim(line())}\n`;
}

export function infoRow(label, value) {
  return `${pad(kleur.bold(label))} ${value}`;
}

export function statusBadge(kind, text) {
  if (kind === 'ok') return `${kleur.bgGreen().black(' OK ')} ${kleur.green(text)}`;
  if (kind === 'warn') return `${kleur.bgYellow().black(' WARN ')} ${kleur.yellow(text)}`;
  if (kind === 'error') return `${kleur.bgRed().white(' FAIL ')} ${kleur.red(text)}`;
  return `${kleur.bgBlue().white(' INFO ')} ${kleur.cyan(text)}`;
}

export function commandHint(commandText) {
  return `${kleur.dim('Run')} ${kleur.cyan(commandText)}`;
}

export function card(title, lines = []) {
  const out = [`${pad(kleur.cyan(`◆ ${title}`))}`];
  for (const item of lines) {
    out.push(pad(item, 4));
  }
  return out.join('\n');
}
