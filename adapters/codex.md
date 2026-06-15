# Codex Adapter

Use this adapter for Codex plugin sessions and bare Codex CLI dispatches.

## Runtime Modes

There are two common Codex modes:

- Companion/plugin mode: runs inside an existing Codex session with current
  tools, skills, sandbox state, and repository context.
- Bare CLI mode: runs through `codex exec` or an equivalent command from a
  dispatcher.

Do not assume these modes have the same tools, memory, approvals, or sandbox.

## Concurrency

Codex dispatches that share credentials or companion runtime state should be
serialized unless the target environment explicitly supports parallel use.

If a project dispatch protocol says a Codex preset is serial-only, obey it.

## Sandbox Discipline

Use read-only mode for planning and review tasks. Use edit/write mode only after
the handoff permits implementation.

Never write outside the approved workspace unless the user or host grants that
permission.

## Skill And Instruction Loading

Read relevant local workflow instructions before acting:

- Target repository `AGENTS.md` or equivalent.
- Relevant skills exposed by the current Codex session.
- Handoff documents named by the dispatcher.

Do not use Claude skill paths or Claude tool names unless they are actually
available in the current Codex runtime.

## Charter + MCP (M6)

fable governs Codex through two surfaces (see `docs/codex-integration.md`).

- **Charter (AGENTS.md + CLAUDE.md):** `fable charter sync` and `fable install`
  seed the portable constitution into `AGENTS.md` and `CLAUDE.md` using the
  idempotent `<!-- FABLE-START -->` / `<!-- FABLE-END -->` markers. Codex loads
  `AGENTS.md` every session; `CLAUDE.md` is seeded for cross-tool parity. User
  content outside the markers is preserved.
- **MCP tools:** `fable codex setup --apply` (or the printed
  `codex mcp add fable -- node <entry> mcp-server`) registers fable's stdio MCP
  server. It exposes only read-only governance tools: `fable_runtime`,
  `fable_build_prompt`, and `fable_doctor`. No mutating or exec tools are
  exposed.

Codex has no skill primitive, and fable overlays (never replaces) Codex's system
prompt.

## Verification Before Completion

Do not claim that a change is complete until the acceptance checks have run.
If a check is skipped, unavailable, or blocked, report that explicitly.

## Smoke Check

Prompt:

```text
Reply exactly PONG and nothing else.
```

Pass criteria: the Codex runtime returns exactly `PONG` and no unrelated edits
are made.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.

