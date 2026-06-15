# FABLE M9 Hardening — Codex review fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the real bugs + integrity items found by the strict Codex (gpt-5.5/xhigh) review of M4–M8: runtime-aware `run`/`smoke`, POSIX shim correctness, MCP safety/honesty, durable MCP registration for zero-clone deploys, charter header bug + refresh, and doc/adapter status drift.

**Architecture:** Targeted fixes; no architectural change. The runtime overlay model, host-agnostic MCP server, charter-set, and source-deploy stay as-is — they are hardened, not redesigned.

**Tech Stack:** Node.js (ESM, zero deps), `node:test`, Windows + POSIX. Base = `e4b3c29` (post source-deploy main).

## Findings addressed (from Codex review)

| Fix | Codex finding |
|---|---|
| T1 | major — `run`/`smoke --execute` always dispatch to opencode regardless of `config.runtime` |
| T2 | major — POSIX shim written CRLF + no `chmod +x` (breaks on real POSIX) |
| T3 | blocker/major — `fable_doctor` spawns `opencode --version`; `fable_build_prompt` reads arbitrary paths ("read-only" not safe) |
| T4 | blocker — MCP registration hard-codes `PKG_ROOT` → ephemeral npx cache path under `npx github:` |
| T5 | major/minor — `charter sync` never refreshes a stale block; `.github/copilot-instructions.md` gets `# AGENTS.md` header |
| T6 | minor — `docs/embed-in-your-project.md` + `adapters/copilot.md`/`kimi.md` still say Kimi/Copilot "planned / no executor" |

Deferred (logged, not in M9 — they are for the eventual npm publish): `package.json files` excluding docs/scripts; lockfile git-SHA pinning; CI host-behavior tests. These will be the M-publish checklist.

## Cross-task invariants (inject into every implementer/reviewer)

- Branch `feat/m9-review-fixes`; commit there only. Zero new deps; ESM; `node:test`; Windows shell verify: `node --test --test-concurrency=1 test/*.test.js`.
- The CLI `fable doctor` (no MCP) MUST still return exactly 9 checks for a fresh opencode project (doctorChecks default `spawn=true`). Only MCP passes `spawn:false`.
- `--link path` shim content stays byte-identical (don't regress M5 tests). Only the POSIX `fable` shim's line endings + mode change (T2).
- Do NOT touch src/opencode.js. PHASE 1 is OFFLINE (no live host execution; setup commands dry by default).
- The plan file has exact code; implement verbatim.

---

## Task 1: Runtime-aware `run` / `smoke` (reject non-opencode)

**Files:** `src/cli.js` (cmdSmoke, cmdRun), `test/cli.test.js`

Only opencode has an executor. `run` and `smoke` must refuse non-opencode runtimes with guidance instead of silently invoking opencode.

- [ ] **Step 1: Failing test** — append to `test/cli.test.js` (it already has TMP/`fable()` spawn helper):
```js
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
```

- [ ] **Step 2: Run → FAIL** (`node --test test/cli.test.js`): non-opencode currently exits 0.

- [ ] **Step 3:** In `src/cli.js`, add a guard helper above `cmdSmoke`:
```js
function requireOpencode(config, what) {
  if (config.runtime !== 'opencode') {
    console.error(`Error: '${what}' only supports the opencode runtime (this project is '${config.runtime}'). ` +
      `Use 'fable build-prompt' to assemble the governance prompt, or 'fable ${config.runtime} setup' for that host's overlay integration.`);
    process.exit(1);
  }
}
```
In `cmdSmoke`, right after `const config = readConfigFile(configBase);` add `requireOpencode(config, 'smoke');`.
In `cmdRun`, right after its `const config = readConfigFile(configBase);` add `requireOpencode(config, 'run');`.

- [ ] **Step 4: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`). Existing opencode run/smoke tests still pass (default runtime opencode).

- [ ] **Step 5: Commit**
```bash
git add src/cli.js test/cli.test.js
git commit -m "fix: run/smoke 仅支持 opencode runtime，非 opencode 给可操作报错

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: POSIX shim — LF line endings + executable bit

**Files:** `src/install.js`, `test/install.test.js`

- [ ] **Step 1: Failing test** — append inside `describe('install', ...)` in `test/install.test.js`:
```js
  it('POSIX fable shim uses LF (no CRLF) so it runs on real POSIX', () => {
    const dir = join(TMP, 'posix-shim');
    mkdirSync(dir, { recursive: true });
    install({ projectDir: dir, runtime: 'opencode', model: 'tokenbox/deepseek-v4-pro' });
    const sh = readFileSync(join(dir, '.fable', 'bin', 'fable'), 'utf-8');
    assert.ok(sh.startsWith('#!/usr/bin/env sh\n'), 'shebang line must end with LF');
    assert.ok(!sh.includes('\r'), 'POSIX shim must not contain CR');
  });
```

- [ ] **Step 2: Run → FAIL** (POSIX shim currently has `\r\n`).

- [ ] **Step 3:** In `src/install.js`: add `chmodSync` to the `node:fs` import. In `createShims`, change the POSIX shim to LF + set mode:
Replace:
```js
  const shContent = `#!/usr/bin/env sh\r\n${posixInv} "$@" --project "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable'), shContent);
```
with:
```js
  const shContent = `#!/usr/bin/env sh\n${posixInv} "$@" --project "${project}"\n`;
  const posixShim = join(shimDir, 'fable');
  writeFileSync(posixShim, shContent);
  try { chmodSync(posixShim, 0o755); } catch { /* chmod is a no-op on Windows */ }
```
(Leave `fable.cmd` / `fable.ps1` as CRLF — they are Windows shims.)

- [ ] **Step 4: Run → PASS**. Note: the existing install test that asserts POSIX shim content (`#!/usr/bin/env sh`, `node`) still passes (content unchanged except line endings).

- [ ] **Step 5: Commit**
```bash
git add src/install.js test/install.test.js
git commit -m "fix: POSIX fable shim 用 LF 并设置可执行位（修复真实 POSIX 运行）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: MCP safety/honesty — non-spawning doctor + project-scoped build-prompt

**Files:** `src/doctor.js` (optional `spawn`), `src/mcp.js`, `test/mcp.test.js`

- [ ] **Step 1: Failing tests** — append to `test/mcp.test.js` (reuse its `rpc` helper):
```js
  it('tools/call fable_build_prompt rejects a handoff path escaping the project root', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'fable_build_prompt', arguments: { project: ROOT, handoff: '../../../../Windows/System32/drivers/etc/hosts' } } }]);
    const res = out.find(m => m.id === 7).result;
    assert.ok(/escapes the project root/i.test(res.content[0].text), `expected scope rejection, got: ${res.content[0].text}`);
  });
```
(ROOT is already defined in mcp.test.js as the repo root.)

- [ ] **Step 2: Run → FAIL** (currently it would read the outside path).

- [ ] **Step 3:** In `src/doctor.js`, make the opencode PATH probe optional. Change the signature:
```js
export function doctorChecks({ projectDir, config, spawn = true }) {
```
and in the opencode branch replace `checks.push(checkOpenCodeInPath());` with:
```js
    if (spawn) {
      checks.push(checkOpenCodeInPath());
    } else {
      checks.push({ check: 'opencode path', status: 'warn', detail: 'skipped (no-spawn mode)' });
    }
```
(CLI `cmdDoctor` calls `doctorChecks({ projectDir, config })` → `spawn` defaults true → still 9 real checks. Invariant preserved.)

- [ ] **Step 4:** In `src/mcp.js`: add `sep` to the `node:path` import. Scope `toolBuildPrompt` and make `toolDoctor` non-spawning:
```js
function toolBuildPrompt(args) {
  const project = resolve(args.project);
  const handoffPath = resolve(project, args.handoff);
  if (handoffPath !== project && !handoffPath.startsWith(project + sep)) {
    return `Error: handoff path escapes the project root: ${args.handoff}`;
  }
  const config = readConfigFile(project);
  const vr = validate(readHandoff(handoffPath));
  if (!vr.valid) return `Handoff missing required sections: ${vr.missing.join(', ')}`;
  return assemble({ handoffPath, config });
}
function toolDoctor(args) {
  const projectDir = resolve(args.project);
  const config = readConfigFile(projectDir);
  return doctorChecks({ projectDir, config, spawn: false }).map(c => `${c.status.toUpperCase()} ${c.check}: ${c.detail}`).join('\n');
}
```
Update the tool descriptions to be accurate (non-mutating + scoped):
```js
  { name: 'fable_build_prompt', description: 'Assemble a fable governance prompt from a project config and a handoff file within the given project root (non-mutating; reads only files under the project).',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, handoff: { type: 'string' } }, required: ['project', 'handoff'] } },
  { name: 'fable_doctor', description: 'Report fable doctor checks for a project (non-mutating, non-spawning).',
    inputSchema: { type: 'object', properties: { project: { type: 'string' } }, required: ['project'] } }
```

- [ ] **Step 5: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`). Confirm doctor.test.js opencode "exactly 9 checks" still passes (CLI default spawn=true).

- [ ] **Step 6: Commit**
```bash
git add src/doctor.js src/mcp.js test/mcp.test.js
git commit -m "fix: MCP 工具去子进程化(doctor 非 spawn)并限定 build-prompt 在 project 根内

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Durable MCP registration (`--via github`) + DRY the host setup

**Files:** `src/cli.js` (shared `registerMcp` helper; cmdCodex/cmdCopilot/cmdGrok use it), `test/skill.test.js` / `test/charter.test.js`

Under `npx github:`, `PKG_ROOT` is the ephemeral npx cache. Add `--via <path|github>`: `github` registers `npx -y github:surebeli/fable-5-anything mcp-server` (durable across cache eviction; no publish). Default stays `path` (correct for clones).

- [ ] **Step 1: Failing test** — append to `test/skill.test.js`:
```js
  it('codex setup --via github prints a durable npx-github mcp registration', () => {
    const dir = join(TMP, 'codex-github'); mkdirSync(dir, { recursive: true });
    const r = spawnSync('node', [BIN, 'codex', 'setup', '--project', dir, '--via', 'github'], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes('codex mcp add fable -- npx -y github:surebeli/fable-5-anything mcp-server'), `got: ${r.stdout}`);
    assert.ok(!r.stdout.includes('bin/fable.js') && !r.stdout.includes('bin\\fable.js'), 'github via should not reference a local path');
  });
```

- [ ] **Step 2: Run → FAIL** (`--via` ignored; still prints PKG_ROOT path).

- [ ] **Step 3:** In `src/cli.js`, add a shared helper (place above `cmdCodex`):
```js
function mcpLaunchParts(via) {
  if (via === 'github') return ['npx', '-y', 'github:surebeli/fable-5-anything', 'mcp-server'];
  return ['node', resolve(PKG_ROOT, 'bin', 'fable.js'), 'mcp-server']; // default: 'path'
}

function registerMcp(hostCli, opts) {
  const via = opts.via || 'path';
  if (!['path', 'github'].includes(via)) {
    console.error(`Error: --via must be one of path|github (got "${via}")`);
    process.exit(1);
  }
  const parts = mcpLaunchParts(via);
  const addCmd = `${hostCli} mcp add fable -- ${parts.map(p => (p.includes(' ') ? `"${p}"` : p)).join(' ')}`;
  if (opts.apply) {
    const r = spawnSync(hostCli, ['mcp', 'add', 'fable', '--', ...parts], { encoding: 'utf-8', stdio: 'inherit' });
    console.log(r.status === 0 ? `Registered fable MCP server with ${hostCli}.` : `${hostCli} mcp add failed; run manually:\n  ${addCmd}`);
  } else {
    console.log(`\nTo register the fable MCP server with ${hostCli}, run:`);
    console.log('  ' + addCmd);
    console.log('(or re-run with --apply; use --via github for zero-clone/no-publish deploys)');
  }
}
```
Refactor `cmdCodex`, `cmdCopilot`, `cmdGrok`: keep their charter-sync block, then replace their bespoke entry/addCmd/apply blocks with a single call `registerMcp('codex', opts);` / `registerMcp('copilot', opts);` / `registerMcp('grok', opts);`. (Remove the now-unused per-function `entry`/`addCmd` locals.)

- [ ] **Step 4: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`). The existing codex/copilot/grok setup tests (default `--via path`) still print `… -- node "<entry>" mcp-server`.

- [ ] **Step 5: Commit**
```bash
git add src/cli.js test/skill.test.js
git commit -m "fix: MCP 注册支持 --via github（零克隆可持久），并抽出 registerMcp 复用

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Charter — correct per-file header + `--force` refresh

**Files:** `src/charter.js`, `src/cli.js` (cmdCharter passes `force`), `test/charter.test.js`

- [ ] **Step 1: Failing tests** — append to `test/charter.test.js`:
```js
  it('copilot-instructions.md gets a sensible header (not "# AGENTS.md")', () => {
    const dir = join(TMP, 'hdr'); mkdirSync(dir, { recursive: true });
    syncCharter({ project: dir, files: ['.github/copilot-instructions.md'] });
    const t = readFileSync(join(dir, '.github', 'copilot-instructions.md'), 'utf-8');
    assert.ok(!t.startsWith('# AGENTS.md'), 'should not mislabel as AGENTS.md');
    assert.ok(/Copilot/i.test(t.split('\n')[0]), 'header should reference Copilot');
  });

  it('syncCharter force refreshes a stale fable block', () => {
    const dir = join(TMP, 'refresh'); mkdirSync(dir, { recursive: true });
    const stale = '# AGENTS.md\n\n<!-- FABLE-START -->\nOLD STALE GOVERNANCE\n<!-- FABLE-END -->\n';
    writeFileSync(join(dir, 'AGENTS.md'), stale);
    syncCharter({ project: dir, files: ['AGENTS.md'], force: true });
    const t = readFileSync(join(dir, 'AGENTS.md'), 'utf-8');
    assert.ok(!t.includes('OLD STALE GOVERNANCE'), 'stale block should be replaced');
    assert.ok(t.includes('## Fable Integration'), 'current block should be present');
    assert.strictEqual((t.match(/<!-- FABLE-START -->/g) || []).length, 1);
  });
```

- [ ] **Step 2: Run → FAIL**.

- [ ] **Step 3:** Rewrite `src/charter.js` `syncCharter` + add `headerFor`:
```js
function headerFor(rel) {
  const base = rel.split(/[\\/]/).pop();
  if (base === 'CLAUDE.md') return '# CLAUDE.md\n';
  if (base === 'AGENTS.md') return '# AGENTS.md\n';
  if (base === 'copilot-instructions.md') return '# Copilot Instructions\n';
  return `# ${base}\n`;
}

export function syncCharter({ project, files, force = false }) {
  const written = [];
  for (const rel of files) {
    const p = join(project, rel);
    const dir = dirname(p);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (existsSync(p)) {
      const existing = readFileSync(p, 'utf-8');
      if (existing.includes('<!-- FABLE-START -->')) {
        if (force) {
          const refreshed = existing.replace(/<!-- FABLE-START -->[\s\S]*?<!-- FABLE-END -->\n?/, FABLE_BLOCK);
          writeFileSync(p, refreshed);
          written.push({ file: rel, action: 'refreshed' });
        } else {
          written.push({ file: rel, action: 'present' });
        }
        continue;
      }
      writeFileSync(p, existing + (existing.endsWith('\n') ? '' : '\n') + '\n' + FABLE_BLOCK);
      written.push({ file: rel, action: 'appended' });
    } else {
      writeFileSync(p, headerFor(rel) + '\n' + FABLE_BLOCK);
      written.push({ file: rel, action: 'created' });
    }
  }
  return written;
}
```

- [ ] **Step 4:** In `src/cli.js` `cmdCharter`, pass `force`: change the `syncCharter({ project, files: [...set] })` call there to `syncCharter({ project, files: [...set], force: opts.force === true || opts.force === 'true' })`. Add a help mention of `--force` to the charter help line.

- [ ] **Step 5: Run → PASS**.

- [ ] **Step 6: Commit**
```bash
git add src/charter.js src/cli.js test/charter.test.js
git commit -m "fix: charter 每文件正确标题 + charter sync --force 刷新陈旧块

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Doc/adapter status drift

**Files:** `docs/embed-in-your-project.md`, `adapters/copilot.md`, `adapters/kimi.md`

- [ ] **Step 1:** In `docs/embed-in-your-project.md`, fix the stale runtime paragraph (the one saying "For Kimi/Copilot it reports `planned`"): update to state codex/kimi/copilot/grok are implemented (codex/copilot/grok via charter+MCP, kimi via skill), opencode via executor, grok the only... (no — grok is implemented too). Say all adapted runtimes are implemented; reword the "checks 9 items" sentence to "for an opencode project, doctor runs 9 checks; other runtimes show a runtime overlay status instead."

- [ ] **Step 2:** In `adapters/copilot.md` and `adapters/kimi.md`, update any "design only / no executor / planned" wording to reflect the verified implemented status (Copilot: MCP + charter, verified vs Copilot CLI 1.0.54; Kimi: fable skill via --skills-dir, verified vs kimi-code 0.14.2), keeping the portable-core footer.

- [ ] **Step 3:** Grep to confirm no remaining stale status: `grep -rni "planned" docs/ adapters/ README.md` should only match grok-history/none and the overlay-model "Planned / design-only: none" line. Fix any others.

- [ ] **Step 4: Commit**
```bash
git add docs/embed-in-your-project.md adapters/copilot.md adapters/kimi.md
git commit -m "docs: 修正 Kimi/Copilot 适配器与 embed 文档的状态漂移（已 implemented）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Offline verification + result file

**Files:** `docs/handoffs/FABLE-M9-REVIEW-FIXES-result.md`

- [ ] **Step 1:** `node --test --test-concurrency=1 test/*.test.js` → 0 fail (102 + new tests).
- [ ] **Step 2:** Parallel recheck (two concurrent runs) → both 0 fail; no `.tmp-test-*` leftover.
- [ ] **Step 3:** Invariant: `git diff e4b3c29 HEAD -- src/opencode.js` empty; CLI `node bin/fable.js install --project <tmp> --runtime opencode --yes && node bin/fable.js doctor --project <tmp>` → exactly 9 checks, exit 0; clean up.
- [ ] **Step 4:** Smoke the fixes: non-opencode `run`/`smoke` exit 1; `codex setup --via github` prints npx-github registration; POSIX shim has no `\r`; mcp build_prompt path-escape rejected; `charter sync --force` refreshes. (Most are covered by tests; spot-check a couple via CLI in temp dirs; clean up.)
- [ ] **Step 5:** Write `docs/handoffs/FABLE-M9-REVIEW-FIXES-result.md` mapping each Codex finding → fix + evidence (verdict PASS), and listing the deferred-to-publish items. Commit.

---

## Self-Review

**Coverage:** every non-deferred Codex finding maps to a task: run/smoke dispatch (T1), POSIX shim (T2), MCP safety+honesty (T3), MCP registration durability + DRY (T4), charter header+refresh (T5), doc drift (T6). Deferred items (package.json files, lockfile SHA, CI host tests) are explicitly logged for the publish milestone.

**Invariants:** CLI doctor stays 9 checks (doctorChecks default spawn=true; only MCP passes spawn:false); `--link path` shim byte-identical except POSIX line-endings/mode (intended); src/opencode.js untouched; zero deps.

**Type/name consistency:** `requireOpencode` (T1); `chmodSync` import (T2); `spawn` option + `sep` import (T3); `registerMcp`/`mcpLaunchParts` + `--via` (T4); `headerFor` + `force` (T5) — all used consistently across cli.js/install.js/doctor.js/mcp.js/charter.js and their tests.

**Honesty:** after T3 the MCP tools are genuinely non-mutating, non-spawning, project-scoped, so "read-only" claims become accurate; T6 removes status overclaim drift.
