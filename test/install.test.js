import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { install } from '../src/install.js';
import { VERSION } from '../src/version.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const TMP = resolve(__dirname, '..', `.tmp-test-install-${process.pid}`);

describe('install', () => {
  before(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
  });

  after(() => {
    if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  });

  it('creates .fable/config.json with correct values', () => {
    install({ projectDir: TMP, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const configPath = join(TMP, '.fable', 'config.json');
    assert.ok(existsSync(configPath));
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    assert.strictEqual(config.runtime, 'opencode');
    assert.strictEqual(config.model, 'tokenbox/deepseek-v4-pro');
    assert.strictEqual(config.fableVersion, VERSION);
  });

  it('creates .fable/handoffs/example.md with all four required sections', () => {
    const handoffPath = join(TMP, '.fable', 'handoffs', 'example.md');
    assert.ok(existsSync(handoffPath));
    const content = readFileSync(handoffPath, 'utf-8');
    assert.ok(content.includes('## Goal'));
    assert.ok(content.includes('## Background'));
    assert.ok(content.includes('## Acceptance'));
    assert.ok(content.includes('## Return'));
  });

  it('creates .fable/README.md', () => {
    const readmePath = join(TMP, '.fable', 'README.md');
    assert.ok(existsSync(readmePath));
    const content = readFileSync(readmePath, 'utf-8');
    assert.ok(content.includes('config.json'));
    assert.ok(content.includes('handoffs/'));
    assert.ok(content.includes('runs/'));
    assert.ok(content.includes('bin/'));
  });

  it('creates .gitignore with .fable/runs/ entry', () => {
    const gitignorePath = join(TMP, '.gitignore');
    assert.ok(existsSync(gitignorePath));
    const content = readFileSync(gitignorePath, 'utf-8');
    assert.ok(content.includes('.fable/runs/'));
  });

  it('creates AGENTS.md with fable section when none exists', () => {
    const agentsPath = join(TMP, 'AGENTS.md');
    assert.ok(existsSync(agentsPath));
    const content = readFileSync(agentsPath, 'utf-8');
    assert.ok(content.includes('Fable Integration'));
    assert.ok(content.includes('<!-- FABLE-START -->'));
    assert.ok(content.includes('<!-- FABLE-END -->'));
  });

  it('idempotent: re-running install does not duplicate AGENTS.md fable section', () => {
    install({ projectDir: TMP, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const content = readFileSync(join(TMP, 'AGENTS.md'), 'utf-8');
    const matches = content.match(/<!-- FABLE-START -->/g);
    assert.strictEqual(matches.length, 1, 'AGENTS.md should have exactly one FABLE-START marker');
  });

  it('idempotent: re-running install preserves pre-existing AGENTS.md content', () => {
    const agentsPath = join(TMP, 'AGENTS.md');
    const original = readFileSync(agentsPath, 'utf-8');
    install({ projectDir: TMP, runtime: 'opencode', model: 'test/other-model' });
    const updated = readFileSync(agentsPath, 'utf-8');
    assert.ok(updated.startsWith(original.split('<!-- FABLE-START -->')[0]));
    assert.strictEqual((updated.match(/<!-- FABLE-START -->/g) || []).length, 1);
  });

  it('does not destroy existing AGENTS.md content when appending fable section', () => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
    const agentsPath = join(TMP, 'AGENTS.md');
    const customContent = '# My Project\n\nCustom project AGENTS.md content.\n';
    writeFileSync(agentsPath, customContent);
    install({ projectDir: TMP, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const updated = readFileSync(agentsPath, 'utf-8');
    assert.ok(updated.startsWith('# My Project'));
    assert.ok(updated.includes('<!-- FABLE-START -->'));
    assert.ok(updated.includes('## Fable Integration'));
  });

  it('creates .fable/runs/ directory', () => {
    const runsDir = join(TMP, '.fable', 'runs');
    assert.ok(existsSync(runsDir));
  });

  it('creates .fable/bin/fable.cmd with project path and fable repo reference', () => {
    const cmdPath = join(TMP, '.fable', 'bin', 'fable.cmd');
    assert.ok(existsSync(cmdPath));
    const content = readFileSync(cmdPath, 'utf-8');
    assert.ok(content.includes('node'));
    assert.ok(content.includes('bin\\fable.js'));
    assert.ok(content.includes('--project'));
    assert.ok(content.includes(TMP));
  });

  it('creates .fable/bin/fable.ps1 with project path', () => {
    const ps1Path = join(TMP, '.fable', 'bin', 'fable.ps1');
    assert.ok(existsSync(ps1Path));
    const content = readFileSync(ps1Path, 'utf-8');
    assert.ok(content.includes('node'));
    assert.ok(content.includes('bin\\fable.js'));
    assert.ok(content.includes('--project'));
    assert.ok(content.includes(TMP));
  });

  it('creates .fable/bin/fable POSIX shim', () => {
    const shPath = join(TMP, '.fable', 'bin', 'fable');
    assert.ok(existsSync(shPath));
    const content = readFileSync(shPath, 'utf-8');
    assert.ok(content.includes('#!/usr/bin/env sh'));
    assert.ok(content.includes('node'));
  });

  it('install protection: modified example.md is preserved, .new file created', () => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
    const projectDir = join(TMP, 'protected');
    mkdirSync(projectDir, { recursive: true });
    install({ projectDir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });

    const handoffPath = join(projectDir, '.fable', 'handoffs', 'example.md');
    const customHandoff = '# My Custom Handoff\n\n## Goal\n\nCustom goal text.\n\n## Background\n\nCustom background.\n\n## Acceptance\n\nCustom acceptance.\n\n## Return\n\nCustom return path.\n';
    writeFileSync(handoffPath, customHandoff);

    install({ projectDir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });

    const contentAfter = readFileSync(handoffPath, 'utf-8');
    assert.strictEqual(contentAfter, customHandoff, 'modified handoff should be preserved');

    const newPath = handoffPath + '.new';
    assert.ok(existsSync(newPath), '.new template should exist');
    const newContent = readFileSync(newPath, 'utf-8');
    assert.ok(newContent.includes('## Goal'));
    assert.ok(newContent.includes('## Background'));
    assert.ok(newContent.includes('## Acceptance'));
    assert.ok(newContent.includes('## Return'));
  });

  it('install protection: modified .fable/README.md is preserved, .new file created', () => {
    const readmePath = join(TMP, 'protected', '.fable', 'README.md');
    const customReadme = '# My Custom README\n';
    writeFileSync(readmePath, customReadme);

    install({ projectDir: join(TMP, 'protected'), runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });

    const contentAfter = readFileSync(readmePath, 'utf-8');
    assert.strictEqual(contentAfter, customReadme, 'modified README should be preserved');

    const newPath = readmePath + '.new';
    assert.ok(existsSync(newPath), '.new template should exist');
  });

  it('generated .fable/bin/fable.cmd executes doctor successfully', () => {
    const projectDir = join(TMP, 'shim-doctor');
    mkdirSync(projectDir, { recursive: true });
    install({ projectDir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const result = execSync('.fable\\bin\\fable.cmd doctor', { cwd: projectDir, encoding: 'utf-8', timeout: 15000 });
    assert.ok(result.includes('PASS'), `doctor output should contain PASS, got: ${result}`);
    assert.ok(result.includes('config'), `doctor output should contain config, got: ${result}`);
  });

  it('generated .fable/bin/fable.cmd executes smoke --dry-run successfully', () => {
    const projectDir = join(TMP, 'shim-smoke');
    mkdirSync(projectDir, { recursive: true });
    install({ projectDir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const result = execSync('.fable\\bin\\fable.cmd smoke --dry-run', { cwd: projectDir, encoding: 'utf-8', timeout: 15000 });
    assert.ok(result.includes('DRY-RUN'), `smoke output should contain DRY-RUN, got: ${result}`);
  });

  it('generated .fable/bin/fable.cmd executes run with --dry-run successfully', () => {
    const projectDir = join(TMP, 'shim-run');
    mkdirSync(projectDir, { recursive: true });
    install({ projectDir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const result = execSync('.fable\\bin\\fable.cmd run .fable/handoffs/example.md --dry-run', { cwd: projectDir, encoding: 'utf-8', timeout: 15000 });
    assert.ok(result.includes('DRY-RUN'), `run dry-run output should contain DRY-RUN, got: ${result}`);
  });

  it('writes .fable/fable.lock.json with version and default link=path', () => {
    const dir = join(TMP, 'lock-default');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const lock = JSON.parse(readFileSync(join(dir, '.fable', 'fable.lock.json'), 'utf-8'));
    assert.strictEqual(lock.fableVersion, VERSION);
    assert.strictEqual(lock.link, 'path');
    assert.ok(lock.entry.includes('bin'), 'path-mode entry references the bin entry');
  });

  it('path-mode fable.lock.json entry is POSIX-normalized (portable, no backslashes)', () => {
    const dir = join(TMP, 'lock-posix-entry');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const lock = JSON.parse(readFileSync(join(dir, '.fable', 'fable.lock.json'), 'utf-8'));
    assert.ok(!lock.entry.includes('\\'), 'lockfile entry must not contain backslashes');
    assert.ok(lock.entry.includes('bin/fable.js'), 'lockfile entry uses forward-slash bin/fable.js');
  });

  it('path-mode POSIX fable shim uses forward slashes (portable to real Unix)', () => {
    const dir = join(TMP, 'shim-posix-path');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const sh = readFileSync(join(dir, '.fable', 'bin', 'fable'), 'utf-8');
    assert.ok(sh.includes('#!/usr/bin/env sh'), 'POSIX shim has sh shebang');
    assert.ok(sh.includes('node "'), 'path-mode shim invokes node with the entry');
    assert.ok(sh.includes('bin/fable.js'), 'POSIX shim references forward-slash bin/fable.js');
    // The node-invocation path (before the runtime "$@" args) must be backslash-free.
    const invocation = sh.split('"$@"')[0];
    assert.ok(!invocation.includes('\\'), 'POSIX shim node path must not contain backslashes');
  });

  it('link=npx generates npx shims and records link in lockfile', () => {
    const dir = join(TMP, 'lock-npx');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro', link: 'npx' });
    const cmd = readFileSync(join(dir, '.fable', 'bin', 'fable.cmd'), 'utf-8');
    assert.ok(cmd.includes('npx -y fable-5-anything'), 'cmd shim should use npx');
    assert.ok(!cmd.includes('bin\\fable.js'), 'npx shim should not hardcode bin/fable.js');
    assert.ok(cmd.includes('--project'));
    const lock = JSON.parse(readFileSync(join(dir, '.fable', 'fable.lock.json'), 'utf-8'));
    assert.strictEqual(lock.link, 'npx');
  });

  it('link=global generates global shims', () => {
    const dir = join(TMP, 'lock-global');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro', link: 'global' });
    const ps1 = readFileSync(join(dir, '.fable', 'bin', 'fable.ps1'), 'utf-8');
    assert.ok(ps1.includes('fable @args'), 'ps1 global shim should call fable directly');
    assert.ok(!ps1.includes('node '), 'global shim should not invoke node directly');
  });
});
