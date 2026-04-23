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

const MENU_ITEMS = [
  { title: `${kleur.cyan('/provision')}   Create a fresh demo repo`, value: 'provision' },
  { title: `${kleur.cyan('/reset')}       Wipe a demo repo clean`, value: 'reset' },
  { title: `${kleur.cyan('/status')}      See what demos exist`, value: 'status' },
  { title: `${kleur.cyan('/setup')}       Get Slack app install steps`, value: 'setup' },
  { title: `${kleur.cyan('/list')}        Browse available scenarios`, value: 'list' },
  { title: kleur.dim('──────────────────────────────────────'), value: '__separator__', disabled: true },
  { title: `${kleur.cyan('/init')}        Check your setup`, value: 'init' },
  { title: `${kleur.cyan('/quit')}        Exit`, value: 'quit' },
];

async function pickScenario(manifest, promptText) {
  if (manifest.scenarios.length === 1) {
    return manifest.scenarios[0].id;
  }
  const { id } = await prompts({
    type: 'select',
    name: 'id',
    message: promptText,
    choices: manifest.scenarios.map((s) => ({
      title: `${s.name} ${kleur.dim(`(${s.id})`)}`,
      value: s.id,
    })),
  });
  return id;
}

export async function menu() {
  console.log(banner());

  let running = true;
  while (running) {
    const response = await prompts({
      type: 'select',
      name: 'choice',
      message: 'What would you like to do?',
      choices: MENU_ITEMS.filter((i) => !i.disabled || (i.disabled && true)),
      hint: kleur.dim('arrow keys to navigate, enter to select'),
    });

    const choice = response.choice;
    if (!choice || choice === 'quit') {
      console.log(kleur.dim('\n  See you at the next demo.\n'));
      running = false;
      break;
    }

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
      console.error(kleur.red(`\n  ${err.message || err}\n`));
    }

    console.log();
    const { cont } = await prompts({
      type: 'confirm',
      name: 'cont',
      message: 'Back to menu?',
      initial: true,
    });
    if (!cont) {
      console.log(kleur.dim('\n  See you at the next demo.\n'));
      running = false;
    }
    console.log();
  }
}
