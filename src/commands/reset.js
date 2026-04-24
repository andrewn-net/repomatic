import kleur from 'kleur';
import prompts from 'prompts';
import ora from 'ora';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadManifest, findScenario, extractManifestFlag } from '../lib/manifest.js';
import { requireAuth, repoExists, gh } from '../lib/gh.js';
import { pickSuccess } from '../lib/brand.js';
import { sectionHeader, statusBadge } from '../lib/ui.js';

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

/**
 * Try to find a local clone of the given repo.
 * Checks the current working directory and ./<repoName>.
 * Returns the absolute path if found, or null.
 */
async function findLocalClone(fullName, repoName) {
  const candidates = [
    process.cwd(),
    resolve(process.cwd(), repoName),
  ];

  for (const dir of candidates) {
    try {
      await stat(join(dir, '.git'));
      const remoteUrl = await run('git', ['remote', 'get-url', 'origin'], { cwd: dir });
      if (remoteUrl.includes(fullName)) {
        return dir;
      }
    } catch {
      // Not a matching clone, skip
    }
  }
  return null;
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

  console.log(sectionHeader('Reset Demo Repo', `${kleur.cyan(fullName)} -> ${kleur.cyan(scenario.start_tag)}`));
  console.log(
    kleur.yellow(
      `⚠  This will force-push over the default branch, close open PRs, and delete all non-default branches.\n`,
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
      console.log(`  ${statusBadge('warn', 'Cancelled')}`);
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
  let defaultBranch = 'main';
  const workDir = await mkdtemp(join(tmpdir(), 'repomatic-'));
  try {
    const cloneSpinner = ora('Cloning repo').start();
    await run('gh', ['repo', 'clone', fullName, workDir, '--', '--quiet']);
    cloneSpinner.succeed('Cloned');

    const rewindSpinner = ora(`Rewinding to ${scenario.start_tag}`).start();
    await run('git', ['fetch', '--tags', '--quiet'], { cwd: workDir });

    // Detect default branch
    defaultBranch = await run(
      'gh',
      ['repo', 'view', fullName, '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'],
    );

    await run('git', ['checkout', defaultBranch, '--quiet'], { cwd: workDir });
    await run('git', ['reset', '--hard', `tags/${scenario.start_tag}`], { cwd: workDir });
    rewindSpinner.succeed(`Rewound to ${scenario.start_tag}`);

    const pushSpinner = ora('Force-pushing').start();
    await run('git', ['push', '--force', 'origin', defaultBranch, '--quiet'], { cwd: workDir });
    pushSpinner.succeed('Force-pushed');

    // 3. Delete all non-default remote branches
    const branchSpinner = ora('Cleaning up branches').start();
    try {
      const remoteBranchOutput = await run(
        'git',
        ['branch', '-r', '--format', '%(refname:short)'],
        { cwd: workDir },
      );
      const remoteBranches = remoteBranchOutput
        .split('\n')
        .map((b) => b.trim())
        .filter((b) => b && b.startsWith('origin/') && b !== `origin/${defaultBranch}` && b !== 'origin/HEAD');

      const branchNames = remoteBranches.map((b) => b.replace('origin/', ''));
      if (branchNames.length > 0) {
        // Delete all non-default branches in one push
        const deleteRefs = branchNames.map((b) => `:refs/heads/${b}`);
        await run('git', ['push', 'origin', ...deleteRefs, '--quiet'], { cwd: workDir });
      }
      branchSpinner.succeed(
        `Deleted ${branchNames.length} branch${branchNames.length === 1 ? '' : 'es'}`,
      );
    } catch (err) {
      branchSpinner.warn(err.message.split('\n')[0]);
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }

  console.log(
    `\n  ${statusBadge('ok', kleur.bold(pickSuccess('reset')))} ${kleur.dim(`https://github.com/${fullName}`)}\n`,
  );

  // 4. Auto-sync local clone if found
  const localDir = await findLocalClone(fullName, repoName);
  if (localDir) {
    const syncSpinner = ora(`Syncing local clone ${kleur.dim(localDir)}`).start();
    try {
      await run('git', ['fetch', 'origin', '--quiet'], { cwd: localDir });
      await run('git', ['reset', '--hard', `origin/${defaultBranch}`], { cwd: localDir });
      await run('git', ['clean', '-fd'], { cwd: localDir });
      // Remove build caches that are gitignored but would serve stale output
      const cacheDirs = ['.next', '.turbo', 'dist', '.nuxt', '.output'];
      for (const dir of cacheDirs) {
        await rm(join(localDir, dir), { recursive: true, force: true }).catch(() => { });
      }
      syncSpinner.succeed(`Local clone synced ${kleur.dim(localDir)}`);
    } catch (err) {
      syncSpinner.warn(`Could not sync local clone: ${err.message.split('\n')[0]}`);
    }

    // Re-install dependencies to match the reverted package.json
    const hasPackageJson = await stat(join(localDir, 'package.json')).catch(() => null);
    if (hasPackageJson) {
      const installSpinner = ora('Re-installing dependencies').start();
      try {
        await run('npm', ['install'], { cwd: localDir });
        installSpinner.succeed('Dependencies re-installed');
      } catch (err) {
        installSpinner.warn(`npm install failed: ${err.message.split('\n')[0]}`);
      }
    }

    console.log(
      `\n  ${kleur.green('✔')} Ready — restart your dev server: ${kleur.cyan(`cd ${repoName} && npm run dev`)}\n`,
    );
  }
}
