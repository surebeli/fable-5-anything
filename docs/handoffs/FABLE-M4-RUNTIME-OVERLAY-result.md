# FABLE-M4-RUNTIME-OVERLAY RESULT

Verdict: PASS

> Return channel relocated from x-agents to this repo by owner decision
> (2026-06-15); x-agents review files were read-only reference only.

## Files Changed
- (created) adapters/runtime-capabilities.json
- (created) adapters/copilot.md, adapters/generic.md
- (created) src/runtime.js
- (created) docs/runtime-overlay-model.md
- (created) test/runtime.test.js
- (modified) src/config.js, src/cli.js, src/doctor.js
- (modified) test/config.test.js, test/doctor.test.js, test/cli.test.js, test/install.test.js
- (modified) package.json, README.md, docs/embed-in-your-project.md

## Commands Run
- node --test --test-concurrency=1 test/*.test.js  -> PASS. `node --test --test-concurrency=1 test/*.test.js` -> # tests 70, # suites 10, # pass 70, # fail 0, # cancelled 0, # skipped 0, # todo 0 (duration ~11.3s). Plan expected ">=51 + ~16 new" -> 70 matches that range. Parallel-collision recheck: `Start-Job { node --test test/*.test.js }; node --test test/*.test.js` -> BOTH processes # tests 70 / # pass 70 / # fail 0, no EEXIST/ENOENT. Temp roots were distinct per process (.tmp-test-install-44384 vs .tmp-test-install-13192), confirming the process.pid isolation from Task 1 works.
- node bin/fable.js runtime --list / runtime opencode  -> PASS, exit 0 both. `runtime --list` printed the 7 known runtimes in order: claude (reference-only / system-prompt-file), opencode (implemented / prompt-prelude), codex (planned / agents-md-or-plugin), kimi (planned / skill-or-prompt-prelude), grok (planned / prompt-prelude), copilot (planned / custom-instructions-or-plugin), agy (opaque / custom-instructions-or-wrapper). `runtime opencode` printed: status implemented, injection mode prompt-prelude, host system policy overlay, adapter adapters/opencode.md, implemented cmds build-prompt/smoke/run/doctor, host system prompt "authoritative — fable OVERLAYS governance, does not replace it".
- fresh install + doctor (opencode 9 checks; kimi overlay warn)  -> PASS, exit 0 both. opencode: `install --project .tmp-verify-oc --runtime opencode --model tokenbox/deepseek-v4-pro --yes` then `doctor` printed exactly 9 checks all PASS in original order (config, adapter, core, handoff, opencode dry-run, opencode path [opencode 1.17.4 on PATH], AGENTS fable, gitignore runs, local shim), "All checks passed.", exit 0; dry-run flags intact (--model tokenbox/deepseek-v4-pro --dangerously-skip-permissions --print-logs --format json --pure). kimi: `install --project .tmp-verify-kimi --runtime kimi --model kimi-latest --yes` then `doctor` printed config/adapter(adapters/kimi.md)/core/handoff PASS, then `WARN  runtime:  runtime "kimi" is planned (overlay/skill-or-prompt-prelude); fable overlays governance, host system prompt is authoritative. No executor in this milestone.`, then AGENTS fable/gitignore runs/local shim PASS, NO opencode-specific checks, "All checks passed.", exit 0 (warn non-failing as designed).
- shim regression (cmd doctor / smoke --dry-run / run --dry-run)  -> PASS. `install --project .tmp-verify-shim --runtime opencode ... --yes`, then via `.\.tmp-verify-shim\.fable\bin\fable.cmd`: (1) `fable.cmd doctor` -> 9 PASS lines, "All checks passed.", exit 0. (2) `fable.cmd smoke --dry-run` -> `DRY-RUN — would execute:` + `opencode run "Reply exactly PONG and nothing else." --model tokenbox/deepseek-v4-pro --dangerously-skip-permissions --print-logs --format json --pure`, exit 0. (3) `fable.cmd run .fable/handoffs/example.md --dry-run` -> `DRY-RUN — would execute:` with the full assembled prompt (portable core + opencode adapter + handoff) and trailing flags --model tokenbox/deepseek-v4-pro --dangerously-skip-permissions --print-logs --format json --pure, exit 0. opencode buildCommand flags unchanged across all three.

## Acceptance Evidence
1. Tests pass -> PASS. `node --test --test-concurrency=1 test/*.test.js` -> # tests 70, # suites 10, # pass 70, # fail 0, # cancelled 0, # skipped 0, # todo 0 (duration ~11.3s). Plan expected ">=51 + ~16 new" -> 70 matches that range. Parallel-collision recheck: BOTH processes # tests 70 / # pass 70 / # fail 0, no EEXIST/ENOENT; temp roots distinct per process (.tmp-test-install-44384 vs .tmp-test-install-13192), confirming the process.pid isolation from Task 1 works.
2. docs/runtime-overlay-model.md explains system-replace vs overlay -> yes
3. Capability artifact covers claude/opencode/kimi/codex/copilot/agy(+grok) -> adapters/runtime-capabilities.json
4. CLI introspection command -> `fable runtime`
5. `fable runtime opencode` reports implemented + prompt-prelude/overlay + host authoritative -> PASS, exit 0. Output: status implemented, injection mode prompt-prelude, host system policy overlay, adapter adapters/opencode.md, implemented cmds build-prompt/smoke/run/doctor, host system prompt "authoritative — fable OVERLAYS governance, does not replace it".
6. doctor on fresh opencode project exits 0 with the 9 checks -> PASS, exit 0. Fresh `install --runtime opencode` then `doctor` printed exactly 9 checks all PASS in the original order (config, adapter, core, handoff, opencode dry-run, opencode path, AGENTS fable, gitignore runs, local shim), "All checks passed."
7. Unknown/planned runtime explicit (warn/fail, not silent opencode) -> PASS. Fresh `install --runtime kimi` then `doctor` emitted `WARN  runtime:  runtime "kimi" is planned (overlay/skill-or-prompt-prelude); fable overlays governance, host system prompt is authoritative. No executor in this milestone.` and showed NO opencode-specific checks (no "opencode dry-run", no "opencode path"); exit 0 (warn non-failing by design), confirming planned runtimes are not silently treated as opencode.
8. Docs explain vendor coordination strategy -> README + runtime-overlay-model.md
9. No raw CLAUDE-FABLE-5.md committed -> confirmed
10. No npm publish / plugin / skill package implemented -> confirmed

## Runtime Matrix
claude=reference-only/system-prompt-file; opencode=implemented/prompt-prelude/overlay;
codex,kimi,grok,copilot=planned/overlay; agy=opaque/overlay.

## Notes
- Only opencode is executable; others are introspectable design/adapter status.
- Real `fable smoke --execute` against live opencode credentials remains unverified (out of scope).
- Next recommended milestone: M5 packaging (npx install ergonomics).
