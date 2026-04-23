import kleur from 'kleur';
import { gh, requireAuth } from '../lib/gh.js';

export async function init() {
  console.log(kleur.bold('Checking prerequisites...\n'));

  // Check gh is installed
  try {
    const version = await gh(['--version']);
    const firstLine = version.split('\n')[0];
    console.log(`  ${kleur.green('✓')} ${firstLine}`);
  } catch (err) {
    console.error(`  ${kleur.red('✗')} gh CLI not found`);
    console.error(`\n    Install it: ${kleur.cyan('https://cli.github.com')}`);
    process.exit(1);
  }

  // Check git is installed
  const { spawnSync } = await import('node:child_process');
  const gitCheck = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (gitCheck.status !== 0) {
    console.error(`  ${kleur.red('✗')} git not found`);
    console.error(`\n    Install it: ${kleur.cyan('https://git-scm.com/downloads')}`);
    process.exit(1);
  }
  console.log(`  ${kleur.green('✓')} ${gitCheck.stdout.trim()}`);

  // Check gh auth
  try {
    const user = await requireAuth();
    console.log(`  ${kleur.green('✓')} GitHub authenticated as ${kleur.cyan(user)}`);
  } catch (err) {
    console.error(`  ${kleur.red('✗')} ${err.message}`);
    process.exit(1);
  }

  console.log(
    `\n${kleur.green('All set.')} Try ${kleur.cyan('repomatic list')} to see available demo scenarios.`,
  );
}
