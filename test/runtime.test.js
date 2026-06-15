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
