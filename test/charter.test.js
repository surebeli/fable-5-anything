import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncCharter, FABLE_BLOCK } from '../src/charter.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const TMP = resolve(__dirname, '..', `.tmp-test-charter-${process.pid}`);

describe('charter', () => {
  before(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true }); });
  after(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); });

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
