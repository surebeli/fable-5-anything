# Copilot Integration

fable governs GitHub Copilot CLI through a project charter plus an optional
read-only MCP server. fable **overlays** Copilot: it layers project governance on
top of Copilot's own system prompt, tool protocol, and safety policy. It never
replaces Copilot's system prompt.

## Charter (.github/copilot-instructions.md + AGENTS.md + CLAUDE.md)

Copilot reads project instruction files every session. fable seeds and maintains
them as the governance charter.

```bash
node bin/fable.js copilot setup --project .
```

`copilot setup` writes the constitution into `.github/copilot-instructions.md`,
`AGENTS.md`, and `CLAUDE.md` using the idempotent `<!-- FABLE-START -->` /
`<!-- FABLE-END -->` markers. Content outside the markers is preserved, so
re-running setup is safe.

## MCP (read-only governance metadata)

fable ships a stdio MCP server. The same host-agnostic server used by Codex can
be registered with Copilot.

```bash
# Print the registration command (offline; recommended first)
node bin/fable.js copilot setup --project .

# Or register now
node bin/fable.js copilot setup --project . --apply
```

`copilot setup` seeds the charter and then prints, or with `--apply` runs, the
equivalent of:

```bash
copilot mcp add fable -- node <entry> mcp-server
```

The server exposes exactly one read-only tool:

| Tool | Purpose |
|---|---|
| `fable_runtime` | List fable runtimes, or describe one (status, injection mode, overlay vs replace). |

During a session, Copilot reads its instruction files and can call
`fable_runtime` over MCP. The charter and MCP tool overlay Copilot; host rules
always win on conflict.

See [runtime-overlay-model.md](runtime-overlay-model.md) for the authority stack.
