# fable-5-anything

Portable prompt **governance** for adapting useful Claude Fable 5 style behaviors
to non-Claude agent runtimes — without copying Claude-specific identity, tools,
paths, or product assumptions. fable installs a model-neutral behavioral
constitution into the charters and skills your hosts already load.

> **Dispatch moved to hopper-plugin.** fable used to also assemble and dispatch
> handoffs (the former "Mode 2"). That capability now lives in
> [hopper-plugin](https://github.com/surebeli/hopper-plugin), a vendor-neutral
> background dispatcher. Governance reaches hopper-dispatched vendors either via
> the `AGENTS.md`/`CLAUDE.md` charter fable installs, or via hopper's opt-in
> `GOVERNANCE.md` overlay (which references fable's portable core).

## Install (one command)

Zero-clone, straight from GitHub source (no clone, no npm publish needed). fable
has no runtime dependencies, so `npx` just fetches and runs it:

```bash
npx -y github:surebeli/fable-5-anything governance --project <your-project>
```

This inlines the full portable core into your project's `AGENTS.md` + `CLAUDE.md`,
so every host that auto-loads those charter files (opencode, Codex, Claude Code,
Grok, Copilot) follows the constitution. Use `--project .` for the current
directory.

Any governance command works the same way, e.g.:

```bash
npx -y github:surebeli/fable-5-anything kimi setup --project .          # older Kimi only (0.17.1+ already reads AGENTS.md); also bundles the Kimi adapter
npx -y github:surebeli/fable-5-anything codex setup --project . --apply # charter + read-only fable MCP server
npx -y github:surebeli/fable-5-anything runtime --list                  # read-only introspection
```

### From a clone (for development)

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
node bin/fable.js governance --project <your-project>
```

## Commands

Every command is **governance-delivery** — it installs or wires fable's
constitution into a host (inlined into `AGENTS.md`/`CLAUDE.md`, written as a Kimi
skill, wired into `opencode.json`, or exposed read-only via MCP). None of them
dispatch, run, or execute tasks: the former dispatch/executor commands (`init`,
`install`, `build-prompt`, `smoke`, `run`, `doctor`) were removed, and background
dispatch now lives in [hopper-plugin](https://github.com/surebeli/hopper-plugin).

| Command | Description |
|---|---|
| `fable governance --project <dir>` | Inline the full portable core into AGENTS.md + CLAUDE.md (host-agnostic). |
| `fable charter sync --project <dir>` | Seed/refresh the fable block in the charter files. |
| `fable runtime [<name>]` | Show how fable overlays governance onto a runtime. |
| `fable codex|copilot|grok setup` | Seed charter + register the read-only fable MCP server. |
| `fable kimi setup` | Seed charter + write the fable Kimi skill. |
| `fable opencode setup` | Slim charter + portable core wired into opencode.json instructions. |
| `fable mcp-server` | Start the fable MCP server (read-only `fable_runtime`). |
| `fable --version` | Print the version. |

## Use as a Claude Code plugin (optional)

fable also ships a Claude Code plugin manifest (`.claude-plugin/`), so you can
install it as a marketplace and drive governance from slash commands:

- Add the marketplace: `surebeli/fable-5-anything` (once pushed to GitHub), or a
  local path to a clone (`./path/to/fable-5-anything`).
- Then use `/fable:governance` (inline the constitution into this repo),
  `/fable:setup <codex|kimi|copilot|grok|opencode>` (wire a specific host), or
  `/fable:runtime` (read-only introspection).

The plugin only wraps the governance CLI — it adds no dispatch.

## Strategy

Use a shared behavior core plus thin runtime adapters.

- `prompts/portable-agent-core.md` is the model-neutral constitution.
- `adapters/*.md` adds runtime-specific execution facts.
- `prompts/claude-fable-5-exclusions.md` lists Claude-specific material that must
  not be migrated into the portable core.
- `tests/smoke-checklist.md` defines minimum governance validation before an
  adapter is used.

The core owns principles. Adapters own mechanics. If an adapter conflicts with
the core, the core wins.

## Runtimes

fable does not replace most vendor system prompts. Claude Code is special: a user
can replace the system prompt with `--system-prompt-file`. For opencode, Kimi,
Codex, Copilot, and opaque hosts, fable **overlays** project governance on top of
the host's authoritative system prompt — it never tells the model to ignore host
rules.

- opencode is implemented via `fable opencode setup`, which can use a slim
  charter plus `opencode.json` `instructions` to load the portable core. See
  [docs/opencode-integration.md](docs/opencode-integration.md).
- codex is implemented via charter (AGENTS.md) + a read-only MCP server
  (`fable_runtime`); see [docs/codex-integration.md](docs/codex-integration.md).
- kimi: 0.17.1+ auto-loads `AGENTS.md`, so `fable governance` governs it directly;
  older Kimi reads only skills, so `fable kimi setup` writes a real fable skill
  (`--skills-dir`) + charter (it also bundles the Kimi adapter). See
  [docs/kimi-integration.md](docs/kimi-integration.md).
- copilot has a `fable copilot setup` that seeds the charter + reuses the
  host-agnostic fable MCP server (`copilot mcp add`); see
  [docs/copilot-integration.md](docs/copilot-integration.md).
- grok has a `fable grok setup` that seeds the charter + reuses the
  host-agnostic fable MCP server (`grok mcp add`); verified vs grok 0.2.51.
- agy and other opaque hosts default to overlay-only.

Inspect any runtime:

```bash
node bin/fable.js runtime --list
node bin/fable.js runtime opencode
```

See [docs/runtime-overlay-model.md](docs/runtime-overlay-model.md) for the full
model and the authority stack.

### Codex

fable governs Codex via a charter (AGENTS.md + CLAUDE.md) plus a read-only MCP
tool (`fable_runtime`). It overlays — never replaces — Codex's system prompt.

```bash
node bin/fable.js codex setup --project . --apply
```

See [docs/codex-integration.md](docs/codex-integration.md) for the full guide.

### Kimi

Kimi 0.17.1+ auto-loads `AGENTS.md`, so `fable governance` governs it directly —
no Kimi-specific step. For older Kimi (which reads only skills), or to also ship
the Kimi runtime adapter, use `fable kimi setup`, which writes a fable **skill**
(`.fable/skills/fable/SKILL.md`) plus the charter (AGENTS.md + CLAUDE.md). fable
overlays — never replaces — Kimi's system prompt.

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

## Status

fable is **governance-only**. The dispatch/executor layer (the former "Mode 2")
has been removed and now lives in
[hopper-plugin](https://github.com/surebeli/hopper-plugin) — see the note at the
top of this README. Governance reaches dispatched vendors via the `AGENTS.md` /
`CLAUDE.md` charter fable installs, or via hopper's opt-in `GOVERNANCE.md`
overlay (which references fable's portable core).
