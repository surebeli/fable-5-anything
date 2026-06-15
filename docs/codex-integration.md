# Codex Integration

fable governs Codex through two real surfaces. fable **overlays** Codex — it
layers project governance on top of Codex's own system prompt, tool protocol,
and safety policy. It never replaces Codex's system prompt, and Codex has no
"skill" primitive, so the portable core is delivered as a charter plus an MCP
toolset.

## Surface A: Charter (AGENTS.md + CLAUDE.md)

Codex reads project instruction files every session. fable seeds and maintains
them as the governance charter.

```bash
# Seed / refresh the charter for a project
node bin/fable.js charter sync --project .

# install also seeds the charter
node bin/fable.js install --project . --runtime opencode --yes
```

Both commands write the constitution into `AGENTS.md` and `CLAUDE.md` (plus any
host-specific charter files) using the idempotent
`<!-- FABLE-START -->` / `<!-- FABLE-END -->` markers. Content outside the
markers is preserved, so re-running sync is safe and your own notes survive.

Codex loads `AGENTS.md` automatically; `CLAUDE.md` is seeded for cross-tool
parity so the same constitution is visible to Claude-aware tooling in the repo.

## Surface B: MCP (in-session read-only tools)

fable ships a stdio MCP server. Registering it with Codex exposes fable's
read-only governance tools inside a Codex session.

```bash
# Print the registration command (offline; recommended first)
node bin/fable.js codex setup --project .

# Or register now
node bin/fable.js codex setup --project . --apply
```

`codex setup` seeds the charter (AGENTS.md + CLAUDE.md) and then prints, or with
`--apply` runs, the equivalent of:

```bash
codex mcp add fable -- node <entry> mcp-server
```

The server exposes exactly these read-only tools (no mutating or exec tools):

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
node bin/fable.js codex setup --project .

# 2. Register the MCP server with Codex
node bin/fable.js codex setup --project . --apply

# 3. Dispatch a task; Codex follows the handoff under the fable charter
codex exec "follow .fable/handoffs/<task>.md"
```

During the session Codex reads `AGENTS.md` (the fable charter), can call
`fable_runtime` / `fable_build_prompt` / `fable_doctor` over MCP, and obeys the
handoff contract. The charter and MCP tools overlay Codex — host rules always
win on conflict.

See [runtime-overlay-model.md](runtime-overlay-model.md) for the authority stack
and why fable overlays rather than replaces.
