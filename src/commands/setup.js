import kleur from 'kleur';
import { loadManifest, findScenario, extractManifestFlag } from '../lib/manifest.js';
import { requireAuth } from '../lib/gh.js';
import { sectionHeader, card } from '../lib/ui.js';

export async function setup(args) {
  const { manifestArg, rest } = extractManifestFlag(args);
  const [scenarioId] = rest;

  if (!scenarioId) {
    throw new Error(
      'Usage: repomatic setup <scenario>\nRun `repomatic list` to see available scenarios.',
    );
  }

  const manifest = await loadManifest(manifestArg);
  const scenario = findScenario(manifest, scenarioId);

  const user = await requireAuth().catch(() => null);
  const repoName = scenario.default_repo_name;
  const repoUrl = user ? `https://github.com/${user}/${repoName}` : '<your demo repo URL>';

  console.log(sectionHeader('Scenario Setup', scenario.name));

  const apps = scenario.slack_apps || (scenario.slack_app ? [scenario.slack_app] : []);
  apps.forEach((app) => {
    console.log(
      card(app.name || 'Slack App', [
        `${kleur.bold('Install:')} ${kleur.cyan(app.install_url)}`,
        `${kleur.bold('Docs:')} ${kleur.cyan(app.docs_url)}`,
      ]),
    );
  });
  console.log('\n' + kleur.bold('  Runbook'));
  scenario.runbook.forEach((step, i) => {
    const rendered = step.replace(/repomatic /g, (m) => kleur.cyan(m)).trim();
    console.log(`  ${kleur.bold(`${i + 1}.`)} ${rendered}`);
  });
  console.log();

  if (scenario.prompts) {
    console.log(kleur.bold('  Suggested demo prompts'));
    console.log();

    if (scenario.prompts.bug_fix?.length) {
      console.log(`  ${kleur.yellow('▸ Fix a bug')}`);
      scenario.prompts.bug_fix.forEach((p) => {
        console.log(indent(p, 6));
        console.log();
      });
    }

    if (scenario.prompts.feature?.length) {
      console.log(`  ${kleur.green('▸ Add a feature')}`);
      scenario.prompts.feature.forEach((p) => {
        console.log(indent(p, 6));
        console.log();
      });
    }
  }

  console.log(card('Your Demo Repo', [kleur.cyan(repoUrl)]));
  console.log();
}

function indent(text, spaces) {
  const pad = ' '.repeat(spaces);
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).length > 70) {
      lines.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current) lines.push(current.trim());
  return lines.map((l) => pad + kleur.dim(l)).join('\n');
}
