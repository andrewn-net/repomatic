import kleur from 'kleur';
import { init } from './commands/init.js';
import { list } from './commands/list.js';
import { provision } from './commands/provision.js';
import { reset } from './commands/reset.js';
import { setup } from './commands/setup.js';
import { status } from './commands/status.js';
import { menu } from './commands/menu.js';
import { banner } from './lib/brand.js';
import { sectionHeader } from './lib/ui.js';

function usage() {
  return `${banner()}${sectionHeader('Usage')}
  repomatic
    Open the interactive menu
  repomatic <command>
    Run a command directly

${sectionHeader('Commands')}
  ${kleur.cyan('init')}
    Check prerequisites (gh, git) and confirm auth
  ${kleur.cyan('list')}
    Show available demo scenarios
  ${kleur.cyan('provision')} <scenario>
    Create a fresh demo repo from a scenario template
  ${kleur.cyan('reset')} <scenario>
    Reset an existing demo repo to its starting state
  ${kleur.cyan('setup')} <scenario>
    Print the Slack app install runbook for a scenario
  ${kleur.cyan('status')}
    Show which demo repos exist and their current state
  ${kleur.cyan('menu')}
    Explicitly open the interactive menu

${sectionHeader('Options')}
  --manifest <url|path>
    Use a custom scenario manifest
  --help, -h
    Show this message
  --version, -v
    Show version

${sectionHeader('Examples')}
  repomatic
  repomatic provision ai-demo
  repomatic reset ai-demo --yes
`;
}

export async function run(argv) {
  // Bare invocation → interactive menu
  if (argv.length === 0) {
    return menu();
  }

  if (argv[0] === '--help' || argv[0] === '-h') {
    console.log(usage());
    return;
  }

  if (argv[0] === '--version' || argv[0] === '-v') {
    console.log('0.1.0');
    return;
  }

  const [command, ...args] = argv;

  switch (command) {
    case 'init':
      return init(args);
    case 'list':
      return list(args);
    case 'provision':
      return provision(args);
    case 'reset':
      return reset(args);
    case 'setup':
      return setup(args);
    case 'status':
      return status(args);
    case 'menu':
      return menu();
    default:
      console.error(kleur.red(`  Unknown command: ${command}`));
      console.error(
        `  Run ${kleur.cyan('repomatic --help')} for usage, or just ${kleur.cyan('repomatic')} for the menu.`,
      );
      process.exit(1);
  }
}
