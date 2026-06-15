# FABLE-M7-KIMI-COPILOT RESULT

Verdict: PASS

> In-repo return channel. Phase 1 (offline) via subagent-driven execution
> (per-task spec + quality review + test gate); Phase 2 (live) driven by the
> controller under user supervision against the real Kimi, Copilot, and opencode
> CLIs.

## Files Changed
- (created) src/skill.js, test/skill.test.js, docs/kimi-integration.md, docs/copilot-integration.md, docs/handoffs/FABLE-M7-KIMI-COPILOT-result.md
- (modified) src/cli.js (kimi setup, copilot setup commands), adapters/runtime-capabilities.json (kimi + copilot → implemented), adapters/kimi.md, adapters/copilot.md, docs/runtime-overlay-model.md, README.md, test/runtime.test.js

## Commands Run
- node --test --test-concurrency=1 test/*.test.js  -> # tests 99 / # pass 99 / # fail 0
- node bin/fable.js kimi setup --project <tmp>  -> writes .fable/skills/fable/SKILL.md (name: fable) + AGENTS.md + CLAUDE.md; prints --skills-dir / extra_skill_dirs
- node bin/fable.js copilot setup --project <tmp>  -> writes .github/copilot-instructions.md + AGENTS.md + CLAUDE.md; prints copilot mcp add
- copilot mcp add fable -- node "F:/workspace/project/fable-5-anything/bin/fable.js" mcp-server  -> registered (Type: local, Source: User); `copilot mcp list` shows fable
- opencode: install + smoke --dry-run + doctor (9 checks) -> intact

## Phase 2 — Real CLI verification
- **Kimi (kimi-code 0.14.2):** `kimi --skills-dir <tmp>/.fable/skills -p "..."` → Kimi loaded the fable skill, read SKILL.md, and answered: "The four required sections of a fable handoff are Goal, Background, Acceptance, and Return, and fable overlays—rather than replaces—the host system prompt." → skill loads + governs a live session.
- **Copilot (GitHub Copilot CLI 1.0.54):** `copilot -p "Use the fable MCP server's fable_runtime tool ..." --allow-all-tools` → Copilot invoked `● fable_runtime (MCP: fable)` and answered "The opencode runtime has a status value of **implemented**." → the host-agnostic fable MCP server (built in M6) works on Copilot unchanged.
- **opencode:** smoke --dry-run prints the correct command with all flags; doctor shows exactly 9 checks, exit 0 → existing executor intact.

## Acceptance Evidence
- Kimi operational via a real fable skill (`--skills-dir` / `extra_skill_dirs`) — verified live.
- Copilot operational via the reused fable MCP server (`copilot mcp add`) + charter — verified live.
- The fable MCP server is host-agnostic: the same server serves Codex (M6) and Copilot (M7) with zero changes.
- opencode executor + flags unchanged; M1–M6 preserved: `git diff 881ddaf HEAD -- src/doctor.js src/opencode.js src/mcp.js src/charter.js` empty.
- kimi + copilot flipped to `implemented` ONLY after live verification passed (no overclaiming).
- No native Codex/Copilot marketplace plugin (undocumented/unstable) — MCP + skill used.

## Runtime Matrix (after M7)
- claude=reference-only/system-prompt-file; opencode=implemented/prompt-prelude; codex=implemented/agents-md-and-mcp; **kimi=implemented/skill**; **copilot=implemented/mcp-and-charter**; grok=planned/overlay; agy=opaque/overlay.

## Notes
- Global side effects from live verification: fable MCP server registered in `~/.copilot/mcp-config.json` (remove with `copilot mcp remove fable`). Kimi was verified via `--skills-dir` (no global config change); to register permanently add the skills dir to `extra_skill_dirs` in `~/.kimi-code/config.toml`.
- Only grok remains planned. Next: M8 (public release — real npm publish, tag, PR material).
