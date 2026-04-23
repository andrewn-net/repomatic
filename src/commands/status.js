import kleur from 'kleur';
import { loadManifest, extractManifestFlag } from '../lib/manifest.js';
import { requireAuth, repoExists, gh } from '../lib/gh.js';

export async function status(args) {
  const { manifestArg } = extractManifestFlag(args);
  const manifest = await loadManifest(manifestArg);
  const user = await requireAuth();

  console.log(kleur.bold(`Demo repo status for ${kleur.cyan(user)}:\n`));

  for (const scenario of manifest.scenarios) {
    const repoName = scenario.default_repo_name;
    const fullName = `${user}/${repoName}`;
    const exists = await repoExists(user, repoName);

    if (!exists) {
      console.log(`  ${kleur.yellow('○')} ${scenario.id}`);
      console.log(`    Not provisioned. Run ${kleur.cyan(`repomatic provision ${scenario.id}`)}`);
      console.log();
      continue;
    }

    // Check for open PRs as a signal that the repo is "mid-demo"
    let openPrs = 0;
    try {
      const prsJson = await gh([
        'pr', 'list', '--repo', fullName, '--state', 'open', '--json', 'number',
      ]);
      openPrs = JSON.parse(prsJson || '[]').length;
    } catch {}

    const state = openPrs > 0 ? kleur.yellow('mid-demo') : kleur.green('clean');
    console.log(`  ${kleur.green('●')} ${scenario.id} — ${state}`);
    console.log(`    ${kleur.dim(`https://github.com/${fullName}`)}`);
    if (openPrs > 0) {
      console.log(
        `    ${openPrs} open PR(s). Run ${kleur.cyan(`repomatic reset ${scenario.id}`)} to clean up.`,
      );
    }
    console.log();
  }
}
