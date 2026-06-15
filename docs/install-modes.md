# Installing fable — choose a mode

fable is two separable layers. After you clone the repo (no npm publish needed —
see [deploy-from-source.md](deploy-from-source.md)), pick the mode you want.

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
```

## Mode 1 — Governance-only (constitution in agent context)

You only want **every agent prompt to follow the fable constitution**. No
dispatcher, no handoff CLI, no shims.

```bash
# zero-.fable footprint: inline the full core into AGENTS.md + CLAUDE.md
node bin/fable.js governance --project <your-project> --inline

# OR referenced: core in .fable/ + opencode.json instructions (leaner charter files)
node bin/fable.js governance --project <your-project>
```

- `--inline` embeds the full portable core into `AGENTS.md` + `CLAUDE.md`. Every
  host that auto-loads those (opencode, Codex, Grok, Claude Code, Copilot) is then
  governed. **Creates no `.fable/`, no `opencode.json`.**
- default copies the core to `.fable/portable-agent-core.md` and wires
  `opencode.json` `instructions` (best for opencode; keeps charter files short).
- For **Kimi**, governance ships as a skill — use `fable kimi setup --project .`
  (writes `.fable/skills/fable/SKILL.md`).

Footprint: just the charter markdown (and, in default mode, one core file +
opencode.json). Nothing to run; nothing machine-specific to commit.

## Mode 2 — Full (governance + dispatch/executor)

You also want fable to **assemble prompts and dispatch handoffs** (the
`fable run` / `build-prompt` / `smoke` / `doctor` workflow, the handoff contract,
local shims).

```bash
node bin/fable.js install --project <your-project> --runtime opencode --model tokenbox/deepseek-v4-pro --link path --yes
# then add in-session governance for your host(s):
node bin/fable.js opencode setup --project <your-project>     # opencode: charter + core via opencode.json instructions
node bin/fable.js codex   setup --project <your-project> --apply   # codex/copilot/grok: charter + MCP server
node bin/fable.js kimi    setup --project <your-project>     # kimi: fable skill
```

`install` scaffolds `.fable/` (`config.json`, `handoffs/`, `runs/`, `bin/` shims,
`fable.lock.json`) + `.gitignore` + the charter. The host `setup` commands add the
always-on governance on top.

## Footprint comparison

| Artifact | Mode 1 (governance-only) | Mode 2 (full) |
|---|---|---|
| AGENTS.md / CLAUDE.md charter | ✅ | ✅ |
| portable core in context | ✅ (inline, or `.fable/` + opencode.json) | ✅ |
| `.fable/config.json`, `handoffs/`, `runs/` | ❌ | ✅ |
| `.fable/bin/` shims, `fable.lock.json` (machine-specific) | ❌ | ✅ (gitignore these) |
| `fable run` / `build-prompt` / `smoke` / `doctor` | ❌ | ✅ |

## Committing into a shared repo

For both modes, commit the **governance** files (charter + any `.fable/portable-agent-core.md`
+ `opencode.json`). Do **not** commit machine-specific bits (`.fable/bin/`,
`.fable/fable.lock.json`) or any raw source prompt — add them to `.gitignore`.

## Updating

When fable changes, `git -C <fable-clone> pull`, then re-run your mode's command
(`fable governance …` or `fable opencode setup …`) — both are idempotent and
refresh the wired core.
