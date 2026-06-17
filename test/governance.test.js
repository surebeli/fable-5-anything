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

describe('fable governance (governance-only mode — host-agnostic)', () => {
  it('host-agnostic: full core inlined into AGENTS.md + CLAUDE.md; no host-specific wiring and NO executor artifacts', () => {
    const dir = join(TMP, 'g1'); mkdirSync(dir, { recursive: true });
    const r = fable(['governance', '--project', dir]);
    assert.strictEqual(r.status, 0, r.stderr);
    for (const f of ['AGENTS.md', 'CLAUDE.md']) {
      const t = readFileSync(join(dir, f), 'utf-8');
      assert.ok(t.includes('<!-- FABLE-START -->'), `${f} has fable block`);
      assert.ok(t.includes('Priority Order'), `${f} should inline the full portable core (host-agnostic)`);
    }
    // Decoupled from any host: no .fable/, no opencode.json, no skill, no .github
    assert.ok(!existsSync(join(dir, '.fable')), 'no .fable/ (decoupled from host)');
    assert.ok(!existsSync(join(dir, 'opencode.json')), 'no opencode.json (host-specific wiring belongs to opencode setup)');
    assert.ok(!existsSync(join(dir, '.github')), 'no copilot-specific files');
  });

  it('default block names NO single-host mechanism (no opencode.json / .fable core-file reference in the charter)', () => {
    const dir = join(TMP, 'g1b'); mkdirSync(dir, { recursive: true });
    fable(['governance', '--project', dir]);
    const t = readFileSync(join(dir, 'AGENTS.md'), 'utf-8');
    assert.ok(!/opencode\.json/.test(t), 'host-agnostic governance must not name opencode.json in the charter');
    assert.ok(!/\.fable\/portable-agent-core\.md/.test(t), 'core is inlined, not referenced via a host-specific file');
  });

  it('is idempotent (single fable block, refreshed not duplicated)', () => {
    const dir = join(TMP, 'g3'); mkdirSync(dir, { recursive: true });
    fable(['governance', '--project', dir]);
    fable(['governance', '--project', dir]);
    const t = readFileSync(join(dir, 'AGENTS.md'), 'utf-8');
    assert.strictEqual((t.match(/<!-- FABLE-START -->/g) || []).length, 1, 'no duplicate block');
  });
});

describe('governance-only install discoverability', () => {
  it('AGENTS.md documents governance-only install and hopper dispatch handoff', () => {
    const t = readFileSync(join(ROOT, 'AGENTS.md'), 'utf-8');
    assert.ok(/governance-only/i.test(t), 'AGENTS.md should state fable is governance-only');
    assert.ok(/governance --project <proj>/.test(t), 'AGENTS.md should show the governance command');
    assert.ok(/hopper-plugin/i.test(t), 'AGENTS.md should point dispatch users to hopper-plugin');
    assert.ok(!/ASK FIRST/i.test(t), 'AGENTS.md should not describe a mode-selection flow');
  });

  it('CLAUDE.md carries the same governance-only directive', () => {
    assert.ok(existsSync(join(ROOT, 'CLAUDE.md')), 'fable repo should have CLAUDE.md for Claude Code installers');
    const t = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf-8');
    assert.ok(/governance-only/i.test(t), 'CLAUDE.md should state fable is governance-only');
    assert.ok(/governance --project <proj>/.test(t), 'CLAUDE.md should show the governance command');
    assert.ok(/hopper-plugin/i.test(t), 'CLAUDE.md should point dispatch users to hopper-plugin');
  });

  it('README documents governance-only install and no current fable install command', () => {
    const t = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    assert.ok(/Install \(one command\)/.test(t) && /governance --project <your-project>/.test(t), 'README has one-command governance install');
    assert.ok(/Dispatch moved to hopper-plugin/.test(t), 'README points dispatch to hopper-plugin');
    assert.ok(!/`fable install/.test(t), 'README should not advertise fable install');
  });

  it('fable --help surfaces governance setup and not install', () => {
    const r = spawnSync('node', [BIN, '--help'], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(/governance/.test(r.stdout), 'help lists governance');
    assert.ok(/opencode setup/.test(r.stdout) && /mcp-server/.test(r.stdout), 'help lists governance setup commands');
    assert.ok(!/fable install/.test(r.stdout), 'help should not list fable install');
  });
});
