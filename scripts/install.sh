#!/usr/bin/env sh
# Bootstrap fable governance into a project without cloning the repo.
# Usage: scripts/install.sh [project]
set -e
PROJECT="${1:-.}"
npx -y github:surebeli/fable-5-anything governance --project "$PROJECT"
