# FABLE-M9-REVIEW-FIXES RESULT

Verdict: PASS (source-deployment bar)

> Fixes for the strict Codex (gpt-5.5/xhigh) review of M4–M8. Implemented TDD via
> subagent-driven execution + a controller-driven blocker fix, then independently
> re-verified by Codex (loop closed).

## Codex finding → resolution (re-verified by Codex)

| # | Finding | Status | Fix |
|---|---|---|---|
| 1 | MCP registration hard-coded PKG_ROOT (ephemeral under npx github) | RESOLVED | `--via path\|github` + shared `registerMcp` (src/cli.js); github → `npx -y github:surebeli/fable-5-anything mcp-server` |
| 2 | `fable_build_prompt` read arbitrary paths (exfiltration) | RESOLVED | handoff path scoped to project root (src/mcp.js) + adapter scoped to packaged `adapters/` (src/config.js `resolveAdapterPath`). Codex re-exploit: secret NOT returned. |
| 3 | `fable_doctor` spawned `opencode --version` | RESOLVED | `doctorChecks({spawn})` default true; MCP passes `spawn:false`. CLI doctor still exactly 9 checks. |
| 4 | run/smoke always dispatched to opencode | RESOLVED | `requireOpencode` guard rejects non-opencode in cmdSmoke/cmdRun |
| 5 | POSIX shim CRLF + no chmod | RESOLVED | LF line endings + `chmodSync(0o755)` (src/install.js) |
| 6 | `--link github` floating / lockfile no SHA | DEFERRED-OK | acceptable for source/no-publish; revisit at publish |
| 7 | charter sync never refreshed a stale block | RESOLVED | `syncCharter({force})` + `fable charter sync --force` |
| 8 | package.json `files` excludes docs/scripts | DEFERRED-OK | matters only for npm publish |
| 9 | "verified" status tested as strings only | PARTIAL/DEFERRED | live host checks are manual (Phase 2); CI host tests need the CLIs + quota |
| 10 | copilot-instructions.md got `# AGENTS.md` header | RESOLVED | per-file `headerFor` (src/charter.js) → `# Copilot Instructions` |
| 11 | copilot/kimi adapters said design-only | RESOLVED | adapters updated to implemented/verified |
| 12 | embed doc said Kimi/Copilot planned | RESOLVED | embed doc + stale "plugin/skill not implemented" section corrected |

New issues found in re-review and also fixed: the adapter-path exfiltration (folded into #2, BLOCKER, fixed + regression test); CLI help missing `--via` (added); stale embed future-work section (rewritten).

## Verification
- `node --test --test-concurrency=1 test/*.test.js` → 110 pass / 0 fail.
- Codex (gpt-5.5/xhigh) re-review: 9/12 RESOLVED, 2 DEFERRED-OK, then found 1 new blocker (adapter exfiltration); after fix, focused Codex re-verify → **FIXED, no new blocker/major**, normal `adapters/*.md` path still works.
- Invariants: `git diff e4b3c29 HEAD -- src/opencode.js` empty; CLI opencode doctor still exactly 9 checks; zero deps.
- Durable github MCP launch proven: `npx -y github:surebeli/fable-5-anything mcp-server` answers initialize + tools/list.

## Deferred to the publish milestone (logged, not done)
- Pin `--link github` / MCP github registration to a git tag/SHA for reproducibility.
- Add `docs/`+`scripts/` to package `files` (or restructure) for a complete npm artifact.
- Automated (CI) live-host behavior tests for codex/copilot/grok/kimi.

## Notes
- The bar met is "source deployment" (clone / `npx github:`), not a published npm release. The three deferred items are the publish checklist.
