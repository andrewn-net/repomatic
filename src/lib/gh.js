import { spawn } from 'node:child_process';

/**
 * Run a `gh` command and capture its output.
 * Throws if gh isn't installed or the command fails.
 */
export function gh(args, { input, quiet = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            "The `gh` CLI is not installed. Install it from https://cli.github.com and run `gh auth login` first.",
          ),
        );
      } else {
        reject(err);
      }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        const msg = stderr.trim() || `gh ${args.join(' ')} exited with code ${code}`;
        if (!quiet) {
          reject(new Error(msg));
        } else {
          resolve({ failed: true, stderr: msg });
        }
      }
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

/**
 * Check that gh is installed and the user is logged in.
 * Returns the authenticated username on success, throws on failure.
 */
export async function requireAuth() {
  try {
    const status = await gh(['auth', 'status'], { quiet: true });
    if (status.failed) {
      throw new Error(
        "You're not logged in to GitHub. Run `gh auth login` and try again.",
      );
    }
  } catch (err) {
    throw err;
  }

  const user = await gh(['api', 'user', '--jq', '.login']);
  return user;
}

/** Check whether a repo exists on GitHub. */
export async function repoExists(owner, name) {
  const result = await gh(['repo', 'view', `${owner}/${name}`, '--json', 'name'], {
    quiet: true,
  });
  return !result.failed;
}

/** Create a repo from a template. */
export async function createFromTemplate({ template, owner, name, isPrivate }) {
  const args = [
    'repo',
    'create',
    `${owner}/${name}`,
    '--template',
    template,
    '--clone=false',
    isPrivate ? '--private' : '--public',
  ];
  return gh(args);
}

/** Create a git tag on the default branch of a repo using the API. */
export async function createTag(owner, name, tagName) {
  const maxRetries = 10;
  const retryInterval = 2000; // 2 seconds

  for (let i = 0; i < maxRetries; i++) {
    try {
      // 1. Get the default branch
      const branch = await gh([
        'api',
        `repos/${owner}/${name}`,
        '--jq',
        '.default_branch'
      ]);

      if (!branch) {
        throw new Error('Default branch not found');
      }

      // 2. Get the latest commit SHA
      const commitSha = await gh([
        'api',
        `repos/${owner}/${name}/commits/${branch}`,
        '--jq',
        '.sha'
      ]);

      // 3. Create the ref (tag)
      return await gh([
        'api',
        `repos/${owner}/${name}/git/refs`,
        '-f', `ref=refs/tags/${tagName}`,
        '-f', `sha=${commitSha}`
      ]);
    } catch (err) {
      // If it's a "Git Repository is empty" error (409), wait and retry
      if (err.message.includes('409') || err.message.includes('empty')) {
        if (i === maxRetries - 1) {
          throw new Error(`Repository still empty after ${maxRetries} retries. Please try running \`repomatic reset\` in a moment.`);
        }
        await new Promise(resolve => setTimeout(resolve, retryInterval));
        continue;
      }
      throw err;
    }
  }
}

/** Delete a repo (used internally — always behind a confirmation prompt). */
export async function deleteRepo(owner, name) {
  return gh(['repo', 'delete', `${owner}/${name}`, '--yes']);
}
