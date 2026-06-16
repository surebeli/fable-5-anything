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

**This mode is host-agnostic** — the constitution is the same portable core no
matter which agent the host runs. So it takes *no* host argument and writes *no*
host-specific config. (Per-host parameters — runtime, model, adapter,
`opencode.json`, MCP, skills-dir — only matter in Mode 2, where fable actually
*dispatches* to a host.)

```bash
node bin/fable.js governance --project <your-project>
```

- Embeds the full portable core into `AGENTS.md` + `CLAUDE.md`. Every host that
  auto-loads those charter files (opencode, Codex, Grok, Claude Code, Copilot) is
  then fully governed — from one command, no host wiring. **Creates no `.fable/`,
  no `opencode.json`, no `.github/`.**
- **Kimi** is the one exception: it loads *skills*, not charter markdown, so its
  governance ships as a skill — `fable kimi setup --project .` (writes
  `.fable/skills/fable/SKILL.md`).
- opencode users who prefer a *slim* charter (a one-line reference + the core in
  `.fable/portable-agent-core.md`, loaded via `opencode.json` `instructions`) can
  use the host-specific `fable opencode setup` instead — but that is an
  opencode-only optimization, not the host-agnostic default.

Footprint: just the charter markdown. Nothing to run; nothing machine-specific to
commit.

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
| portable core in context | ✅ (inlined into the charter; host-agnostic) | ✅ |
| host-specific wiring (`opencode.json`, MCP, skill, `.github/`) | ❌ (decoupled) | ✅ (per host `setup`) |
| `.fable/config.json`, `handoffs/`, `runs/` | ❌ | ✅ |
| `.fable/bin/` shims, `fable.lock.json` (machine-specific) | ❌ | ✅ (gitignore these) |
| `fable run` / `build-prompt` / `smoke` / `doctor` | ❌ | ✅ |

## Committing into a shared repo

Commit the **governance** files: the `AGENTS.md` / `CLAUDE.md` charter (both
modes). If you used the host-specific `fable opencode setup`, also commit the
`.fable/portable-agent-core.md` + `opencode.json` it creates — **Mode 1
governance-only produces neither**, so there is nothing extra to commit there. Do
**not** commit machine-specific bits (`.fable/bin/`, `.fable/fable.lock.json`) or
any raw source prompt — add them to `.gitignore`.

## Updating

When fable changes, `git -C <fable-clone> pull`, then re-run your mode's command
(`fable governance …` or `fable opencode setup …`) — both are idempotent and
refresh the wired core.
