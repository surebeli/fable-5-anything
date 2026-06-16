# CLAUDE.md — fable-5-anything

Read first when helping someone install or use fable.

## Installing fable into a user's project — ASK FIRST

If a user asks you to install or set up fable into their project, do NOT assume a
mode. First **ask the user which mode** they want — don't just pick one:

1. **Governance-only** — the fable constitution governs every agent prompt; no
   executor. `node bin/fable.js governance --project <proj> [--inline]`
   (`--inline` = zero `.fable/`; the full portable core is embedded directly into
   the project's `AGENTS.md` + `CLAUDE.md`).
2. **Full (governance + dispatch)** — adds `fable run` / `build-prompt` / `smoke`
   + the handoff contract + local shims. `node bin/fable.js install --project
   <proj> --runtime opencode --model <model> --link path --yes`, then
   `node bin/fable.js <host> setup --project <proj>`.

Confirm the mode (and the runtime/host) before running anything. Full comparison
and footprint table: `docs/install-modes.md`.

## When committing fable into a shared repo

Commit only the governance files (charter + `.fable/portable-agent-core.md` +
`opencode.json`). Never commit machine-specific bits (`.fable/bin/`,
`.fable/fable.lock.json`) or any raw source prompt — gitignore them.

## Repo development

For working ON this repo (not installing it into a project), follow `AGENTS.md`.
