import kleur from 'kleur';
import { gh, requireAuth } from '../lib/gh.js';
import { sectionHeader, statusBadge, commandHint } from '../lib/ui.js';

export async function init() {
  console.log(sectionHeader('System Readiness Check', 'Verifying required tools and authentication'));

  // Check gh is installed
  try {
    const version = await gh(['--version']);
    const firstLine = version.split('\n')[0];
    console.log(`  ${statusBadge('ok', firstLine)}`);
  } catch (err) {
    console.error(`  ${statusBadge('error', 'GitHub CLI (gh) not found')}`);
    console.error(`\n    ${commandHint('https://cli.github.com')}`);
    process.exit(1);
  }

  // Check git is installed
  const { spawnSync } = await import('node:child_process');
  const gitCheck = spawnSync('git', ['--version'], { encoding: 'utf8' });
  if (gitCheck.status !== 0) {
    console.error(`  ${statusBadge('error', 'Git not found')}`);
    console.error(`\n    ${commandHint('https://git-scm.com/downloads')}`);
    process.exit(1);
  }
  console.log(`  ${statusBadge('ok', gitCheck.stdout.trim())}`);

  // Check gh auth
  try {
    const user = await requireAuth();
    console.log(`  ${statusBadge('ok', `GitHub authenticated as ${kleur.cyan(user)}`)}`);
  } catch (err) {
    console.error(`  ${statusBadge('error', err.message)}`);
    process.exit(1);
  }

  console.log(`\n  ${statusBadge('ok', 'All checks passed')}`);
  console.log(`  ${commandHint('repomatic list')} ${kleur.dim('to view available demo scenarios.')}\n`);
}
