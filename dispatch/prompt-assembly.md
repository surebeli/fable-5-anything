# Prompt Assembly

This document defines how to build a dispatch prompt from the portable core and
one runtime adapter.

## Assembly Order

Build prompts in this order:

1. Target repository instructions, if the runtime does not already inject them.
2. `prompts/portable-agent-core.md`.
3. Exactly one runtime adapter from `adapters/`.
4. A short task prompt that points to the handoff document.

Do not paste the handoff background inline. The task prompt should be short:

```text
Read <handoff-path>. Follow the portable core and the <runtime> adapter. Write
the result to <return-path>.
```

## Adapter Selection

Select adapters by runtime, not by model family:

| Runtime | Adapter |
|---|---|
| Codex plugin or bare Codex CLI | `adapters/codex.md` |
| opencode with DeepSeek or MiMo models | `adapters/opencode.md` |
| Kimi CLI / hopper Kimi | `adapters/kimi.md` |
| Grok CLI / hopper Grok | `adapters/grok.md` |

Model selection belongs to the dispatcher or project dispatch protocol. Runtime
mechanics belong to adapters.

## Conflict Rule

Adapters can add execution details only. They cannot override or weaken the
portable core.

Every adapter must end with this statement:

```text
These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.
```

## Prompt Builder Responsibility

The dispatcher, not the remote model, is responsible for choosing the adapter.

The dispatcher must record:

- Handoff path.
- Runtime and model.
- Adapter path.
- Return path.
- Smoke status, when available.

For repeatable dispatch, store this metadata in the handoff, the result file, or
the dispatch log.

## Invalid Assemblies

Do not assemble prompts that:

- Include more than one runtime adapter.
- Include Claude-specific system prompt sections.
- Include provider tool schemas for a different runtime.
- Replace the handoff contract with long inline background.
- Omit the return path.

