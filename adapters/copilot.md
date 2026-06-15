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

## Copilot (M7)

fable integrates with GitHub Copilot CLI (verified against 1.0.54) via a charter
plus an MCP toolset that **reuses the same fable MCP server as Codex** (the
server is host-agnostic; M7 writes no new server).

- `fable copilot setup --project .` seeds the charter
  (`.github/copilot-instructions.md` + AGENTS.md + CLAUDE.md) and prints, or with
  `--apply` runs, `copilot mcp add fable -- node <entry> mcp-server`, which
  writes Copilot's local stdio MCP config (`~/.copilot/mcp-config.json`).
- The server exposes the read-only tools `fable_runtime`, `fable_build_prompt`,
  and `fable_doctor` — the exact same tools Codex sees.
- Verify in-session with `copilot -p "<prompt>" --allow-all-tools`. The host
  Copilot system and tool rules remain authoritative; the charter and MCP tools
  overlay governance and never override host rules.

See [docs/copilot-integration.md](../docs/copilot-integration.md) for the full
guide.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.
