# AGENTS.md — fable-5-anything

This repository hosts portable prompt adaptation work derived from analysis of
Claude Fable 5 style prompts.

## Installing fable into a user's project

fable is governance-only. To govern a project, inline the portable core into its
charter files:

`node bin/fable.js governance --project <proj>`

This embeds the full portable core into `AGENTS.md` + `CLAUDE.md` (host-agnostic).
Exceptions: Kimi 0.17.1+ auto-loads `AGENTS.md` (governed by `governance`); older Kimi reads only skills → `fable kimi setup`; opencode users who want a
slim charter + `opencode.json` instructions → `fable opencode setup`; codex /
copilot / grok can also register the read-only fable MCP server → `fable <host>
setup`.

Background dispatch to vendor CLIs is NOT part of fable anymore — use
[hopper-plugin](https://github.com/surebeli/hopper-plugin) for that.

## Scope

Keep implementation artifacts in this repository:

- Portable core prompt rules.
- Claude-specific exclusion lists.
- Runtime adapters.
- Smoke and regression checklists.
- Decision records.

Do not place new implementation files for this work in `x-agents`; that
repository may keep handoff and review records only.

## Architecture

Use one shared core plus runtime adapters:

- Core: `prompts/portable-agent-core.md`
- Exclusions: `prompts/claude-fable-5-exclusions.md`
- Adapters: `adapters/*.md`

Adapters are additive. They must not weaken or override the portable core.

## Editing Rules

- Do not copy Claude system prompts wholesale into the portable core.
- Do not introduce provider identity claims into model-neutral files.
- Do not add runtime paths, CLI flags, or tool schemas to
  `prompts/portable-agent-core.md`.
- Put runtime mechanics in the matching adapter.
- Update `tests/smoke-checklist.md` when adding a new adapter.

## Verification

For each adapter, define at least:

- A PONG smoke check.
- A read-only review smoke check.
- A conflict/pollution smoke check.

