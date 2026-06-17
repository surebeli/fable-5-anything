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
> Current user task
```

(See also the Priority Order in `prompts/portable-agent-core.md`.)

## Conflict policy

Host agent rules win over fable. When a lower-priority instruction conflicts with
a higher-priority one, fable states the conflict and obeys the higher priority.
fable never claims a provider identity (Claude, Codex, Kimi, Copilot, opencode,
Grok) unless the host itself establishes it.

## How portable core maps into each runtime

The portable core (`prompts/portable-agent-core.md`) is runtime-neutral. Each
runtime adapter under `adapters/` adds only the mechanics for that host. The
machine-readable map is `adapters/runtime-capabilities.json`; inspect it from the
CLI with the `runtime` command.

## Charter file set

The fable charter is the runtime-neutral constitution written into a project's
instruction files. The base set is `AGENTS.md` + `CLAUDE.md`, plus any
host-specific extras declared in a runtime's `charterFiles`.

`fable governance` inlines the full core into the base charter. `fable charter
sync` and the host setup commands seed the relevant charter files using the
idempotent `<!-- FABLE-START -->` / `<!-- FABLE-END -->` markers, preserving user
content outside the markers.

For Codex, Copilot, and Grok, the charter plus the read-only MCP tool
(`fable_runtime`) form the overlay path. Kimi uses a skill plus the charter.
opencode can use a slim charter plus `opencode.json` `instructions`.

## Per-runtime support

| Runtime | Status | Injection mode | Host system policy | Adapter |
|---|---|---|---|---|
| claude | reference-only | system-prompt-file | system-replace-when-user-owned | (none) |
| opencode | implemented | prompt-prelude | overlay | adapters/opencode.md |
| codex | implemented | agents-md-and-mcp | overlay | adapters/codex.md |
| kimi | implemented | skill | overlay | adapters/kimi.md |
| grok | implemented | mcp-and-charter | overlay | adapters/grok.md |
| copilot | implemented | mcp-and-charter | overlay | adapters/copilot.md |
| agy (generic opaque host) | opaque | custom-instructions-or-wrapper | overlay | adapters/generic.md |

All adapted runtimes are governance overlays. Background dispatch to vendor CLIs
has moved to [hopper-plugin](https://github.com/surebeli/hopper-plugin).
