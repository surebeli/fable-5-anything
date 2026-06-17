---
description: Inline fable's full portable governance constitution into this project's AGENTS.md + CLAUDE.md (host-agnostic). Governance only — no dispatch.
allowed-tools: Bash
---

This command runs inside a Claude Code session. Optional argument: a project directory (defaults to the current directory).

Run fable's host-agnostic governance install, which inlines the full portable
constitution (`prompts/portable-agent-core.md`) into the project's `AGENTS.md`
and `CLAUDE.md` between idempotent `<!-- FABLE-START -->` / `<!-- FABLE-END -->`
markers. Use the current directory unless the user named a project path:

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/fable.js" governance --project .
```

Surface the created/refreshed files to the user. This is governance-only: it does
NOT dispatch, run, or execute tasks. Notes:

- Kimi loads *skills*, not charter markdown → use `/fable:setup kimi`.
- opencode users who want a slim charter + `opencode.json` wiring → `/fable:setup opencode`.
- Background dispatch to vendor CLIs is not part of fable — that lives in hopper-plugin.

If `$CLAUDE_PLUGIN_ROOT/bin/fable.js` cannot be found, tell the user the fable
plugin root could not be resolved; fable can also be run from a clone with
`node bin/fable.js governance --project .`.
