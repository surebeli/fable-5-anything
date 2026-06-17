# CLAUDE.md — fable-5-anything

Read first when helping someone install or use fable.

## Installing fable into a user's project

fable is governance-only. To govern a project, inline the portable core into its
charter files:

`node bin/fable.js governance --project <proj>`

This embeds the full portable core into `AGENTS.md` + `CLAUDE.md` (host-agnostic).
Exceptions: Kimi loads *skills* → `fable kimi setup`; opencode users who want a
slim charter + `opencode.json` instructions → `fable opencode setup`; codex /
copilot / grok can also register the read-only fable MCP server → `fable <host>
setup`.

Background dispatch to vendor CLIs is NOT part of fable anymore — use
[hopper-plugin](https://github.com/surebeli/hopper-plugin) for that.

## When committing fable into a shared repo

Commit the governance files: the `AGENTS.md` / `CLAUDE.md` charter. If you used a
host-specific setup (`fable opencode setup`), also commit the
`.fable/portable-agent-core.md` + `opencode.json` it creates. fable no longer
produces shims or a lockfile.

## Repo development

For working ON this repo (not installing it into a project), follow `AGENTS.md`.
