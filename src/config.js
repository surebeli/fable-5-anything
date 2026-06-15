import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRuntime } from './runtime.js';
import { VERSION } from './version.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PKG_ROOT = resolve(join(__dirname, '..'));

const DEFAULT_ADAPTER = 'adapters/opencode.md';

export function defaultConfig(runtime = 'opencode', model = 'tokenbox/deepseek-v4-pro') {
  const rt = getRuntime(runtime);
  return {
    runtime,
    model,
    adapter: (rt && rt.adapter) || DEFAULT_ADAPTER,
    injectionMode: rt ? rt.injectionMode : 'prompt-prelude',
    hostSystemPolicy: rt ? rt.hostSystemPolicy : 'overlay',
    fableVersion: VERSION
  };
}

export function readConfigFile(cwdOrPath) {
  const p = resolve(cwdOrPath);
  if (p.endsWith('.json') && existsSync(p)) {
    const raw = readFileSync(p, 'utf-8');
    return JSON.parse(raw);
  }
  const configPath = join(p, '.fable', 'config.json');
  const raw = readFileSync(configPath, 'utf-8');
  return JSON.parse(raw);
}

export function writeConfig(cwd, config) {
  const dir = join(resolve(cwd), '.fable');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n');
}

export function resolveAdapterPath(config) {
  // Adapters must be packaged adapters under <pkg>/adapters/. Reject absolute or
  // traversing adapter paths so an untrusted project config cannot make prompt
  // assembly (incl. the MCP fable_build_prompt tool) read arbitrary files.
  const adaptersRoot = resolve(PKG_ROOT, 'adapters');
  const p = resolve(PKG_ROOT, config.adapter || '');
  if (p !== adaptersRoot && !p.startsWith(adaptersRoot + sep)) {
    throw new Error(`adapter must be a packaged adapter under adapters/ (got "${config.adapter}")`);
  }
  return p;
}

export function resolveCorePath() {
  return resolve(PKG_ROOT, 'prompts', 'portable-agent-core.md');
}
