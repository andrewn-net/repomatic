import kleur from 'kleur';
import prompts from 'prompts';
import ora from 'ora';
import { loadManifest, findScenario, extractManifestFlag } from '../lib/manifest.js';
import { requireAuth, createFromTemplate, repoExists } from '../lib/gh.js';
import { pickSuccess } from '../lib/brand.js';

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

  console.log(
    `${kleur.bold('Provisioning')} ${kleur.cyan(scenario.name)} as ${kleur.cyan(`${user}/${repoName}`)}...\n`,
  );

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
      console.log('Cancelled.');
      return;
    }
    if (action === 'reset') {
      console.log(
        `\nRun ${kleur.cyan(`repomatic reset ${scenarioId}`)} to reset the existing repo.`,
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
        console.log('Cancelled.');
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
  } catch (err) {
    spinner.fail('Failed to create repo');
    throw err;
  }

  console.log(`  ${kleur.dim(`https://github.com/${user}/${repoName}`)}\n`);
  console.log(`  ${kleur.green('✓')} ${kleur.bold(pickSuccess('provision'))}\n`);

  console.log(kleur.bold('  Next steps:'));
  console.log(
    `    1. Run ${kleur.cyan(`repomatic setup ${scenarioId}`)} to install the Slack app.`,
  );
  console.log(
    `    2. When you're ready to demo again, run ${kleur.cyan(`repomatic reset ${scenarioId}`)}.`,
  );
}
