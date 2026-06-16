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

describe('two-mode install discoverability (LLM-assisted installs surface the choice)', () => {
  it('AGENTS.md instructs an installing agent to ASK which mode (governance vs full)', () => {
    const t = readFileSync(join(ROOT, 'AGENTS.md'), 'utf-8');
    assert.ok(/ask/i.test(t), 'AGENTS.md should tell installers to ask');
    assert.ok(/governance/i.test(t) && /install/i.test(t), 'mentions both modes');
    assert.ok(/install-modes\.md/.test(t), 'points to docs/install-modes.md');
  });

  it('CLAUDE.md exists with the same ask-first mode directive', () => {
    assert.ok(existsSync(join(ROOT, 'CLAUDE.md')), 'fable repo should have CLAUDE.md for Claude Code installers');
    const t = readFileSync(join(ROOT, 'CLAUDE.md'), 'utf-8');
    assert.ok(/ask/i.test(t) && /governance/i.test(t) && /install/i.test(t), 'CLAUDE.md should carry the ask-first two-mode directive');
  });

  it('README documents the two modes', () => {
    const t = readFileSync(join(ROOT, 'README.md'), 'utf-8');
    assert.ok(/two modes/i.test(t) && /governance/i.test(t), 'README has the two-mode section');
  });

  it('fable --help surfaces both governance and install', () => {
    const r = spawnSync('node', [BIN, '--help'], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.ok(/governance/.test(r.stdout) && /install/.test(r.stdout), 'help lists both modes');
  });
});
