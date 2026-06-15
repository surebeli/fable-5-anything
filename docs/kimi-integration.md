# Kimi Integration

fable governs Kimi Code through a real **skill** plus a charter. fable
**overlays** Kimi — it layers project governance on top of Kimi's own system
prompt, tool protocol, and safety policy. It never replaces Kimi's system
prompt. Kimi has a real skill primitive, so the portable core is delivered as a
fable skill (`SKILL.md`) plus the charter (AGENTS.md + CLAUDE.md).

## Surface A: Skill (`.fable/skills/fable/SKILL.md`)

Kimi loads skills from a skills directory where each skill lives at
`<skills-dir>/<name>/SKILL.md` with YAML frontmatter (`name` / `description`)
followed by the skill body. fable generates one such skill from the portable
core (`prompts/portable-agent-core.md`) plus the Kimi adapter
(`adapters/kimi.md`).

```bash
# Write the fable skill + charter and print the registration usage (offline)
node bin/fable.js kimi setup --project .
```

`kimi setup` writes `.fable/skills/fable/SKILL.md` (frontmatter `name: fable`
plus the portable core and Kimi adapter body) and seeds the charter
(AGENTS.md + CLAUDE.md plus any host-specific charter files) using the
idempotent `<!-- FABLE-START -->` / `<!-- FABLE-END -->` markers, so re-running
is safe and your own content survives.

Use the skill in Kimi by pointing it at the skills directory:

```bash
kimi --skills-dir ".fable/skills" -p "<your task>"
```

Or register it permanently in `~/.kimi-code/config.toml` so it is always
available:

```toml
extra_skill_dirs = ["<abs-path>/.fable/skills"]
```

Kimi auto-merges available skills (`merge_all_available_skills = true`), so the
fable skill becomes always-on governance once registered. The host system
prompt and tool rules remain authoritative; the fable skill overlays governance
and never overrides host rules.

## Surface B: Charter (AGENTS.md + CLAUDE.md)

Kimi reads project instruction files every session. `kimi setup` seeds and
maintains them as the governance charter alongside the skill. `AGENTS.md` is the
primary charter file; `CLAUDE.md` is seeded for cross-tool parity so the same
constitution is visible to Claude-aware tooling in the repo.

## Real-usage walkthrough

```bash
# 1. Write the fable skill + charter and get the --skills-dir registration
node bin/fable.js kimi setup --project .

# 2. Dispatch a task; Kimi loads the fable skill and follows the handoff
kimi --skills-dir ".fable/skills" -p "follow .fable/handoffs/<task>.md"
```

During the session Kimi merges the fable skill (always-on governance) and reads
`AGENTS.md` (the fable charter), then obeys the handoff contract. The skill and
charter overlay Kimi — host rules always win on conflict.

See [runtime-overlay-model.md](runtime-overlay-model.md) for the authority stack
and why fable overlays rather than replaces.
