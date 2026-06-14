# fable-5-anything

Portable prompt governance for adapting useful Claude Fable 5 style behaviors to
non-Claude agent runtimes without copying Claude-specific identity, tools, paths,
or product assumptions.

## Quickstart: Embed in your project (5 minutes)

See [docs/embed-in-your-project.md](docs/embed-in-your-project.md).

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
node bin/fable.js install --project <your-project> --runtime opencode --model tokenbox/deepseek-v4-pro --yes
node bin/fable.js doctor --project <your-project>
```

After install, call fable from within your project using the local shim:

```bash
# Windows (PowerShell / cmd)
.fable\bin\fable.cmd doctor
.fable\bin\fable.cmd build-prompt .fable/handoffs/example.md
.fable\bin\fable.cmd smoke --dry-run
.fable\bin\fable.cmd run .fable/handoffs/example.md --dry-run

# Or from the fable repo:
node bin/fable.js build-prompt --project <your-project> --handoff <your-project>/.fable/handoffs/example.md
node bin/fable.js smoke --project <your-project> --dry-run
node bin/fable.js run .fable/handoffs/example.md --project <your-project> --dry-run
```

## Quickstart: DeepSeek + opencode (from within fable repo)

See [docs/quickstart-deepseek.md](docs/quickstart-deepseek.md).

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
node bin/fable.js init --cwd . --runtime opencode --model tokenbox/deepseek-v4-pro --yes
node bin/fable.js build-prompt --handoff examples/deepseek-handoff.md --config examples/fable.config.json
node bin/fable.js smoke --config examples/fable.config.json
node bin/fable.js run examples/deepseek-handoff.md --config examples/fable.config.json
npm test
```

## Commands

| Command | Description |
|---|---|
| `fable install --project <dir>` | Bootstrap a project with .fable/ config, handoffs, shims, README, .gitignore, and AGENTS.md. Safe re-run preserves user files. |
| `fable doctor --project <dir>` | Check 9 items: config, adapter, core, handoff, opencode dry-run, opencode PATH, AGENTS.md, gitignore, shims. No model calls. |
| `fable init --cwd <dir>` | Create `.fable/config.json` only |
| `fable build-prompt --handoff <path>` | Assemble dispatch prompt |
| `fable smoke [--execute]` | PONG smoke check (dry-run by default) |
| `fable run <handoff> [--dry-run]` | Execute opencode run |

All commands support `--project <dir>` for project-scoped use and `--config <path>` for explicit config.

After install, use the local shim from within your project: `.fable/bin/fable.cmd <command>`.

## Strategy

Use a shared behavior core plus thin runtime adapters.

- `prompts/portable-agent-core.md` is the model-neutral constitution.
- `adapters/*.md` adds runtime-specific execution facts.
- `prompts/claude-fable-5-exclusions.md` lists Claude-specific material that must
  not be migrated into the portable core.
- `dispatch/prompt-assembly.md` defines how dispatchers assemble a final prompt.
- `tests/smoke-checklist.md` defines minimum validation before an adapter is used.

The core owns principles. Adapters own mechanics. If an adapter conflicts with
the core, the core wins.

## Repository Status

This repository is the implementation home for the non-Claude adaptation work
that was first reviewed in `x-agents`.

Source review record:

- `x-agents/planning/handoffs/NONCLAUDE-PROMPT-ADAPTER-P3.md`
- `x-agents/planning/handoffs/NONCLAUDE-PROMPT-ADAPTER-P3-review.md`
- `x-agents/planning/handoffs/FABLE-M1-CLI-review.md`
- `x-agents/planning/handoffs/FABLE-M2-EMBED-result.md`
- `x-agents/planning/handoffs/FABLE-M2-EMBED-review.md`

### M3 (current)

- Install protection: re-run preserves user-modified handoff/README; writes `.new` templates.
- Local shims: `.fable/bin/fable.cmd`, `.fable/bin/fable.ps1`, `.fable/bin/fable`.
- Doctor hardening: 9 checks including opencode PATH, AGENTS.md, gitignore, shim.
- Demo: `scripts/demo-x-agents.ps1` and `docs/demo-x-agents.md`.
