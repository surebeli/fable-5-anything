import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadCapabilities, getRuntime, listRuntimes, adapterForRuntime, REQUIRED_KEYS } from '../src/runtime.js';

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

const EXPECTED_RUNTIMES = ['claude', 'opencode', 'codex', 'kimi', 'grok', 'copilot', 'agy'];

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

const BIN = resolve(ROOT, 'bin', 'fable.js');
function fable(args) {
  return spawnSync('node', [BIN, ...args], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
}

describe('fable runtime command', () => {
  it('runtime --list exits 0 and lists the full vendor set', () => {
    const r = fable(['runtime', '--list']);
    assert.strictEqual(r.status, 0, r.stderr);
    for (const name of ['claude', 'opencode', 'codex', 'kimi', 'grok', 'copilot', 'agy']) {
      assert.ok(r.stdout.includes(name), `--list should mention ${name}`);
    }
  });

  it('runtime opencode reports implemented + overlay + prompt-prelude + authoritative host', () => {
    const r = fable(['runtime', 'opencode']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('implemented'));
    assert.ok(r.stdout.includes('prompt-prelude'));
    assert.ok(r.stdout.includes('overlay'));
    assert.ok(/authoritative/i.test(r.stdout), 'should state host system prompt is authoritative');
  });

  it('runtime claude states it is reference-only and can replace system prompt', () => {
    const r = fable(['runtime', 'claude']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('reference-only'));
    assert.ok(/system-replace-when-user-owned/.test(r.stdout));
  });

  it('runtime with unknown name exits 1 with actionable message', () => {
    const r = fable(['runtime', 'bogus']);
    assert.strictEqual(r.status, 1);
    assert.ok(/Unknown runtime/i.test(r.stderr));
  });
});
