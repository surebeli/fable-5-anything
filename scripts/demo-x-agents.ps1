# demo-x-agents.ps1
# Minimal end-to-end demo: embed fable into x-agents, run doctor, build-prompt, dry-run smoke and run.
# Run from fable-5-anything repo root.
# Creator: P3 executor for FABLE-M3-HARDEN-DEMO
# Usage (from fable-5-anything repo):
#   powershell -ExecutionPolicy Bypass -File scripts/demo-x-agents.ps1

$ErrorActionPreference = 'Stop'
$FableRoot = $PSScriptRoot | Split-Path -Parent | Resolve-Path
$xAgentsRoot = $FableRoot | Split-Path -Parent | Join-Path -ChildPath 'x-agents' | Resolve-Path
$DemoDir = Join-Path $env:TEMP "fable-demo-x-agents"

Write-Host @"

============================================================
 fable-5-anything M3 demo: x-agents integration
============================================================
  Fable repo : $FableRoot
  x-agents   : $xAgentsRoot
  Demo dir   : $DemoDir
============================================================

"@ -ForegroundColor Cyan

# 1. Create isolated demo directory
Write-Host "[1/6] Creating isolated demo directory..." -ForegroundColor Yellow
if (Test-Path $DemoDir) { Remove-Item -Recurse -Force $DemoDir }
New-Item -ItemType Directory -Path $DemoDir -Force | Out-Null
Write-Host "  Created $DemoDir"

# 2. Install fable into demo dir
Write-Host "[2/6] Installing fable into demo directory..." -ForegroundColor Yellow
$install = node "$FableRoot\bin\fable.js" install --project $DemoDir --runtime opencode --model tokenbox/deepseek-v4-pro --yes 2>&1
Write-Host $install

# 3. Run doctor
Write-Host "[3/6] Running fable doctor..." -ForegroundColor Yellow
$doctor = node "$FableRoot\bin\fable.js" doctor --project $DemoDir 2>&1
Write-Host $doctor
if ($LASTEXITCODE -ne 0) {
    Write-Host "  => doctor exit code: $LASTEXITCODE" -ForegroundColor Red
} else {
    Write-Host "  => doctor passed" -ForegroundColor Green
}

# 4. Build prompt (project-relative handoff)
Write-Host "[4/6] Building prompt from project-relative handoff..." -ForegroundColor Yellow
$prompt = node "$FableRoot\bin\fable.js" build-prompt --project $DemoDir --handoff .fable/handoffs/example.md 2>&1
if ($LASTEXITCODE -eq 0) {
    if ($prompt -match 'Portable Agent Core') {
        Write-Host "  => build-prompt PASS (contains Portable Agent Core)" -ForegroundColor Green
    } else {
        Write-Host "  => build-prompt WARNING (missing expected content)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  => build-prompt FAIL (exit $LASTEXITCODE)" -ForegroundColor Red
    Write-Host $prompt
}

# 5. Smoke dry-run
Write-Host "[5/6] Smoke check (dry-run)..." -ForegroundColor Yellow
$smoke = node "$FableRoot\bin\fable.js" smoke --project $DemoDir --dry-run 2>&1
if ($LASTEXITCODE -eq 0 -and $smoke -match 'DRY-RUN') {
    Write-Host "  => smoke dry-run PASS" -ForegroundColor Green
} else {
    Write-Host "  => smoke dry-run FAIL (exit $LASTEXITCODE)" -ForegroundColor Red
}

# 6. Run dry-run
Write-Host "[6/6] Run dry-run..." -ForegroundColor Yellow
$run = node "$FableRoot\bin\fable.js" run .fable/handoffs/example.md --project $DemoDir --dry-run 2>&1
if ($LASTEXITCODE -eq 0 -and $run -match 'DRY-RUN') {
    Write-Host "  => run dry-run PASS" -ForegroundColor Green
} else {
    Write-Host "  => run dry-run FAIL (exit $LASTEXITCODE)" -ForegroundColor Red
}

# Summary
Write-Host @"

============================================================
 Demo complete.
 Demo artifacts are in: $DemoDir
 To clean up: Remove-Item -Recurse -Force $DemoDir
============================================================

"@ -ForegroundColor Cyan
