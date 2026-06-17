# Deploy fable from source

fable can be used directly from source; it does not need to be published to npm.

## Clone path

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
node bin/fable.js governance --project <your-project>
```

Re-run the same command after pulling updates. The governance block is
idempotent and preserves content outside the fable markers.

## Zero-clone via `npx github:`

```bash
npx -y github:surebeli/fable-5-anything governance --project .
```

The bootstrap scripts are thin wrappers around that command:

```bash
scripts/install.ps1 -Project .       # Windows
sh scripts/install.sh .              # POSIX
```

## Host setup commands

Host setup commands work from either source path:

- `fable codex setup --project . --apply` — charter + `codex mcp add fable`
- `fable copilot setup --project . --apply` — charter + `copilot mcp add fable`
- `fable grok setup --project . --apply` — charter + `grok mcp add fable`
- `fable kimi setup --project .` — fable skill + charter
- `fable opencode setup --project .` — slim charter + `opencode.json` instructions

The fable MCP server is read-only and exposes `fable_runtime`.

## Dispatch

Background dispatch to vendor CLIs has moved to
[hopper-plugin](https://github.com/surebeli/hopper-plugin). fable provides the
governance charter that hopper-dispatched vendors can load.
