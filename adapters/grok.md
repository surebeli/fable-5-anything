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

Verify the installed Grok CLI before use. A common command shape is:

```powershell
grok -p "<prompt>" --output-format json --no-auto-update -m <model>
```

Use the exact model id and flags required by the current installation.

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

