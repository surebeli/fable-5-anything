import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfig, readConfigFile, writeConfig, PKG_ROOT } from '../src/config.js';
import { VERSION } from '../src/version.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const TMP = resolve(__dirname, '..', `.tmp-test-config-${process.pid}`);

describe('config', () => {
  before(() => {
    if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });
  });

  after(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('defaultConfig returns expected shape', () => {
    const cfg = defaultConfig();
    assert.strictEqual(cfg.runtime, 'opencode');
    assert.strictEqual(cfg.model, 'tokenbox/deepseek-v4-pro');
    assert.strictEqual(cfg.adapter, 'adapters/opencode.md');
    assert.strictEqual(cfg.fableVersion, VERSION);
  });

  it('defaultConfig accepts overrides', () => {
    const cfg = defaultConfig('kimi', 'kimi-latest');
    assert.strictEqual(cfg.runtime, 'kimi');
    assert.strictEqual(cfg.model, 'kimi-latest');
  });

  it('writeConfig and readConfigFile round-trip', () => {
    const cfg = defaultConfig('opencode', 'test/model');
    writeConfig(TMP, cfg);
    const read = readConfigFile(TMP);
    assert.strictEqual(read.runtime, 'opencode');
    assert.strictEqual(read.model, 'test/model');
  });

  it('readConfigFile accepts direct config JSON path', () => {
    const cfg = defaultConfig('opencode', 'direct/path');
    writeConfig(TMP, cfg);
    const configPath = join(TMP, '.fable', 'config.json');
    const read = readConfigFile(configPath);
    assert.strictEqual(read.model, 'direct/path');
  });

  it('PKG_ROOT points to the repo root', () => {
    const pkgJson = join(PKG_ROOT, 'package.json');
    assert.ok(existsSync(pkgJson));
  });

  it('defaultConfig maps runtime to its adapter (kimi -> adapters/kimi.md)', () => {
    const cfg = defaultConfig('kimi', 'kimi-latest');
    assert.strictEqual(cfg.adapter, 'adapters/kimi.md');
  });

  it('defaultConfig carries injectionMode and hostSystemPolicy from capabilities', () => {
    const cfg = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    assert.strictEqual(cfg.injectionMode, 'prompt-prelude');
    assert.strictEqual(cfg.hostSystemPolicy, 'overlay');
  });

  it('defaultConfig falls back to the opencode adapter for unknown runtime', () => {
    const cfg = defaultConfig('bogus', 'x');
    assert.strictEqual(cfg.adapter, 'adapters/opencode.md');
    assert.strictEqual(cfg.hostSystemPolicy, 'overlay');
  });
});
