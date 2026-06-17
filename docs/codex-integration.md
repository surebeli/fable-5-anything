# Codex Integration

fable governs Codex through a project charter plus an optional read-only MCP
server. fable **overlays** Codex: it layers project governance on top of Codex's
own system prompt, tool protocol, and safety policy. It never replaces Codex's
system prompt.

## Charter (AGENTS.md + CLAUDE.md)

Codex reads project instruction files every session. fable seeds and maintains
them as the governance charter.

```bash
node bin/fable.js governance --project .
```

That command inlines the portable core into `AGENTS.md` and `CLAUDE.md` using the
idempotent `<!-- FABLE-START -->` / `<!-- FABLE-END -->` markers. Content outside
the markers is preserved, so re-running the command is safe.

## MCP (read-only governance metadata)

fable ships a stdio MCP server. Registering it with Codex exposes governance
metadata inside a Codex session without adding mutating or execution tools.

```bash
# Print the registration command (offline; recommended first)
node bin/fable.js codex setup --project .

# Or register now
node bin/fable.js codex setup --project . --apply
```

`codex setup` seeds the charter and then prints, or with `--apply` runs, the
equivalent of:

```bash
codex mcp add fable -- node <entry> mcp-server
```

The server exposes exactly one read-only tool:

| Tool | Purpose |
|---|---|
| `fable_runtime` | List fable runtimes, or describe one (status, injection mode, overlay vs replace). |

You can start the server standalone for any MCP host:

```bash
node bin/fable.js mcp-server
```

During a session, Codex reads `AGENTS.md` and can call `fable_runtime` over MCP.
The charter and MCP tool overlay Codex; host rules always win on conflict.

See [runtime-overlay-model.md](runtime-overlay-model.md) for the authority stack.
