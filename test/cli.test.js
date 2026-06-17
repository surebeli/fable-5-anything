import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const BIN = resolve(ROOT, 'bin', 'fable.js');
const TMP = resolve(ROOT, `.tmp-test-cli-${process.pid}`);

function fable(args) {
  return spawnSync('node', [BIN, ...args], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
}

describe('governance-only CLI', () => {
  before(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true }); });
  after(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); });

  it('governance inlines the full portable core into AGENTS.md + CLAUDE.md', () => {
    const dir = join(TMP, 'gov'); mkdirSync(dir, { recursive: true });
    const r = fable(['governance', '--project', dir]);
    assert.strictEqual(r.status, 0, r.stderr);
    for (const f of ['AGENTS.md', 'CLAUDE.md']) {
      const t = readFileSync(join(dir, f), 'utf-8');
      assert.ok(t.includes('<!-- FABLE-START -->'));
      assert.ok(/Identity Boundary/.test(t), `${f} should inline the core`);
    }
  });

  it('removed Mode B commands error cleanly', () => {
    for (const cmd of ['install', 'build-prompt', 'run', 'smoke', 'doctor', 'init']) {
      const r = fable([cmd, '--project', TMP]);
      assert.notStrictEqual(r.status, 0, `${cmd} should no longer succeed`);
    }
  });

  it('--help no longer advertises Mode B / dispatch commands', () => {
    const r = fable(['--help']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(!/fable run\b/.test(r.stdout), 'help must not list `fable run`');
    assert.ok(/governance-only/i.test(r.stdout));
    assert.ok(/hopper-plugin/.test(r.stdout), 'help should point dispatch users to hopper');
  });
});
