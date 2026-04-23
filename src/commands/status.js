import kleur from 'kleur';
import { loadManifest, extractManifestFlag } from '../lib/manifest.js';
import { requireAuth, repoExists, gh } from '../lib/gh.js';
import { sectionHeader, card, commandHint } from '../lib/ui.js';

export async function status(args) {
  const { manifestArg } = extractManifestFlag(args);
  const manifest = await loadManifest(manifestArg);
  const user = await requireAuth();

  console.log(sectionHeader('Demo Repo Status', `Owner: ${kleur.cyan(user)}`));

  for (const scenario of manifest.scenarios) {
    const repoName = scenario.default_repo_name;
    const fullName = `${user}/${repoName}`;
    const exists = await repoExists(user, repoName);

    if (!exists) {
      console.log(
        card(`${scenario.name} ${kleur.dim(`(${scenario.id})`)}`, [
          kleur.yellow('Not provisioned'),
          `${commandHint(`repomatic provision ${scenario.id}`)} ${kleur.dim('to create it.')}`,
        ]),
      );
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
    const lines = [
      `${kleur.bold('State:')} ${state}`,
      kleur.dim(`https://github.com/${fullName}`),
    ];
    if (openPrs > 0) {
      lines.push(`${openPrs} open PR(s)`);
      lines.push(`${commandHint(`repomatic reset ${scenario.id}`)} ${kleur.dim('to clean it up.')}`);
    }
    console.log(card(`${scenario.name} ${kleur.dim(`(${scenario.id})`)}`, lines));
    console.log();
  }
}
