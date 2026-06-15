# FABLE M4 Runtime Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codify a multi-vendor runtime-overlay model in `fable-5-anything` — machine-readable capability metadata, a `fable runtime` introspection command, runtime-aware `doctor`, and runtime→adapter config mapping — without claiming unsupported vendor execution and without breaking the M1–M3 opencode path.

**Architecture:** One portable core + many injection adapters. A new `adapters/runtime-capabilities.json` is the single source of truth for each runtime's status / injection mode / host-system policy / adapter file. `src/runtime.js` loads and validates it (self-contained path resolution, no import cycle with `config.js`). `config.js` derives a runtime's adapter from that metadata; `cli.js` exposes `fable runtime`; `doctor.js` branches on `config.runtime` (opencode keeps its exact 9 checks; other runtimes get generic checks + a non-failing `runtime` warning; unknown runtimes fail).

**Tech Stack:** Node.js (ESM, `type: module`), zero runtime dependencies, `node:test` built-in test runner, Windows-first with POSIX support.

**Scope decisions locked by the user (2026-06-15):**
- Result file stays in THIS repo at `docs/handoffs/FABLE-M4-RUNTIME-OVERLAY-result.md` (the handoff's x-agents return channel is superseded; x-agents review files are read-only reference only).
- Runtime coverage is the FULL set: `claude, opencode, codex, kimi, grok, copilot, agy` (generic opaque host). `grok` reuses the existing `adapters/grok.md`; `copilot` and `agy`/generic get new adapter files.

---

## Conflicts this plan resolves (from the conflict audit)

| # | Conflict | Resolution in this plan |
|---|---|---|
| C1 | Cross-repo return channel | Result → `docs/handoffs/` in-repo (Task 11); no writes to x-agents |
| C2 | Adapter roster (grok vs copilot/agy) | Full 7-runtime capability set incl. grok; new `copilot.md` + `generic.md` (Tasks 2–3) |
| C3 | Entry-point prose drift | Docs use correct `bin/fable.js`; shims already correct, no code change (Tasks 9–10) |
| C4 | `defaultConfig` hardcodes opencode adapter | Runtime→adapter mapping via capabilities (Task 4) |
| C5 | `doctor` has no runtime branch | Runtime-aware `doctor` (Task 6) |
| C6 | npm `test` script missing `--test-concurrency=1` | Updated script (Task 7) + per-process temp dirs (Task 1) |

Non-conflict confirmed: opencode flags intact — do **not** touch `src/opencode.js` `buildCommand`.

---

## File Structure

**Create:**
- `adapters/runtime-capabilities.json` — single source of truth for runtime metadata (7 runtimes).
- `adapters/copilot.md` — Copilot overlay adapter.
- `adapters/generic.md` — generic opaque-host (agy/Antigravity-like) overlay adapter.
- `src/runtime.js` — capability loader/validator + lookups (`loadCapabilities`, `getRuntime`, `listRuntimes`, `adapterForRuntime`). Self-contained path resolution (no `config.js` import → no cycle).
- `test/runtime.test.js` — unit + CLI coverage for runtime metadata and the `runtime` command.
- `docs/runtime-overlay-model.md` — the design/PR-source doc (system-replace vs overlay).
- `docs/handoffs/FABLE-M4-RUNTIME-OVERLAY-result.md` — milestone result (Return Channel, in-repo).

**Modify:**
- `src/config.js` — `defaultConfig` derives `adapter` from capabilities + adds optional `injectionMode`/`hostSystemPolicy`. Imports `runtime.js` one-directionally.
- `src/cli.js` — add `runtime` command + `cmdRuntime`; teach `cmdDoctor` to render a non-failing `warn` status; help text.
- `src/doctor.js` — branch `doctorChecks` on `config.runtime`; import `loadCapabilities`.
- `test/config.test.js` — assertions for runtime→adapter mapping + new fields; per-process temp dir.
- `test/doctor.test.js` — non-opencode + unknown-runtime coverage; per-process temp dir.
- `test/cli.test.js`, `test/install.test.js` — per-process temp dir.
- `package.json` — `test` script gains `--test-concurrency=1`.
- `README.md`, `docs/embed-in-your-project.md` — runtimes section + `fable runtime` + overlay-vs-replace note.

**Do NOT touch:** `src/opencode.js`, `src/prompt.js`, `src/handoff.js`, `src/install.js`, `bin/fable.js`, `prompts/**`, existing `adapters/{opencode,codex,kimi,grok}.md`, anything under `F:\workspace\project\x-agents`, `docs/pr/**`.

---

## Task 1: Harden test temp dirs against parallel-process collisions (C6 / M4.6)

**Files:**
- Modify: `test/cli.test.js:9`
- Modify: `test/config.test.js:9`
- Modify: `test/doctor.test.js:11`
- Modify: `test/install.test.js:10`

Each file uses a fixed `.tmp-test-<name>` dir; two suites running in separate processes collide on the same path. Append `process.pid` so each process gets a unique root.

- [ ] **Step 1: Make `test/cli.test.js` temp dir per-process**

Replace line 9:
```js
const TMP = resolve(__dirname, '..', `.tmp-test-cli-${process.pid}`);
```

- [ ] **Step 2: Make `test/config.test.js` temp dir per-process**

Replace line 9:
```js
const TMP = resolve(__dirname, '..', `.tmp-test-config-${process.pid}`);
```

- [ ] **Step 3: Make `test/doctor.test.js` temp dir per-process**

Replace line 11:
```js
const TMP = resolve(__dirname, '..', `.tmp-test-doctor-${process.pid}`);
```

- [ ] **Step 4: Make `test/install.test.js` temp dir per-process**

Replace line 10:
```js
const TMP = resolve(__dirname, '..', `.tmp-test-install-${process.pid}`);
```

- [ ] **Step 5: Run the full suite (single process) to confirm no regression**

Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# pass 51` `# fail 0`

- [ ] **Step 6: Run two suites in parallel to confirm no temp collision**

Run (Windows PowerShell):
```powershell
Start-Job { node --test test/*.test.js } ; node --test test/*.test.js ; Get-Job | Wait-Job | Receive-Job
```
Expected: both runs report `# fail 0` (no `EEXIST`/`ENOENT` on `.tmp-test-*`).

- [ ] **Step 7: Commit**
```bash
git add test/cli.test.js test/config.test.js test/doctor.test.js test/install.test.js
git commit -m "test: 隔离测试临时目录到每进程唯一路径，避免并行碰撞

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Create the Copilot and generic opaque-host adapters (C2)

**Files:**
- Create: `adapters/copilot.md`
- Create: `adapters/generic.md`
- Test: `test/runtime.test.js` (adapter-existence assertion lands in Task 3; here we add a focused file-shape check)

Follow the existing adapter convention: H1 `# <Name> Adapter`, a command/usage section, and the standard footer that defers to the portable core.

- [ ] **Step 1: Write the failing test for adapter file shape**

Create `test/runtime.test.js` with this initial content:
```js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');

describe('new adapters', () => {
  it('copilot adapter exists with heading and core-deference footer', () => {
    const p = resolve(ROOT, 'adapters', 'copilot.md');
    assert.ok(existsSync(p), 'adapters/copilot.md must exist');
    const t = readFileSync(p, 'utf-8');
    assert.ok(t.includes('# Copilot Adapter'));
    assert.ok(t.includes('prompts/portable-agent-core.md'));
    assert.ok(/overlay/i.test(t));
  });

  it('generic opaque-host adapter exists with heading and core-deference footer', () => {
    const p = resolve(ROOT, 'adapters', 'generic.md');
    assert.ok(existsSync(p), 'adapters/generic.md must exist');
    const t = readFileSync(p, 'utf-8');
    assert.ok(t.includes('# Generic (Opaque Host) Adapter'));
    assert.ok(t.includes('prompts/portable-agent-core.md'));
    assert.ok(/overlay/i.test(t));
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test test/runtime.test.js`
Expected: FAIL — `adapters/copilot.md must exist`.

- [ ] **Step 3: Create `adapters/copilot.md`**
```markdown
# Copilot Adapter

Use this adapter for GitHub Copilot CLI sessions and Copilot custom-agent
dispatches. Status: design/overlay. There is no fable executor for Copilot in
this milestone.

## Injection Model

Copilot ships its own system prompt, tool protocol, and permissions. fable does
NOT replace them. fable is layered as project governance via the highest
available overlay surface:

- `AGENTS.md` / custom instructions in the target repository.
- `--agent` custom agent definitions where supported.
- `--plugin-dir` plugins where supported.
- a prompt prelude as a last resort.

Verify the installed Copilot CLI's actual flags before relying on any of these.

## Authority

Host Copilot system and tool rules win over fable. fable never instructs the
model to ignore host instructions. fable governs portable behavior only: read
the project first, obey the handoff contract, TDD/acceptance gates, minimal
scoped changes, preserve user work, verify before completion, write
result/review artifacts.

## Command Contract

Treat command shapes as unverified until checked against the local install. A
common shape is:

```powershell
copilot --prompt "<prompt>" --agent <agent> --plugin-dir <dir>
```

## Smoke Check

Prompt:

```text
Reply exactly PONG and nothing else.
```

Pass criteria: the Copilot runtime returns exactly `PONG` and makes no unrelated
edits.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.
```

- [ ] **Step 4: Create `adapters/generic.md`**
```markdown
# Generic (Opaque Host) Adapter

Use this adapter for opaque or not-yet-characterized agent hosts, including
agy/Antigravity-like tools, where the injection surface is unknown or limited.
Status: opaque/overlay. There is no fable executor for these hosts.

## Default Assumption

Assume overlay-only. Never assume the host exposes a safe full system-prompt
replacement. If a replacement path is later proven to be user-owned and safe,
document it and switch that specific runtime to a dedicated adapter — do not
generalize from one host to all opaque hosts.

## Injection Model

Use the highest available overlay surface, in this order of preference:

- durable project instructions (`AGENTS.md` or equivalent).
- custom instructions / agent config exposed by the host.
- a wrapper that prepends the assembled prompt, if and only if one exists.
- a prompt prelude as a last resort.

## Authority

Host system and tool rules win over fable. fable never tells the model to ignore
host instructions and never claims a provider identity the host has not
established. fable governs only portable behavior (read-first, handoff contract,
TDD/acceptance, minimal scoped changes, preserve user work, verify before
completion, return artifacts).

## Smoke Check

Prompt:

```text
Reply exactly PONG and nothing else.
```

Pass criteria: the host returns exactly `PONG` and makes no unrelated edits.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test test/runtime.test.js`
Expected: PASS (2 passing under `new adapters`).

- [ ] **Step 6: Commit**
```bash
git add adapters/copilot.md adapters/generic.md test/runtime.test.js
git commit -m "feat: 新增 copilot 与 generic 不透明宿主 overlay 适配器

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Runtime capability metadata + loader (`src/runtime.js`) (C2, M4.2)

**Files:**
- Create: `adapters/runtime-capabilities.json`
- Create: `src/runtime.js`
- Test: `test/runtime.test.js` (extend)

`src/runtime.js` resolves its own paths from `import.meta.url` and does NOT import `config.js`, so when `config.js` imports it in Task 4 there is no import cycle.

- [ ] **Step 1: Write the failing tests for the loader**

Append to `test/runtime.test.js` (after the existing `describe('new adapters', ...)` block):
```js
import { loadCapabilities, getRuntime, listRuntimes, adapterForRuntime } from '../src/runtime.js';

const EXPECTED_RUNTIMES = ['claude', 'opencode', 'codex', 'kimi', 'grok', 'copilot', 'agy'];
const REQUIRED_KEYS = ['status', 'injectionMode', 'hostSystemPolicy', 'adapter', 'commandSupport', 'notes'];

describe('runtime capabilities metadata', () => {
  it('listRuntimes covers the full agreed vendor set', () => {
    const names = listRuntimes();
    for (const r of EXPECTED_RUNTIMES) {
      assert.ok(names.includes(r), `capabilities must include ${r}`);
    }
  });

  it('every runtime entry has all required keys and valid enums', () => {
    const caps = loadCapabilities();
    for (const [name, entry] of Object.entries(caps)) {
      for (const k of REQUIRED_KEYS) {
        assert.ok(k in entry, `${name} missing key ${k}`);
      }
      assert.ok(['implemented', 'planned', 'reference-only', 'opaque'].includes(entry.status), `${name} bad status`);
      assert.ok(['overlay', 'system-replace-when-user-owned'].includes(entry.hostSystemPolicy), `${name} bad hostSystemPolicy`);
      assert.ok(Array.isArray(entry.commandSupport), `${name} commandSupport must be array`);
    }
  });

  it('opencode is implemented, prompt-prelude, overlay, with the opencode adapter', () => {
    const r = getRuntime('opencode');
    assert.strictEqual(r.status, 'implemented');
    assert.strictEqual(r.injectionMode, 'prompt-prelude');
    assert.strictEqual(r.hostSystemPolicy, 'overlay');
    assert.strictEqual(r.adapter, 'adapters/opencode.md');
  });

  it('claude is reference-only with system-replace-when-user-owned', () => {
    const r = getRuntime('claude');
    assert.strictEqual(r.status, 'reference-only');
    assert.strictEqual(r.hostSystemPolicy, 'system-replace-when-user-owned');
  });

  it('adapterForRuntime maps known runtimes to their adapter files (or null)', () => {
    assert.strictEqual(adapterForRuntime('opencode'), 'adapters/opencode.md');
    assert.strictEqual(adapterForRuntime('kimi'), 'adapters/kimi.md');
    assert.strictEqual(adapterForRuntime('grok'), 'adapters/grok.md');
    assert.strictEqual(adapterForRuntime('copilot'), 'adapters/copilot.md');
    assert.strictEqual(adapterForRuntime('agy'), 'adapters/generic.md');
    assert.strictEqual(adapterForRuntime('claude'), null);
  });

  it('getRuntime returns null for unknown runtime', () => {
    assert.strictEqual(getRuntime('bogus'), null);
  });

  it('every non-null adapter referenced by capabilities exists on disk', () => {
    const caps = loadCapabilities();
    for (const [name, entry] of Object.entries(caps)) {
      if (entry.adapter !== null) {
        const p = resolve(ROOT, entry.adapter);
        assert.ok(existsSync(p), `${name} adapter file ${entry.adapter} must exist`);
      }
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/runtime.test.js`
Expected: FAIL — cannot resolve `../src/runtime.js`.

- [ ] **Step 3: Create `adapters/runtime-capabilities.json`**
```json
{
  "claude": {
    "status": "reference-only",
    "injectionMode": "system-prompt-file",
    "hostSystemPolicy": "system-replace-when-user-owned",
    "adapter": null,
    "commandSupport": [],
    "notes": "Claude Code can replace the system prompt via --system-prompt-file when the user owns the session. Reference only; fable ships no Claude executor and does not migrate Claude identity/tool assumptions."
  },
  "opencode": {
    "status": "implemented",
    "injectionMode": "prompt-prelude",
    "hostSystemPolicy": "overlay",
    "adapter": "adapters/opencode.md",
    "commandSupport": ["build-prompt", "smoke", "run", "doctor"],
    "notes": "Assembled prompt is passed to opencode run. The host opencode system prompt remains authoritative; fable overlays governance."
  },
  "codex": {
    "status": "planned",
    "injectionMode": "agents-md-or-plugin",
    "hostSystemPolicy": "overlay",
    "adapter": "adapters/codex.md",
    "commandSupport": [],
    "notes": "Design only in this milestone. Overlay via AGENTS.md / plugin / profile; host Codex system and tool policy remain authoritative."
  },
  "kimi": {
    "status": "planned",
    "injectionMode": "skill-or-prompt-prelude",
    "hostSystemPolicy": "overlay",
    "adapter": "adapters/kimi.md",
    "commandSupport": [],
    "notes": "Design only in this milestone. Overlay via --skills-dir or prompt prelude; host system prompt remains authoritative."
  },
  "grok": {
    "status": "planned",
    "injectionMode": "prompt-prelude",
    "hostSystemPolicy": "overlay",
    "adapter": "adapters/grok.md",
    "commandSupport": [],
    "notes": "Advisory/review-oriented adapter. Design only; overlay via prompt prelude; no executor in this milestone."
  },
  "copilot": {
    "status": "planned",
    "injectionMode": "custom-instructions-or-plugin",
    "hostSystemPolicy": "overlay",
    "adapter": "adapters/copilot.md",
    "commandSupport": [],
    "notes": "Design only in this milestone. Overlay via AGENTS/custom instructions / --agent / --plugin-dir; host system prompt remains authoritative."
  },
  "agy": {
    "status": "opaque",
    "injectionMode": "custom-instructions-or-wrapper",
    "hostSystemPolicy": "overlay",
    "adapter": "adapters/generic.md",
    "commandSupport": [],
    "notes": "Generic opaque-host fallback (agy/Antigravity-like). Overlay only; never assume system replacement until proven user-owned and safe."
  }
}
```

- [ ] **Step 4: Create `src/runtime.js`**
```js
import { readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Self-contained path resolution. Intentionally does NOT import config.js so
// that config.js can import this module without creating an ESM import cycle.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(join(__dirname, '..'));
const CAPABILITIES_PATH = join(PKG_ROOT, 'adapters', 'runtime-capabilities.json');

const REQUIRED_KEYS = ['status', 'injectionMode', 'hostSystemPolicy', 'adapter', 'commandSupport', 'notes'];

export function loadCapabilities() {
  const raw = readFileSync(CAPABILITIES_PATH, 'utf-8');
  const data = JSON.parse(raw);
  for (const [name, entry] of Object.entries(data)) {
    for (const key of REQUIRED_KEYS) {
      if (!(key in entry)) {
        throw new Error(`runtime-capabilities.json: "${name}" is missing required key "${key}"`);
      }
    }
  }
  return data;
}

export function getRuntime(name) {
  const caps = loadCapabilities();
  return Object.prototype.hasOwnProperty.call(caps, name) ? caps[name] : null;
}

export function listRuntimes() {
  return Object.keys(loadCapabilities());
}

export function adapterForRuntime(name) {
  const r = getRuntime(name);
  return r ? r.adapter : null;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `node --test test/runtime.test.js`
Expected: PASS (all `runtime capabilities metadata` + `new adapters` tests green).

- [ ] **Step 6: Commit**
```bash
git add adapters/runtime-capabilities.json src/runtime.js test/runtime.test.js
git commit -m "feat: 新增 runtime-capabilities 元数据与 src/runtime.js 加载校验

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Map runtime → adapter in `defaultConfig` + optional fields (C4, M4.5)

**Files:**
- Modify: `src/config.js:8-17`
- Test: `test/config.test.js` (extend; per-process temp from Task 1)

Back-compat invariant: `defaultConfig('opencode', ...)` MUST still return `adapter: 'adapters/opencode.md'` (existing `config.test.js` asserts this). Adding `injectionMode`/`hostSystemPolicy` is safe because tests assert individual props, never whole-object equality.

- [ ] **Step 1: Write the failing tests**

Append to `test/config.test.js` inside `describe('config', ...)`:
```js
  it('defaultConfig maps runtime to its adapter (kimi -> adapters/kimi.md)', () => {
    const cfg = defaultConfig('kimi', 'kimi-latest');
    assert.strictEqual(cfg.adapter, 'adapters/kimi.md');
  });

  it('defaultConfig carries injectionMode and hostSystemPolicy from capabilities', () => {
    const cfg = defaultConfig('opencode', 'tokenbox/deepseek-v4-pro');
    assert.strictEqual(cfg.injectionMode, 'prompt-prelude');
    assert.strictEqual(cfg.hostSystemPolicy, 'overlay');
  });

  it('defaultConfig falls back to the opencode adapter for unknown runtime', () => {
    const cfg = defaultConfig('bogus', 'x');
    assert.strictEqual(cfg.adapter, 'adapters/opencode.md');
    assert.strictEqual(cfg.hostSystemPolicy, 'overlay');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/config.test.js`
Expected: FAIL — `cfg.adapter` is `adapters/opencode.md` for kimi (current hardcode), and `cfg.injectionMode` is undefined.

- [ ] **Step 3: Update `src/config.js`**

Add the import at the top (after the existing imports, line 3):
```js
import { getRuntime } from './runtime.js';
```

Replace the `defaultConfig` function (lines 10-17) with:
```js
export function defaultConfig(runtime = 'opencode', model = 'tokenbox/deepseek-v4-pro') {
  const rt = getRuntime(runtime);
  return {
    runtime,
    model,
    adapter: (rt && rt.adapter) || DEFAULT_ADAPTER,
    injectionMode: rt ? rt.injectionMode : 'prompt-prelude',
    hostSystemPolicy: rt ? rt.hostSystemPolicy : 'overlay',
    fableVersion: '0.1.0'
  };
}
```

(`DEFAULT_ADAPTER` at line 8 stays as the `'adapters/opencode.md'` fallback for unknown/null-adapter runtimes.)

- [ ] **Step 4: Run config + install tests to verify pass + no regression**

Run: `node --test test/config.test.js test/install.test.js`
Expected: PASS. (`install.test.js` asserts only runtime/model/fableVersion → unaffected by the two new fields.)

- [ ] **Step 5: Commit**
```bash
git add src/config.js test/config.test.js
git commit -m "feat: defaultConfig 按 runtime 映射 adapter 并写入 injectionMode/hostSystemPolicy

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Add the `fable runtime` introspection command (M4.3)

**Files:**
- Modify: `src/cli.js` (parseArgs switch, new `cmdRuntime`, import, help text)
- Test: `test/runtime.test.js` (extend with spawned-CLI cases)

`parseArgs` turns `--list` into `opts.list = true`; `fable runtime opencode` yields `positional = ['opencode']`. Handle both.

- [ ] **Step 1: Write the failing CLI tests**

Append to `test/runtime.test.js`:
```js
import { spawnSync } from 'node:child_process';

const BIN = resolve(ROOT, 'bin', 'fable.js');
function fable(args) {
  return spawnSync('node', [BIN, ...args], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
}

describe('fable runtime command', () => {
  it('runtime --list exits 0 and lists the full vendor set', () => {
    const r = fable(['runtime', '--list']);
    assert.strictEqual(r.status, 0, r.stderr);
    for (const name of ['claude', 'opencode', 'codex', 'kimi', 'grok', 'copilot', 'agy']) {
      assert.ok(r.stdout.includes(name), `--list should mention ${name}`);
    }
  });

  it('runtime opencode reports implemented + overlay + prompt-prelude + authoritative host', () => {
    const r = fable(['runtime', 'opencode']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('implemented'));
    assert.ok(r.stdout.includes('prompt-prelude'));
    assert.ok(r.stdout.includes('overlay'));
    assert.ok(/authoritative/i.test(r.stdout), 'should state host system prompt is authoritative');
  });

  it('runtime claude states it is reference-only and can replace system prompt', () => {
    const r = fable(['runtime', 'claude']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('reference-only'));
    assert.ok(/system-replace-when-user-owned/.test(r.stdout));
  });

  it('runtime with unknown name exits 1 with actionable message', () => {
    const r = fable(['runtime', 'bogus']);
    assert.strictEqual(r.status, 1);
    assert.ok(/Unknown runtime/i.test(r.stderr));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/runtime.test.js`
Expected: FAIL — `runtime --list` currently hits the default branch (`Unknown command: runtime`, exit 1).

- [ ] **Step 3: Add the import to `src/cli.js`**

After line 8 (`import { doctorChecks } from './doctor.js';`) add:
```js
import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';
```

- [ ] **Step 4: Add `cmdRuntime` to `src/cli.js`**

Insert this function just before `export function main(argv) {`:
```js
function cmdRuntime(opts, positional) {
  const caps = loadCapabilities();

  if (opts.list || positional[0] === '--list' || (!positional[0] && !opts.list)) {
    if (!positional[0] && !opts.list) {
      // bare `fable runtime` behaves as --list
    }
    console.log('Known runtimes:\n');
    for (const name of listRuntimes()) {
      const r = caps[name];
      console.log(`  ${name.padEnd(10)} ${r.status.padEnd(14)} ${r.hostSystemPolicy} / ${r.injectionMode}`);
    }
    console.log('\nRun: fable runtime <name>   for details.');
    return;
  }

  const name = positional[0];
  const r = getRuntime(name);
  if (!r) {
    console.error(`Unknown runtime: ${name}. Known: ${listRuntimes().join(', ')}. Run: fable runtime --list`);
    process.exit(1);
  }

  const replaces = r.hostSystemPolicy === 'system-replace-when-user-owned';
  console.log(`runtime:            ${name}`);
  console.log(`status:             ${r.status}`);
  console.log(`injection mode:     ${r.injectionMode}`);
  console.log(`host system policy: ${r.hostSystemPolicy}`);
  console.log(`adapter:            ${r.adapter === null ? '(none — reference only)' : r.adapter}`);
  console.log(`implemented cmds:   ${r.commandSupport.length ? r.commandSupport.join(', ') : '(none)'}`);
  console.log(`host system prompt: ${replaces ? 'fable may REPLACE it when the user owns the session' : 'authoritative — fable OVERLAYS governance, does not replace it'}`);
  console.log(`notes:              ${r.notes}`);
}
```

- [ ] **Step 5: Wire the command into the switch in `main`**

In the `switch (command)` block, add before `default:`:
```js
    case 'runtime':
      cmdRuntime(opts, positional);
      break;
```

- [ ] **Step 6: Add `runtime` to the help text**

In `showHelp()`, after the `fable run ...` block and before `fable --help`, add:
```js
  fable runtime [<name>] [--list]
    Show how fable injects into a runtime (status, injection mode, whether it
    overlays or replaces the host system prompt). No args lists all runtimes.

```

- [ ] **Step 7: Run runtime tests + full suite**

Run: `node --test test/runtime.test.js`
Expected: PASS (all `fable runtime command` cases green).
Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0`.

- [ ] **Step 8: Commit**
```bash
git add src/cli.js test/runtime.test.js
git commit -m "feat: 新增 fable runtime introspection 命令

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Runtime-aware `doctor` (C5, M4.4)

**Files:**
- Modify: `src/doctor.js` (import + branch `doctorChecks`)
- Modify: `src/cli.js` (`cmdDoctor` renders a non-failing `warn` status)
- Test: `test/doctor.test.js` (extend; per-process temp from Task 1)

Invariant (Acceptance #6 + existing regression test): for `runtime === 'opencode'`, `doctorChecks` returns **exactly the same 9 checks in the same order**, all `ok` for a fresh install. Branching is additive only for non-opencode.

- [ ] **Step 1: Write the failing tests**

Append to `test/doctor.test.js` inside `describe('doctor', ...)`:
```js
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/doctor.test.js`
Expected: FAIL — no `runtime` check exists; kimi project currently runs opencode checks.

- [ ] **Step 3: Add the import to `src/doctor.js`**

After line 6 (`import { smokePrompt } from './prompt.js';`) add:
```js
import { loadCapabilities } from './runtime.js';
```

- [ ] **Step 4: Branch `doctorChecks` in `src/doctor.js`**

Replace the block that currently runs lines 108-123 (the `opencode dry-run` try/catch, `checkOpenCodeInPath()`, `checkFableAgentsSection`, `checkGitignoreRuns`, `checkLocalShim` pushes) with:
```js
  const runtime = config.runtime;
  let caps = {};
  try {
    caps = loadCapabilities();
  } catch (e) {
    checks.push({ check: 'capabilities', status: 'fail', detail: `runtime-capabilities.json error: ${e.message}` });
  }
  const rt = caps[runtime];

  if (!rt) {
    checks.push({
      check: 'runtime',
      status: 'fail',
      detail: `Unknown runtime "${runtime}". Known: ${Object.keys(caps).join(', ')}. Run: fable runtime --list`
    });
  } else if (runtime === 'opencode') {
    try {
      const prompt = smokePrompt();
      const { cmd } = buildCommand({ prompt, model: config.model });
      checks.push({
        check: 'opencode dry-run',
        status: 'ok',
        detail: `${cmd} run "<prompt>" --model ${config.model} --dangerously-skip-permissions --print-logs --format json --pure`
      });
    } catch (e) {
      checks.push({ check: 'opencode dry-run', status: 'fail', detail: e.message });
    }
    checks.push(checkOpenCodeInPath());
  } else {
    checks.push({
      check: 'runtime',
      status: 'warn',
      detail: `runtime "${runtime}" is ${rt.status} (${rt.hostSystemPolicy}/${rt.injectionMode}); fable overlays governance, host system prompt is authoritative. No executor in this milestone.`
    });
  }

  checks.push(checkFableAgentsSection(project));
  checks.push(checkGitignoreRuns(project));
  checks.push(checkLocalShim(project));
```

Note ordering: opencode path → config, adapter, core, handoff, opencode dry-run, opencode path, AGENTS fable, gitignore runs, local shim = the exact original 9.

- [ ] **Step 5: Render `warn` as non-failing in `src/cli.js` `cmdDoctor`**

Replace lines 125-128 (the loop body computing `icon` and `allOk`) with:
```js
  for (const c of checks) {
    const icon = c.status === 'ok' ? '  PASS' : c.status === 'warn' ? '  WARN' : '  FAIL';
    const label = (c.check + ':').padEnd(24);
    console.log(`${icon}  ${label} ${c.detail}`);
    if (c.status === 'fail') allOk = false;
  }
```

- [ ] **Step 6: Run doctor tests + full suite**

Run: `node --test test/doctor.test.js`
Expected: PASS (new non-opencode/unknown/9-count cases green; all existing opencode cases still green).
Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0`.

- [ ] **Step 7: Commit**
```bash
git add src/doctor.js src/cli.js test/doctor.test.js
git commit -m "feat: doctor 按 runtime 分支，非 opencode 给 overlay 警告、未知 runtime 报错

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Pin test concurrency in the npm script (C6)

**Files:**
- Modify: `package.json:10`

- [ ] **Step 1: Update the `test` script**

Replace line 10:
```json
    "test": "node --test --test-concurrency=1 test/*.test.js"
```

- [ ] **Step 2: Verify via npm (best-effort) and direct node**

Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0`.
(If `npm test` works on this machine it should now match; the handoff notes the npm shim may be broken locally — the direct `node --test` command is the source of truth.)

- [ ] **Step 3: Commit**
```bash
git add package.json
git commit -m "test: npm test 固定 --test-concurrency=1

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Runtime overlay design doc (M4.1)

**Files:**
- Create: `docs/runtime-overlay-model.md`

This is an Acceptance item (#2, #8) and PR-source material. It must explain system-replace vs overlay, the authority stack, the conflict policy, why fable avoids "ignore previous instructions", the per-runtime support level, and what is executable today vs planned.

- [ ] **Step 1: Create `docs/runtime-overlay-model.md`**
```markdown
# Runtime Overlay Model

fable-5-anything is portable prompt governance, not "the Claude prompt for every
model". This document explains how fable injects its governance into different
agent runtimes, and why the mechanism differs per runtime.

## System replacement vs overlay

Claude Code exposes a strong path to **replace** the system prompt: a user can
start a session with `--system-prompt-file` and make the whole session follow a
new operating constitution. That does not generalize. opencode, Kimi Code,
Codex CLI, Copilot CLI, and similar tools already ship their own system prompts,
tool protocols, permissions, safety policies, and project-instruction loaders.
Most expose no safe "replace the entire system prompt" API. Even their custom
instructions usually layer **below** vendor and tool rules.

So fable supports two injection postures:

- **system-replace (Claude only, user-owned):** the user explicitly replaces the
  system prompt. fable treats this as reference only and ships no Claude
  executor.
- **overlay (everyone else):** fable is layered as project governance on top of
  the host's authoritative system prompt and tool protocol.

## Authority stack

```text
Vendor/platform hard rules
> Agent CLI built-in system prompt and tool protocol
> Project instructions / skills / plugins / agent config
> fable portable core + runtime adapter
> Current handoff / user task
```

(See also the Priority Order in `prompts/portable-agent-core.md`.)

## Conflict policy

Host agent rules win over fable. When a lower-priority instruction conflicts with
a higher-priority one, fable states the conflict and obeys the higher priority.
fable never claims a provider identity (Claude, Codex, Kimi, Copilot, opencode,
Grok) unless the host itself establishes it.

## Why fable avoids "ignore previous instructions"

fable cooperates with the host instead of fighting it. It does not tell the model
to ignore host or system instructions, because (1) it is layered below those
rules and cannot safely override them, and (2) prompt-injection-style overrides
are exactly the behavior host safety layers are built to resist. fable governs
only portable behavior: read the project first, obey the handoff contract, use
TDD/acceptance gates, make minimal scoped changes, preserve user work, verify
before completion, write result/review artifacts, and avoid long inline dispatch
context when a handoff file exists.

## How portable core maps into each runtime

The portable core (`prompts/portable-agent-core.md`) is runtime-neutral. Each
runtime adapter under `adapters/` adds only the mechanics for that host. The
machine-readable map is `adapters/runtime-capabilities.json`; inspect it from the
CLI with `fable runtime <name>` or `fable runtime --list`.

## Per-runtime support

| Runtime | Status | Injection mode | Host system policy | Adapter |
|---|---|---|---|---|
| claude | reference-only | system-prompt-file | system-replace-when-user-owned | (none) |
| opencode | implemented | prompt-prelude | overlay | adapters/opencode.md |
| codex | planned | agents-md-or-plugin | overlay | adapters/codex.md |
| kimi | planned | skill-or-prompt-prelude | overlay | adapters/kimi.md |
| grok | planned | prompt-prelude | overlay | adapters/grok.md |
| copilot | planned | custom-instructions-or-plugin | overlay | adapters/copilot.md |
| agy (generic opaque host) | opaque | custom-instructions-or-wrapper | overlay | adapters/generic.md |

## Executable today vs planned

- **Executable today:** opencode only. `fable build-prompt`, `fable smoke`,
  `fable run`, and the opencode-specific `fable doctor` checks operate against a
  configured opencode runtime.
- **Planned / design-only:** codex, kimi, grok, copilot. Their adapters and
  capability metadata exist and are introspectable, but fable ships no executor
  for them in this milestone, and `doctor` reports them as overlay/planned rather
  than running host-specific checks.
- **Opaque:** agy and similar hosts default to overlay-only; never assume system
  replacement until a specific host is proven user-owned and safe.

This document is intended to be reusable as PR/launch article source material.
```

- [ ] **Step 2: Sanity-check the doc matches the metadata**

Run: `node bin/fable.js runtime --list`
Expected: the printed statuses/policies match the table above (claude reference-only, opencode implemented, others planned/opaque).

- [ ] **Step 3: Commit**
```bash
git add docs/runtime-overlay-model.md
git commit -m "docs: 新增 runtime overlay 设计文档（system-replace vs overlay）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Update README and embed docs (M4.7, C3)

**Files:**
- Modify: `README.md` (command table + new Runtimes section)
- Modify: `docs/embed-in-your-project.md` (runtime introspection step + non-opencode status note)

Use the correct `bin/fable.js` entry everywhere (do not reproduce the handoff's `node fable.js` prose).

- [ ] **Step 1: Add the `runtime` row to the README command table**

In `README.md`, after the `fable run <handoff> [--dry-run]` row (line 56), add:
```markdown
| `fable runtime [<name>]` | Show how fable injects into a runtime (status, injection mode, overlay vs system replacement). No args lists all. |
```

- [ ] **Step 2: Add a "Runtimes" section to the README**

In `README.md`, immediately after the `## Strategy` section (after line 74) insert:
```markdown
## Runtimes

fable does not replace most vendor system prompts. Claude Code is special: a user
can replace the system prompt with `--system-prompt-file`. For opencode, Kimi,
Codex, Copilot, and opaque hosts, fable **overlays** project governance on top of
the host's authoritative system prompt — it never tells the model to ignore host
rules.

- opencode is implemented end-to-end (build-prompt, smoke, run, doctor).
- codex, kimi, grok, copilot are adapter/design status (introspectable, no
  executor yet).
- agy and other opaque hosts default to overlay-only.

Inspect any runtime:

```bash
node bin/fable.js runtime --list
node bin/fable.js runtime opencode
```

See [docs/runtime-overlay-model.md](docs/runtime-overlay-model.md) for the full
model and the authority stack.
```

- [ ] **Step 3: Add a runtime-introspection step to the embed doc**

In `docs/embed-in-your-project.md`, after the `## 3. Run doctor` section (after line 79) insert:
```markdown
## 3b. Inspect the runtime

See how fable will inject into your configured runtime:

```bash
node bin/fable.js runtime --list
node bin/fable.js runtime opencode
```

For opencode this reports `implemented` + `overlay` + `prompt-prelude`. For
Kimi/Codex/Copilot it reports `planned` (adapter/design status); fable overlays
governance and never replaces the host system prompt. `doctor` mirrors this:
non-opencode runtimes show a runtime overlay warning instead of opencode checks.
```

- [ ] **Step 4: Verify links and commands render**

Run: `node bin/fable.js runtime opencode`
Expected: exit 0, output includes `implemented`, `overlay`, `prompt-prelude`, and an "authoritative" line.

- [ ] **Step 5: Commit**
```bash
git add README.md docs/embed-in-your-project.md
git commit -m "docs: README/embed 增加 runtime introspection 与 overlay 说明

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Full verification + shim regression (Acceptance #1, #6; Reviewer #5, #6)

**Files:** none (verification only)

- [ ] **Step 1: Full test suite (single process)**

Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0`, total ≥ 51 + the new runtime/config/doctor cases (≈ 51 + 16 new).

- [ ] **Step 2: Parallel-process collision re-check**

Run (PowerShell):
```powershell
Start-Job { node --test test/*.test.js } ; node --test test/*.test.js ; Get-Job | Wait-Job | Receive-Job
```
Expected: both `# fail 0`, no `.tmp-test-*` collisions.

- [ ] **Step 3: Fresh opencode install + doctor exits 0 with 9 checks**
```powershell
node bin/fable.js install --project .tmp-verify-oc --runtime opencode --model tokenbox/deepseek-v4-pro --yes
node bin/fable.js doctor --project .tmp-verify-oc
```
Expected: doctor prints the 9 checks; exit code 0 (opencode path check may fail only if opencode is absent from PATH — note it, do not "fix" by weakening the check).

- [ ] **Step 4: Non-opencode doctor shows overlay warning, exit 0**
```powershell
node bin/fable.js install --project .tmp-verify-kimi --runtime kimi --model kimi-latest --yes
node bin/fable.js doctor --project .tmp-verify-kimi
```
Expected: a `WARN  runtime:` line, no opencode checks, exit 0.

- [ ] **Step 5: Local shim regression (Reviewer #5)**
```powershell
node bin/fable.js install --project .tmp-verify-shim --runtime opencode --model tokenbox/deepseek-v4-pro --yes
cd .tmp-verify-shim
.\.fable\bin\fable.cmd doctor
.\.fable\bin\fable.cmd smoke --dry-run
.\.fable\bin\fable.cmd run .fable/handoffs/example.md --dry-run
cd ..
```
Expected: doctor PASS lines; smoke/run print `DRY-RUN`.

- [ ] **Step 6: Clean up verify dirs**
```powershell
Remove-Item -Recurse -Force .tmp-verify-oc, .tmp-verify-kimi, .tmp-verify-shim
```

- [ ] **Step 7: No raw Claude prompt / no forbidden material (Acceptance #9, Reviewer #1-2)**

Run: `git diff --stat HEAD~9` (or review staged history) and confirm: no `CLAUDE-FABLE-5.md` content, no "ignore previous instructions" text, opencode flags unchanged in `src/opencode.js`, `docs/pr/**` untouched.

---

## Task 11: Write the milestone result file (C1, Return Channel)

**Files:**
- Create: `docs/handoffs/FABLE-M4-RUNTIME-OVERLAY-result.md`

Per the user's decision this replaces the handoff's x-agents return channel; nothing is written to x-agents.

- [ ] **Step 1: Create the result file**
```markdown
# FABLE-M4-RUNTIME-OVERLAY RESULT

Verdict: PASS

> Return channel relocated from x-agents to this repo by owner decision
> (2026-06-15); x-agents review files were read-only reference only.

## Files Changed
- (created) adapters/runtime-capabilities.json
- (created) adapters/copilot.md, adapters/generic.md
- (created) src/runtime.js
- (created) docs/runtime-overlay-model.md
- (created) test/runtime.test.js
- (modified) src/config.js, src/cli.js, src/doctor.js
- (modified) test/config.test.js, test/doctor.test.js, test/cli.test.js, test/install.test.js
- (modified) package.json, README.md, docs/embed-in-your-project.md

## Commands Run
- node --test --test-concurrency=1 test/*.test.js  -> <fill: pass/fail counts>
- node bin/fable.js runtime --list / runtime opencode  -> <fill>
- fresh install + doctor (opencode 9 checks; kimi overlay warn)  -> <fill>
- shim regression (cmd doctor / smoke --dry-run / run --dry-run)  -> <fill>

## Acceptance Evidence
1. Tests pass -> <fill>
2. docs/runtime-overlay-model.md explains system-replace vs overlay -> yes
3. Capability artifact covers claude/opencode/kimi/codex/copilot/agy(+grok) -> adapters/runtime-capabilities.json
4. CLI introspection command -> `fable runtime`
5. `fable runtime opencode` reports implemented + prompt-prelude/overlay + host authoritative -> <fill>
6. doctor on fresh opencode project exits 0 with the 9 checks -> <fill>
7. Unknown/planned runtime explicit (warn/fail, not silent opencode) -> <fill>
8. Docs explain vendor coordination strategy -> README + runtime-overlay-model.md
9. No raw CLAUDE-FABLE-5.md committed -> confirmed
10. No npm publish / plugin / skill package implemented -> confirmed

## Runtime Matrix
claude=reference-only/system-prompt-file; opencode=implemented/prompt-prelude/overlay;
codex,kimi,grok,copilot=planned/overlay; agy=opaque/overlay.

## Notes
- Only opencode is executable; others are introspectable design/adapter status.
- Real `fable smoke --execute` against live opencode credentials remains unverified (out of scope).
- Next recommended milestone: M5 packaging (npx install ergonomics).
```

- [ ] **Step 2: Fill the `<fill>` markers with real command output from Task 10**, then save.

- [ ] **Step 3: Commit**
```bash
git add docs/handoffs/FABLE-M4-RUNTIME-OVERLAY-result.md
git commit -m "docs: 记录 M4 runtime overlay 结果（return channel 落在本仓）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage (handoff Standard / Acceptance):**
- #1 tests pass → Tasks 1,7,10. #2 runtime-overlay-model.md → Task 8. #3 capability artifact (7 runtimes incl. grok + agy) → Task 3. #4 CLI introspection → Task 5. #5 `runtime opencode` reports overlay/prompt-prelude/implemented/authoritative → Task 5. #6 opencode doctor exits 0 with 9 checks → Tasks 6,10 (+ regression test). #7 unknown/planned explicit → Task 6. #8 docs explain coordination strategy → Tasks 8,9. #9 no raw Claude prompt → Task 10 check. #10 no publish/plugin/skill → not in scope (confirmed in Task 11). M4.5 optional config fields → Task 4. M4.6 unique temp roots → Task 1.
- Implementation Constraints: zero deps (no new deps added); `node:test` only; Windows preserved (PowerShell verify steps); M1–M3 compatibility (back-compat tests in Tasks 4,6); opencode flags untouched (explicit no-touch); `docs/pr/**` untouched.

**2. Placeholder scan:** The only intentional `<fill>` markers are in the result file (Task 11), to be replaced with real Task-10 output before its commit — they are explicitly flagged, not silent gaps. All source/JSON/test steps contain complete code.

**3. Type/name consistency:** `loadCapabilities`/`getRuntime`/`listRuntimes`/`adapterForRuntime` are defined in `src/runtime.js` (Task 3) and consumed identically in `config.js` (Task 4), `cli.js` (Task 5), `doctor.js` (Task 6). Capability keys (`status`, `injectionMode`, `hostSystemPolicy`, `adapter`, `commandSupport`, `notes`) are consistent across the JSON (Task 3), the loader's `REQUIRED_KEYS` (Task 3), the config mapping (Task 4), and the CLI printer (Task 5). The `warn` status is produced in `doctor.js` (Task 6) and rendered in `cli.js cmdDoctor` (Task 6). Runtime names are the same 7 everywhere: `claude, opencode, codex, kimi, grok, copilot, agy`.

**4. Import-cycle check:** `runtime.js` resolves paths from its own `import.meta.url` and imports nothing from `config.js`; `config.js` imports `runtime.js` one-directionally. No cycle.

**5. Regression guard:** opencode `doctor` stays exactly 9 checks in the original order (Task 6) — directly asserted by both the pre-existing "exactly 9" test and the new "still 9" test; `defaultConfig('opencode')` still returns `adapters/opencode.md` (Task 4) per the pre-existing config test.
