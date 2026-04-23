import kleur from 'kleur';
import { loadManifest, extractManifestFlag } from '../lib/manifest.js';

export async function list(args) {
  const { manifestArg } = extractManifestFlag(args);
  const manifest = await loadManifest(manifestArg);

  console.log(kleur.bold('Available demo scenarios:\n'));

  for (const scenario of manifest.scenarios) {
    console.log(`  ${kleur.cyan(scenario.id)}`);
    console.log(`    ${kleur.bold(scenario.name)}`);
    console.log(`    ${scenario.description}`);
    console.log(`    Template: ${kleur.dim(scenario.template_repo)}`);
    console.log();
  }

  console.log(
    `Run ${kleur.cyan('repomatic provision <id>')} to create a demo repo from a scenario.`,
  );
}
