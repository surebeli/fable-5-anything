# FABLE-M8-GROK RESULT

Verdict: PASS

> In-repo return channel. Implemented directly with TDD (small, analogous to the
> Copilot path), then verified live against the real Grok CLI and reviewed.

## Files Changed
- (created) docs/handoffs/FABLE-M8-GROK-result.md
- (modified) src/cli.js (fable grok setup command), test/skill.test.js (grok setup test), adapters/grok.md (real agentic CLI: MCP + charter), adapters/runtime-capabilities.json (grok → implemented), test/runtime.test.js (grok implemented assertion), docs/runtime-overlay-model.md, README.md

## Commands Run
- node --test --test-concurrency=1 test/*.test.js  -> 101 pass / 0 fail
- node bin/fable.js grok setup --project <tmp>  -> seeds AGENTS.md + CLAUDE.md, prints `grok mcp add fable -- node "<entry>" mcp-server`
- grok mcp add fable -- node "F:/workspace/project/fable-5-anything/bin/fable.js" mcp-server  -> "Added stdio MCP server 'fable' ... File modified: ~/.grok/config.toml"; `grok mcp list` shows fable

## Phase 2 — Real CLI verification (grok 0.2.51)
- `grok -p "Use the fable_runtime MCP tool to report the status value of the opencode runtime." --always-approve` →
  grok output: "Checking the fable MCP server for the `fable_runtime` tool schema. The opencode runtime status is **implemented**." → grok invoked the fable MCP tool in a real headless session and returned correct data.
- (The transient gitnexus-spawn and worker-auth errors in grok's log are from other MCP servers / unrelated retries in the user's config; the fable tool call itself succeeded.)

## Acceptance Evidence
- grok operational via the reused host-agnostic fable MCP server (`grok mcp add`) + charter (AGENTS.md) — verified live.
- The same fable MCP server (built in M6) now serves Codex, Copilot, AND Grok with zero changes — host-agnostic confirmed across three hosts.
- `adapters/grok.md` corrected from the outdated thin `grok -p --output-format json` model to the real agentic grok 0.2.51 (MCP + charter).
- grok flipped to `implemented` ONLY after live verification (no overclaiming). No native marketplace plugin.
- Invariants preserved: `git diff 72523d6 HEAD -- src/doctor.js src/opencode.js src/mcp.js src/charter.js` empty; opencode doctor still 9 checks.

## Runtime Matrix (after grok)
- claude=reference-only; opencode=implemented/prompt-prelude; codex=implemented/agents-md-and-mcp; kimi=implemented/skill; copilot=implemented/mcp-and-charter; **grok=implemented/mcp-and-charter**; agy=opaque/overlay.
- No `planned` runtimes remain — every adapted vendor is verified against its real CLI. agy stays the deliberate generic opaque-host fallback.

## Notes
- Global side effect: fable MCP registered in `~/.grok/config.toml` (remove with `grok mcp remove fable`).
- Next: M8 public release (real npm publish, tag, PR material) — needs the owner's npm credentials.
