# Installing fable

fable is governance-only. One command inlines the portable behavioral core into a
project's charter files:

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
node bin/fable.js governance --project <your-project>
```

Every host that auto-loads `AGENTS.md` / `CLAUDE.md` (opencode, Codex, Claude
Code, Grok, Copilot) is then governed. Kimi 0.17.1+ auto-loads `AGENTS.md` too
(governed directly); older Kimi reads only skills → `fable kimi setup`.
opencode users who prefer a slim charter + `opencode.json` instructions →
`fable opencode setup`.

Commit the governance files (`AGENTS.md` / `CLAUDE.md`, and for opencode-setup the
`.fable/portable-agent-core.md` + `opencode.json`). There is nothing
machine-specific to gitignore — fable no longer produces shims or a lockfile.

## Dispatch?

The former "Mode 2" dispatch/executor (assemble + `opencode run` + handoffs) has
moved to [hopper-plugin](https://github.com/surebeli/hopper-plugin). Governance
reaches hopper-dispatched vendors via the charter fable installs, or via hopper's
opt-in `GOVERNANCE.md` overlay.
