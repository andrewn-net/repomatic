import kleur from 'kleur';
import prompts from 'prompts';
import ora from 'ora';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadManifest, findScenario, extractManifestFlag } from '../lib/manifest.js';
import { requireAuth, repoExists, gh } from '../lib/gh.js';
import { pickSuccess } from '../lib/brand.js';

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'pipe', ...opts });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `${cmd} ${args.join(' ')} exited ${code}`));
    });
  });
}

export async function reset(args) {
  const { manifestArg, rest } = extractManifestFlag(args);
  const [scenarioId, ...flags] = rest;

  if (!scenarioId) {
    throw new Error(
      'Usage: repomatic reset <scenario>\nRun `repomatic list` to see available scenarios.',
    );
  }

  const skipConfirm = flags.includes('--yes') || flags.includes('-y');
  const nameOverrideIdx = flags.indexOf('--name');
  const nameOverride = nameOverrideIdx >= 0 ? flags[nameOverrideIdx + 1] : undefined;

  const manifest = await loadManifest(manifestArg);
  const scenario = findScenario(manifest, scenarioId);

  const user = await requireAuth();
  const repoName = nameOverride || scenario.default_repo_name;
  const fullName = `${user}/${repoName}`;

  const exists = await repoExists(user, repoName);
  if (!exists) {
    throw new Error(
      `No repo at ${fullName}. Provision it first: repomatic provision ${scenarioId}`,
    );
  }

  console.log(
    `${kleur.bold('Resetting')} ${kleur.cyan(fullName)} to tag ${kleur.cyan(scenario.start_tag)}\n`,
  );
  console.log(
    kleur.yellow(
      `⚠  This will force-push over the default branch and close any open PRs on this repo.\n`,
    ),
  );

  if (!skipConfirm) {
    const { confirm } = await prompts({
      type: 'confirm',
      name: 'confirm',
      message: 'Proceed?',
      initial: false,
    });
    if (!confirm) {
      console.log('Cancelled.');
      return;
    }
  }

  // 1. Close any open PRs
  const prSpinner = ora('Closing open PRs').start();
  try {
    const prsJson = await gh([
      'pr',
      'list',
      '--repo',
      fullName,
      '--state',
      'open',
      '--json',
      'number',
    ]);
    const prs = JSON.parse(prsJson || '[]');
    for (const pr of prs) {
      await gh(['pr', 'close', String(pr.number), '--repo', fullName]);
    }
    prSpinner.succeed(`Closed ${prs.length} open PR${prs.length === 1 ? '' : 's'}`);
  } catch (err) {
    prSpinner.warn(err.message.split('\n')[0]);
  }

  // 2. Clone, rewind, force-push
  const workDir = await mkdtemp(join(tmpdir(), 'repomatic-'));
  try {
    const cloneSpinner = ora('Cloning repo').start();
    await run('gh', ['repo', 'clone', fullName, workDir, '--', '--quiet']);
    cloneSpinner.succeed('Cloned');

    const rewindSpinner = ora(`Rewinding to ${scenario.start_tag}`).start();
    await run('git', ['fetch', '--tags', '--quiet'], { cwd: workDir });

    // Detect default branch
    const defaultBranch = await run(
      'gh',
      ['repo', 'view', fullName, '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'],
    );

    await run('git', ['checkout', defaultBranch, '--quiet'], { cwd: workDir });
    await run('git', ['reset', '--hard', `tags/${scenario.start_tag}`], { cwd: workDir });
    rewindSpinner.succeed(`Rewound to ${scenario.start_tag}`);

    const pushSpinner = ora('Force-pushing').start();
    await run('git', ['push', '--force', 'origin', defaultBranch, '--quiet'], { cwd: workDir });
    pushSpinner.succeed('Force-pushed');
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  console.log(
    `\n  ${kleur.green('✓')} ${kleur.bold(pickSuccess('reset'))} ${kleur.dim(`https://github.com/${fullName}`)}\n`,
  );
}
