# Kimi Adapter

Use this adapter for Kimi CLI or hopper Kimi dispatches.

## CLI Contract

Do not copy flags from another runtime. Verify the installed Kimi CLI help before
writing a new dispatcher command. In particular, do not assume that a `--print`
flag exists.

Record the verified command shape in the dispatch log or handoff before using it
for real work.

## Low-Interaction Discipline

Kimi dispatches should complete from the handoff document without requiring
interactive clarification.

If the handoff is insufficient, write a partial result that states:

- What is missing.
- Why the missing input blocks a reliable answer.
- What file or field should be added to the handoff.

Do not abandon the return channel.

## Long-Document Handling

Read the handoff completely before writing the result. For long handoffs, keep
the output anchored to the required sections and acceptance gates rather than
summarizing broadly.

## Uncertainty Handling

When a conclusion depends on unavailable logs, code, or current external facts,
mark it as uncertain. Do not present plausible synthesis as verified evidence.

## Smoke Check

Prompt:

```text
Reply exactly PONG and nothing else.
```

Pass criteria: the Kimi runtime returns exactly `PONG`, exits cleanly, and does
not require interactive input.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.

