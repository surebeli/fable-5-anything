---
description: Wire fable governance into a specific host — codex | kimi | copilot | grok | opencode. Seeds the charter and registers that host's governance delivery. Governance only.
allowed-tools: Bash
---

This command runs inside a Claude Code session. Argument: the host to set up — one of `codex`, `kimi`, `copilot`, `grok`, `opencode`.

FIRST validate the host the user named is EXACTLY one of: `codex`, `kimi`,
`copilot`, `grok`, `opencode`. If it is anything else, or missing, STOP and ask
the user to pick one — do not run with an unvalidated value.

Then run the matching fable host setup against the current project (or a directory
the user specifies):

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/fable.js" <host> setup --project .
```

Each setup seeds the `AGENTS.md` / `CLAUDE.md` charter and wires that host's
governance delivery:

- `codex` / `copilot` / `grok` → register the read-only `fable_runtime` MCP server
  (prints the `<host> mcp add fable` command; pass `--apply` ONLY if the user wants
  fable to run the registration for them, otherwise they run it manually).
- `kimi` → write `.fable/skills/fable/SKILL.md` (Kimi loads skills, not charter markdown).
- `opencode` → copy the portable core into `.fable/` and wire `opencode.json` `instructions`.

Surface the output (including any `<host> mcp add fable` command) to the user.
Do NOT auto-apply MCP registration without explicit user approval. Governance
only — no dispatch.
