# M7 — Kimi / Copilot / opencode Deeper Adapters (roadmap / design)

Status: planned. Design/behavior spec, not an executable TDD plan. Sequenced
after M6 (which establishes charter-set injection and the first in-session
delivery form on Codex).

## Goal

Make the non-opencode vendors operational from inside their own host sessions,
and deepen the opencode adapter beyond inline prompts — all via overlay, never
system-prompt replacement.

## Per-vendor behavior to deliver

### Kimi (`injectionMode: skill-or-prompt-prelude`)
- Investigate `--skills-dir`; produce `.fable/skills/fable/SKILL.md` (or the
  equivalent the installed Kimi expects) carrying the portable core + Kimi
  adapter rules.
- Verify `kimi --prompt` dry-run/live where safe.
- `fable runtime kimi` flips to `implemented` only once a real path works.

### Copilot (`injectionMode: custom-instructions-or-plugin`)
- Investigate `--agent`, `--plugin-dir`, and custom-instructions behavior.
- Decide whether fable ships a plugin, custom instructions, or both.
- Charter file: `.github/copilot-instructions.md` (plus `AGENTS.md` where Copilot
  reads it) — injected via the shared charter-set mechanism.

### opencode (already `implemented`, deepen it)
- Investigate `opencode agent` and plugin config.
- Decide whether the assembled prompt should move from an inline prompt to a
  prompt file or agent config (less fragile than a giant inline string).
- Keep the existing executor and its flags intact (regression-locked from M4).

## Charter file set (shared with M6, extended here)

M7 reuses the charter-set mechanism defined in M6 and extends it to the hosts it
owns. The constitution is a *set* of durable instruction files; fable injects its
idempotent `<!-- FABLE-START -->` … `<!-- FABLE-END -->` block into each file the
target host reads:

| Host | Charter file(s) M7 must handle |
|---|---|
| Kimi | `AGENTS.md` and/or `.fable/skills/fable/SKILL.md` |
| Copilot | `.github/copilot-instructions.md`, `AGENTS.md` |
| opencode | `AGENTS.md`, `opencode.json` (if used for agent config) |
| (cross-host) | `CLAUDE.md` when the same repo is also used from Claude Code |

`runtime-capabilities.json` carries `charterFiles` per runtime (introduced in
M6); M7 fills in the Kimi/Copilot/opencode entries and makes `fable charter sync`
seed them. Injection stays idempotent and preserves user content (`.new`
protection).

## What is in scope for M7

- At least one of Kimi/Copilot proven operational in-session (skill/plugin/
  custom-instructions), with `fable runtime <name>` reflecting real status.
- opencode prompt delivery hardened (prompt file or agent config) without
  breaking the M1–M4 opencode executor or its flags.
- Charter-set entries for Kimi/Copilot/opencode (and `CLAUDE.md` cross-host
  recognition) wired into capabilities + `charter sync`.
- Docs per vendor: how to enable fable inside that host.

## What is OUT of scope for M7

- npm publish / public launch (M8).
- Any claim of system-prompt replacement for these hosts (overlay only).
- Vendors not listed here.

## Acceptance direction

- For each vendor marked `implemented`, a real in-session run follows the handoff
  contract and writes the result to the return path, with fable governance in
  context via the host's charter/skill/plugin surface.
- No vendor is reported as `implemented` unless proven end-to-end (the M4 FAIL
  gate against overclaiming still applies).
- opencode regression: executor + flags unchanged; existing tests stay green.
- Charter injection idempotent and non-destructive across all targeted files.

## Open questions to resolve before planning M7

1. Which vendor first — Kimi (skills-dir looks closest) or Copilot?
2. For opencode, is prompt-file or agent-config the better delivery, and does it
   change the dry-run command shape that doctor asserts?
3. How much of the host-CLI flag knowledge can be verified locally vs must be
   marked "verify against your install" in the adapter?

## Dependencies

- M4 (runtime model), M5 (stable packaged entry for skill/plugin references),
  M6 (charter-set mechanism + first in-session delivery form on Codex).
