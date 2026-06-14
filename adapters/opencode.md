# opencode Adapter

Use this adapter for opencode runtimes, including DeepSeek and MiMo models.

Split by runtime, not by model. DeepSeek and MiMo share the same opencode
execution hazards, so they share this adapter.

## Minimum Headless Command

Use a non-interactive command shape that drains logs and returns parseable
output:

```powershell
opencode run "<prompt>" `
  --model <provider/model> `
  --dangerously-skip-permissions `
  --print-logs `
  --format json `
  --pure
```

Use the provider-prefixed model id required by the local opencode configuration.

## Working Directory Rule

Do not point opencode at a giant repository as its project directory. Large
repositories can stall snapshot and watcher setup before the model is called.

Use a small scratch directory as the working directory when practical, and refer
to source repositories by absolute paths in the handoff.

## Output Handling

opencode is stdout-oriented. Capture stdout and parse the JSON event stream.
Accumulate final text from message-part events as supported by the active
opencode version.

Do not treat command launch as success. Check:

- Exit code.
- Output file existence, when the task requires a file.
- Verdict or result marker in the output.
- Absence of permission or tool errors.

## Review Discipline

For review tasks, the model may write only the requested review artifact. It
must not modify source code or unrelated handoff files.

Required review verdicts:

- `ACCEPT`
- `APPROVE-WITH-MINOR`
- `REVISION`
- `REJECT`

## Smoke Check

Before using a newly configured opencode model for real work, run a real model
call. A dry `--check` is not enough.

Prompt:

```text
Reply exactly PONG and nothing else.
```

Pass criteria: exit code 0 and final response exactly `PONG`.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.

