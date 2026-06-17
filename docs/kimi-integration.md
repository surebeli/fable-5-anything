# Kimi Integration

fable governs Kimi Code through a real **skill** plus a charter. fable
**overlays** Kimi: it layers project governance on top of Kimi's own system
prompt, tool protocol, and safety policy. It never replaces Kimi's system
prompt.

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
