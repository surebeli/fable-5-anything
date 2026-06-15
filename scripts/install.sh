#!/usr/bin/env sh
# Bootstrap fable into a project without cloning the repo.
# Usage: scripts/install.sh [project] [runtime] [model] [link]
set -e
PROJECT="${1:-.}"
RUNTIME="${2:-opencode}"
MODEL="${3:-tokenbox/deepseek-v4-pro}"
LINK="${4:-npx}"
npx -y github:surebeli/fable-5-anything install --project "$PROJECT" --runtime "$RUNTIME" --model "$MODEL" --link "$LINK" --yes
