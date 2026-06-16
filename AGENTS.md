# AGENTS.md — fable-5-anything

This repository hosts portable prompt adaptation work derived from analysis of
Claude Fable 5 style prompts.

## Installing fable into a user's project — ASK FIRST

If a user asks you to install or set up fable into their project, do NOT assume a
mode. First **ask which mode** they want:

1. **Governance-only** — every agent prompt follows the fable constitution; no
   executor / handoffs / shims. `node bin/fable.js governance --project <proj> [--inline]`.
2. **Full (governance + dispatch)** — adds the `fable run` / `build-prompt` / `smoke`
   executor + handoff contract. `node bin/fable.js install --project <proj> --runtime
   opencode --model <model> --link path --yes`, then `node bin/fable.js <host> setup
   --project <proj>`.

Confirm the mode (and runtime/host) with the user before running anything. Full
comparison: docs/install-modes.md.

## Scope

Keep implementation artifacts in this repository:

- Portable core prompt rules.
- Claude-specific exclusion lists.
- Runtime adapters.
- Prompt assembly rules.
- Smoke and regression checklists.
- Decision records.

Do not place new implementation files for this work in `x-agents`; that
repository may keep handoff and review records only.

## Architecture

Use one shared core plus runtime adapters:

- Core: `prompts/portable-agent-core.md`
- Exclusions: `prompts/claude-fable-5-exclusions.md`
- Assembly: `dispatch/prompt-assembly.md`
- Adapters: `adapters/*.md`
- Tests: `tests/smoke-checklist.md`

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

