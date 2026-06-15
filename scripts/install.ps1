#requires -Version 5
# Bootstrap fable into a project without cloning the repo.
# Usage: scripts\install.ps1 -Project . [-Runtime opencode] [-Model tokenbox/deepseek-v4-pro] [-Link npx]
param(
  [string]$Project = ".",
  [string]$Runtime = "opencode",
  [string]$Model = "tokenbox/deepseek-v4-pro",
  [ValidateSet("path","global","npx")][string]$Link = "npx"
)
npx -y github:surebeli/fable-5-anything install --project "$Project" --runtime "$Runtime" --model "$Model" --link "$Link" --yes
