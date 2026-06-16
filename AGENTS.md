# AGENTS.md — fable-5-anything

This repository hosts portable prompt adaptation work derived from analysis of
Claude Fable 5 style prompts.

## Installing fable into a user's project — ASK FIRST

If a user asks you to install or set up fable into their project, do NOT assume a
mode. First **ask which mode** they want — don't pick one for them:

1. **Mode 1 — Governance-only (host-agnostic).** Just puts the fable constitution
   into agent context; no executor, no handoffs, no shims, and **no host-specific
   wiring**. One command, no host argument:
   `node bin/fable.js governance --project <proj>`
   It inlines the full portable core into the project's `AGENTS.md` + `CLAUDE.md`,
   so every host that auto-loads those (opencode, Codex, Claude Code, Grok,
   Copilot) is governed — zero `.fable/`, no `opencode.json`, no `.github/`.
   Exceptions: Kimi loads *skills*, not charter markdown → `fable kimi setup`;
   opencode users who want a slim charter + `opencode.json` `instructions` →
   `fable opencode setup`.
2. **Mode 2 — Full (governance + dispatch).** Adds the executor
   (`fable run` / `build-prompt` / `smoke` / `doctor`), the handoff contract, and
   local shims — host-specific by nature (runtime/model/adapter):
   `node bin/fable.js install --project <proj> --runtime opencode --model <model> --link path --yes`,
   then the host setup, e.g. `node bin/fable.js opencode setup --project <proj>`
   (or `codex setup --apply` / `kimi setup` / `copilot setup --apply` /
   `grok setup --apply`).

Confirm the mode (and, for Mode 2, the runtime/host) before running anything. Full
comparison and footprint table: `docs/install-modes.md`.

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

