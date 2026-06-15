# FABLE-M6-CODEX RESULT

Verdict: PASS

> In-repo return channel. Phase 1 (offline) via subagent-driven execution with
> per-task spec + quality review + test gate; Phase 2 (live Codex) driven by the
> controller under user supervision.

## Files Changed
- (created) src/charter.js, src/mcp.js, test/charter.test.js, test/mcp.test.js, docs/codex-integration.md, docs/handoffs/FABLE-M6-CODEX-result.md
- (modified) adapters/runtime-capabilities.json (+charterFiles; codex → implemented), src/runtime.js (REQUIRED_KEYS += charterFiles), src/install.js (charter-set: AGENTS.md + CLAUDE.md), src/cli.js (charter / mcp-server / codex setup), adapters/codex.md, docs/runtime-overlay-model.md, README.md, docs/embed-in-your-project.md, test/runtime.test.js, test/install.test.js

## Commands Run
- node --test --test-concurrency=1 test/*.test.js  -> # tests 93 / # pass 93 / # fail 0
- node bin/fable.js mcp-server (offline)  -> valid JSON-RPC: initialize (protocolVersion 2025-06-18, serverInfo fable 0.2.0), tools/list (fable_runtime, fable_build_prompt, fable_doctor)
- node bin/fable.js codex setup --project <tmp>  -> seeds AGENTS.md + CLAUDE.md, prints `codex mcp add fable -- node "<entry>" mcp-server`
- codex mcp add fable -- node "F:/workspace/project/fable-5-anything/bin/fable.js" mcp-server  -> "Added global MCP server 'fable'." ; `codex mcp list` shows fable enabled

## Phase 2 — Real Codex verification (codex-cli 0.131.0, model gpt-5.5)
- **MCP tool (plugin):** `codex exec "Call the fable_runtime MCP tool ... state opencode status"` →
  Codex log: `mcp: fable/fable_runtime started` → `(completed)`; answer: "The opencode runtime status is `implemented`." → MCP tools work in a live Codex session.
- **Charter (skill):** seeded a temp project via `fable install`, then `codex exec -C <tmp> "Based only on this repo's AGENTS.md, what governance applies and what are the four handoff sections?"` →
  answer: "uses `fable-5-anything` portable prompt governance: follow the `.fable/` portable core and handoff contract, while host system/tool instructions remain authoritative. A fable handoff requires `Goal`, `Background`, `Acceptance`, and `Return`." → charter governs a live Codex session.

## Acceptance Evidence
- Codex governance loads in-session via charter (AGENTS.md) — verified live.
- fable callable capabilities in-session via MCP server (codex mcp add) — verified live.
- charter is a set incl. CLAUDE.md (decision): install + `fable charter sync` always seed AGENTS.md + CLAUDE.md; copilot adds `.github/copilot-instructions.md`; charterFiles in capabilities.
- No native marketplace plugin built (undocumented/unstable format) — MCP used instead.
- Host Codex system/tool policy remains authoritative; no "ignore instructions" text.
- M1–M5 preserved: `git diff ba7296a HEAD -- src/doctor.js src/opencode.js` empty; opencode still exactly 9 doctor checks.
- codex flipped to `implemented` (agents-md-and-mcp) ONLY after live verification passed.

## Runtime Matrix (after M6)
- claude=reference-only/system-prompt-file; opencode=implemented/prompt-prelude; **codex=implemented/agents-md-and-mcp (charter + MCP, verified)**; kimi/grok/copilot=planned/overlay; agy=opaque/overlay.

## Notes
- The fable MCP server is registered globally in `~/.codex/config.toml` (`codex mcp list` → fable). Remove with `codex mcp remove fable` if desired.
- MCP tools are read-only (fable_runtime/fable_build_prompt/fable_doctor) — no mutating/exec tools exposed.
- Next: M7 (Kimi/Copilot operational + deeper opencode delivery); the MCP server is reusable across those hosts.
