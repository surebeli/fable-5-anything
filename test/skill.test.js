import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildKimiSkill, writeKimiSkill } from '../src/skill.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const TMP = resolve(__dirname, '..', `.tmp-test-skill-${process.pid}`);

before(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true }); });
after(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); });

describe('kimi skill', () => {
  it('buildKimiSkill returns SKILL.md with frontmatter name: fable and governance body', () => {
    const s = buildKimiSkill();
    assert.ok(s.startsWith('---'), 'starts with YAML frontmatter');
    assert.ok(/\nname:\s*fable\b/.test(s), 'has name: fable');
    assert.ok(/\ndescription:\s*\S/.test(s), 'has a description');
    assert.ok(s.includes('Priority Order'), 'includes portable core Priority Order');
    assert.ok(/kimi/i.test(s), 'includes kimi adapter content');
  });

  it('writeKimiSkill writes <project>/.fable/skills/fable/SKILL.md and returns its path', () => {
    const p = writeKimiSkill({ project: TMP });
    assert.ok(existsSync(p));
    assert.ok(p.replace(/\\/g, '/').endsWith('.fable/skills/fable/SKILL.md'));
    assert.ok(readFileSync(p, 'utf-8').includes('name: fable'));
  });
});

import { spawnSync } from 'node:child_process';
const ROOT = resolve(__dirname, '..');
const BIN = resolve(ROOT, 'bin', 'fable.js');

describe('fable kimi setup command', () => {
  it('writes the skill + charter and prints --skills-dir / extra_skill_dirs registration', () => {
    const dir = join(TMP, 'kimi'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'kimi', 'setup', '--project', dir], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, '.fable', 'skills', 'fable', 'SKILL.md')));
    assert.ok(existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'CLAUDE.md')));
    assert.ok(r.stdout.includes('--skills-dir'), 'prints --skills-dir usage');
    assert.ok(r.stdout.includes('extra_skill_dirs'), 'prints extra_skill_dirs registration');
  });
});

describe('fable copilot setup command', () => {
  it('writes charter incl .github/copilot-instructions.md and prints copilot mcp add (dry)', () => {
    const dir = join(TMP, 'copilot'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'copilot', 'setup', '--project', dir], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, '.github', 'copilot-instructions.md')));
    assert.ok(existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'CLAUDE.md')));
    assert.ok(r.stdout.includes('copilot mcp add fable'), 'prints copilot mcp add');
    assert.ok(r.stdout.includes('mcp-server'));
  });
});

describe('fable grok setup command', () => {
  it('writes charter (AGENTS.md + CLAUDE.md) and prints grok mcp add (dry)', () => {
    const dir = join(TMP, 'grok'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'grok', 'setup', '--project', dir], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'CLAUDE.md')));
    assert.ok(r.stdout.includes('grok mcp add fable'), 'prints grok mcp add');
    assert.ok(r.stdout.includes('mcp-server'));
  });

  it('codex setup --via github prints a durable npx-github mcp registration', () => {
    const dir = join(TMP, 'codex-github'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'codex', 'setup', '--project', dir, '--via', 'github'], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('codex mcp add fable -- npx -y github:surebeli/fable-5-anything mcp-server'), `got: ${r.stdout}`);
    assert.ok(!r.stdout.includes('bin/fable.js') && !r.stdout.includes('bin\\fable.js'), 'github via should not reference a local path');
  });
});

describe('fable opencode setup command', () => {
  it('writes charter, copies the portable core into .fable/, and wires opencode.json instructions', () => {
    const dir = join(TMP, 'oc'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'opencode', 'setup', '--project', dir], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(existsSync(join(dir, 'AGENTS.md')) && existsSync(join(dir, 'CLAUDE.md')));
    const core = readFileSync(join(dir, '.fable', 'portable-agent-core.md'), 'utf-8');
    assert.ok(core.includes('Priority Order'), 'portable core copied into .fable/');
    const oc = JSON.parse(readFileSync(join(dir, 'opencode.json'), 'utf-8'));
    assert.ok(oc.instructions.includes('AGENTS.md') && oc.instructions.includes('.fable/portable-agent-core.md'), 'opencode.json wired with instructions');
  });

  it('preserves existing opencode.json keys and is idempotent', () => {
    const dir = join(TMP, 'oc-merge'); mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'opencode.json'), JSON.stringify({ '$schema': 'https://opencode.ai/config.json', mcp: { x: { type: 'remote', url: 'http://h' } } }));
    spawnSync('node', [BIN, 'opencode', 'setup', '--project', dir], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    spawnSync('node', [BIN, 'opencode', 'setup', '--project', dir], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    const oc = JSON.parse(readFileSync(join(dir, 'opencode.json'), 'utf-8'));
    assert.ok(oc.mcp && oc.mcp.x, 'existing mcp key preserved');
    assert.strictEqual(oc.instructions.filter(i => i === '.fable/portable-agent-core.md').length, 1, 'no duplicate instruction on re-run');
  });
});
