# fable-5-anything

Portable prompt governance for adapting useful Claude Fable 5 style behaviors to
non-Claude agent runtimes without copying Claude-specific identity, tools, paths,
or product assumptions.

## Quickstart: Embed in your project (5 minutes)

Zero-clone install (no repo path to remember):

```bash
# one-off, via npx straight from GitHub source (no npm publish required)
npx -y github:surebeli/fable-5-anything install --project . --link github --yes

# or bootstrap scripts (default --link github)
scripts/install.ps1 -Project .      # Windows
sh scripts/install.sh .             # POSIX
```

The `--link` mode controls how the generated `.fable/bin` shims call fable:
`path` (default — points at a local clone), `github` (re-runs from GitHub source
via `npx -y github:surebeli/fable-5-anything`; no clone to keep around and no npm
publish needed — best for the zero-clone flow), `global` (a globally installed
`fable`), or `npx` (the npm registry name, requires a future `npm publish`). Each
install records `fableVersion` and the link mode in `.fable/fable.lock.json`. See
[docs/deploy-from-source.md](docs/deploy-from-source.md).

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
| `fable runtime [<name>]` | Show how fable injects into a runtime (status, injection mode, overlay vs system replacement). No args lists all. |
| `fable --version` | Print the fable version (single-sourced from package.json). |

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

## Runtimes

fable does not replace most vendor system prompts. Claude Code is special: a user
can replace the system prompt with `--system-prompt-file`. For opencode, Kimi,
Codex, Copilot, and opaque hosts, fable **overlays** project governance on top of
the host's authoritative system prompt — it never tells the model to ignore host
rules.

- opencode is implemented end-to-end (build-prompt, smoke, run, doctor); `fable opencode setup` also makes the full portable core govern every session via `opencode.json` `instructions`. See [docs/opencode-integration.md](docs/opencode-integration.md).
- codex is implemented via charter (AGENTS.md) + an MCP server (`codex mcp add`); see [docs/codex-integration.md](docs/codex-integration.md).
- kimi has a `fable kimi setup` that writes a real fable skill (`--skills-dir`) + charter; see [docs/kimi-integration.md](docs/kimi-integration.md).
- copilot has a `fable copilot setup` that seeds the charter + reuses the host-agnostic fable MCP server (`copilot mcp add`); see [docs/copilot-integration.md](docs/copilot-integration.md).
- grok has a `fable grok setup` that seeds the charter + reuses the host-agnostic fable MCP server (`grok mcp add`); verified vs grok 0.2.51.
- agy and other opaque hosts default to overlay-only.

Inspect any runtime:

```bash
node bin/fable.js runtime --list
node bin/fable.js runtime opencode
```

See [docs/runtime-overlay-model.md](docs/runtime-overlay-model.md) for the full
model and the authority stack.

### Codex

fable governs Codex via a charter (AGENTS.md + CLAUDE.md) plus read-only MCP
tools (`fable_runtime`, `fable_build_prompt`, `fable_doctor`). It overlays —
never replaces — Codex's system prompt.

```bash
node bin/fable.js codex setup --project . --apply
```

See [docs/codex-integration.md](docs/codex-integration.md) for the full guide.

### Kimi

fable governs Kimi via a real fable **skill** (`.fable/skills/fable/SKILL.md`)
plus a charter (AGENTS.md + CLAUDE.md). It overlays — never replaces — Kimi's
system prompt.

```bash
node bin/fable.js kimi setup --project .
kimi --skills-dir ".fable/skills" -p "<your task>"
```

See [docs/kimi-integration.md](docs/kimi-integration.md) for the full guide.

### Copilot

fable governs Copilot via a charter (`.github/copilot-instructions.md` +
AGENTS.md + CLAUDE.md) plus the **same host-agnostic fable MCP server** that
Codex uses. It overlays — never replaces — Copilot's system prompt.

```bash
node bin/fable.js copilot setup --project . --apply
```

See [docs/copilot-integration.md](docs/copilot-integration.md) for the full guide.

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
