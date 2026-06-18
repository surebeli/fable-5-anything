# Kimi Adapter

Use this adapter for Kimi CLI or hopper Kimi dispatches. Status: implemented.
Kimi 0.17.1+ auto-loads `AGENTS.md`, so the charter governs it directly; the
fable skill (via `--skills-dir`, verified against kimi-code 0.14.2) remains for
older Kimi and bundles this adapter. fable layers governance as an overlay; the
host Kimi system and tool rules stay authoritative.

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

## Kimi (M7)

fable integrates with Kimi Code two ways: Kimi 0.17.1+ auto-loads the **charter**
(`AGENTS.md`), so `fable governance` governs it directly; older Kimi (the 0.14.2
era) reads only skills, so the fable **skill** path below is required there and
also bundles this adapter. Kimi loads skills from a skills directory where each skill is
`<skills-dir>/<name>/SKILL.md` with YAML frontmatter (`name` / `description`)
and a body.

- `fable kimi setup --project .` writes `.fable/skills/fable/SKILL.md`
  (frontmatter `name: fable` + the portable core + this adapter) and seeds the
  charter (AGENTS.md + CLAUDE.md), then prints the registration usage.
- Use it via `kimi --skills-dir ".fable/skills" -p "<task>"`, or register it
  permanently with `extra_skill_dirs = ["<abs>/.fable/skills"]` in
  `~/.kimi-code/config.toml`.
- Kimi auto-merges available skills (`merge_all_available_skills = true`), so the
  fable skill becomes always-on governance. The host system prompt and tool
  rules remain authoritative; the fable skill overlays governance and never
  overrides host rules.

See [docs/kimi-integration.md](../docs/kimi-integration.md) for the full guide.

These adapter rules obey all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.

