# Demo: fable-5-anything with x-agents

This document describes how to run a minimal end-to-end demo of fable-5-anything M3
against the x-agents project. The demo installs fable into an isolated temporary
directory, runs doctor, builds a prompt, and performs dry-run smoke/run checks.

**No files in x-agents are modified.** The demo uses a separate temp directory.

## Prerequisites

- Node.js 18+
- opencode CLI installed and in PATH
- fable-5-anything repo cloned locally
- x-agents repo cloned locally (for context only; demo dir is isolated)

## Quick run (Windows)

From the fable-5-anything repo root:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\demo-x-agents.ps1
```

## Step-by-step (cross-platform)

All commands are run from the fable-5-anything repo root.

### 1. Create isolated demo directory

```powershell
$demoDir = Join-Path $env:TEMP "fable-demo-x-agents"
New-Item -ItemType Directory -Path $demoDir -Force
```

### 2. Install fable into demo dir

```powershell
node bin\fable.js install --project $demoDir --runtime opencode --model tokenbox/deepseek-v4-pro --yes
```

This creates `.fable/` with config, handoffs, shims, README, `.gitignore`, and `AGENTS.md`.

### 3. Run doctor

```powershell
node bin\fable.js doctor --project $demoDir
```

Should exit 0 with 9 checks: config, adapter, core, handoff, opencode dry-run,
opencode path, AGENTS fable, gitignore runs, local shim.

### 4. Build prompt

```powershell
node bin\fable.js build-prompt --project $demoDir --handoff .fable/handoffs/example.md
```

Assembles a dispatch prompt containing the Portable Agent Core, opencode Adapter, and
the example handoff.

### 5. Smoke dry-run

```powershell
node bin\fable.js smoke --project $demoDir --dry-run
```

Prints the opencode command that would execute the PONG smoke check.

### 6. Run dry-run

```powershell
node bin\fable.js run .fable/handoffs/example.md --project $demoDir --dry-run
```

Prints the opencode command that would dispatch the example handoff.

## Using the local shim

After install, you can call fable from within the demo project using the local shim:

```powershell
# From within the demo directory:
.fable\bin\fable.cmd doctor
.fable\bin\fable.cmd build-prompt .fable/handoffs/example.md
```

## Cleanup

```powershell
Remove-Item -Recurse -Force $demoDir
```

## Verification checklist for CEO reviewer

- [ ] `scripts\demo-x-agents.ps1` runs without error
- [ ] doctor exits 0 with 9 checks all passing
- [ ] build-prompt output includes "Portable Agent Core", "opencode Adapter", handoff content
- [ ] smoke dry-run prints DRY-RUN with opencode command
- [ ] run dry-run prints DRY-RUN with opencode command
- [ ] No files in x-agents repo were modified
