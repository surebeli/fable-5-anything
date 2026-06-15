import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');

describe('new adapters', () => {
  it('copilot adapter exists with heading and core-deference footer', () => {
    const p = resolve(ROOT, 'adapters', 'copilot.md');
    assert.ok(existsSync(p), 'adapters/copilot.md must exist');
    const t = readFileSync(p, 'utf-8');
    assert.ok(t.includes('# Copilot Adapter'));
    assert.ok(t.includes('prompts/portable-agent-core.md'));
    assert.ok(/overlay/i.test(t));
  });

  it('generic opaque-host adapter exists with heading and core-deference footer', () => {
    const p = resolve(ROOT, 'adapters', 'generic.md');
    assert.ok(existsSync(p), 'adapters/generic.md must exist');
    const t = readFileSync(p, 'utf-8');
    assert.ok(t.includes('# Generic (Opaque Host) Adapter'));
    assert.ok(t.includes('prompts/portable-agent-core.md'));
    assert.ok(/overlay/i.test(t));
  });
});

import { loadCapabilities, getRuntime, listRuntimes, adapterForRuntime } from '../src/runtime.js';

const EXPECTED_RUNTIMES = ['claude', 'opencode', 'codex', 'kimi', 'grok', 'copilot', 'agy'];
const REQUIRED_KEYS = ['status', 'injectionMode', 'hostSystemPolicy', 'adapter', 'commandSupport', 'notes'];

describe('runtime capabilities metadata', () => {
  it('listRuntimes covers the full agreed vendor set', () => {
    const names = listRuntimes();
    for (const r of EXPECTED_RUNTIMES) {
      assert.ok(names.includes(r), `capabilities must include ${r}`);
    }
  });

  it('every runtime entry has all required keys and valid enums', () => {
    const caps = loadCapabilities();
    for (const [name, entry] of Object.entries(caps)) {
      for (const k of REQUIRED_KEYS) {
        assert.ok(k in entry, `${name} missing key ${k}`);
      }
      assert.ok(['implemented', 'planned', 'reference-only', 'opaque'].includes(entry.status), `${name} bad status`);
      assert.ok(['overlay', 'system-replace-when-user-owned'].includes(entry.hostSystemPolicy), `${name} bad hostSystemPolicy`);
      assert.ok(Array.isArray(entry.commandSupport), `${name} commandSupport must be array`);
    }
  });

  it('opencode is implemented, prompt-prelude, overlay, with the opencode adapter', () => {
    const r = getRuntime('opencode');
    assert.strictEqual(r.status, 'implemented');
    assert.strictEqual(r.injectionMode, 'prompt-prelude');
    assert.strictEqual(r.hostSystemPolicy, 'overlay');
    assert.strictEqual(r.adapter, 'adapters/opencode.md');
  });

  it('claude is reference-only with system-replace-when-user-owned', () => {
    const r = getRuntime('claude');
    assert.strictEqual(r.status, 'reference-only');
    assert.strictEqual(r.hostSystemPolicy, 'system-replace-when-user-owned');
  });

  it('adapterForRuntime maps known runtimes to their adapter files (or null)', () => {
    assert.strictEqual(adapterForRuntime('opencode'), 'adapters/opencode.md');
    assert.strictEqual(adapterForRuntime('kimi'), 'adapters/kimi.md');
    assert.strictEqual(adapterForRuntime('grok'), 'adapters/grok.md');
    assert.strictEqual(adapterForRuntime('copilot'), 'adapters/copilot.md');
    assert.strictEqual(adapterForRuntime('agy'), 'adapters/generic.md');
    assert.strictEqual(adapterForRuntime('claude'), null);
  });

  it('getRuntime returns null for unknown runtime', () => {
    assert.strictEqual(getRuntime('bogus'), null);
  });

  it('every non-null adapter referenced by capabilities exists on disk', () => {
    const caps = loadCapabilities();
    for (const [name, entry] of Object.entries(caps)) {
      if (entry.adapter !== null) {
        const p = resolve(ROOT, entry.adapter);
        assert.ok(existsSync(p), `${name} adapter file ${entry.adapter} must exist`);
      }
    }
  });
});
