import kleur from 'kleur';
import { loadManifest, extractManifestFlag } from '../lib/manifest.js';
import { sectionHeader, card, commandHint } from '../lib/ui.js';

export async function list(args) {
  const { manifestArg } = extractManifestFlag(args);
  const manifest = await loadManifest(manifestArg);

  console.log(sectionHeader('available demo scemarios', `${manifest.scenarios.length} scenario(s) loaded`));

  for (const scenario of manifest.scenarios) {
    console.log(
      card(`${scenario.name} ${kleur.dim(`(${scenario.id})`)}`, [
        scenario.description,
        `${kleur.bold('Template:')} ${kleur.dim(scenario.template_repo)}`,
      ]),
    );
    console.log();
  }

  console.log(`  ${commandHint('repomatic provision <id>')} ${kleur.dim('to create a demo repo from a scenario.')}`);
}
