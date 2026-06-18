# Kimi Integration

fable governs Kimi Code by **overlaying** project governance on top of Kimi's own
system prompt, tool protocol, and safety policy — it never replaces Kimi's system
prompt. There are two delivery paths:

- **Charter (Kimi 0.17.1+).** Recent Kimi auto-loads `AGENTS.md`, so
  `fable governance --project .` (which inlines the portable core into `AGENTS.md`
  + `CLAUDE.md`) governs Kimi directly — no Kimi-specific step needed.
- **Skill (all versions; required on older Kimi).** Older Kimi (the 0.14.x era)
  read only skills, not charter markdown. `fable kimi setup` writes a skill that
  also bundles the Kimi runtime adapter; use it on older Kimi, or to ship the
  adapter alongside the core.

## Skill (`.fable/skills/fable/SKILL.md`)

Kimi loads skills from a skills directory where each skill lives at
`<skills-dir>/<name>/SKILL.md` with YAML frontmatter (`name` / `description`)
followed by the skill body. fable generates one such skill from the portable
core plus the Kimi adapter.

```bash
node bin/fable.js kimi setup --project .
```

`kimi setup` writes `.fable/skills/fable/SKILL.md` and seeds the charter
(`AGENTS.md` + `CLAUDE.md`) using the idempotent `<!-- FABLE-START -->` /
`<!-- FABLE-END -->` markers.

Use the skill in Kimi by pointing it at the skills directory:

```bash
kimi --skills-dir ".fable/skills" -p "<your task>"
```

Or register it permanently in `~/.kimi-code/config.toml` so it is always
available:

```toml
extra_skill_dirs = ["<abs-path>/.fable/skills"]
```

During a session, Kimi merges the fable skill and reads the charter. The skill
and charter overlay Kimi; host rules always win on conflict.

See [runtime-overlay-model.md](runtime-overlay-model.md) for the authority stack.
