# M6 — Codex Integration (roadmap / design)

Status: planned. This is a design/behavior spec, not an executable TDD plan. It
defines what M6 must do so that, when scheduled, it can be turned into a plan and
executed the same way M4/M5 were.

## Goal

Make Codex consume fable governance from **inside** a Codex session without the
user manually running `build-prompt` and pasting. Codex's own system prompt, tool
protocol, sandbox, and approvals stay authoritative; fable is layered as project
governance (overlay), never as a system-prompt replacement.

## Behavior to deliver

1. **In-session governance loads automatically.** When a Codex session starts in
   a fable-enabled project, the fable portable core + the Codex adapter rules are
   present in context via the project charter (see "Charter file set" below), not
   via a one-off prompt.
2. **Handoff-driven work.** The user (or Codex itself) can say "execute
   `.fable/handoffs/<task>.md`" and Codex follows the four-section contract
   (Goal/Background/Acceptance/Return), writing the result to the return path.
3. **Two delivery forms, pick per environment:**
   - **Codex skill** wrapping the fable handoff rules + portable core, loaded by
     Codex before acting. This replaces the explicit `build-prompt` step.
   - **Codex plugin** exposing `fable install`, `fable doctor`, `fable build-prompt`
     (and `fable runtime`) as callable commands inside the session.
4. **Honest status.** `fable runtime codex` flips from `planned` to `implemented`
   only once a delivery form actually works end-to-end; until then it stays
   `planned` and `commandSupport` stays `[]`.

## Charter file set (the constitution is more than AGENTS.md)

Hosts auto-load a *set* of durable instruction files, not a single file. fable
must treat the project "charter/constitution" as that set and inject its
governance block (idempotent `<!-- FABLE-START -->` … `<!-- FABLE-END -->`
markers, already used for AGENTS.md) into each file the target host actually
reads:

| Host | Primary charter file(s) | Notes |
|---|---|---|
| Codex CLI | `AGENTS.md` | Codex's documented project-instruction file. |
| Claude Code | `CLAUDE.md` (and often also `AGENTS.md`) | `CLAUDE.md` is commonly treated as the charter. |
| Copilot CLI | `.github/copilot-instructions.md` (and increasingly `AGENTS.md`) | |
| Gemini CLI | `GEMINI.md` | |
| opencode | `AGENTS.md` / `opencode.json` | |
| generic/opaque | `AGENTS.md` | Safe default. |

M6 specifically owns the Codex column (`AGENTS.md`) but must NOT hardcode the
assumption that AGENTS.md is the only charter. The recommended shared mechanism:

- Add a `charterFiles` array to each runtime entry in
  `adapters/runtime-capabilities.json` (e.g. codex → `["AGENTS.md"]`,
  claude → `["CLAUDE.md","AGENTS.md"]`).
- A shared `fable charter sync --project <dir>` (or an extension of `install`)
  writes/updates the marked fable block into every charter file for the
  configured runtime, idempotently, preserving user content (same `.new`
  protection as M3 templates).
- Because a project may be opened by more than one host (e.g. both Claude and
  Codex), `charter sync` should be able to target a set of runtimes and seed all
  their charter files at once.

Today (post-M4) `install` writes only `AGENTS.md`. Generalizing to the charter
set is the first concrete sub-task of M6 and is reused by M7.

## What is in scope for M6

- Codex skill OR plugin (at least one), proven against a real Codex CLI.
- Charter-set injection generalized beyond AGENTS.md (shared with M7), including
  `CLAUDE.md` recognition for projects also used from Claude Code.
- `runtime-capabilities.json` gains `charterFiles`; `codex` status → `implemented`
  only when proven; `fable runtime codex` reflects the real delivery form.
- Docs: how to enable fable inside Codex; how the charter set works.

## What is OUT of scope for M6

- Kimi/Copilot/opencode deeper adapters (that is M7).
- npm publish / public release (M5 prepares packaging; M8 releases).
- Replacing Codex's system prompt (never — overlay only).

## Acceptance direction

- In a fable-enabled repo, starting Codex and asking it to run a handoff results
  in the four-section contract being followed and the result written to the
  return path, with fable governance demonstrably in context.
- `fable runtime codex` reports the real status/injection form (no overclaiming).
- Charter injection is idempotent and preserves user-authored content across
  `AGENTS.md` and `CLAUDE.md`.
- Host Codex system/tool rules remain authoritative; nothing instructs Codex to
  ignore host instructions.

## Open questions to resolve before planning M6

1. Skill vs plugin first? (Recommend skill — lower coupling, easier to verify.)
2. Does the local Codex CLI expose a stable skill/plugin loading path we can
   target, or do we start with AGENTS.md charter injection only?
3. Should `charter sync` default to seeding both `AGENTS.md` and `CLAUDE.md` when
   the project shows signs of multi-host use, or only the configured runtime's
   set?

## Dependencies

- Builds on M4 (runtime model + capabilities + adapters) and M5 (packaging, so
  the Codex skill/plugin can reference a stable fable entry rather than a clone).
