# Embed fable in your project

Use fable when you want project agents to share one portable governance charter.

## Prerequisites

- Node.js 18+
- A source checkout, or `npx -y github:surebeli/fable-5-anything`

## One-command governance

From the fable repo directory:

```bash
node bin/fable.js governance --project <path-to-your-project>
```

Or without keeping a clone:

```bash
npx -y github:surebeli/fable-5-anything governance --project <path-to-your-project>
```

This writes the full portable core into `<your-project>/AGENTS.md` and
`<your-project>/CLAUDE.md`. The command is idempotent and preserves content
outside the fable markers.

## Host-specific setup

Most hosts can use the charter directly. Use a host setup command when that host
has a better native loading path:

1. **opencode** — `fable opencode setup --project .` writes a slim charter,
   copies the portable core to `.fable/portable-agent-core.md`, and wires
   `opencode.json` `instructions`.
2. **Codex / Copilot / Grok** — `fable <host> setup --project . [--apply]
   [--via path|github]` seeds the charter and registers the read-only fable MCP
   server (`fable_runtime`).
3. **Kimi** — `fable kimi setup --project .` writes the fable skill, loaded via
   `--skills-dir` or `extra_skill_dirs`.

## What to commit

Commit the governance files (`AGENTS.md` / `CLAUDE.md`). If you used
`fable opencode setup`, also commit `.fable/portable-agent-core.md` and
`opencode.json`. fable no longer produces shims, lockfiles, or run directories.

## Dispatch

Background dispatch to vendor CLIs has moved to
[hopper-plugin](https://github.com/surebeli/hopper-plugin). Governance reaches
hopper-dispatched vendors through the charter fable installs or hopper's
`GOVERNANCE.md` overlay.
