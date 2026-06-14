# Decision Record: Claude Fable 5 Adaptation For Non-Claude Agents

Date: 2026-06-14

## Decision

Host the implementation of the non-Claude Fable 5 adaptation strategy in this
repository.

Use one portable core plus runtime adapters.

## Why

A single universal prompt would mix incompatible runtime facts. opencode, Kimi,
Codex, and Grok have different tool protocols, CLI behavior, output capture
rules, filesystem assumptions, and failure modes.

Fully separate prompts would duplicate the same constitutional rules and allow
TDD, handoff discipline, safety, copyright, and tool honesty to drift.

The selected structure keeps shared behavior in one file and isolates runtime
mechanics in small adapters.

## Source Review

The strategy was reviewed by P3 (opencode + DeepSeek v4 pro) in the x-agents
repository. The P3 verdict was `APPROVE-WITH-MINOR` with no blockers.

P3 required three implementation details:

- Define an exclusion list before writing the core.
- Define prompt assembly and adapter selection.
- Make adapters additive only; they cannot weaken the core.

This repository implements those requirements.

## Files

- `prompts/portable-agent-core.md`
- `prompts/claude-fable-5-exclusions.md`
- `dispatch/prompt-assembly.md`
- `adapters/codex.md`
- `adapters/opencode.md`
- `adapters/kimi.md`
- `adapters/grok.md`
- `tests/smoke-checklist.md`

