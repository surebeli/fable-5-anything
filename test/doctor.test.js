import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { install } from '../src/install.js';
import { doctorChecks } from '../src/doctor.js';
import { defaultConfig } from '../src/config.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const TMP = resolve(__dirname, '..', `.tmp-test-doctor-${process.pid}`);

describe('doctor', () => {
  before(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
    install({ projectDir: TMP, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
  });

  after(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('all checks pass for a freshly installed project', () => {
    const config = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    const checks = doctorChecks({ projectDir: TMP, config });
    for (const c of checks) {
      assert.strictEqual(c.status, 'ok', `${c.check} should be ok, got ${c.status}: ${c.detail}`);
    }
  });

  it('returns exactly 9 checks: config, adapter, core, handoff, opencode dry-run, opencode path, AGENTS fable, gitignore runs, local shim', () => {
    const config = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    const checks = doctorChecks({ projectDir: TMP, config });
    const checkNames = checks.map(c => c.check);
    assert.ok(checkNames.includes('config'));
    assert.ok(checkNames.includes('adapter'));
    assert.ok(checkNames.includes('core'));
    assert.ok(checkNames.includes('handoff'));
    assert.ok(checkNames.includes('opencode dry-run'));
    assert.ok(checkNames.includes('opencode path'));
    assert.ok(checkNames.includes('AGENTS fable'));
    assert.ok(checkNames.includes('gitignore runs'));
    assert.ok(checkNames.includes('local shim'));
    assert.strictEqual(checks.length, 9);
  });

  it('config check fails when config.json is missing', () => {
    const emptyDir = join(TMP, 'empty-project');
    mkdirSync(emptyDir, { recursive: true });
    const config = defaultConfig();
    const checks = doctorChecks({ projectDir: emptyDir, config });
    const configCheck = checks.find(c => c.check === 'config');
    assert.strictEqual(configCheck.status, 'fail');
  });

  it('handoff check fails when example.md is missing', () => {
    const noHandoffDir = join(TMP, 'no-handoff');
    mkdirSync(join(noHandoffDir, '.fable', 'handoffs'), { recursive: true });
    mkdirSync(join(noHandoffDir, '.fable', 'runs'), { recursive: true });
    mkdirSync(join(noHandoffDir, '.fable', 'bin'), { recursive: true });
    writeFileSync(join(noHandoffDir, '.fable', 'config.json'), JSON.stringify(defaultConfig()));
    writeFileSync(join(noHandoffDir, '.fable', 'bin', 'fable.cmd'), '');
    writeFileSync(join(noHandoffDir, '.fable', 'bin', 'fable.ps1'), '');
    writeFileSync(join(noHandoffDir, '.fable', 'bin', 'fable'), '');
    writeFileSync(join(noHandoffDir, '.gitignore'), '.fable/runs/\n');
    writeFileSync(join(noHandoffDir, 'AGENTS.md'), '<!-- FABLE-START -->');
    const config = defaultConfig();
    const checks = doctorChecks({ projectDir: noHandoffDir, config });
    const handoffCheck = checks.find(c => c.check === 'handoff');
    assert.strictEqual(handoffCheck.status, 'fail');
  });

  it('opencode dry-run check includes all required flags', () => {
    const config = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    const checks = doctorChecks({ projectDir: TMP, config });
    const dryRunCheck = checks.find(c => c.check === 'opencode dry-run');
    assert.strictEqual(dryRunCheck.status, 'ok');
    assert.ok(dryRunCheck.detail.includes('--dangerously-skip-permissions'));
    assert.ok(dryRunCheck.detail.includes('--print-logs'));
    assert.ok(dryRunCheck.detail.includes('--format json'));
    assert.ok(dryRunCheck.detail.includes('--pure'));
  });

  it('opencode path check runs without crashing', () => {
    const config = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    const checks = doctorChecks({ projectDir: TMP, config });
    const pathCheck = checks.find(c => c.check === 'opencode path');
    assert.ok(pathCheck, 'should have opencode path check');
    assert.ok(['ok', 'fail'].includes(pathCheck.status));
  });

  it('AGENTS fable check passes when fable section is present', () => {
    const config = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    const checks = doctorChecks({ projectDir: TMP, config });
    const agentsCheck = checks.find(c => c.check === 'AGENTS fable');
    assert.strictEqual(agentsCheck.status, 'ok');
  });

  it('AGENTS fable check fails when AGENTS.md is missing', () => {
    const dir = join(TMP, 'no-agents');
    mkdirSync(join(dir, '.fable', 'handoffs'), { recursive: true });
    mkdirSync(join(dir, '.fable', 'runs'), { recursive: true });
    mkdirSync(join(dir, '.fable', 'bin'), { recursive: true });
    writeFileSync(join(dir, '.fable', 'config.json'), JSON.stringify(defaultConfig()));
    writeFileSync(join(dir, '.fable', 'handoffs', 'example.md'), '## Goal\n\n## Background\n\n## Acceptance\n\n## Return\n');
    writeFileSync(join(dir, '.fable', 'bin', 'fable.cmd'), '');
    writeFileSync(join(dir, '.fable', 'bin', 'fable.ps1'), '');
    writeFileSync(join(dir, '.fable', 'bin', 'fable'), '');
    writeFileSync(join(dir, '.gitignore'), '.fable/runs/\n');
    const config = defaultConfig();
    const checks = doctorChecks({ projectDir: dir, config });
    const agentsCheck = checks.find(c => c.check === 'AGENTS fable');
    assert.strictEqual(agentsCheck.status, 'fail');
  });

  it('gitignore runs check passes when .fable/runs/ is in .gitignore', () => {
    const config = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    const checks = doctorChecks({ projectDir: TMP, config });
    const gitignoreCheck = checks.find(c => c.check === 'gitignore runs');
    assert.strictEqual(gitignoreCheck.status, 'ok');
  });

  it('local shim check passes when all three shims exist', () => {
    const config = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    const checks = doctorChecks({ projectDir: TMP, config });
    const shimCheck = checks.find(c => c.check === 'local shim');
    assert.strictEqual(shimCheck.status, 'ok');
  });

  it('local shim check fails when shims are missing', () => {
    const dir = join(TMP, 'no-shims');
    mkdirSync(join(dir, '.fable', 'handoffs'), { recursive: true });
    mkdirSync(join(dir, '.fable', 'runs'), { recursive: true });
    writeFileSync(join(dir, '.fable', 'config.json'), JSON.stringify(defaultConfig()));
    writeFileSync(join(dir, '.fable', 'handoffs', 'example.md'), '## Goal\n\n## Background\n\n## Acceptance\n\n## Return\n');
    writeFileSync(join(dir, '.gitignore'), '.fable/runs/\n');
    writeFileSync(join(dir, 'AGENTS.md'), '<!-- FABLE-START -->');
    const config = defaultConfig();
    const checks = doctorChecks({ projectDir: dir, config });
    const shimCheck = checks.find(c => c.check === 'local shim');
    assert.strictEqual(shimCheck.status, 'fail');
  });

  it('non-opencode runtime: includes a runtime warn check, excludes opencode-specific checks', () => {
    const dir = join(TMP, 'kimi-project');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'kimi', model: 'kimi-latest' });
    const config = defaultConfig('kimi', 'kimi-latest');
    const checks = doctorChecks({ projectDir: dir, config });
    const names = checks.map(c => c.check);
    assert.ok(names.includes('runtime'), 'should include a runtime check');
    assert.ok(!names.includes('opencode dry-run'), 'should NOT include opencode dry-run');
    assert.ok(!names.includes('opencode path'), 'should NOT include opencode path');
    const rt = checks.find(c => c.check === 'runtime');
    assert.strictEqual(rt.status, 'warn');
    assert.ok(/overlay/.test(rt.detail));
  });

  it('unknown runtime: runtime check fails with actionable detail', () => {
    const dir = join(TMP, 'bogus-project');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'm' });
    const config = { runtime: 'bogus', model: 'm', adapter: 'adapters/opencode.md', fableVersion: '0.1.0' };
    const checks = doctorChecks({ projectDir: dir, config });
    const rt = checks.find(c => c.check === 'runtime');
    assert.ok(rt, 'should include a runtime check');
    assert.strictEqual(rt.status, 'fail');
    assert.ok(/fable runtime --list/.test(rt.detail));
  });

  it('opencode runtime still returns exactly 9 checks (unchanged)', () => {
    const config = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    const checks = doctorChecks({ projectDir: TMP, config });
    assert.strictEqual(checks.length, 9);
    assert.ok(!checks.map(c => c.check).includes('runtime'));
  });
});
