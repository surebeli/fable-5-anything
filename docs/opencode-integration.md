# opencode integration

opencode has two complementary fable integrations:

## 1. Executor (dispatch a handoff)

`fable run <handoff> --project .` assembles `portable core + opencode adapter +
handoff` and runs it via `opencode run` (DeepSeek etc.). One-shot, per task.

## 2. In-session governance (every prompt) — `fable opencode setup`

Make the **full fable portable core govern every opencode session**, not just
`fable run` dispatches:

```bash
fable opencode setup --project .
```

This (idempotently):
- seeds the charter (`AGENTS.md` + `CLAUDE.md`),
- copies the portable core to `.fable/portable-agent-core.md`,
- wires `opencode.json` `"instructions": ["AGENTS.md", ".fable/portable-agent-core.md"]`, preserving any existing keys (e.g. `mcp`).

opencode auto-loads `AGENTS.md` and every file in `instructions` on each run, so
afterwards **every `opencode` / `opencode run` in the project follows the full
portable core** (read project first, handoff contract, TDD/acceptance, minimal
scoped changes, preserve user work, verify before completion). Verified end-to-end
against opencode 1.17.7: a session loads the wired core.

Verify yourself:
```bash
opencode run "What governance rules must you follow in this repo? List them."
```

Notes:
- The host opencode system prompt and tool rules remain authoritative; fable
  overlays governance and never tells the model to ignore host rules.
- Re-running `fable opencode setup` is safe: it refreshes the copied core and
  dedupes the `instructions` entries.
- This is separate from registering the fable MCP server with opencode
  (`opencode mcp add …`), which adds callable `fable_*` tools but is not always-on
  governance.
