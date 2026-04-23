import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_MANIFEST_PATH = join(__dirname, '..', '..', 'manifest.json');

/**
 * Load the scenario manifest.
 * If manifestArg is a URL, fetch it. If it's a path, read it. Otherwise use the bundled default.
 */
export async function loadManifest(manifestArg) {
  if (!manifestArg) {
    const raw = await readFile(DEFAULT_MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  }

  if (manifestArg.startsWith('http://') || manifestArg.startsWith('https://')) {
    const res = await fetch(manifestArg);
    if (!res.ok) {
      throw new Error(`Failed to fetch manifest from ${manifestArg}: ${res.status}`);
    }
    return res.json();
  }

  const raw = await readFile(manifestArg, 'utf8');
  return JSON.parse(raw);
}

export function findScenario(manifest, id) {
  const scenario = manifest.scenarios.find((s) => s.id === id);
  if (!scenario) {
    const available = manifest.scenarios.map((s) => s.id).join(', ');
    throw new Error(`Unknown scenario: "${id}". Available: ${available}`);
  }
  return scenario;
}

/** Parse --manifest out of argv. Returns { manifestArg, rest }. */
export function extractManifestFlag(args) {
  const rest = [];
  let manifestArg;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest') {
      manifestArg = args[i + 1];
      i++;
    } else {
      rest.push(args[i]);
    }
  }
  return { manifestArg, rest };
}
