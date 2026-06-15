import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const TMP = resolve(__dirname, '..', `.tmp-test-cli-${process.pid}`);
const BIN = resolve(__dirname, '..', 'bin', 'fable.js');

function fable(args) {
  return spawnSync('node', [BIN, ...args], {
    encoding: 'utf-8',
    timeout: 30000,
    cwd: resolve(__dirname, '..')
  });
}

describe('cli --project relative handoff path resolution', () => {
  before(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
    const r = fable(['install', '--project', TMP, '--runtime', 'opencode', '--model', 'tokenbox/deepseek-v4-pro', '--yes']);
    assert.strictEqual(r.status, 0, `install failed: ${r.stderr}`);
  });

  after(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('build-prompt --project <dir> with relative --handoff resolves against project dir', () => {
    const r = fable(['build-prompt', '--project', TMP, '--handoff', '.fable/handoffs/example.md']);
    assert.strictEqual(r.status, 0, `build-prompt failed: ${r.stderr}`);
    assert.ok(r.stdout.includes('Portable Agent Core'), 'should contain Portable Agent Core');
    assert.ok(r.stdout.includes('opencode Adapter'), 'should contain opencode Adapter');
    assert.ok(r.stdout.includes('## Goal'), 'should contain handoff Goal');
    assert.ok(!r.stderr.includes('ENOENT'), 'should not have ENOENT error');
  });

  it('run --project <dir> with relative handoff positional and --dry-run resolves against project dir', () => {
    const r = fable(['run', '.fable/handoffs/example.md', '--project', TMP, '--dry-run']);
    assert.strictEqual(r.status, 0, `run dry-run failed: ${r.stderr}`);
    assert.ok(r.stdout.includes('DRY-RUN'), 'should output DRY-RUN header');
    assert.ok(r.stdout.includes('opencode'), 'should reference opencode command');
    assert.ok(!r.stderr.includes('ENOENT'), 'should not have ENOENT error');
  });

  it('run with absolute handoff path works regardless of --project', () => {
    const absPath = resolve(TMP, '.fable', 'handoffs', 'example.md');
    const r = fable(['run', absPath, '--project', TMP, '--dry-run']);
    assert.strictEqual(r.status, 0, `run with absolute path failed: ${r.stderr}`);
    assert.ok(r.stdout.includes('DRY-RUN'));
    assert.ok(!r.stderr.includes('ENOENT'));
  });

  it('run rejects a non-opencode runtime with actionable guidance', () => {
    const dir = join(TMP, 'kimi-proj');
    mkdirSync(dir, { recursive: true });
    fable(['install', '--project', dir, '--runtime', 'kimi', '--model', 'kimi-latest', '--yes']);
    const r = fable(['run', '.fable/handoffs/example.md', '--project', dir, '--dry-run']);
    assert.strictEqual(r.status, 1, 'should exit 1 for non-opencode');
    assert.ok(/only supports the opencode runtime|kimi/i.test(r.stderr), `expected guidance, got: ${r.stderr}`);
  });

  it('smoke rejects a non-opencode runtime', () => {
    const dir = join(TMP, 'kimi-proj2');
    mkdirSync(dir, { recursive: true });
    fable(['install', '--project', dir, '--runtime', 'kimi', '--model', 'kimi-latest', '--yes']);
    const r = fable(['smoke', '--project', dir, '--dry-run']);
    assert.strictEqual(r.status, 1);
    assert.ok(/opencode/i.test(r.stderr));
  });
});
