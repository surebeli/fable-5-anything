# Grok Adapter

Use this adapter for Grok CLI or hopper Grok dispatches.

## Role Fit

Grok is best used for:

- Research.
- Strategic pushback.
- Blind-spot hunting.
- Independent challenge reviews.
- Evidence gathering when the task is read-only.

Do not treat this role fit as a hard model-role binding. The dispatcher still
chooses model and runtime per task.

## Command Contract

Grok ships a full agentic CLI (verified against grok 0.2.51): interactive TUI,
headless `grok -p "<prompt>" --always-approve [--output-format json]`, custom
agents (`--agent`), permission rules (`--allow`/`--deny`), and MCP support
(`grok mcp add/list/remove`). It reads `AGENTS.md` as project instructions.

fable integrates via overlay, not replacement:

- Charter: `AGENTS.md` (+ `CLAUDE.md`) carry fable governance every session.
- MCP: register the host-agnostic fable MCP server with
  `grok mcp add fable -- node "<repo>/bin/fable.js" mcp-server` to expose
  read-only `fable_runtime`/`fable_build_prompt`/`fable_doctor` in-session.

Run `fable grok setup --project <dir> [--apply]` to seed the charter and register
the MCP server. Host Grok system and tool rules remain authoritative.

## Output Shape

For advisory tasks, prefer:

- Architecture.
- Risk.
- Missing evidence.
- Pushback.
- Recommendation.

For adversarial reviews, prefer:

- Blocker.
- Major.
- Minor.
- Verdict.

## Return Channel

Always write the requested result or review file. If the CLI only returns
stdout, capture and transfer the final result into the requested return path.

## Smoke Check

Prompt:

```text
Reply exactly PONG and nothing else.
```

Pass criteria: exit code 0 and final response exactly `PONG`.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.

