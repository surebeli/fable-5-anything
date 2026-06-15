# FABLE M5 Packaging & Install Ergonomics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce clone friction — make fable installable without remembering a clone path, single-source the version, generate portable shims, record a per-project lockfile, and ship cross-platform bootstrap scripts — without any irreversible publish and without breaking M1–M4.

**Architecture:** Single source the version from `package.json` via a new `src/version.js`. `install` gains a `--link <path|global|npx>` mode that controls how the generated `.fable/bin` shims invoke fable, and writes a `.fable/fable.lock.json` recording version + link mode. `package.json` gains distribution metadata so `npx`/publish works. Bootstrap scripts wrap the GitHub-based npx install for first-time users. `doctor.js` is intentionally NOT modified, preserving M4's opencode-exactly-9-checks invariant.

**Tech Stack:** Node.js (ESM, zero deps), `node:test`, Windows-first + POSIX.

## Scope decisions (defaults; stated, not asked — all reversible/local)

- **No actual `npm publish`.** M5 makes the package publish-*ready* and immediately usable via `npx github:surebeli/fable-5-anything`. Running `npm publish` is a release act requiring the owner's npm credentials → deferred to a release step the owner runs (M8).
- **Build for both** registry (`npx fable-5-anything`) and GitHub (`npx github:...`) install — no A/B choice needed.
- **Lockfile included** (`.fable/fable.lock.json`) — handoff lists it, low cost, high traceability value.
- **`doctor` unchanged** — a lockfile doctor check would change the opencode-9-count invariant from M4; deferred (logged here intentionally, not silently dropped).

## File Structure

**Create:**
- `src/version.js` — reads `package.json` once, exports `VERSION` (no local imports → no cycle).
- `test/version.test.js` — VERSION + `fable --version` coverage.
- `scripts/install.ps1`, `scripts/install.sh` — first-run bootstrap wrappers.
- `docs/handoffs/FABLE-M5-PACKAGING-result.md` — milestone result (in-repo return channel).

**Modify:**
- `package.json` — version → `0.2.0`; add `files`, `engines`, `repository`, `bugs`, `homepage`, `keywords`.
- `src/config.js` — `defaultConfig` uses `VERSION` instead of the literal `'0.1.0'`.
- `src/cli.js` — `fable --version`/`version`; pass `--link` through to install; help text.
- `src/install.js` — `install({..., link})` → portable shim modes + `.fable/fable.lock.json`.
- `test/config.test.js`, `test/install.test.js` — version assertions become version-agnostic; add lockfile + link coverage; (per-process temp dirs already in place from M4).
- `README.md`, `docs/embed-in-your-project.md` — npx/global quickstart, `--link` modes, lockfile.

**Do NOT touch:** `src/doctor.js` (preserve opencode-9 invariant), `src/opencode.js`, `src/runtime.js`, `src/prompt.js`, `src/handoff.js`, `bin/fable.js`, `prompts/**`, `adapters/**`, anything under `x-agents`, `docs/pr/**`.

---

## Task 1: Single-source the version (`src/version.js`) + use it in config

**Files:**
- Create: `src/version.js`
- Create: `test/version.test.js`
- Modify: `src/config.js` (import + `defaultConfig`)
- Modify: `test/config.test.js` (version-agnostic assertion)
- Modify: `test/install.test.js` (version-agnostic assertion)

- [ ] **Step 1: Write the failing test**

Create `test/version.test.js`:
```js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/version.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');

describe('version', () => {
  it('VERSION is a non-empty semver-ish string', () => {
    assert.strictEqual(typeof VERSION, 'string');
    assert.ok(/^\d+\.\d+\.\d+/.test(VERSION), `unexpected VERSION: ${VERSION}`);
  });

  it('VERSION matches package.json version (single source of truth)', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
    assert.strictEqual(VERSION, pkg.version);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/version.test.js`
Expected: FAIL — cannot resolve `../src/version.js`.

- [ ] **Step 3: Create `src/version.js`**
```js
import { readFileSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Single source of truth for the fable version: read it from package.json.
// Imports nothing from other src modules, so importers (config.js, cli.js)
// never create an import cycle.
const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_JSON = join(resolve(__dirname, '..'), 'package.json');

export const VERSION = JSON.parse(readFileSync(PKG_JSON, 'utf-8')).version;
```

- [ ] **Step 4: Use VERSION in `src/config.js`**

Add after line 4 (`import { getRuntime } from './runtime.js';`):
```js
import { VERSION } from './version.js';
```
Replace the line `    fableVersion: '0.1.0'` with:
```js
    fableVersion: VERSION
```

- [ ] **Step 5: Make existing version assertions version-agnostic**

In `test/config.test.js`, add to the imports at the top:
```js
import { VERSION } from '../src/version.js';
```
Replace the line `    assert.strictEqual(cfg.fableVersion, '0.1.0');` with:
```js
    assert.strictEqual(cfg.fableVersion, VERSION);
```

In `test/install.test.js`, add to the imports at the top:
```js
import { VERSION } from '../src/version.js';
```
Replace the line `    assert.strictEqual(config.fableVersion, '0.1.0');` with:
```js
    assert.strictEqual(config.fableVersion, VERSION);
```

- [ ] **Step 6: Run to verify pass**

Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0` (VERSION still `0.1.0` at this point, so all assertions hold).

- [ ] **Step 7: Commit**
```bash
git add src/version.js test/version.test.js src/config.js test/config.test.js test/install.test.js
git commit -m "feat: 版本单一来源 src/version.js，config 读取 package.json 版本

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: package.json distribution metadata + version bump

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

Append to `test/version.test.js` inside `describe('version', ...)`:
```js
  it('package.json has distribution metadata for npx/publish', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
    assert.strictEqual(pkg.version, '0.2.0');
    assert.ok(Array.isArray(pkg.files) && pkg.files.includes('src/'), 'files must whitelist src/');
    assert.ok(pkg.files.includes('adapters/') && pkg.files.includes('prompts/'), 'files must include adapters/ and prompts/');
    assert.ok(pkg.engines && pkg.engines.node, 'engines.node required');
    assert.ok(pkg.repository && /github\.com\/surebeli\/fable-5-anything/.test(pkg.repository.url || ''), 'repository.url required');
    assert.ok(Array.isArray(pkg.keywords) && pkg.keywords.length > 0, 'keywords required');
    assert.strictEqual(pkg.bin.fable, './bin/fable.js', 'bin entry preserved');
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/version.test.js`
Expected: FAIL — version is `0.1.0`, no `files`/`engines`/etc.

- [ ] **Step 3: Rewrite `package.json`**
```json
{
  "name": "fable-5-anything",
  "version": "0.2.0",
  "description": "Portable prompt governance CLI for non-Claude agent runtimes",
  "type": "module",
  "bin": {
    "fable": "./bin/fable.js"
  },
  "files": [
    "bin/",
    "src/",
    "adapters/",
    "prompts/",
    "dispatch/",
    "README.md"
  ],
  "engines": {
    "node": ">=18"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/surebeli/fable-5-anything.git"
  },
  "bugs": {
    "url": "https://github.com/surebeli/fable-5-anything/issues"
  },
  "homepage": "https://github.com/surebeli/fable-5-anything#readme",
  "keywords": [
    "prompt",
    "governance",
    "agent",
    "opencode",
    "codex",
    "kimi",
    "copilot",
    "cli",
    "overlay"
  ],
  "scripts": {
    "test": "node --test --test-concurrency=1 test/*.test.js"
  },
  "license": "MIT"
}
```

- [ ] **Step 4: Run full suite (version is now 0.2.0; version-agnostic tests track it)**

Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0`. Confirm `node -e "import('./src/version.js').then(m=>console.log(m.VERSION))"` prints `0.2.0`.

- [ ] **Step 5: Commit**
```bash
git add package.json
git commit -m "feat: package.json 增加发布元数据并升版 0.2.0

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `fable --version` / `fable version` command

**Files:**
- Modify: `src/cli.js` (import VERSION, handle version, help text)
- Modify: `test/version.test.js` (spawn coverage)

- [ ] **Step 1: Write the failing test**

Append to `test/version.test.js`:
```js
import { spawnSync } from 'node:child_process';
const BIN = resolve(ROOT, 'bin', 'fable.js');
function fable(args) {
  return spawnSync('node', [BIN, ...args], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
}

describe('fable --version command', () => {
  it('--version prints the version and exits 0', () => {
    const r = fable(['--version']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes(VERSION), `stdout should include ${VERSION}, got: ${r.stdout}`);
  });

  it('version subcommand prints the version and exits 0', () => {
    const r = fable(['version']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes(VERSION));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/version.test.js`
Expected: FAIL — `--version` hits the default branch (`Unknown command`, exit 1).

- [ ] **Step 3: Import VERSION in `src/cli.js`**

After the line `import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';` add:
```js
import { VERSION } from './version.js';
```

- [ ] **Step 4: Handle version in `main`**

In `export function main(argv) {`, immediately after the help block
```js
  if (opts.help || command === 'help' || command === '--help') {
    showHelp();
    return;
  }
```
insert:
```js
  if (opts.version || command === 'version' || command === '--version') {
    console.log(VERSION);
    return;
  }
```

- [ ] **Step 5: Add to help text**

In `showHelp()`, after the `fable runtime ...` block and before `fable --help`, add:
```js
  fable --version
    Print the fable version.

```

- [ ] **Step 6: Run version tests + full suite**

Run: `node --test test/version.test.js`
Expected: PASS.
Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0`.

- [ ] **Step 7: Commit**
```bash
git add src/cli.js test/version.test.js
git commit -m "feat: 新增 fable --version 命令

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Portable shim `--link` modes + `.fable/fable.lock.json`

**Files:**
- Modify: `src/install.js` (link modes, lockfile, VERSION)
- Modify: `src/cli.js` (`cmdInstall` passes/validates `--link`)
- Modify: `test/install.test.js` (lockfile + link coverage)

Default `link` is `path` → byte-identical shims to today (existing install tests stay green). `global` → shims call `fable`; `npx` → shims call `npx -y fable-5-anything`.

- [ ] **Step 1: Write the failing tests**

Append to `test/install.test.js` inside `describe('install', ...)`:
```js
  it('writes .fable/fable.lock.json with version and default link=path', () => {
    const dir = join(TMP, 'lock-default');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const lock = JSON.parse(readFileSync(join(dir, '.fable', 'fable.lock.json'), 'utf-8'));
    assert.strictEqual(lock.fableVersion, VERSION);
    assert.strictEqual(lock.link, 'path');
    assert.ok(lock.entry.includes('bin'), 'path-mode entry references the bin entry');
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/install.test.js`
Expected: FAIL — no lockfile; `link` ignored.

- [ ] **Step 3: Update `src/install.js`**

Add to the top imports (after `import { defaultConfig, PKG_ROOT } from './config.js';`):
```js
import { VERSION } from './version.js';
```

Replace the `createShims` function with:
```js
function shimInvocation(link, fableRepo) {
  if (link === 'global') return 'fable';
  if (link === 'npx') return 'npx -y fable-5-anything';
  return `node "${join(fableRepo, 'bin', 'fable.js')}"`; // default: 'path'
}

function createShims(shimDir, project, fableRepo, link) {
  const inv = shimInvocation(link, fableRepo);

  const cmdContent = `@echo off\r\n${inv} %* --project "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable.cmd'), cmdContent);

  const ps1Content = `${inv} @args "--project" "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable.ps1'), ps1Content);

  const shContent = `#!/usr/bin/env sh\r\n${inv} "$@" --project "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable'), shContent);
}

function lockEntry(link, fableRepo) {
  if (link === 'global') return 'fable';
  if (link === 'npx') return 'npx -y fable-5-anything';
  return join(fableRepo, 'bin', 'fable.js');
}
```

Change the `install` signature and body. Replace:
```js
export function install({ projectDir, runtime, model }) {
```
with:
```js
export function install({ projectDir, runtime, model, link = 'path' }) {
```

Replace the `createShims(shimDir, project, PKG_ROOT);` call with:
```js
  createShims(shimDir, project, PKG_ROOT, link);
```

After the `createShims(...)` call and its `summary.push(...)` line, add:
```js
  const lock = {
    fableVersion: VERSION,
    link,
    entry: lockEntry(link, PKG_ROOT),
    installedFrom: PKG_ROOT
  };
  writeFileSync(join(fableDir, 'fable.lock.json'), JSON.stringify(lock, null, 2) + '\n');
  summary.push(`  (created) .fable/fable.lock.json`);
```

- [ ] **Step 4: Pass `--link` through in `src/cli.js` `cmdInstall`**

Replace the body of `cmdInstall` (the part after the `--project` guard) so it validates and forwards `link`. Replace:
```js
  const runtime = opts.runtime || 'opencode';
  const model = opts.model || 'tokenbox/deepseek-v4-pro';

  const result = install({ projectDir: opts.project, runtime, model });
```
with:
```js
  const runtime = opts.runtime || 'opencode';
  const model = opts.model || 'tokenbox/deepseek-v4-pro';
  const link = opts.link || 'path';
  if (!['path', 'global', 'npx'].includes(link)) {
    console.error(`Error: --link must be one of path|global|npx (got "${link}")`);
    process.exit(1);
  }

  const result = install({ projectDir: opts.project, runtime, model, link });
```

- [ ] **Step 5: Run install tests + full suite**

Run: `node --test test/install.test.js`
Expected: PASS (existing path-mode tests unchanged; new lockfile/link tests green).
Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0`.

- [ ] **Step 6: Commit**
```bash
git add src/install.js src/cli.js test/install.test.js
git commit -m "feat: install 支持 --link path|global|npx 可移植 shim 与 fable.lock.json

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Cross-platform bootstrap scripts

**Files:**
- Create: `scripts/install.ps1`
- Create: `scripts/install.sh`
- Test: `test/version.test.js` (existence + shape; offline)

These wrap the GitHub-based npx install so a first-time user needs neither a clone nor a remembered path. Tests assert shape only (no network execution).

- [ ] **Step 1: Write the failing test**

Append to `test/version.test.js`:
```js
import { existsSync } from 'node:fs';

describe('bootstrap scripts', () => {
  it('scripts/install.ps1 exists and runs npx github install with --link', () => {
    const p = resolve(ROOT, 'scripts', 'install.ps1');
    assert.ok(existsSync(p));
    const t = readFileSync(p, 'utf-8');
    assert.ok(t.includes('npx'), 'should use npx');
    assert.ok(t.includes('github:surebeli/fable-5-anything'), 'should reference the github package');
    assert.ok(t.includes('install'), 'should call fable install');
    assert.ok(t.includes('--link'), 'should set a link mode');
  });

  it('scripts/install.sh exists and runs npx github install with --link', () => {
    const p = resolve(ROOT, 'scripts', 'install.sh');
    assert.ok(existsSync(p));
    const t = readFileSync(p, 'utf-8');
    assert.ok(t.includes('#!/usr/bin/env sh') || t.includes('#!/bin/sh'));
    assert.ok(t.includes('npx'));
    assert.ok(t.includes('github:surebeli/fable-5-anything'));
    assert.ok(t.includes('--link'));
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/version.test.js`
Expected: FAIL — scripts do not exist.

- [ ] **Step 3: Create `scripts/install.ps1`**
```powershell
#requires -Version 5
# Bootstrap fable into a project without cloning the repo.
# Usage: scripts\install.ps1 -Project . [-Runtime opencode] [-Model tokenbox/deepseek-v4-pro] [-Link npx]
param(
  [string]$Project = ".",
  [string]$Runtime = "opencode",
  [string]$Model = "tokenbox/deepseek-v4-pro",
  [ValidateSet("path","global","npx")][string]$Link = "npx"
)
npx -y github:surebeli/fable-5-anything install --project "$Project" --runtime "$Runtime" --model "$Model" --link "$Link" --yes
```

- [ ] **Step 4: Create `scripts/install.sh`**
```sh
#!/usr/bin/env sh
# Bootstrap fable into a project without cloning the repo.
# Usage: scripts/install.sh [project] [runtime] [model] [link]
set -e
PROJECT="${1:-.}"
RUNTIME="${2:-opencode}"
MODEL="${3:-tokenbox/deepseek-v4-pro}"
LINK="${4:-npx}"
npx -y github:surebeli/fable-5-anything install --project "$PROJECT" --runtime "$RUNTIME" --model "$MODEL" --link "$LINK" --yes
```

- [ ] **Step 5: Run tests**

Run: `node --test test/version.test.js`
Expected: PASS.
Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0`.

- [ ] **Step 6: Commit**
```bash
git add scripts/install.ps1 scripts/install.sh test/version.test.js
git commit -m "feat: 新增跨平台 bootstrap 安装脚本（npx github 免克隆）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Update README and embed docs

**Files:**
- Modify: `README.md`
- Modify: `docs/embed-in-your-project.md`

Use `bin/fable.js` for repo-local examples; npx/global for zero-clone.

- [ ] **Step 1: Add a zero-clone quickstart to the README**

In `README.md`, immediately after the `## Quickstart: Embed in your project (5 minutes)` heading line, insert:
```markdown

Zero-clone install (no repo path to remember):

```bash
# one-off, via npx (GitHub source until published to npm)
npx -y github:surebeli/fable-5-anything install --project . --link npx --yes

# or bootstrap scripts
scripts/install.ps1 -Project .      # Windows
sh scripts/install.sh .             # POSIX
```

The `--link` mode controls how the generated `.fable/bin` shims call fable:
`path` (default, points at this clone), `global` (calls a globally installed
`fable`), or `npx` (re-resolves `fable-5-anything` each call — best for the
zero-clone flow). Each install records `fableVersion` and the link mode in
`.fable/fable.lock.json`.
```

- [ ] **Step 2: Add the runtime/version note to the README command table**

In `README.md`, after the `fable runtime [<name>]` row, add:
```markdown
| `fable --version` | Print the fable version (single-sourced from package.json). |
```

- [ ] **Step 3: Document link modes + lockfile in the embed doc**

In `docs/embed-in-your-project.md`, after the `## 2. Install fable into your project` section's table, insert:
```markdown
### Install link modes

`fable install` accepts `--link <path|global|npx>`:

- `path` (default) — shims call this clone's `bin/fable.js` by absolute path.
- `global` — shims call a globally installed `fable` (`npm i -g fable-5-anything`).
- `npx` — shims call `npx -y fable-5-anything` (no clone to keep around).

Each install writes `.fable/fable.lock.json` recording the `fableVersion` and the
chosen link mode, so a project's fable wiring is traceable and reproducible.
```

- [ ] **Step 4: Verify the linked commands**

Run: `node bin/fable.js --version`
Expected: prints `0.2.0`, exit 0.

- [ ] **Step 5: Commit**
```bash
git add README.md docs/embed-in-your-project.md
git commit -m "docs: README/embed 增加零克隆安装、--link 模式与 lockfile 说明

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Full verification + result file

**Files:**
- Create: `docs/handoffs/FABLE-M5-PACKAGING-result.md`

- [ ] **Step 1: Full suite (single process)**

Run: `node --test --test-concurrency=1 test/*.test.js`
Expected: `# fail 0` (70 from M4 + ~9 new = ~79).

- [ ] **Step 2: Parallel-process recheck**

Run (PowerShell):
```powershell
Start-Job { node --test test/*.test.js } ; node --test test/*.test.js ; Get-Job | Wait-Job | Receive-Job
```
Expected: both `# fail 0`.

- [ ] **Step 3: M1–M4 regression spot-checks**
```powershell
node bin/fable.js --version
node bin/fable.js runtime --list
node bin/fable.js install --project .tmp-verify-m5 --runtime opencode --model tokenbox/deepseek-v4-pro --yes
node bin/fable.js doctor --project .tmp-verify-m5
type .tmp-verify-m5\.fable\fable.lock.json
node bin/fable.js install --project .tmp-verify-npx --runtime opencode --model tokenbox/deepseek-v4-pro --link npx --yes
type .tmp-verify-npx\.fable\bin\fable.cmd
Remove-Item -Recurse -Force .tmp-verify-m5, .tmp-verify-npx
```
Expected: `--version` → 0.2.0; doctor on the default (`path`) install still shows the 9 opencode checks, exit 0; lockfile shows `"link": "path"` then `"link": "npx"`; the npx shim contains `npx -y fable-5-anything`.

- [ ] **Step 4: Guard checks**

Confirm `git diff f79c144 HEAD -- src/doctor.js src/opencode.js` is empty (doctor & opencode untouched), and `docs/pr/**` is not in the diff.

- [ ] **Step 5: Create `docs/handoffs/FABLE-M5-PACKAGING-result.md`**
```markdown
# FABLE-M5-PACKAGING RESULT

Verdict: PASS

## Files Changed
- (created) src/version.js, test/version.test.js, scripts/install.ps1, scripts/install.sh
- (created) docs/handoffs/FABLE-M5-PACKAGING-result.md, docs/roadmap/M6-codex-integration.md, docs/roadmap/M7-kimi-copilot-opencode-adapters.md
- (modified) package.json, src/config.js, src/cli.js, src/install.js
- (modified) test/config.test.js, test/install.test.js, README.md, docs/embed-in-your-project.md

## Commands Run
- node --test --test-concurrency=1 test/*.test.js  -> <fill>
- node bin/fable.js --version  -> <fill>
- install (path) + doctor (9 checks, exit 0) + lockfile  -> <fill>
- install --link npx -> npx shim content  -> <fill>

## Acceptance Evidence
- Zero-clone install path exists (npx github + bootstrap scripts) -> scripts/install.ps1, scripts/install.sh
- Version single-sourced from package.json (0.2.0) -> src/version.js
- Portable shim modes path|global|npx -> src/install.js
- Per-project lockfile .fable/fable.lock.json -> install writes it
- No global destructive changes; no npm publish performed -> confirmed
- M1–M4 preserved: doctor & opencode untouched (git diff empty) -> confirmed

## Notes
- `npm publish` intentionally NOT run (needs owner credentials; release step deferred to M8).
- doctor lockfile check intentionally deferred to avoid changing the M4 opencode-9-check invariant.
- Next: M6 (Codex in-session integration + charter-set incl. CLAUDE.md).
```

- [ ] **Step 6: Replace `<fill>` markers with real Step 1–3 output, then commit**
```bash
git add docs/handoffs/FABLE-M5-PACKAGING-result.md
git commit -m "docs: 记录 M5 打包结果

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:** version single-source (T1) + bump/metadata (T2) → publishable; `fable --version` (T3); `--link` portable shims + lockfile (T4) → install ergonomics; bootstrap scripts (T5) → zero-clone; docs (T6); verification + result (T7). The handoff's M5 "options" (npx package, GitHub install script, versioned templates, lockfile) are all covered except actual publish (explicitly deferred, logged in result Notes).

**2. Placeholder scan:** only the result file's `<fill>` markers (T7), flagged and filled before its commit. All code steps contain complete code.

**3. Type/name consistency:** `VERSION` exported by `src/version.js` (T1), consumed by `config.js` (T1), `cli.js` (T3), `install.js` (T4) and tests — same name everywhere. `link` values `path|global|npx` are identical across `shimInvocation`/`lockEntry`/`install` (T4), `cmdInstall` validation (T4), bootstrap scripts (T5), and docs (T6). Lockfile keys (`fableVersion`, `link`, `entry`, `installedFrom`) match between `install.js` and the install tests.

**4. Invariant guard:** `src/doctor.js` and `src/opencode.js` are never modified (verified in T7 Step 4), so M4's opencode-exactly-9-checks invariant and the opencode flags are preserved. Default `link='path'` keeps shim content byte-identical to M4, so the existing install/shim regression tests stay green.

**5. Import-cycle check:** `version.js` imports only `node:*` → no cycle; `config.js`/`cli.js`/`install.js` import it one-directionally.
