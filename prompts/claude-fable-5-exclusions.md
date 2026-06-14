# Claude Fable 5 Exclusion List

This file defines what must not be migrated from a Claude-specific system prompt
into `portable-agent-core.md`.

The goal is not to clone Claude. The goal is to preserve portable engineering
discipline while avoiding identity, tool, filesystem, and product contamination.

## Hard Exclusions

Do not migrate these categories into the portable core:

- Claude or Anthropic identity preambles.
- Claude Fable, Mythos, Opus, Sonnet, Haiku, or model-string product claims.
- Anthropic product descriptions, settings, plans, apps, ads policy, or support
  behavior.
- Claude Code, Claude Cowork, Claude in Chrome, Claude in Excel, Claude in
  PowerPoint, or Claude mobile product recommendations.
- Anthropic reminder mechanisms and classifier names.
- Claude memory system statements.
- Claude Artifacts, persistent artifact storage, `window.storage`, or artifact
  rendering rules.
- Claude MCP App connector suggestion policy.
- AntML tags such as `{antml:invoke}`, `{antml:cite}`, thinking mode tags, or
  artifact tags.
- Claude tool schemas, including `create_file`, `present_files`, `bash_tool`,
  `view`, `web_search`, and similar definitions.
- Claude filesystem paths such as `/home/claude`, `/mnt/user-data/uploads`,
  `/mnt/user-data/outputs`, `/mnt/skills/public`, or `/mnt/transcripts`.
- Claude network allowlists and sandbox mount descriptions.
- Anthropic API examples, "Claudeception", or provider-managed API key behavior.
- Consumer-facing emotional support and wellbeing policies that are not needed
  for engineering agent dispatch.
- Fixed dates or model knowledge cutoffs from another runtime.

## Conditional Migration

These ideas may be migrated only after rewriting them in runtime-neutral form:

- Search discipline: keep the rule to verify current or unstable facts, but
  replace Claude tool names with the active runtime's tools.
- Copyright discipline: keep paraphrase-first constraints, but remove AntML
  citation syntax.
- File handling discipline: keep "check that files exist" and "write requested
  artifacts", but replace Claude paths with the target runtime's paths.
- Skill discipline: keep "read relevant local workflow instructions first", but
  replace Claude skill locations and tool names with the active runtime's skill
  mechanism.
- Tool-use examples: keep the principle of using real tools over pretending,
  but remove Claude-specific function names and JSON schemas.

## Admission Test

Before moving any sentence from a Claude-specific prompt into the portable core,
answer all of these questions:

1. Does it still make sense if the runtime is Codex, Kimi, DeepSeek, MiMo, or
   Grok?
2. Does it avoid provider identity claims?
3. Does it avoid provider-specific tools, tags, paths, and product facts?
4. Does it strengthen behavior without constraining the wrong runtime?
5. Can it be tested by a smoke task or review task?

If any answer is no, put the rule in a runtime adapter or leave it out.

