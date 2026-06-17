# Remove fable Mode B (governance-only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce `fable-5-anything` to governance-only (Mode A) by removing the Mode B dispatch/executor layer (`init`/`install`/`build-prompt`/`smoke`/`run`/`doctor`, the handoff contract, the opencode executor, `.fable/` scaffold + shims) and the docs that describe it — while keeping every governance capability working.

**Architecture:** The two governance functions trapped inside the dispatch module (`install.js`) move to `charter.js` first; then the dispatch commands, executor modules, and their tests are deleted; `mcp.js` and `config.js` are slimmed to their governance surface; the capability registry drops dispatch-only `commandSupport`; docs (README/AGENTS/CLAUDE/install-modes) are rewritten to a single governance-only mode. The `adapters/*.md` files stay — they are governance/overlay reference prose, registry- and test-coupled, not executable Mode B code.

**Tech Stack:** Node ≥18 ESM, `node --test --test-concurrency=1 test/*.test.js`.

**Spec:** `docs/superpowers/specs/2026-06-17-fable-hopper-governance-fusion-design.md` (lives in the hopper-plugin repo; this plan is the fable half).

**Ordering note (critical):** Task 1 (extract governance fns out of `install.js`) MUST land before Task 6 (delete `install.js`), or `fable governance` and `fable opencode setup` break. Do the tasks in order.

---

### Task 1: Extract `buildInlineCharterBlock` + `wireOpencodeGovernance` into `charter.js`

These two functions are pure governance but currently live in the dispatch module `install.js`. Move them so `install.js` can be deleted later.

**Files:**
- Modify: `src/charter.js` (add the two functions + a self-contained `PKG_ROOT`)
- Modify: `src/cli.js` (import them from `charter.js` instead of `install.js`)
- Test: `test/charter.test.js` (add unit tests locking the moved functions)

- [ ] **Step 1: Add the moved functions to `charter.js`**

At the top of `src/charter.js`, replace the import line:

```js
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
```

with:

```js
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Self-contained PKG_ROOT (mirrors skill.js / runtime.js) so charter.js does not
// depend on the dispatch modules being removed in this change.
const PKG_ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));
```

Then append to `src/charter.js` (verbatim moves of the two functions from `install.js`):

```js
// Build a charter block (with FABLE markers) containing the FULL portable core
// inline — used by the host-agnostic `fable governance` command (Mode A), which
// inlines the constitution straight into AGENTS.md / CLAUDE.md.
export function buildInlineCharterBlock() {
  const core = readFileSync(join(PKG_ROOT, 'prompts', 'portable-agent-core.md'), 'utf-8');
  return '<!-- FABLE-START -->\n## Fable Governance (portable core)\n\n' + core.trimEnd() + '\n\nThe host agent\'s own system prompt and tool rules remain authoritative; fable overlays project governance and never asks you to ignore host instructions.\n<!-- FABLE-END -->\n';
}

// Make the FULL fable portable core govern every opencode session: copy the
// portable core into the project's .fable/ and wire it (plus AGENTS.md) into
// opencode.json `instructions`. Preserves existing opencode.json keys; idempotent.
export function wireOpencodeGovernance({ projectDir }) {
  const project = resolve(projectDir);
  const fableDir = join(project, '.fable');
  if (!existsSync(fableDir)) mkdirSync(fableDir, { recursive: true });

  const coreDest = join(fableDir, 'portable-agent-core.md');
  copyFileSync(join(PKG_ROOT, 'prompts', 'portable-agent-core.md'), coreDest);

  const ocPath = join(project, 'opencode.json');
  let oc = { '$schema': 'https://opencode.ai/config.json' };
  if (existsSync(ocPath)) {
    try {
      oc = JSON.parse(readFileSync(ocPath, 'utf-8'));
    } catch (e) {
      throw new Error(`opencode.json is not valid JSON (refusing to overwrite): ${e.message}`);
    }
  }
  const want = ['AGENTS.md', '.fable/portable-agent-core.md'];
  const instructions = Array.isArray(oc.instructions) ? [...oc.instructions] : [];
  for (const w of want) if (!instructions.includes(w)) instructions.push(w);
  oc.instructions = instructions;
  writeFileSync(ocPath, JSON.stringify(oc, null, 2) + '\n');

  return { core: coreDest, opencodeJson: ocPath, instructions };
}
```

- [ ] **Step 2: Point `cli.js` at the new location**

In `src/cli.js`, change the charter import line:

```js
import { syncCharter, FABLE_BLOCK_OPENCODE } from './charter.js';
```

to:

```js
import { syncCharter, FABLE_BLOCK_OPENCODE, buildInlineCharterBlock, wireOpencodeGovernance } from './charter.js';
```

and DELETE the install.js import line entirely:

```js
import { install, wireOpencodeGovernance, buildInlineCharterBlock } from './install.js';
```

- [ ] **Step 3: Add unit tests locking the moved functions**

Append to `test/charter.test.js`:

```js
import { buildInlineCharterBlock, wireOpencodeGovernance } from '../src/charter.js';

describe('moved governance functions', () => {
  it('buildInlineCharterBlock inlines the full portable core between FABLE markers', () => {
    const block = buildInlineCharterBlock();
    assert.ok(block.startsWith('<!-- FABLE-START -->'));
    assert.ok(block.includes('## Fable Governance (portable core)'));
    assert.ok(/Identity Boundary/.test(block), 'should inline the actual core text');
    assert.ok(block.trimEnd().endsWith('<!-- FABLE-END -->'));
  });

  it('wireOpencodeGovernance copies the core and wires opencode.json instructions', () => {
    const dir = join(TMP, 'oc-wire'); mkdirSync(dir, { recursive: true });
    const r = wireOpencodeGovernance({ projectDir: dir });
    assert.ok(existsSync(join(dir, '.fable', 'portable-agent-core.md')), 'core copied');
    const oc = JSON.parse(readFileSync(join(dir, 'opencode.json'), 'utf-8'));
    assert.ok(oc.instructions.includes('AGENTS.md'));
    assert.ok(oc.instructions.includes('.fable/portable-agent-core.md'));
    assert.deepStrictEqual(r.instructions, oc.instructions);
  });
});
```

- [ ] **Step 4: Run the affected tests**

Run: `node --test --test-concurrency=1 test/charter.test.js test/governance.test.js`
Expected: PASS (the moved functions work from `charter.js`; `fable governance` still seeds the inline block).

- [ ] **Step 5: Commit**

```bash
git add src/charter.js src/cli.js test/charter.test.js
git commit -m "refactor(governance): move buildInlineCharterBlock + wireOpencodeGovernance into charter.js"
```

---

### Task 2: Slim `mcp.js` to the `fable_runtime` governance tool

`fable_build_prompt` and `fable_doctor` depend on the dispatch modules (`prompt.js`, `handoff.js`, `doctor.js`) being deleted. Drop them; keep the governance-metadata tool.

**Files:**
- Modify: `src/mcp.js`
- Test: `test/mcp.test.js`

- [ ] **Step 1: Update the MCP tests first (red)**

In `test/mcp.test.js`, replace the test named `tools/list returns fable_runtime, fable_build_prompt, fable_doctor` with:

```js
  it('tools/list returns only fable_runtime', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 2, method: 'tools/list' }]);
    const names = out.find(m => m.id === 2).result.tools.map(t => t.name);
    assert.deepStrictEqual(names, ['fable_runtime']);
  });
```

DELETE the two tests `tools/call fable_build_prompt rejects a handoff path escaping the project root` and `tools/call fable_build_prompt does not read an out-of-tree adapter ...` (they exercise a removed tool). Keep tests 1 and 3 (initialize, fable_runtime).

- [ ] **Step 2: Run, verify failure**

Run: `node --test --test-concurrency=1 test/mcp.test.js`
Expected: FAIL — current `mcp.js` still lists three tools.

- [ ] **Step 3: Slim `mcp.js`**

Replace the top imports of `src/mcp.js`:

```js
import { createInterface } from 'node:readline';
import { resolve, sep } from 'node:path';
import { VERSION } from './version.js';
import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';
import { readConfigFile } from './config.js';
import { assemble } from './prompt.js';
import { readHandoff, validate } from './handoff.js';
import { doctorChecks } from './doctor.js';
```

with:

```js
import { createInterface } from 'node:readline';
import { VERSION } from './version.js';
import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';
```

Replace the `TOOLS` array with:

```js
const TOOLS = [
  { name: 'fable_runtime', description: 'List fable runtimes, or describe one (status, injection mode, overlay vs replace).',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'runtime name; omit to list all' } } } }
];
```

DELETE the `toolBuildPrompt` and `toolDoctor` functions entirely, and replace `callTool` with:

```js
function callTool(name, args) {
  if (name === 'fable_runtime') return toolRuntime(args);
  throw new Error(`Unknown tool: ${name}`);
}
```

(`toolRuntime`, `handleMessage`, and `startMcpServer` are unchanged.)

- [ ] **Step 4: Run, verify pass**

Run: `node --test --test-concurrency=1 test/mcp.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/mcp.js test/mcp.test.js
git commit -m "refactor(governance): slim fable MCP server to fable_runtime only"
```

---

### Task 3: Remove Mode B commands from `cli.js` + replace `cli.test.js`

**Files:**
- Modify: `src/cli.js`
- Replace: `test/cli.test.js`

- [ ] **Step 1: Remove dispatch command handlers + imports**

In `src/cli.js`:

DELETE these import lines (their modules are dispatch-only and will be removed):

```js
import { readHandoff, validate } from './handoff.js';
import { assemble, smokePrompt } from './prompt.js';
import { buildCommand, runOpenCode } from './opencode.js';
import { doctorChecks } from './doctor.js';
```

Change the config import from:

```js
import { defaultConfig, readConfigFile, writeConfig, PKG_ROOT } from './config.js';
```

to:

```js
import { PKG_ROOT } from './config.js';
```

Remove the now-unused `node:fs`/`node:path` pieces: change

```js
import { resolve, isAbsolute } from 'node:path';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
```

to:

```js
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
```

DELETE these functions entirely: `resolveHandoffPath`, `cmdInit`, `cmdInstall`, `cmdDoctor`, `cmdBuildPrompt`, `requireOpencode`, `cmdSmoke`, `cmdRun`.

In `main()`, DELETE the `case 'init'`, `case 'install'`, `case 'doctor'`, `case 'build-prompt'`, `case 'smoke'`, `case 'run'` branches.

- [ ] **Step 2: Simplify `cmdCharter` (no more `.fable/config.json`)**

In `cmdCharter`, replace:

```js
    const rtName = opts.runtime || (() => { try { return readConfigFile(project).runtime; } catch { return 'opencode'; } })();
```

with:

```js
    const rtName = opts.runtime || 'opencode';
```

- [ ] **Step 3: Rewrite `showHelp()` for governance-only**

Replace the entire `showHelp()` body with a governance-only usage block:

```js
function showHelp() {
  console.log(`fable — portable prompt governance (governance-only)

Usage:
  fable governance --project <dir>
    Inline the full portable core into AGENTS.md + CLAUDE.md (host-agnostic).

  fable charter sync --project <dir> [--runtime <name>] [--all] [--force]
    Seed/refresh the AGENTS.md + CLAUDE.md fable block (plus a runtime's charter files).

  fable runtime [<name>] [--list]
    Show how fable overlays governance onto a runtime (injection mode, overlay vs replace).

  fable codex   setup --project <dir> [--apply] [--via path|github]
  fable copilot setup --project <dir> [--apply] [--via path|github]
  fable grok    setup --project <dir> [--apply] [--via path|github]
    Seed the charter and register the read-only fable MCP server (governance metadata).

  fable kimi    setup --project <dir>
    Seed the charter and write the fable Kimi skill (.fable/skills/fable/SKILL.md).

  fable opencode setup --project <dir>
    Seed a slim charter, copy the portable core into .fable/, and wire opencode.json instructions.

  fable mcp-server
    Start the fable MCP server (stdio) exposing the read-only fable_runtime tool.

  fable --version | --help

For background DISPATCH to vendor CLIs (the former Mode B), use hopper-plugin:
  https://github.com/surebeli/hopper-plugin  (governance reaches dispatched vendors
  via the AGENTS.md/CLAUDE.md charter this tool installs, or hopper's GOVERNANCE.md overlay).`);
}
```

- [ ] **Step 4: Replace `test/cli.test.js` with a governance-only CLI smoke**

Overwrite `test/cli.test.js` with:

```js
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
```

- [ ] **Step 5: Run the CLI + governance tests**

Run: `node --test --test-concurrency=1 test/cli.test.js test/governance.test.js test/charter.test.js`
Expected: PASS. (Removed commands hit the `default:` branch → `Unknown command` → exit 1.)

- [ ] **Step 6: Commit**

```bash
git add src/cli.js test/cli.test.js
git commit -m "refactor(governance): drop Mode B commands from CLI; governance-only help"
```

---

### Task 4: Slim `config.js` to `PKG_ROOT` + rewrite `config.test.js`

`defaultConfig`/`readConfigFile`/`writeConfig`/`resolveAdapterPath`/`resolveCorePath` are all dispatch-config helpers (they create/read `.fable/config.json` and resolve adapters for prompt assembly). After Mode B removal, only `PKG_ROOT` is consumed (by `cli.js`).

**Files:**
- Modify: `src/config.js`
- Replace: `test/config.test.js`

- [ ] **Step 1: Rewrite `config.test.js` (red)**

Overwrite `test/config.test.js` with:

```js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PKG_ROOT } from '../src/config.js';

describe('config', () => {
  it('PKG_ROOT points to the repo root', () => {
    assert.ok(existsSync(join(PKG_ROOT, 'package.json')));
  });
});
```

- [ ] **Step 2: Run, verify failure**

Run: `node --test --test-concurrency=1 test/config.test.js`
Expected: PASS already for the PKG_ROOT case (config.js still exports it). This step is the regression guard; the slim in Step 3 must keep it green.

- [ ] **Step 3: Slim `config.js`**

Overwrite `src/config.js` with:

```js
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PKG_ROOT = resolve(join(__dirname, '..'));
```

- [ ] **Step 4: Run, verify pass**

Run: `node --test --test-concurrency=1 test/config.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config.js test/config.test.js
git commit -m "refactor(governance): slim config.js to PKG_ROOT (drop dispatch config helpers)"
```

---

### Task 5: Trim dispatch-only `commandSupport` from the capability registry

**Files:**
- Modify: `adapters/runtime-capabilities.json`

- [ ] **Step 1: Trim opencode's commandSupport + notes**

In `adapters/runtime-capabilities.json`, for the `opencode` entry, change:

```json
    "commandSupport": ["build-prompt", "smoke", "run", "doctor", "opencode-setup"],
```

to:

```json
    "commandSupport": ["opencode-setup"],
```

and change its `notes` to drop the executor sentence:

```json
    "notes": "In-session governance via `fable opencode setup` (charter + portable core wired into opencode.json `instructions`, auto-loaded every session; verified vs opencode 1.17.7). Host opencode system prompt remains authoritative; fable overlays governance."
```

(Leave codex/kimi/grok/copilot/claude/agy entries unchanged — their `commandSupport` lists are governance commands.)

- [ ] **Step 2: Run the runtime tests (registry still valid)**

Run: `node --test --test-concurrency=1 test/runtime.test.js`
Expected: PASS. (runtime.test.js asserts opencode's status/injectionMode/hostSystemPolicy/adapter and the *presence* of `mcp-server`/`kimi-setup` in other vendors — it does NOT assert opencode's commandSupport contents, so trimming is safe. All `adapters/*.md` remain on disk, so the "exists on disk" + `adapterForRuntime` tests stay green.)

- [ ] **Step 3: Commit**

```bash
git add adapters/runtime-capabilities.json
git commit -m "chore(governance): drop dispatch-only commandSupport from opencode registry entry"
```

---

### Task 6: Delete the Mode B executor modules + their tests

**Files:**
- Delete: `src/opencode.js`, `src/prompt.js`, `src/handoff.js`, `src/doctor.js`, `src/install.js`
- Delete: `test/opencode.test.js`, `test/prompt.test.js`, `test/handoff.test.js`, `test/doctor.test.js`, `test/install.test.js`

- [ ] **Step 1: Confirm no surviving imports reference these modules**

Run: `grep -rn -e "opencode.js" -e "prompt.js" -e "handoff.js" -e "doctor.js" -e "install.js" src/ bin/`
Expected: NO matches in `src/` or `bin/` (Tasks 1–3 removed every import). If anything prints, fix that import before deleting.

- [ ] **Step 2: Delete the modules and their tests**

```bash
git rm src/opencode.js src/prompt.js src/handoff.js src/doctor.js src/install.js
git rm test/opencode.test.js test/prompt.test.js test/handoff.test.js test/doctor.test.js test/install.test.js
```

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: PASS — no dangling imports, no references to deleted modules.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(governance)!: remove Mode B executor modules (opencode/prompt/handoff/doctor/install)"
```

---

### Task 7: Delete Mode B artifacts (dispatch/, examples/, demo) + prune `package.json`

**Files:**
- Delete: `dispatch/prompt-assembly.md` (and the `dispatch/` dir), `examples/deepseek-handoff.md`, `examples/fable.config.json`, `scripts/demo-x-agents.ps1`, `docs/demo-x-agents.md` (if present)
- Modify: `package.json`

- [ ] **Step 1: Delete the artifacts**

```bash
git rm -r dispatch examples
git rm scripts/demo-x-agents.ps1
git rm -f docs/demo-x-agents.md
```

(`git rm -f docs/demo-x-agents.md` is harmless if the file is absent; verify with `ls docs` first if unsure.)

- [ ] **Step 2: Prune `package.json` `files[]` + keywords**

In `package.json`, change the `files` array from:

```json
  "files": [
    "bin/",
    "src/",
    "adapters/",
    "prompts/",
    "dispatch/",
    "README.md"
  ],
```

to:

```json
  "files": [
    "bin/",
    "src/",
    "adapters/",
    "prompts/",
    "README.md"
  ],
```

and bump the `version` to `0.3.0` (Mode B removal is a breaking change), and update `description` to `"Portable prompt governance for non-Claude agent runtimes (governance-only; dispatch lives in hopper-plugin)"`.

- [ ] **Step 3: Run the suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore(governance)!: drop dispatch/, examples/, demo; prune package files[] + bump 0.3.0"
```

---

### Task 8: Rewrite the docs to governance-only (README, AGENTS, CLAUDE, install-modes)

**Files:**
- Modify: `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/install-modes.md`

- [ ] **Step 1: Rewrite `README.md`**

Replace the install/quickstart/commands sections (the two-mode framing) with a single governance-only narrative. The new README top half:

```markdown
# fable-5-anything

Portable prompt **governance** for adapting useful Claude Fable 5 style behaviors
to non-Claude agent runtimes — without copying Claude-specific identity, tools,
paths, or product assumptions. fable installs a model-neutral behavioral
constitution into the charters and skills your hosts already load.

> **Dispatch moved to hopper-plugin.** fable used to also assemble and dispatch
> handoffs (the former "Mode 2"). That capability now lives in
> [hopper-plugin](https://github.com/surebeli/hopper-plugin), a vendor-neutral
> background dispatcher. Governance reaches hopper-dispatched vendors either via
> the `AGENTS.md`/`CLAUDE.md` charter fable installs, or via hopper's opt-in
> `GOVERNANCE.md` overlay (which references fable's portable core).

## Install (one command)

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
node bin/fable.js governance --project <your-project>
```

This inlines the full portable core into your project's `AGENTS.md` + `CLAUDE.md`,
so every host that auto-loads those charter files (opencode, Codex, Claude Code,
Grok, Copilot) follows the constitution. Kimi loads skills → `fable kimi setup`.

## Commands

| Command | Description |
|---|---|
| `fable governance --project <dir>` | Inline the full portable core into AGENTS.md + CLAUDE.md (host-agnostic). |
| `fable charter sync --project <dir>` | Seed/refresh the fable block in the charter files. |
| `fable runtime [<name>]` | Show how fable overlays governance onto a runtime. |
| `fable codex|copilot|grok setup` | Seed charter + register the read-only fable MCP server. |
| `fable kimi setup` | Seed charter + write the fable Kimi skill. |
| `fable opencode setup` | Slim charter + portable core wired into opencode.json instructions. |
| `fable mcp-server` | Start the fable MCP server (read-only `fable_runtime`). |
| `fable --version` | Print the version. |
```

Keep the existing "Strategy" and "Runtimes" sections, but delete any lines about
`fable run` / `build-prompt` / `smoke` / `doctor` / `install` / `.fable/handoffs`
/ shims. Remove the "M3 (current)" dispatch-status block at the bottom.

- [ ] **Step 2: Rewrite the "ASK FIRST" block in `AGENTS.md` and `CLAUDE.md`**

In BOTH `AGENTS.md` and `CLAUDE.md`, replace the entire "Installing fable into a
user's project — ASK FIRST" two-mode section with:

```markdown
## Installing fable into a user's project

fable is governance-only. To govern a project, inline the portable core into its
charter files:

`node bin/fable.js governance --project <proj>`

This embeds the full portable core into `AGENTS.md` + `CLAUDE.md` (host-agnostic).
Exceptions: Kimi loads *skills* → `fable kimi setup`; opencode users who want a
slim charter + `opencode.json` instructions → `fable opencode setup`; codex /
copilot / grok can also register the read-only fable MCP server → `fable <host>
setup`.

Background dispatch to vendor CLIs is NOT part of fable anymore — use
[hopper-plugin](https://github.com/surebeli/hopper-plugin) for that.
```

In `AGENTS.md`, also update the "## Architecture" list: remove the
`dispatch/prompt-assembly.md` line and the `tests/smoke-checklist.md` line if it
references dispatch smoke; keep core/exclusions/adapters.

- [ ] **Step 3: Replace `docs/install-modes.md`**

Overwrite `docs/install-modes.md` with a short single-mode page:

```markdown
# Installing fable

fable is governance-only. One command inlines the portable behavioral core into a
project's charter files:

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
node bin/fable.js governance --project <your-project>
```

Every host that auto-loads `AGENTS.md` / `CLAUDE.md` (opencode, Codex, Claude
Code, Grok, Copilot) is then governed. Kimi loads skills → `fable kimi setup`.
opencode users who prefer a slim charter + `opencode.json` instructions →
`fable opencode setup`.

Commit the governance files (`AGENTS.md` / `CLAUDE.md`, and for opencode-setup the
`.fable/portable-agent-core.md` + `opencode.json`). There is nothing
machine-specific to gitignore — fable no longer produces shims or a lockfile.

## Dispatch?

The former "Mode 2" dispatch/executor (assemble + `opencode run` + handoffs) has
moved to [hopper-plugin](https://github.com/surebeli/hopper-plugin). Governance
reaches hopper-dispatched vendors via the charter fable installs, or via hopper's
opt-in `GOVERNANCE.md` overlay.
```

- [ ] **Step 4: Sweep for stragglers**

Run: `grep -rn -e "Mode 2" -e "build-prompt" -e "fable run" -e "fable install" -e "fable doctor" -e "fable smoke" -e ".fable/handoffs" README.md AGENTS.md CLAUDE.md docs/`
Expected: no remaining references that describe Mode B as a current capability. Fix any that remain (a historical mention in a changelog is fine; a how-to is not).

- [ ] **Step 5: Commit**

```bash
git add README.md AGENTS.md CLAUDE.md docs/install-modes.md
git commit -m "docs(governance)!: rewrite README/AGENTS/CLAUDE/install-modes to governance-only"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full suite + command smokes**

Run: `npm test`
Expected: PASS (all governance tests; no references to removed modules).

Run these manual smokes (each exits 0):

```bash
node bin/fable.js --help
node bin/fable.js governance --project .tmp-smoke
node bin/fable.js runtime --list
node bin/fable.js kimi setup --project .tmp-smoke
node bin/fable.js codex setup --project .tmp-smoke
rm -rf .tmp-smoke
```

Expected: governance inlines the core; `kimi setup` writes `.tmp-smoke/.fable/skills/fable/SKILL.md`; `codex setup` prints `codex mcp add fable`.

- [ ] **Step 2: Confirm Mode B is gone**

Run: `ls src/` — expect: `charter.js cli.js config.js mcp.js runtime.js skill.js version.js` (no opencode/prompt/handoff/doctor/install).
Run: `node bin/fable.js run x 2>&1 | head -1` — expect: `Unknown command: run`.

- [ ] **Step 3: Final commit (if any straggler fixes)**

```bash
git add -A
git commit -m "test(governance): final governance-only verification"
```

---

## Self-Review

- **Spec coverage (§4 staysInFable / movesToHopper / fableResidual):** governance fns extracted (Task 1) · mcp slimmed to fable_runtime (Task 2) · CLI gutted of init/install/build-prompt/smoke/run/doctor + help rewrite (Task 3) · config.js slimmed (Task 4) · registry commandSupport trimmed (Task 5) · executor modules + tests deleted (Task 6) · dispatch/examples/demo + package.json (Task 7) · README **and** AGENTS/CLAUDE/install-modes rewritten (Task 8). All covered.
- **Refinement vs spec:** spec §4 listed deleting `adapters/{opencode,codex,grok,copilot,generic}.md`. This plan KEEPS them — they are governance/overlay reference prose, are referenced by `runtime-capabilities.json` `adapter` fields, and are asserted to exist by `test/runtime.test.js`; `kimi.md` is embedded into the Kimi skill. Deleting them would require a `runtime.test.js` rewrite + nulling registry fields for no governance benefit. Pruning dispatch-only prose from `opencode.md` is left as an optional follow-up. (Spec §4 updated to match.)
- **Placeholder scan:** none — every step is an exact edit, file list, or command with expected output.
- **Ordering:** Task 1 (extract) precedes Task 6 (delete install.js); Task 3 (drop cli imports) + Task 2 (drop mcp imports) precede Task 6's grep-clean gate.
- **Type/symbol consistency:** `buildInlineCharterBlock` / `wireOpencodeGovernance` referenced identically in charter.js (def), cli.js (import), charter.test.js (test). `PKG_ROOT` exported by both config.js (for cli.js) and self-computed in charter.js — intentional (mirrors skill.js/runtime.js), no cycle.
