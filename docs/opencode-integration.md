# opencode Integration

fable governs opencode by wiring the portable core into opencode's normal
instruction loading path. fable **overlays** opencode: the host system prompt and
tool rules remain authoritative.

## Always-on governance

```bash
node bin/fable.js opencode setup --project .
```

This is idempotent and:

- seeds a slim charter (`AGENTS.md` + `CLAUDE.md`),
- copies the portable core to `.fable/portable-agent-core.md`,
- wires `opencode.json` `"instructions": ["AGENTS.md", ".fable/portable-agent-core.md"]`, preserving existing keys.

opencode auto-loads `AGENTS.md` and every file in `instructions` on each run, so
after setup every opencode session in the project follows the portable core.

Verify the wiring:

```bash
opencode run "What governance rules must you follow in this repo? List them."
```

Re-running `fable opencode setup` refreshes the copied core and dedupes the
`instructions` entries.
