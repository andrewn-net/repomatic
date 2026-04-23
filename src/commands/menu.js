import kleur from 'kleur';
import prompts from 'prompts';
import { banner } from '../lib/brand.js';
import { provision } from './provision.js';
import { reset } from './reset.js';
import { setup } from './setup.js';
import { status } from './status.js';
import { list } from './list.js';
import { init } from './init.js';
import { loadManifest } from '../lib/manifest.js';
import { statusBadge } from '../lib/ui.js';

const MENU_ITEMS = [
  { title: `${kleur.bgCyan().black(' 1 ')} ${kleur.cyan('Create a new demo repo')} ${kleur.dim('(provision)')}`, value: 'provision' },
  { title: `${kleur.bgYellow().black(' 2 ')} ${kleur.yellow('Reset an existing demo repo')} ${kleur.dim('(reset)')}`, value: 'reset' },
  { title: `${kleur.bgGreen().black(' 3 ')} ${kleur.green('Check repo status')} ${kleur.dim('(status)')}`, value: 'status' },
  { title: `${kleur.bgBlue().white(' 4 ')} ${kleur.blue('Show Slack setup steps')} ${kleur.dim('(setup)')}`, value: 'setup' },
  { title: `${kleur.bgMagenta().white(' 5 ')} ${kleur.magenta('Browse available scenarios')} ${kleur.dim('(list)')}`, value: 'list' },
  { title: kleur.dim('──────────────────────────────────────'), value: '__separator__', disabled: true },
  { title: `${kleur.bgWhite().black(' 6 ')} ${kleur.white('Check your machine setup')} ${kleur.dim('(init)')}`, value: 'init' },
  { title: `${kleur.bgRed().white(' 0 ')} ${kleur.red('Exit repomatic')} ${kleur.dim('(quit)')}`, value: 'quit' },
];

const ACTION_LABELS = {
  provision: 'Create a new demo repo',
  reset: 'Reset an existing demo repo',
  status: 'Check repo status',
  setup: 'Show Slack setup steps',
  list: 'Browse available scenarios',
  init: 'Check your machine setup',
};

function controlsHint() {
  return kleur.dim('Use ↑/↓ arrows to move, Enter to choose, Ctrl+C to exit anytime.');
}

async function pickScenario(manifest, promptText) {
  if (manifest.scenarios.length === 1) {
    console.log(`  ${statusBadge('info', `Only one scenario found, auto-selecting ${kleur.cyan(manifest.scenarios[0].id)}.`)}`);
    return manifest.scenarios[0].id;
  }

  console.log(`  ${kleur.bold('Choose a scenario')}`);
  console.log(`  ${controlsHint()}\n`);

  const { id } = await prompts({
    type: 'select',
    name: 'id',
    message: promptText,
    choices: manifest.scenarios.map((s) => ({
      title: `${kleur.cyan(s.name)} ${kleur.dim(`(${s.id})`)}`,
      value: s.id,
      description: s.description,
    })),
    hint: controlsHint(),
  });
  return id;
}

export async function menu() {
  console.log(banner());
  console.log(`  ${controlsHint()}\n`);

  let running = true;
  while (running) {
    const response = await prompts({
      type: 'select',
      name: 'choice',
      message: 'Main menu: pick what you want to do',
      choices: MENU_ITEMS.filter((i) => !i.disabled || (i.disabled && true)),
      hint: controlsHint(),
    });

    const choice = response.choice;
    if (!choice || choice === 'quit') {
      console.log(`\n  ${statusBadge('info', 'See you at the next demo.')}\n`);
      running = false;
      break;
    }

    console.log(`\n  ${statusBadge('info', `Selected: ${ACTION_LABELS[choice] || choice}`)}\n`);

    console.log();

    try {
      const manifest = await loadManifest();

      switch (choice) {
        case 'provision': {
          const id = await pickScenario(manifest, 'Which scenario?');
          if (id) await provision([id]);
          break;
        }
        case 'reset': {
          const id = await pickScenario(manifest, 'Reset which scenario?');
          if (id) await reset([id]);
          break;
        }
        case 'setup': {
          const id = await pickScenario(manifest, 'Setup runbook for which scenario?');
          if (id) await setup([id]);
          break;
        }
        case 'status':
          await status([]);
          break;
        case 'list':
          await list([]);
          break;
        case 'init':
          await init([]);
          break;
      }
    } catch (err) {
      console.error(`\n  ${statusBadge('error', err.message || String(err))}\n`);
    }

    console.log();
    const { cont } = await prompts({
      type: 'toggle',
      name: 'cont',
      message: 'What next?',
      active: 'Back to main menu',
      inactive: 'Exit repomatic',
      initial: true,
    });
    if (!cont) {
      console.log(`\n  ${statusBadge('info', 'See you at the next demo.')}\n`);
      running = false;
    }
    console.log();
  }
}
