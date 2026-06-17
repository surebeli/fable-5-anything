#requires -Version 5
# Bootstrap fable governance into a project without cloning the repo.
# Usage: scripts\install.ps1 -Project .
param(
  [string]$Project = "."
)
npx -y github:surebeli/fable-5-anything governance --project "$Project"
