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

    const issues = [];

    // 1. Compare default branch HEAD against start_tag
    let commitDrift = false;
    try {
      const defaultBranch = await gh([
        'api', `repos/${user}/${repoName}`, '--jq', '.default_branch',
      ]);
      const headSha = await gh([
        'api', `repos/${user}/${repoName}/commits/${defaultBranch}`, '--jq', '.sha',
      ]);
      const tagSha = await gh([
        'api', `repos/${user}/${repoName}/git/ref/tags/${scenario.start_tag}`,
        '--jq', '.object.sha',
      ]);
      if (headSha !== tagSha) {
        commitDrift = true;
        issues.push('Default branch has drifted from start tag');
      }
    } catch {
      issues.push('Could not verify start tag');
    }

    // 2. Check for open PRs
    let openPrs = 0;
    try {
      const prsJson = await gh([
        'pr', 'list', '--repo', fullName, '--state', 'open', '--json', 'number',
      ]);
      openPrs = JSON.parse(prsJson || '[]').length;
      if (openPrs > 0) {
        issues.push(`${openPrs} open PR${openPrs === 1 ? '' : 's'}`);
      }
    } catch {}

    // 3. Check for extra branches (beyond default)
    let extraBranches = 0;
    try {
      const branchesJson = await gh([
        'api', `repos/${user}/${repoName}/branches`, '--jq', '.[].name',
      ]);
      const branches = branchesJson.split('\n').filter((b) => b.trim());
      // Subtract 1 for the default branch
      extraBranches = Math.max(0, branches.length - 1);
      if (extraBranches > 0) {
        issues.push(`${extraBranches} extra branch${extraBranches === 1 ? '' : 'es'}`);
      }
    } catch {}

    const isClean = issues.length === 0;
    const state = isClean ? kleur.green('clean') : kleur.yellow('modified');
    const lines = [
      `${kleur.bold('State:')} ${state}`,
      kleur.dim(`https://github.com/${fullName}`),
    ];
    if (!isClean) {
      for (const issue of issues) {
        lines.push(kleur.yellow(`• ${issue}`));
      }
      lines.push(`${commandHint(`repomatic reset ${scenario.id}`)} ${kleur.dim('to restore it.')}`);
    }
    console.log(card(`${scenario.name} ${kleur.dim(`(${scenario.id})`)}`, lines));
    console.log();
  }
}

