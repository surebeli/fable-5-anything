# Copilot Adapter

Use this adapter for GitHub Copilot CLI sessions and Copilot custom-agent
dispatches. Status: design/overlay. There is no fable executor for Copilot in
this milestone.

## Injection Model

Copilot ships its own system prompt, tool protocol, and permissions. fable does
NOT replace them. fable is layered as project governance via the highest
available overlay surface:

- `AGENTS.md` / custom instructions in the target repository.
- `--agent` custom agent definitions where supported.
- `--plugin-dir` plugins where supported.
- a prompt prelude as a last resort.

Verify the installed Copilot CLI's actual flags before relying on any of these.

## Authority

Host Copilot system and tool rules win over fable. fable never instructs the
model to ignore host instructions. fable governs portable behavior only: read
the project first, obey the handoff contract, TDD/acceptance gates, minimal
scoped changes, preserve user work, verify before completion, write
result/review artifacts.

## Command Contract

Treat command shapes as unverified until checked against the local install. A
common shape is:

```powershell
copilot --prompt "<prompt>" --agent <agent> --plugin-dir <dir>
```

## Smoke Check

Prompt:

```text
Reply exactly PONG and nothing else.
```

Pass criteria: the Copilot runtime returns exactly `PONG` and makes no unrelated
edits.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.
