---
description: Show how fable overlays governance onto a runtime (injection mode, overlay vs replace). Read-only. Optional argument: a runtime name; omit to list all.
allowed-tools: Bash
---

This command runs inside a Claude Code session. Optional argument: a runtime name (`claude`, `opencode`, `codex`, `kimi`, `grok`, `copilot`, `agy`); omit to list all.

List all known runtimes and how fable governs each:

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/fable.js" runtime --list
```

Or, if the user named a runtime, describe just that one (status, injection mode,
overlay vs system-replace, charter files):

```bash
node "$CLAUDE_PLUGIN_ROOT/bin/fable.js" runtime <name>
```

Surface the output to the user. This is read-only — it makes no changes.
