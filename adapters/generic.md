# Generic (Opaque Host) Adapter

Use this adapter for opaque or not-yet-characterized agent hosts, including
agy/Antigravity-like tools, where the injection surface is unknown or limited.
Status: opaque/overlay. There is no fable executor for these hosts.

## Default Assumption

Assume overlay-only. Never assume the host exposes a safe full system-prompt
replacement. If a replacement path is later proven to be user-owned and safe,
document it and switch that specific runtime to a dedicated adapter — do not
generalize from one host to all opaque hosts.

## Injection Model

Use the highest available overlay surface, in this order of preference:

- durable project instructions (`AGENTS.md` or equivalent).
- custom instructions / agent config exposed by the host.
- a wrapper that prepends the assembled prompt, if and only if one exists.
- a prompt prelude as a last resort.

## Authority

Host system and tool rules win over fable. fable never tells the model to ignore
host instructions and never claims a provider identity the host has not
established. fable governs only portable behavior (read-first, handoff contract,
TDD/acceptance, minimal scoped changes, preserve user work, verify before
completion, return artifacts).

## Smoke Check

Prompt:

```text
Reply exactly PONG and nothing else.
```

Pass criteria: the host returns exactly `PONG` and makes no unrelated edits.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.
