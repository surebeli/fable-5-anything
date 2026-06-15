import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncCharter, FABLE_BLOCK } from '../src/charter.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const TMP = resolve(__dirname, '..', `.tmp-test-charter-${process.pid}`);

// File-level lifecycle so TMP is cleaned up after ALL describes in this file.
// A per-describe after() ran too early and left TMP behind once the later
// command describes recreated it; hoisting cleanup here fixes the leftover.
before(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true }); });
after(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); });

describe('charter', () => {
  it('seeds AGENTS.md and CLAUDE.md with the fable block', () => {
    const dir = join(TMP, 'a'); mkdirSync(dir, { recursive: true });
    syncCharter({ project: dir, files: ['AGENTS.md', 'CLAUDE.md'] });
    for (const f of ['AGENTS.md', 'CLAUDE.md']) {
      const t = readFileSync(join(dir, f), 'utf-8');
      assert.ok(t.includes('<!-- FABLE-START -->'));
      assert.ok(t.includes('<!-- FABLE-END -->'));
    }
  });

  it('is idempotent (no duplicate block) and preserves user content', () => {
    const dir = join(TMP, 'b'); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'CLAUDE.md'), '# My Rules\n\nKeep these.\n');
    syncCharter({ project: dir, files: ['CLAUDE.md'] });
    syncCharter({ project: dir, files: ['CLAUDE.md'] });
    const t = readFileSync(join(dir, 'CLAUDE.md'), 'utf-8');
    assert.ok(t.startsWith('# My Rules'));
    assert.strictEqual((t.match(/<!-- FABLE-START -->/g) || []).length, 1);
  });

  it('copilot-instructions.md gets a sensible header (not "# AGENTS.md")', () => {
    const dir = join(TMP, 'hdr'); mkdirSync(dir, { recursive: true });
    syncCharter({ project: dir, files: ['.github/copilot-instructions.md'] });
    const t = readFileSync(join(dir, '.github', 'copilot-instructions.md'), 'utf-8');
    assert.ok(!t.startsWith('# AGENTS.md'), 'should not mislabel as AGENTS.md');
    assert.ok(/Copilot/i.test(t.split('\n')[0]), 'header should reference Copilot');
  });

  it('syncCharter force refreshes a stale fable block', () => {
    const dir = join(TMP, 'refresh'); mkdirSync(dir, { recursive: true });
    const stale = '# AGENTS.md\n\n<!-- FABLE-START -->\nOLD STALE GOVERNANCE\n<!-- FABLE-END -->\n';
    writeFileSync(join(dir, 'AGENTS.md'), stale);
    syncCharter({ project: dir, files: ['AGENTS.md'], force: true });
    const t = readFileSync(join(dir, 'AGENTS.md'), 'utf-8');
    assert.ok(!t.includes('OLD STALE GOVERNANCE'), 'stale block should be replaced');
    assert.ok(t.includes('## Fable Integration'), 'current block should be present');
    assert.strictEqual((t.match(/<!-- FABLE-START -->/g) || []).length, 1);
  });
});

import { spawnSync } from 'node:child_process';
const ROOT = resolve(__dirname, '..');
const BIN = resolve(ROOT, 'bin', 'fable.js');

describe('fable charter sync command', () => {
  it('seeds AGENTS.md + CLAUDE.md and exits 0', () => {
    const dir = join(TMP, 'cmd'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'charter', 'sync', '--project', dir], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, 'AGENTS.md')));
    assert.ok(existsSync(join(dir, 'CLAUDE.md')));
  });

  it('--all includes copilot .github/copilot-instructions.md', () => {
    const dir = join(TMP, 'cmd-all'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'charter', 'sync', '--project', dir, '--all'], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, '.github', 'copilot-instructions.md')));
  });
});

describe('fable codex setup command', () => {
  it('seeds charter and prints the codex mcp add command (no --apply = dry)', () => {
    const dir = join(TMP, 'codex-setup'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'codex', 'setup', '--project', dir], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'CLAUDE.md')));
    assert.ok(r.stdout.includes('codex mcp add fable'), 'should print the codex mcp add command');
    assert.ok(r.stdout.includes('mcp-server'));
  });
});
