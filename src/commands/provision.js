import kleur from 'kleur';
import prompts from 'prompts';
import ora from 'ora';
import { loadManifest, findScenario, extractManifestFlag } from '../lib/manifest.js';
import { requireAuth, createFromTemplate, repoExists, createTag } from '../lib/gh.js';
import { pickSuccess } from '../lib/brand.js';
import { sectionHeader, commandHint, statusBadge } from '../lib/ui.js';

export async function provision(args) {
  const { manifestArg, rest } = extractManifestFlag(args);
  const [scenarioId, ...flags] = rest;

  if (!scenarioId) {
    throw new Error(
      'Usage: repomatic provision <scenario>\nRun `repomatic list` to see available scenarios.',
    );
  }

  const isPrivate = flags.includes('--private');
  const nameOverrideIdx = flags.indexOf('--name');
  const nameOverride = nameOverrideIdx >= 0 ? flags[nameOverrideIdx + 1] : undefined;

  const manifest = await loadManifest(manifestArg);
  const scenario = findScenario(manifest, scenarioId);

  const user = await requireAuth();
  const repoName = nameOverride || scenario.default_repo_name;

  console.log(sectionHeader('Provision Demo Repo', `${scenario.name} -> ${kleur.cyan(`${user}/${repoName}`)}`));

  const exists = await repoExists(user, repoName);
  if (exists) {
    console.log(
      kleur.yellow(
        `A repo called ${user}/${repoName} already exists.`,
      ),
    );
    const { action } = await prompts({
      type: 'select',
      name: 'action',
      message: 'What would you like to do?',
      choices: [
        { title: 'Reset the existing repo instead', value: 'reset' },
        { title: 'Pick a different name', value: 'rename' },
        { title: 'Cancel', value: 'cancel' },
      ],
    });

    if (action === 'cancel' || !action) {
      console.log(`  ${statusBadge('warn', 'Cancelled')}`);
      return;
    }
    if (action === 'reset') {
      console.log(
        `\n  ${commandHint(`repomatic reset ${scenarioId}`)} ${kleur.dim('to reset the existing repo.')}`,
      );
      return;
    }
    if (action === 'rename') {
      const { newName } = await prompts({
        type: 'text',
        name: 'newName',
        message: 'New repo name:',
        initial: `${repoName}-2`,
      });
      if (!newName) {
        console.log(`  ${statusBadge('warn', 'Cancelled')}`);
        return;
      }
      return provision([...(manifestArg ? ['--manifest', manifestArg] : []), scenarioId, '--name', newName, ...(isPrivate ? ['--private'] : [])]);
    }
  }

  const spinner = ora(`Creating ${kleur.cyan(`${user}/${repoName}`)} from ${scenario.template_repo}`).start();
  try {
    await createFromTemplate({
      template: scenario.template_repo,
      owner: user,
      name: repoName,
      isPrivate,
    });
    spinner.succeed(`Created ${kleur.cyan(`${user}/${repoName}`)}`);

    const tagSpinner = ora(`Adding ${kleur.cyan(scenario.start_tag)} tag`).start();
    await createTag(user, repoName, scenario.start_tag);
    tagSpinner.succeed(`Added ${kleur.cyan(scenario.start_tag)} tag`);
  } catch (err) {
    spinner.fail(err.message || 'Failed during provision');
    throw err;
  }

  console.log(`  ${kleur.dim(`https://github.com/${user}/${repoName}`)}\n`);
  console.log(`  ${statusBadge('ok', kleur.bold(pickSuccess('provision')))}\n`);

  console.log(kleur.bold('  Next steps'));
  console.log(
    `    1. ${commandHint(`repomatic setup ${scenarioId}`)} ${kleur.dim('to install the Slack app.')}`,
  );
  console.log(
    `    2. ${commandHint(`repomatic reset ${scenarioId}`)} ${kleur.dim("when you're ready to demo again.")}`,
  );
}
