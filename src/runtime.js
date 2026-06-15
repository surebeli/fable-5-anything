import { readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Self-contained path resolution. Intentionally does NOT import config.js so
// that config.js can import this module without creating an ESM import cycle.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(join(__dirname, '..'));
const CAPABILITIES_PATH = join(PKG_ROOT, 'adapters', 'runtime-capabilities.json');

const REQUIRED_KEYS = ['status', 'injectionMode', 'hostSystemPolicy', 'adapter', 'commandSupport', 'notes'];

export function loadCapabilities() {
  const raw = readFileSync(CAPABILITIES_PATH, 'utf-8');
  const data = JSON.parse(raw);
  for (const [name, entry] of Object.entries(data)) {
    for (const key of REQUIRED_KEYS) {
      if (!(key in entry)) {
        throw new Error(`runtime-capabilities.json: "${name}" is missing required key "${key}"`);
      }
    }
  }
  return data;
}

export function getRuntime(name) {
  const caps = loadCapabilities();
  return Object.prototype.hasOwnProperty.call(caps, name) ? caps[name] : null;
}

export function listRuntimes() {
  return Object.keys(loadCapabilities());
}

export function adapterForRuntime(name) {
  const r = getRuntime(name);
  return r ? r.adapter : null;
}
