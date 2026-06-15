#requires -Version 5
# Bootstrap fable into a project without cloning the repo.
# Usage: scripts\install.ps1 -Project . [-Runtime opencode] [-Model tokenbox/deepseek-v4-pro] [-Link github]
# Default -Link github runs the project shim via `npx -y github:...` so no npm publish is required.
param(
  [string]$Project = ".",
  [string]$Runtime = "opencode",
  [string]$Model = "tokenbox/deepseek-v4-pro",
  [ValidateSet("path","global","npx","github")][string]$Link = "github"
)
npx -y github:surebeli/fable-5-anything install --project "$Project" --runtime "$Runtime" --model "$Model" --link "$Link" --yes
