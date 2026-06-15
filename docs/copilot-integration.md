# Copilot Integration

fable governs GitHub Copilot CLI through two real surfaces. fable **overlays**
Copilot — it layers project governance on top of Copilot's own system prompt,
tool protocol, and safety policy. It never replaces Copilot's system prompt.
Copilot speaks MCP, so the portable core is delivered as a charter plus an MCP
toolset — **reusing the same fable MCP server as Codex** (the server is
host-agnostic; M7 writes no new server).

## Surface A: Charter (.github/copilot-instructions.md + AGENTS.md + CLAUDE.md)

Copilot reads project instruction files every session. fable seeds and maintains
them as the governance charter.

```bash
# Seed / refresh the charter and print the MCP registration command (offline)
node bin/fable.js copilot setup --project .
```

`copilot setup` writes the constitution into `.github/copilot-instructions.md`
(Copilot's primary custom-instructions file), `AGENTS.md`, and `CLAUDE.md` using
the idempotent `<!-- FABLE-START -->` / `<!-- FABLE-END -->` markers. Content
outside the markers is preserved, so re-running setup is safe and your own notes
survive. `copilot init` also creates `.github/copilot-instructions.md`; fable
writes the same file with the governance charter.

## Surface B: MCP (in-session read-only tools, shared with Codex)

fable ships a stdio MCP server. The **same** server registered with Codex is
registered with Copilot — the server is host-agnostic, so Copilot and Codex
share it unchanged.

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

This writes Copilot's local stdio MCP config (`~/.copilot/mcp-config.json`). The
server exposes exactly these read-only tools (no mutating or exec tools):

| Tool | Purpose |
|---|---|
| `fable_runtime` | List fable runtimes, or describe one (status, injection mode, overlay vs replace). |
| `fable_build_prompt` | Assemble a fable governance prompt from a project config and a handoff file. |
| `fable_doctor` | Run fable doctor checks for a project and return their statuses. |

You can start the server standalone for any MCP host:

```bash
node bin/fable.js mcp-server
```

## Real-usage walkthrough

```bash
# 1. Seed the charter and (offline) get the MCP registration command
node bin/fable.js copilot setup --project .

# 2. Register the shared fable MCP server with Copilot
node bin/fable.js copilot setup --project . --apply

# 3. Dispatch a task; Copilot follows the handoff under the fable charter
copilot -p "follow .fable/handoffs/<task>.md" --allow-all-tools
```

During the session Copilot reads `.github/copilot-instructions.md` and
`AGENTS.md` (the fable charter), can call `fable_runtime` /
`fable_build_prompt` / `fable_doctor` over MCP, and obeys the handoff contract.
The charter and MCP tools overlay Copilot — host rules always win on conflict.

See [runtime-overlay-model.md](runtime-overlay-model.md) for the authority stack
and why fable overlays rather than replaces.
