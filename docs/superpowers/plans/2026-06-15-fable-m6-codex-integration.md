# FABLE M6 Codex Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make fable governance usable from inside a real Codex CLI session via two real, Codex-native surfaces — the **charter** (always-on `AGENTS.md` + `CLAUDE.md` governance = the "skill") and an **MCP server** (`fable mcp-server` registered with `codex mcp add` = the "plugin"/callable capabilities) — verified end-to-end against the installed `codex` (0.131.0).

**Architecture:** Phase 1 (offline, deterministic, fully unit-tested): a reusable charter-set injector that always seeds `AGENTS.md` + `CLAUDE.md` (plus per-runtime extras from new `charterFiles` metadata), a `fable charter sync` command, a zero-dep stdio JSON-RPC MCP server (`src/mcp.js`) exposing read-only fable tools, a `fable mcp-server` command, and a `fable codex setup` command that prints/applies the exact `codex mcp add` registration. Phase 2 (live Codex, real verification): register the MCP server, drive `codex exec` to confirm both the charter governance and the MCP tools work, and only then flip `codex` to `implemented`.

**Tech Stack:** Node.js (ESM, zero deps), `node:test`, `node:readline` for stdio framing, Windows-first + POSIX. Real `codex` CLI for Phase 2.

## Codex reality this plan is built on (verified by probing codex 0.131.0)

- Codex has **no skill primitive**. Its always-loaded instruction surface is `AGENTS.md` (project) + `~/.codex/AGENTS.md` (global) + `~/.codex/config.toml`. → charter = the skill-equivalent.
- Codex **plugins are marketplace-based** with an undocumented local snapshot format → NOT targeted (too risky/unverifiable).
- Codex **MCP is first-class & local-dev-friendly**: `codex mcp add <name> -- <command...>` writes a stdio server entry into `~/.codex/config.toml` (modeled on existing `gitnexus`/`xcodebuildmcp` entries). → MCP server = the plugin-equivalent.
- `codex exec [PROMPT]` runs non-interactively → used for real verification.

## Scope decisions (locked with the user)

- Deliver **both** the charter (skill-equivalent) and the MCP server (plugin-equivalent).
- **Real integration + verification** against the installed codex; flip `codex` status to `implemented` ONLY after Phase 2 passes.
- Charter injection **always seeds `AGENTS.md` + `CLAUDE.md`** (universal pair), plus any per-runtime extra `charterFiles`.

## File Structure

**Create:** `src/charter.js` (charter-set injector), `src/mcp.js` (stdio MCP server), `test/charter.test.js`, `test/mcp.test.js`, `docs/codex-integration.md`, `docs/handoffs/FABLE-M6-CODEX-result.md`.
**Modify:** `adapters/runtime-capabilities.json` (+`charterFiles`), `src/runtime.js` (REQUIRED_KEYS), `src/install.js` (use charter injector → AGENTS.md+CLAUDE.md), `src/cli.js` (`charter`, `mcp-server`, `codex setup` commands + help), `adapters/codex.md` (real mechanics), `README.md`, `docs/runtime-overlay-model.md`, plus test updates.

**Do NOT touch:** `src/doctor.js` (preserve M4 opencode-9 invariant — charter checks are deferred), `src/opencode.js`. Don't stage `docs/pr/**` or x-agents.

## Cross-task invariants (inject into every implementer/reviewer)

- Branch `feat/m6-codex-integration`; commit there only.
- Zero new deps; ESM; `node:test` only; Windows.
- `src/doctor.js` and `src/opencode.js` stay byte-identical to base `ba7296a` (M5 head). Verify with `git diff ba7296a HEAD -- src/doctor.js src/opencode.js` empty.
- `src/mcp.js` must be a newline-delimited JSON-RPC 2.0 stdio server (one JSON object per line, no embedded newlines in output).
- MCP tools are **read-only** (runtime/build-prompt/doctor) — never expose mutating/exec tools over MCP.
- Do NOT mark `codex` `implemented` until Phase 2 verification actually passes against real codex.

---

## Task 1: Add `charterFiles` metadata + extend the loader contract

**Files:** `adapters/runtime-capabilities.json`, `src/runtime.js`, `test/runtime.test.js`

- [ ] **Step 1: Failing test** — append to `test/runtime.test.js` inside the `runtime capabilities metadata` describe:
```js
  it('every runtime entry has a charterFiles array including AGENTS.md', () => {
    const caps = loadCapabilities();
    for (const [name, entry] of Object.entries(caps)) {
      assert.ok(Array.isArray(entry.charterFiles), `${name} charterFiles must be an array`);
      assert.ok(entry.charterFiles.includes('AGENTS.md'), `${name} charterFiles should include AGENTS.md`);
    }
    assert.ok(getRuntime('claude').charterFiles.includes('CLAUDE.md'));
    assert.ok(getRuntime('copilot').charterFiles.includes('.github/copilot-instructions.md'));
  });
```

- [ ] **Step 2: Run → FAIL** (`node --test test/runtime.test.js`): charterFiles missing.

- [ ] **Step 3:** Add `charterFiles` to each entry in `adapters/runtime-capabilities.json`:
  - claude: `["CLAUDE.md", "AGENTS.md"]`
  - opencode: `["AGENTS.md"]`
  - codex: `["AGENTS.md"]`
  - kimi: `["AGENTS.md"]`
  - grok: `["AGENTS.md"]`
  - copilot: `[".github/copilot-instructions.md", "AGENTS.md"]`
  - agy: `["AGENTS.md"]`

- [ ] **Step 4:** In `src/runtime.js` add `'charterFiles'` to the `REQUIRED_KEYS` array so validation enforces it:
```js
export const REQUIRED_KEYS = ['status', 'injectionMode', 'hostSystemPolicy', 'adapter', 'commandSupport', 'notes', 'charterFiles'];
```

- [ ] **Step 5: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`, expect 0 fail).

- [ ] **Step 6: Commit**
```bash
git add adapters/runtime-capabilities.json src/runtime.js test/runtime.test.js
git commit -m "feat: runtime-capabilities 增加 charterFiles（宪章文件集，含 CLAUDE.md）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Charter-set injector (`src/charter.js`) + install seeds AGENTS.md + CLAUDE.md

**Files:** `src/charter.js` (create), `src/install.js`, `test/charter.test.js` (create), `test/install.test.js`

The injector reuses the existing idempotent `<!-- FABLE-START -->` … `<!-- FABLE-END -->` block and writes it into each file in a set, preserving user content (append if marker absent; leave untouched if present).

- [ ] **Step 1: Failing test** — create `test/charter.test.js`:
```js
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
```

- [ ] **Step 2: Run → FAIL** (cannot resolve `../src/charter.js`).

- [ ] **Step 3:** Create `src/charter.js`:
```js
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const FABLE_BLOCK = '<!-- FABLE-START -->\n## Fable Integration\n\nThis project uses [fable-5-anything](https://github.com/surebeli/fable-5-anything) for\nportable prompt governance. Follow the portable core in `.fable/` and the handoff\ncontract (Goal/Background/Acceptance/Return). Dispatch handoffs via:\n\n```bash\nfable run .fable/handoffs/example.md --project .\n```\n\nThe host agent\'s own system prompt and tool rules remain authoritative; fable\noverlays project governance and never asks you to ignore host instructions.\n<!-- FABLE-END -->\n';

export function syncCharter({ project, files }) {
  const written = [];
  for (const rel of files) {
    const p = join(project, rel);
    const dir = dirname(p);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (existsSync(p)) {
      const existing = readFileSync(p, 'utf-8');
      if (existing.includes('<!-- FABLE-START -->')) { written.push({ file: rel, action: 'present' }); continue; }
      writeFileSync(p, existing + (existing.endsWith('\n') ? '' : '\n') + '\n' + FABLE_BLOCK);
      written.push({ file: rel, action: 'appended' });
    } else {
      const header = rel.endsWith('CLAUDE.md') ? '# CLAUDE.md\n' : '# AGENTS.md\n';
      writeFileSync(p, header + '\n' + FABLE_BLOCK);
      written.push({ file: rel, action: 'created' });
    }
  }
  return written;
}
```

- [ ] **Step 4:** Refactor `src/install.js` to use `syncCharter` and seed BOTH `AGENTS.md` + `CLAUDE.md`. Add `import { syncCharter } from './charter.js';`. Replace the existing `const agentsPath = join(project, 'AGENTS.md'); ... ` AGENTS-only block with:
```js
  syncCharter({ project, files: ['AGENTS.md', 'CLAUDE.md'] });
  summary.push('  (charter) AGENTS.md, CLAUDE.md');
```
Keep the existing `AGENTS_SECTION` constant only if still referenced; otherwise remove it (the block now lives in charter.js). The existing install tests asserting AGENTS.md gets a `<!-- FABLE-START -->` + `## Fable Integration` still pass because `FABLE_BLOCK` contains both markers and that heading.

- [ ] **Step 5:** Add to `test/install.test.js` inside `describe('install', ...)`:
```js
  it('seeds CLAUDE.md with the fable charter block', () => {
    const dir = join(TMP, 'charter-claude'); mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const t = readFileSync(join(dir, 'CLAUDE.md'), 'utf-8');
    assert.ok(t.includes('<!-- FABLE-START -->'));
    assert.ok(t.includes('Fable Integration'));
  });
```

- [ ] **Step 6: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`). Verify existing AGENTS.md install tests still green.

- [ ] **Step 7: Commit**
```bash
git add src/charter.js src/install.js test/charter.test.js test/install.test.js
git commit -m "feat: charter-set 注入器，install 同时种 AGENTS.md 与 CLAUDE.md

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `fable charter sync` command

**Files:** `src/cli.js`, `test/charter.test.js`

Default file set = universal pair `['AGENTS.md','CLAUDE.md']` ∪ the configured runtime's `charterFiles`. `--all` = union across all runtimes. `--runtime <name>` overrides which runtime's extras to include.

- [ ] **Step 1: Failing test** — append to `test/charter.test.js`:
```js
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
```

- [ ] **Step 2: Run → FAIL** (`charter` is an unknown command).

- [ ] **Step 3:** In `src/cli.js`: add `import { syncCharter } from './charter.js';` and (already-imported) `loadCapabilities`. Add `cmdCharter`:
```js
function cmdCharter(opts, positional) {
  const sub = positional[0];
  if (sub !== 'sync') {
    console.error('Usage: fable charter sync --project <dir> [--runtime <name>] [--all]');
    process.exit(1);
  }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  if (opts.all) {
    for (const r of Object.values(caps)) for (const f of r.charterFiles) set.add(f);
  } else {
    const rtName = opts.runtime || (() => { try { return readConfigFile(project).runtime; } catch { return 'opencode'; } })();
    const rt = caps[rtName];
    if (rt) for (const f of rt.charterFiles) set.add(f);
  }
  const written = syncCharter({ project, files: [...set] });
  for (const w of written) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
}
```
Wire into the `switch`: `case 'charter': cmdCharter(opts, positional); break;`. Add a help line.

- [ ] **Step 4: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`).

- [ ] **Step 5: Commit**
```bash
git add src/cli.js test/charter.test.js
git commit -m "feat: 新增 fable charter sync 命令（多宿主宪章注入）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: MCP server core (`src/mcp.js`) + `fable mcp-server`

**Files:** `src/mcp.js` (create), `src/cli.js`, `test/mcp.test.js` (create)

A newline-delimited JSON-RPC 2.0 stdio server. Offline tests spawn it and exercise the protocol — no Codex needed.

- [ ] **Step 1: Failing test** — create `test/mcp.test.js`:
```js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const BIN = resolve(ROOT, 'bin', 'fable.js');

function rpc(lines) {
  const r = spawnSync('node', [BIN, 'mcp-server'], { input: lines.map(l => JSON.stringify(l)).join('\n') + '\n', encoding: 'utf-8', timeout: 30000, cwd: ROOT });
  return r.stdout.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

describe('mcp-server', () => {
  it('initialize returns serverInfo fable', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }]);
    const init = out.find(m => m.id === 1);
    assert.ok(init && init.result && init.result.serverInfo.name === 'fable');
    assert.ok(init.result.capabilities.tools);
  });

  it('tools/list returns fable_runtime, fable_build_prompt, fable_doctor', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 2, method: 'tools/list' }]);
    const names = out.find(m => m.id === 2).result.tools.map(t => t.name);
    for (const n of ['fable_runtime', 'fable_build_prompt', 'fable_doctor']) assert.ok(names.includes(n), `missing ${n}`);
  });

  it('tools/call fable_runtime returns text content listing opencode', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'fable_runtime', arguments: {} } }]);
    const res = out.find(m => m.id === 3).result;
    assert.ok(res.content[0].text.includes('opencode'));
  });
});
```

- [ ] **Step 2: Run → FAIL** (`mcp-server` unknown command).

- [ ] **Step 3:** Create `src/mcp.js`:
```js
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { VERSION } from './version.js';
import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';
import { readConfigFile } from './config.js';
import { assemble } from './prompt.js';
import { readHandoff, validate } from './handoff.js';
import { doctorChecks } from './doctor.js';

const PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  { name: 'fable_runtime', description: 'List fable runtimes, or describe one (status, injection mode, overlay vs replace).',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'runtime name; omit to list all' } } } },
  { name: 'fable_build_prompt', description: 'Assemble a fable governance prompt from a project config and a handoff file.',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, handoff: { type: 'string' } }, required: ['project', 'handoff'] } },
  { name: 'fable_doctor', description: 'Run fable doctor checks for a project and return their statuses.',
    inputSchema: { type: 'object', properties: { project: { type: 'string' } }, required: ['project'] } }
];

function toolRuntime(args) {
  if (args && args.name) {
    const r = getRuntime(args.name);
    return r ? JSON.stringify({ name: args.name, ...r }, null, 2) : `Unknown runtime: ${args.name}. Known: ${listRuntimes().join(', ')}`;
  }
  const caps = loadCapabilities();
  return JSON.stringify(Object.keys(caps).map(n => ({ name: n, status: caps[n].status, injectionMode: caps[n].injectionMode, hostSystemPolicy: caps[n].hostSystemPolicy })), null, 2);
}
function toolBuildPrompt(args) {
  const config = readConfigFile(resolve(args.project));
  const handoffPath = resolve(args.project, args.handoff);
  const vr = validate(readHandoff(handoffPath));
  if (!vr.valid) return `Handoff missing required sections: ${vr.missing.join(', ')}`;
  return assemble({ handoffPath, config });
}
function toolDoctor(args) {
  const projectDir = resolve(args.project);
  const config = readConfigFile(projectDir);
  return doctorChecks({ projectDir, config }).map(c => `${c.status.toUpperCase()} ${c.check}: ${c.detail}`).join('\n');
}
function callTool(name, args) {
  if (name === 'fable_runtime') return toolRuntime(args);
  if (name === 'fable_build_prompt') return toolBuildPrompt(args);
  if (name === 'fable_doctor') return toolDoctor(args);
  throw new Error(`Unknown tool: ${name}`);
}

export function handleMessage(msg) {
  const { id, method, params } = msg;
  if (method === 'notifications/initialized') return null;
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: (params && params.protocolVersion) || PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'fable', version: VERSION } } };
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  if (method === 'tools/call') {
    const targs = (params && params.arguments) || {};
    try {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: callTool(params && params.name, targs) }] } };
    } catch (e) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true } };
    }
  }
  if (id !== undefined && id !== null) return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  return null;
}

export function startMcpServer() {
  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on('line', (line) => {
    const t = line.trim();
    if (!t) return;
    let msg;
    try { msg = JSON.parse(t); } catch { return; }
    const res = handleMessage(msg);
    if (res !== null && res !== undefined) process.stdout.write(JSON.stringify(res) + '\n');
  });
}
```

- [ ] **Step 4:** In `src/cli.js`: `import { startMcpServer } from './mcp.js';`. In the `switch`, add `case 'mcp-server': startMcpServer(); break;` (do NOT call `process.exit`; the server runs until stdin closes). Add a help line: `fable mcp-server  —  Start the fable MCP server (stdio) for codex mcp add / other MCP hosts.`

- [ ] **Step 5: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`).

- [ ] **Step 6: Commit**
```bash
git add src/mcp.js src/cli.js test/mcp.test.js
git commit -m "feat: 新增 fable mcp-server（stdio JSON-RPC MCP 服务，只读 fable 工具）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `fable codex setup` — charter + MCP registration command

**Files:** `src/cli.js`, `test/charter.test.js` (or a new `test/codex.test.js`)

Prints the exact `codex mcp add` registration and runs charter sync; only executes `codex mcp add` when `--apply` is passed (so tests + dry runs never mutate global Codex config).

- [ ] **Step 1: Failing test** — append to `test/charter.test.js`:
```js
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
```

- [ ] **Step 2: Run → FAIL** (`codex` unknown command).

- [ ] **Step 3:** In `src/cli.js` add `cmdCodex` and import `PKG_ROOT` from config (already importing from './config.js' — add `PKG_ROOT`). Use `node:child_process` `spawnSync` only when `--apply`:
```js
function cmdCodex(opts, positional) {
  if (positional[0] !== 'setup') { console.error('Usage: fable codex setup --project <dir> [--apply]'); process.exit(1); }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  for (const f of (caps.codex ? caps.codex.charterFiles : [])) set.add(f);
  for (const w of syncCharter({ project, files: [...set] })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  const entry = resolve(PKG_ROOT, 'bin', 'fable.js');
  const addCmd = `codex mcp add fable -- node "${entry}" mcp-server`;
  if (opts.apply) {
    const r = spawnSync('codex', ['mcp', 'add', 'fable', '--', 'node', entry, 'mcp-server'], { encoding: 'utf-8', stdio: 'inherit' });
    console.log(r.status === 0 ? 'Registered fable MCP server with Codex.' : 'codex mcp add failed; run manually:');
    if (r.status !== 0) console.log(addCmd);
  } else {
    console.log('\nTo register the fable MCP server with Codex, run:');
    console.log('  ' + addCmd);
    console.log('(or re-run with --apply to do it now)');
  }
}
```
Wire `case 'codex': cmdCodex(opts, positional); break;`. Add `import { spawnSync } from 'node:child_process';` at top if not present. Add help line.

- [ ] **Step 4: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`).

- [ ] **Step 5: Commit**
```bash
git add src/cli.js test/charter.test.js
git commit -m "feat: 新增 fable codex setup（宪章 + 打印/应用 codex mcp add）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Docs (Codex integration guide, adapter, overlay model, README)

**Files:** `docs/codex-integration.md` (create), `adapters/codex.md`, `docs/runtime-overlay-model.md`, `README.md`

- [ ] **Step 1:** Create `docs/codex-integration.md` documenting the two real surfaces: (a) charter — `fable charter sync` / `fable install` seeds AGENTS.md + CLAUDE.md, loaded by Codex every session; (b) MCP — `fable codex setup --apply` (or the printed `codex mcp add fable -- node <entry> mcp-server`), exposing `fable_runtime`/`fable_build_prompt`/`fable_doctor` in-session. Note Codex has no skill primitive and that fable overlays (never replaces) Codex's system prompt. Include a real-usage walkthrough: `codex exec "follow .fable/handoffs/<task>.md"`.

- [ ] **Step 2:** Update `adapters/codex.md` to add a "Charter + MCP (M6)" section describing the AGENTS.md/CLAUDE.md charter and the MCP tools, keeping the existing footer deferring to the portable core.

- [ ] **Step 3:** Update `docs/runtime-overlay-model.md`: in the per-runtime table note codex's charterFiles and that codex now has a charter + MCP path; add a short "Charter file set" paragraph (the constitution is AGENTS.md + CLAUDE.md + host extras).

- [ ] **Step 4:** Add a README "Codex" subsection under Runtimes pointing to `docs/codex-integration.md` and showing `fable codex setup --project . --apply`.

- [ ] **Step 5:** Verify links: `node bin/fable.js charter sync --project .tmp-doc-check && rm -rf .tmp-doc-check` (then restore any seeded AGENTS.md/CLAUDE.md in repo root if created — run in a temp dir instead to avoid touching the repo's own files).

- [ ] **Step 6: Commit**
```bash
git add docs/codex-integration.md adapters/codex.md docs/runtime-overlay-model.md README.md
git commit -m "docs: Codex 集成指南（charter + MCP），更新适配器与 overlay 模型

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Offline full verification

**Files:** none (verification only)

- [ ] **Step 1:** `node --test --test-concurrency=1 test/*.test.js` → expect 0 fail (M5's ~82 + new charter/mcp/runtime tests).
- [ ] **Step 2:** Parallel recheck (two concurrent `node --test test/*.test.js`) → both 0 fail.
- [ ] **Step 3:** Invariant guard: `git diff ba7296a HEAD -- src/doctor.js src/opencode.js` MUST be empty; `docs/pr/**` not in diff.
- [ ] **Step 4:** Manual smoke: `node bin/fable.js mcp-server` fed an `initialize` + `tools/list` line returns valid JSON-RPC; `node bin/fable.js codex setup --project <tmp>` seeds AGENTS.md+CLAUDE.md and prints the `codex mcp add` command; clean up temp.

---

## Task 8 (PHASE 2 — LIVE CODEX): real integration + verification + status flip

> **Side effects:** this task mutates the user's global `~/.codex/config.toml` (via `codex mcp add fable`) and spends Codex quota (via `codex exec`). It is gated on explicit user go-ahead before the milestone runs.

**Files:** `adapters/runtime-capabilities.json`, `test/runtime.test.js`, `docs/handoffs/FABLE-M6-CODEX-result.md`

- [ ] **Step 1: Register the MCP server with real Codex**
```bash
node bin/fable.js codex setup --project <repo-or-sample> --apply
codex mcp list
```
Expected: `codex mcp list` shows a `fable` entry (command `node <abs>/bin/fable.js mcp-server`), status enabled.

- [ ] **Step 2: Verify the MCP tools work in a real Codex session**
```bash
codex exec "Use the fable_runtime MCP tool to list runtimes and tell me opencode's status."
```
Expected: Codex calls the fable MCP tool and reports opencode = implemented. Capture the transcript/output as evidence.

- [ ] **Step 3: Verify the charter governs a real Codex session.** In a temp project seeded by `fable install` (AGENTS.md + CLAUDE.md present), run:
```bash
codex exec "What governance rules apply in this repo? Summarize the fable handoff contract."
```
Expected: Codex's answer reflects the fable charter (handoff Goal/Background/Acceptance/Return, overlay-not-replace). Capture evidence.

- [ ] **Step 4: Only if Steps 1–3 PASS — flip codex to implemented.** Update `adapters/runtime-capabilities.json` codex entry: `"status": "implemented"`, `"injectionMode": "agents-md-and-mcp"`, `"commandSupport": ["charter", "mcp-server", "codex-setup"]`, and update the note to describe the charter + MCP path. Update the `test/runtime.test.js` expectation if it asserts codex status (add/adjust an assertion that codex is implemented with an MCP/charter injection mode). Run the full suite → 0 fail.

- [ ] **Step 5:** If any of Steps 1–3 FAIL, leave codex `planned`, record exactly what failed, and stop (do not overclaim). Either way, write `docs/handoffs/FABLE-M6-CODEX-result.md` (verdict PASS only if codex was verified + flipped; PARTIAL if offline parts done but live verification blocked) with real command output as evidence and the runtime matrix.

- [ ] **Step 6: Commit**
```bash
git add adapters/runtime-capabilities.json test/runtime.test.js docs/handoffs/FABLE-M6-CODEX-result.md
git commit -m "feat: Codex 真机验证通过，runtime 状态翻为 implemented（charter + MCP）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** charter-set incl. CLAUDE.md (T1–T2), `charter sync` (T3), MCP server = plugin-equivalent (T4), `codex setup` registration (T5), docs (T6), offline verify (T7), real Codex verification + honest status flip (T8). Both user-chosen surfaces (skill→charter, plugin→MCP) are delivered and really verified.

**Placeholder scan:** only the result file evidence in T8 is filled from real output; all code steps are complete.

**Invariant guard:** `doctor.js`/`opencode.js` untouched (T7 Step 3); MCP tools read-only; codex flips to implemented only after real verification (T8 gated). Charter reuses the existing idempotent marker so install's AGENTS.md tests stay green.

**Type/name consistency:** `syncCharter`/`FABLE_BLOCK` (charter.js) used by install.js, cli.js charter/codex commands; `startMcpServer`/`handleMessage` (mcp.js) used by cli.js + tests; tool names `fable_runtime`/`fable_build_prompt`/`fable_doctor` identical across mcp.js + tests; `charterFiles` key consistent across capabilities.json, runtime.js REQUIRED_KEYS, and the charter command.

**Honesty:** no native marketplace plugin (undocumented/unstable); codex status is data-driven by real verification; the live-Codex task is explicitly side-effecting and user-gated.
