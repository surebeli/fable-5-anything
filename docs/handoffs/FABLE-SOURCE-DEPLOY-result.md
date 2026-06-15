# FABLE-SOURCE-DEPLOY RESULT

Verdict: PASS

> Source-based deployment without npm publish. Implemented with TDD, real-tested,
> reviewed.

## Goal
Support deploying fable from source (no `npm publish`), and fix the no-publish gap
left by M5 (bootstrap scripts defaulted to `--link npx`, whose shim points at the
unpublished npm registry name).

## Files Changed
- (created) docs/deploy-from-source.md, docs/handoffs/FABLE-SOURCE-DEPLOY-result.md
- (modified) src/install.js (+`github` link mode), src/cli.js (+`github` in --link validation), test/install.test.js (github link test), scripts/install.ps1 + scripts/install.sh (default `--link github`), README.md, docs/embed-in-your-project.md

## What changed
- New `--link github` mode: shims + lockfile invoke `npx -y github:surebeli/fable-5-anything` — runs from GitHub source, no clone to keep, no publish.
- Bootstrap scripts now default `--link github` (were `--link npx`, which needed a publish).
- Docs clarify the four link modes and that `npx`/`global` are reserved for a future publish.

## Real verification
- Path A (clone + `--link path`): generated `.fable/bin/fable.cmd runtime --list` ran offline → opencode/codex implemented.
- Path B (zero-clone): `npx -y github:surebeli/fable-5-anything --version` → `0.2.0` (bin runs from live GitHub source).
- Full suite: 102 pass / 0 fail.

## Notes
- `--link github` resolves via `npx github:` against the repo's default branch; once this change is on `main`, `npx github:... install --link github` works end-to-end.
- npm publish remains deliberately out of scope (package is publish-ready: bin/files/engines/repository present).
