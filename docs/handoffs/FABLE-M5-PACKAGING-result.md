# FABLE-M5-PACKAGING RESULT

Verdict: PASS

> Return channel is in-repo (owner decision from M4). No writes to x-agents.
> Subagent-driven execution; per-task spec + quality review + test gate, then
> controller verification.

## Files Changed
- (created) src/version.js, test/version.test.js, scripts/install.ps1, scripts/install.sh
- (created) docs/handoffs/FABLE-M5-PACKAGING-result.md, docs/roadmap/M6-codex-integration.md, docs/roadmap/M7-kimi-copilot-opencode-adapters.md
- (modified) package.json, src/config.js, src/cli.js, src/install.js
- (modified) test/config.test.js, test/install.test.js, README.md, docs/embed-in-your-project.md

## Commands Run
- node --test --test-concurrency=1 test/*.test.js  -> # tests 82 / # pass 82 / # fail 0 (13 suites). Parallel-process recheck: both runs 82/82/0, no temp collisions.
- node bin/fable.js --version  -> 0.2.0 (exit 0)
- install (default link=path) + doctor  -> doctor shows exactly 9 opencode checks, all PASS, exit 0 (M4 invariant preserved)
- .fable/fable.lock.json (path install)  -> { fableVersion: "0.2.0", link: "path", entry: <...>/bin/fable.js }
- install --link npx  -> .fable/bin/fable.cmd = `@echo off` + `npx -y fable-5-anything %* --project "..."` (no hardcoded bin/fable.js); lockfile link="npx", entry "npx -y fable-5-anything"

## Acceptance Evidence
- Zero-clone install path exists (npx github + bootstrap scripts) -> scripts/install.ps1, scripts/install.sh
- Version single-sourced from package.json (0.2.0) -> src/version.js; config/install/version tests assert against VERSION
- Portable shim modes path|global|npx -> src/install.js shimInvocation(); validated in cli cmdInstall
- Per-project lockfile .fable/fable.lock.json -> install writes it (fableVersion + link + entry + installedFrom)
- No global destructive changes; no npm publish performed -> confirmed (no publish command run; package.json only gained metadata)
- M1-M4 preserved: doctor & opencode untouched -> `git diff 970a250 HEAD -- src/doctor.js src/opencode.js` is empty (970a250 = post-M4 main, the correct M5 base)

## Runtime / Packaging Matrix
- version: single-sourced 0.2.0; `fable --version` works.
- install link modes: path (default, byte-identical shims), global (`fable`), npx (`npx -y fable-5-anything`).
- distribution: package.json has files/engines/repository/bugs/homepage/keywords + bin; publish-ready.

## Notes
- `npm publish` intentionally NOT run (needs the owner's npm credentials; release step deferred to M8).
- doctor lockfile check intentionally deferred to avoid changing the M4 opencode-exactly-9-check invariant; doctor.js left byte-identical.
- The M5 execution workflow's verify step reported overall=fail, but this was a FALSE POSITIVE: the guard diffed against f79c144 (pre-M4 base), so M4's legitimate doctor.js rework (commit c5a8edc) appeared in range. Scoped to the correct M5 base (970a250) the doctor.js/opencode.js diff is empty. All substantive checks passed.
- Next recommended milestone: M6 (Codex in-session integration + charter-set incl. CLAUDE.md), then M7.
