# FABLE M7 Kimi + Copilot (+ opencode smoke) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Kimi and Copilot operational from inside their real CLIs — Kimi via a real fable **skill** (`--skills-dir`), Copilot by **reusing the M6 fable MCP server** (`copilot mcp add`) plus charter — verified end-to-end against the installed CLIs; and real-smoke the existing opencode path. Flip `kimi` and `copilot` to `implemented` only after live verification.

**Architecture:** Phase 1 (offline, deterministic): a `src/skill.js` that generates the fable Kimi SKILL.md from `prompts/portable-agent-core.md` + `adapters/kimi.md`, a `fable kimi setup` command (writes `.fable/skills/fable/SKILL.md` + charter + prints `--skills-dir`/`extra_skill_dirs` registration), and a `fable copilot setup` command (charter incl. `.github/copilot-instructions.md` + prints/`--apply`s `copilot mcp add fable -- node <entry> mcp-server`, reusing the M6 MCP server unchanged). Phase 2 (live): verify Kimi loads the skill (`kimi --skills-dir … -p`), Copilot calls the fable MCP tool + reflects the charter (`copilot -p --allow-all-tools`), opencode smoke; then flip statuses.

**Tech Stack:** Node.js (ESM, zero deps), `node:test`, Windows-first + POSIX. Real `kimi` (0.14.2) and `copilot` (1.0.54) CLIs for Phase 2.

## Verified CLI facts (probed this session)

- **Kimi 0.14.2:** real skills via `--skills-dir <dir>` (dir = `<skills-dir>/<name>/SKILL.md`, YAML frontmatter `name`/`description` + body — confirmed by loading a probe skill). `merge_all_available_skills=true`, `extra_skill_dirs=[]` in `~/.kimi-code/config.toml`. `kimi -p "<prompt>"` non-interactive (cannot combine with `--auto`/`--yolo`). No native MCP (has ACP). → integration = skill + charter.
- **Copilot 1.0.54:** `copilot mcp add <name> -- <command...>` writes `~/.copilot/mcp-config.json` (local stdio). `copilot init` creates `.github/copilot-instructions.md`. `copilot -p "<prompt>" --allow-all-tools` non-interactive. → integration = reuse fable MCP server + charter.
- **opencode:** already `implemented`; M7 only real-smokes it (no refactor).

## Scope decisions (locked / defaulted)

- Kimi gets a real fable **skill**; Copilot **reuses the M6 MCP server** (no new server). Both also get charter (decision from M6: always AGENTS.md + CLAUDE.md, + host extras).
- Kimi registered via `extra_skill_dirs` (non-destructive; printed, applied only with `--apply`). opencode: smoke-only, no code change.
- Real verification (Phase 2) against installed CLIs; flip kimi/copilot → `implemented` ONLY if it passes.

## File Structure

**Create:** `src/skill.js`, `test/skill.test.js`, `docs/kimi-integration.md`, `docs/copilot-integration.md`, `docs/handoffs/FABLE-M7-KIMI-COPILOT-result.md`.
**Modify:** `src/cli.js` (`kimi setup`, `copilot setup` commands + help), `adapters/runtime-capabilities.json` (kimi/copilot → implemented in Phase 2), `adapters/kimi.md` + `adapters/copilot.md` (real mechanics), `docs/runtime-overlay-model.md`, `README.md`, `test/runtime.test.js`, `test/charter.test.js` (or new `test/setup.test.js` for the setup commands).

**Do NOT touch:** `src/doctor.js`, `src/opencode.js`, `src/mcp.js` (reused as-is), `src/charter.js` (reused), `prompts/**`. Don't stage `docs/pr/**` or x-agents.

## Cross-task invariants (inject into every implementer/reviewer)

- Branch `feat/m7-kimi-copilot`; commit there only. Zero new deps; ESM; `node:test`; Windows.
- `git diff 881ddaf HEAD -- src/doctor.js src/opencode.js src/mcp.js src/charter.js` MUST be empty (M7 reuses, doesn't modify them).
- PHASE 1 is OFFLINE: no live `kimi`/`copilot`/`codex`/`opencode` execution; setup commands print registration by default (apply only with `--apply`, not used in tests). Do NOT mark kimi/copilot `implemented` (that's Phase 2).
- The Kimi skill SKILL.md MUST have YAML frontmatter with `name: fable` and a `description`, then the portable core + kimi adapter body.
- Reuse `src/mcp.js` for Copilot unchanged (MCP server is host-agnostic).

---

## Task 1: Kimi skill generator (`src/skill.js`)

**Files:** `src/skill.js` (create), `test/skill.test.js` (create)

- [ ] **Step 1: Failing test** — create `test/skill.test.js`:
```js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
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
```

- [ ] **Step 2: Run → FAIL** (`node --test test/skill.test.js`): cannot resolve `../src/skill.js`.

- [ ] **Step 3:** Create `src/skill.js`:
```js
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(join(__dirname, '..'));

const FRONTMATTER = `---
name: fable
description: Portable prompt governance for this project. Read the project first; obey the handoff contract (Goal/Background/Acceptance/Return); use TDD/acceptance gates; make minimal scoped changes; preserve user work; verify before completion; write result/review artifacts. The host system prompt and tool rules remain authoritative; fable overlays governance and never overrides host rules.
---
`;

export function buildKimiSkill() {
  const core = readFileSync(join(PKG_ROOT, 'prompts', 'portable-agent-core.md'), 'utf-8');
  const adapter = readFileSync(join(PKG_ROOT, 'adapters', 'kimi.md'), 'utf-8');
  return `${FRONTMATTER}\n# Fable Governance (portable core)\n\n${core}\n\n# Kimi runtime adapter\n\n${adapter}\n`;
}

export function writeKimiSkill({ project }) {
  const dir = join(resolve(project), '.fable', 'skills', 'fable');
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'SKILL.md');
  writeFileSync(p, buildKimiSkill());
  return p;
}
```

- [ ] **Step 4: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`, 0 fail).

- [ ] **Step 5: Commit**
```bash
git add src/skill.js test/skill.test.js
git commit -m "feat: 新增 Kimi 技能生成器 src/skill.js（portable core + kimi 适配器）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `fable kimi setup` command

**Files:** `src/cli.js`, `test/skill.test.js` (extend with spawned-CLI cases)

- [ ] **Step 1: Failing test** — append to `test/skill.test.js`:
```js
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
```

- [ ] **Step 2: Run → FAIL** (`kimi` unknown command).

- [ ] **Step 3:** In `src/cli.js`: add `import { writeKimiSkill } from './skill.js';`. Add `cmdKimi`:
```js
function cmdKimi(opts, positional) {
  if (positional[0] !== 'setup') { console.error('Usage: fable kimi setup --project <dir>'); process.exit(1); }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  for (const f of (caps.kimi ? caps.kimi.charterFiles : [])) set.add(f);
  for (const w of syncCharter({ project, files: [...set] })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  writeKimiSkill({ project });
  console.log('  (skill)   .fable/skills/fable/SKILL.md');
  const skillsDir = resolve(project, '.fable', 'skills');
  console.log('\nUse the fable skill in Kimi:');
  console.log(`  kimi --skills-dir "${skillsDir}" -p "<your task>"`);
  console.log('Or register permanently in ~/.kimi-code/config.toml:');
  console.log(`  extra_skill_dirs = ["${skillsDir}"]`);
}
```
Wire `case 'kimi': cmdKimi(opts, positional); break;`. Add a help line.

- [ ] **Step 4: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`).

- [ ] **Step 5: Commit**
```bash
git add src/cli.js test/skill.test.js
git commit -m "feat: 新增 fable kimi setup（技能 + 宪章 + 打印 --skills-dir/extra_skill_dirs）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `fable copilot setup` command (reuse M6 MCP server)

**Files:** `src/cli.js`, `test/skill.test.js` (extend)

- [ ] **Step 1: Failing test** — append to `test/skill.test.js`:
```js
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
```

- [ ] **Step 2: Run → FAIL** (`copilot` unknown command).

- [ ] **Step 3:** In `src/cli.js` add `cmdCopilot` (mirrors `cmdCodex` from M6; `PKG_ROOT`, `spawnSync`, `syncCharter`, `loadCapabilities` already imported):
```js
function cmdCopilot(opts, positional) {
  if (positional[0] !== 'setup') { console.error('Usage: fable copilot setup --project <dir> [--apply]'); process.exit(1); }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  for (const f of (caps.copilot ? caps.copilot.charterFiles : [])) set.add(f);
  for (const w of syncCharter({ project, files: [...set] })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  const entry = resolve(PKG_ROOT, 'bin', 'fable.js');
  const addCmd = `copilot mcp add fable -- node "${entry}" mcp-server`;
  if (opts.apply) {
    const r = spawnSync('copilot', ['mcp', 'add', 'fable', '--', 'node', entry, 'mcp-server'], { encoding: 'utf-8', stdio: 'inherit' });
    console.log(r.status === 0 ? 'Registered fable MCP server with Copilot.' : `copilot mcp add failed; run manually:\n  ${addCmd}`);
  } else {
    console.log('\nTo register the fable MCP server with Copilot, run:');
    console.log('  ' + addCmd);
    console.log('(or re-run with --apply to do it now)');
  }
}
```
Wire `case 'copilot': cmdCopilot(opts, positional); break;`. Add a help line.

- [ ] **Step 4: Run → PASS** (`node --test --test-concurrency=1 test/*.test.js`).

- [ ] **Step 5: Commit**
```bash
git add src/cli.js test/skill.test.js
git commit -m "feat: 新增 fable copilot setup（宪章 + 复用 fable MCP 服务，打印/应用 copilot mcp add）

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Docs (Kimi + Copilot integration guides, adapters, overlay model, README)

**Files:** `docs/kimi-integration.md` (create), `docs/copilot-integration.md` (create), `adapters/kimi.md`, `adapters/copilot.md`, `docs/runtime-overlay-model.md`, `README.md`

- [ ] **Step 1:** Create `docs/kimi-integration.md`: explain the fable **skill** path — `fable kimi setup --project .` writes `.fable/skills/fable/SKILL.md`; use via `kimi --skills-dir .fable/skills -p "<task>"` or register `extra_skill_dirs` in `~/.kimi-code/config.toml`. Note Kimi auto-merges available skills (always-on governance); host system prompt remains authoritative.

- [ ] **Step 2:** Create `docs/copilot-integration.md`: explain the **MCP** path — `fable copilot setup --project . --apply` (or `copilot mcp add fable -- node <entry> mcp-server`) reusing the same fable MCP server as Codex; charter via `.github/copilot-instructions.md` + AGENTS.md; verify with `copilot -p "..." --allow-all-tools`.

- [ ] **Step 3:** Add a "Kimi (M7)" section to `adapters/kimi.md` and a "Copilot (M7)" section to `adapters/copilot.md` describing the real mechanics, keeping the portable-core footer.

- [ ] **Step 4:** Update `docs/runtime-overlay-model.md` per-runtime table: kimi → `skill (--skills-dir)`, copilot → `mcp (copilot mcp add) + charter` (status updated in Phase 2). Add a sentence that the fable MCP server is host-agnostic (Codex + Copilot share it).

- [ ] **Step 5:** Add Kimi/Copilot bullets to the README Runtimes section linking the two new guides.

- [ ] **Step 6:** Verify a doc command runs: `node bin/fable.js kimi setup --project <tmp> && node bin/fable.js copilot setup --project <tmp>` in a temp dir; clean up.

- [ ] **Step 7: Commit**
```bash
git add docs/kimi-integration.md docs/copilot-integration.md adapters/kimi.md adapters/copilot.md docs/runtime-overlay-model.md README.md
git commit -m "docs: Kimi（技能）与 Copilot（MCP）集成指南 + 适配器/overlay/README 更新

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Offline full verification

**Files:** none

- [ ] **Step 1:** `node --test --test-concurrency=1 test/*.test.js` → 0 fail (93 from M6 + new skill/setup tests).
- [ ] **Step 2:** Parallel recheck (two concurrent `node --test test/*.test.js`) → both 0 fail; no `.tmp-test-*` left behind.
- [ ] **Step 3:** Invariant guard: `git diff 881ddaf HEAD -- src/doctor.js src/opencode.js src/mcp.js src/charter.js` empty; `docs/pr/**` not in diff.
- [ ] **Step 4:** Manual smoke: `fable kimi setup --project <tmp>` writes SKILL.md + charter + prints registration; `fable copilot setup --project <tmp>` writes charter + prints `copilot mcp add`; clean up. Confirm kimi/copilot still `planned` in capabilities.

---

## Task 6 (PHASE 2 — LIVE, supervised): real verification + status flips

> **Side effects:** mutates `~/.kimi-code/config.toml` (extra_skill_dirs, only if `--apply`/manual) and `~/.copilot/mcp-config.json` (`copilot mcp add`), and spends Kimi/Copilot quota (`kimi -p`, `copilot -p`). Gated on user supervision.

**Files:** `adapters/runtime-capabilities.json`, `test/runtime.test.js`, `adapters/kimi.md`/`copilot.md` (if status text), `docs/runtime-overlay-model.md`, `README.md`, `docs/handoffs/FABLE-M7-KIMI-COPILOT-result.md`

- [ ] **Step 1 — Kimi:** seed a temp project (`fable kimi setup --project <tmp>`), then:
```bash
kimi --skills-dir <tmp>/.fable/skills -p "Using the fable skill, summarize the fable handoff contract (the four required sections) in one sentence."
```
Expected: the answer lists Goal/Background/Acceptance/Return and reflects overlay-not-replace. Capture as evidence.

- [ ] **Step 2 — Copilot:** register + verify:
```bash
copilot mcp add fable -- node "F:/workspace/project/fable-5-anything/bin/fable.js" mcp-server
copilot mcp list   # shows fable
copilot -p "Use the fable MCP server's fable_runtime tool to report the status of the opencode runtime." --allow-all-tools
```
Expected: Copilot calls the fable MCP tool and reports opencode = implemented. Capture evidence. Also seed a temp project with `fable copilot setup` and confirm `.github/copilot-instructions.md` reflects fable governance in a `copilot -p` charter question.

- [ ] **Step 3 — opencode smoke:** `node bin/fable.js install --project <tmp> --runtime opencode ... --yes` then `node bin/fable.js smoke --project <tmp> --dry-run` (and `--execute` only if opencode creds are configured); confirm the existing path still works. Clean up temp dirs.

- [ ] **Step 4 — flip statuses only for what passed:** for kimi (if Step 1 passed) set `status:"implemented"`, `injectionMode:"skill"`, `commandSupport:["kimi-setup","charter"]`, updated note; for copilot (if Step 2 passed) set `status:"implemented"`, `injectionMode:"mcp-and-charter"`, `commandSupport:["copilot-setup","mcp-server","charter"]`, updated note. Add `test/runtime.test.js` assertions for the verified statuses. Update the overlay-model table + README to match. Run full suite → 0 fail.

- [ ] **Step 5:** If any live step fails, leave that runtime `planned`, record exactly what failed (no overclaiming). Write `docs/handoffs/FABLE-M7-KIMI-COPILOT-result.md` with real command output, verdict (PASS if kimi+copilot verified+flipped; PARTIAL otherwise), and the runtime matrix.

- [ ] **Step 6: Commit**
```bash
git add adapters/runtime-capabilities.json test/runtime.test.js docs/runtime-overlay-model.md README.md adapters/kimi.md adapters/copilot.md docs/handoffs/FABLE-M7-KIMI-COPILOT-result.md
git commit -m "feat: Kimi/Copilot 真机验证通过，runtime 状态翻为 implemented

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:** Kimi real skill (T1–T2), Copilot MCP reuse + charter (T3), docs (T4), offline verify (T5), live verification + honest status flips + opencode smoke (T6). Matches the user's "real environments, real-test all."

**Placeholder scan:** only T6 result-file evidence filled from real output; all code steps complete.

**Invariant guard:** `doctor.js`/`opencode.js`/`mcp.js`/`charter.js` untouched (reused); kimi/copilot flip to implemented only after live verification; setup commands are dry by default.

**Type/name consistency:** `buildKimiSkill`/`writeKimiSkill` (skill.js) used by cli.js + tests; `cmdKimi`/`cmdCopilot` mirror M6 `cmdCodex`; reuse `syncCharter` (charter.js) + the M6 MCP server (mcp.js) unchanged; `charterFiles` already present per runtime.

**Honesty:** Copilot reuses the proven host-agnostic MCP server; Kimi uses its real skill primitive (format empirically confirmed); opencode not refactored; statuses data-driven by real verification.
