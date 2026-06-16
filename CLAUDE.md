# CLAUDE.md — fable-5-anything

Read first when helping someone install or use fable.

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

## When committing fable into a shared repo

Commit the governance files: the `AGENTS.md` / `CLAUDE.md` charter (both modes).
If you used a host-specific setup (`fable opencode setup`), also commit the
`.fable/portable-agent-core.md` + `opencode.json` it creates — **Mode 1
governance-only produces neither.** Never commit machine-specific bits
(`.fable/bin/`, `.fable/fable.lock.json`) or any raw source prompt — gitignore them.

## Repo development

For working ON this repo (not installing it into a project), follow `AGENTS.md`.
