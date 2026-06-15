import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const BIN = resolve(ROOT, 'bin', 'fable.js');
const TMP = resolve(ROOT, `.tmp-test-governance-${process.pid}`);
after(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); });
function fable(args) { return spawnSync('node', [BIN, ...args], { encoding: 'utf-8', timeout: 30000, cwd: ROOT }); }

describe('fable governance (governance-only mode)', () => {
  it('default: charter + core + opencode.json instructions, and NO executor artifacts', () => {
    const dir = join(TMP, 'g1'); mkdirSync(dir, { recursive: true });
    const r = fable(['governance', '--project', dir]);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'CLAUDE.md')));
    assert.ok(existsSync(join(dir, '.fable', 'portable-agent-core.md')), 'core copied');
    const oc = JSON.parse(readFileSync(join(dir, 'opencode.json'), 'utf-8'));
    assert.ok(oc.instructions.includes('.fable/portable-agent-core.md'), 'opencode.json wired');
    // governance-only must NOT create the dispatch/executor (B-layer) artifacts
    assert.ok(!existsSync(join(dir, '.fable', 'config.json')), 'no .fable/config.json');
    assert.ok(!existsSync(join(dir, '.fable', 'bin')), 'no shims');
    assert.ok(!existsSync(join(dir, '.fable', 'handoffs')), 'no handoffs');
    assert.ok(!existsSync(join(dir, '.fable', 'fable.lock.json')), 'no lockfile');
  });

  it('--inline: full core inlined into AGENTS.md + CLAUDE.md; zero .fable/ and no opencode.json', () => {
    const dir = join(TMP, 'g2'); mkdirSync(dir, { recursive: true });
    const r = fable(['governance', '--project', dir, '--inline']);
    assert.strictEqual(r.status, 0, r.stderr);
    for (const f of ['AGENTS.md', 'CLAUDE.md']) {
      const t = readFileSync(join(dir, f), 'utf-8');
      assert.ok(t.includes('<!-- FABLE-START -->'), `${f} has fable block`);
      assert.ok(t.includes('Priority Order'), `${f} should inline the full portable core`);
    }
    assert.ok(!existsSync(join(dir, '.fable')), 'inline mode creates no .fable/');
    assert.ok(!existsSync(join(dir, 'opencode.json')), 'inline mode needs no opencode.json');
  });

  it('--inline is idempotent (single fable block, refreshed not duplicated)', () => {
    const dir = join(TMP, 'g3'); mkdirSync(dir, { recursive: true });
    fable(['governance', '--project', dir, '--inline']);
    fable(['governance', '--project', dir, '--inline']);
    const t = readFileSync(join(dir, 'AGENTS.md'), 'utf-8');
    assert.strictEqual((t.match(/<!-- FABLE-START -->/g) || []).length, 1, 'no duplicate block');
  });
});
