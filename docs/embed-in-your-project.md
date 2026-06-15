# Embed fable in your project

Get from zero to dispatching handoffs from your own project in 5 minutes.

## Prerequisites

- Node.js 18+
- opencode CLI installed and configured with a DeepSeek model
- A clone of `fable-5-anything` on your machine

## 1. Clone fable

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
```

## 2. Install fable into your project

From the fable repo directory, run install pointing at your project:

```bash
node bin/fable.js install --project <path-to-your-project> --runtime opencode --model tokenbox/deepseek-v4-pro --yes
```

This creates inside `<your-project>/`:

| Artifact | Purpose |
|---|---|
| `.fable/config.json` | Runtime and model configuration |
| `.fable/handoffs/example.md` | Example handoff to get started |
| `.fable/README.md` | Directory reference |
| `.fable/runs/` | Run output directory (auto-created) |
| `.fable/bin/fable.cmd` | Windows cmd shim |
| `.fable/bin/fable.ps1` | PowerShell shim |
| `.fable/bin/fable` | POSIX shell shim |
| `.gitignore` | Entry to ignore `.fable/runs/` |
| `AGENTS.md` | Short fable integration block (appended if file exists) |

### Install link modes

`fable install` accepts `--link <path|github|global|npx>`:

- `path` (default) — shims call this clone's `bin/fable.js` by absolute path.
- `github` — shims call `npx -y github:surebeli/fable-5-anything` (runs from
  GitHub source; no clone to keep around and no npm publish required).
- `global` — shims call a globally installed `fable`.
- `npx` — shims call `npx -y fable-5-anything` (npm registry name; requires a
  future `npm publish`).

Each install writes `.fable/fable.lock.json` recording the `fableVersion` and the
chosen link mode, so a project's fable wiring is traceable and reproducible.

> **Safe re-run:** Repeating `fable install` preserves any handoff or README files you
> have modified. Updated templates are written as `.new` files alongside the originals.

### Using the local shim

After install, you can call fable directly from within your project:

```bash
# Windows (PowerShell or cmd)
.fable\bin\fable.cmd doctor
.fable\bin\fable.cmd build-prompt .fable/handoffs/example.md
.fable\bin\fable.cmd smoke --dry-run
.fable\bin\fable.cmd run .fable/handoffs/example.md --dry-run

# POSIX (Linux/macOS)
./.fable/bin/fable doctor
./.fable/bin/fable build-prompt .fable/handoffs/example.md
```

The shim automatically passes `--project <your-project-path>` to the fable CLI.

## 3. Run doctor

Verify everything is wired correctly:

```bash
node bin/fable.js doctor --project <path-to-your-project>
```

Or from within your project using the shim:

```bash
.fable\bin\fable.cmd doctor
```

For an opencode project, doctor runs 9 checks: config, adapter, core, handoff,
opencode command shape, opencode in PATH, AGENTS.md fable section, .gitignore
runs entry, and local shim; other runtimes show a runtime overlay status instead.
No real model calls.

All checks should pass with exit code 0.

## 3b. Inspect the runtime

See how fable will inject into your configured runtime:

```bash
node bin/fable.js runtime --list
node bin/fable.js runtime opencode
```

For opencode this reports `implemented` + `overlay` + `prompt-prelude`. The other
adapted runtimes are implemented too: codex, copilot, and grok via charter + MCP,
and kimi via a fable skill (`--skills-dir`); opencode runs via the executor. In
every case fable overlays governance and never replaces the host system prompt.
`doctor` mirrors this: non-opencode runtimes show a runtime overlay warning
instead of opencode checks.

## 4. Build a prompt

Assemble a dispatch prompt from the portable core, opencode adapter, and your handoff:

```bash
node bin/fable.js build-prompt --project <path-to-your-project> --handoff <path-to-your-project>/.fable/handoffs/example.md
```

Or if you are inside your project directory:

```bash
cd <your-project>
node <path-to-fable>/bin/fable.js build-prompt --project . --handoff .fable/handoffs/example.md
```

## 5. Smoke check

Dry-run (print the command without executing):

```bash
node bin/fable.js smoke --project <your-project> --dry-run
```

Run for real:

```bash
node bin/fable.js smoke --project <your-project> --execute
```

## 6. Execute a handoff

```bash
node bin/fable.js run .fable/handoffs/your-task.md --project <your-project>
```

Dry-run to inspect the command before executing:

```bash
node bin/fable.js run .fable/handoffs/your-task.md --project <your-project> --dry-run
```

Run output is captured in `<your-project>/.fable/runs/`.

## Handoff contract

Every handoff file must contain these four sections:

- `## Goal` — What to achieve
- `## Background` — Context and constraints
- `## Acceptance` — How to verify success
- `## Return` — Where to write the result

See `.fable/handoffs/example.md` for a working template.

## Host integrations (Codex / Copilot / Grok / Kimi)

Each supported host has a one-command setup that overlays fable governance:

1. **Codex / Copilot / Grok** — `fable <host> setup --project . [--apply] [--via path|github]` seeds the charter and registers the host-agnostic fable MCP server (`<host> mcp add fable`), exposing `fable_runtime` / `fable_build_prompt` / `fable_doctor` in-session. See [codex-integration.md](codex-integration.md) and [copilot-integration.md](copilot-integration.md).
2. **Kimi** — `fable kimi setup --project .` writes a real fable skill (loaded via `--skills-dir` or `extra_skill_dirs`). See [kimi-integration.md](kimi-integration.md).

Still future: an npm registry publish (so `npx fable-5-anything` / a global `fable` work without GitHub source). Today, deploy from source — clone (`--link path`) or zero-clone (`--link github`); see [deploy-from-source.md](deploy-from-source.md).

## More resources

- [Demo: fable with x-agents](demo-x-agents.md) — step-by-step demo script
