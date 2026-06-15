# Runtime Overlay Model

fable-5-anything is portable prompt governance, not "the Claude prompt for every
model". This document explains how fable injects its governance into different
agent runtimes, and why the mechanism differs per runtime.

## System replacement vs overlay

Claude Code exposes a strong path to **replace** the system prompt: a user can
start a session with `--system-prompt-file` and make the whole session follow a
new operating constitution. That does not generalize. opencode, Kimi Code,
Codex CLI, Copilot CLI, and similar tools already ship their own system prompts,
tool protocols, permissions, safety policies, and project-instruction loaders.
Most expose no safe "replace the entire system prompt" API. Even their custom
instructions usually layer **below** vendor and tool rules.

So fable supports two injection postures:

- **system-replace (Claude only, user-owned):** the user explicitly replaces the
  system prompt. fable treats this as reference only and ships no Claude
  executor.
- **overlay (everyone else):** fable is layered as project governance on top of
  the host's authoritative system prompt and tool protocol.

## Authority stack

```text
Vendor/platform hard rules
> Agent CLI built-in system prompt and tool protocol
> Project instructions / skills / plugins / agent config
> fable portable core + runtime adapter
> Current handoff / user task
```

(See also the Priority Order in `prompts/portable-agent-core.md`.)

## Conflict policy

Host agent rules win over fable. When a lower-priority instruction conflicts with
a higher-priority one, fable states the conflict and obeys the higher priority.
fable never claims a provider identity (Claude, Codex, Kimi, Copilot, opencode,
Grok) unless the host itself establishes it.

## Why fable avoids "ignore previous instructions"

fable cooperates with the host instead of fighting it. It does not tell the model
to ignore host or system instructions, because (1) it is layered below those
rules and cannot safely override them, and (2) prompt-injection-style overrides
are exactly the behavior host safety layers are built to resist. fable governs
only portable behavior: read the project first, obey the handoff contract, use
TDD/acceptance gates, make minimal scoped changes, preserve user work, verify
before completion, write result/review artifacts, and avoid long inline dispatch
context when a handoff file exists.

## How portable core maps into each runtime

The portable core (`prompts/portable-agent-core.md`) is runtime-neutral. Each
runtime adapter under `adapters/` adds only the mechanics for that host. The
machine-readable map is `adapters/runtime-capabilities.json`; inspect it from the
CLI with `fable runtime <name>` or `fable runtime --list`.

## Charter file set

The fable charter is the runtime-neutral constitution written into a project's
instruction files. The base set is `AGENTS.md` + `CLAUDE.md`, plus any
host-specific extras declared in a runtime's `charterFiles`. `fable charter sync`
and `fable install` write the constitution into these files using the idempotent
`<!-- FABLE-START -->` / `<!-- FABLE-END -->` markers, preserving user content
outside the markers. For codex, the charter (AGENTS.md + CLAUDE.md) plus the
read-only MCP tools (`fable_runtime`, `fable_build_prompt`, `fable_doctor`) form
the overlay path; see `docs/codex-integration.md`.

## Per-runtime support

| Runtime | Status | Injection mode | Host system policy | Adapter |
|---|---|---|---|---|
| claude | reference-only | system-prompt-file | system-replace-when-user-owned | (none) |
| opencode | implemented | prompt-prelude | overlay | adapters/opencode.md |
| codex | planned | agents-md-or-plugin | overlay | adapters/codex.md (charterFiles: AGENTS.md; charter + MCP path) |
| kimi | planned | skill-or-prompt-prelude | overlay | adapters/kimi.md |
| grok | planned | prompt-prelude | overlay | adapters/grok.md |
| copilot | planned | custom-instructions-or-plugin | overlay | adapters/copilot.md |
| agy (generic opaque host) | opaque | custom-instructions-or-wrapper | overlay | adapters/generic.md |

## Executable today vs planned

- **Executable today:** opencode only. `fable build-prompt`, `fable smoke`,
  `fable run`, and the opencode-specific `fable doctor` checks operate against a
  configured opencode runtime.
- **Planned / design-only:** codex, kimi, grok, copilot. Their adapters and
  capability metadata exist and are introspectable, but fable ships no executor
  for them in this milestone, and `doctor` reports them as overlay/planned rather
  than running host-specific checks.
- **Opaque:** agy and similar hosts default to overlay-only; never assume system
  replacement until a specific host is proven user-owned and safe.

This document is intended to be reusable as PR/launch article source material.
