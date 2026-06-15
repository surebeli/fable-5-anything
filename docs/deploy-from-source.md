# Deploy fable from source (no npm publish)

fable does not need to be published to npm to be used. There are two
source-based deployment paths; pick by whether you want a local clone.

## Path A — Clone + `--link path` (recommended; fully offline)

Most robust: a stable local clone, shims point at it by absolute path. No
network, no registry, no publish.

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
node bin/fable.js install --project <your-project> --link path --yes
```

The generated `<your-project>/.fable/bin/fable.cmd` (and `.ps1` / POSIX `fable`)
invoke `node "<clone>/bin/fable.js" … --project "<your-project>"`. Keep the clone
in place; `git pull` to update. `.fable/fable.lock.json` records the version and
`link: path`.

Use it from inside your project:

```bash
.fable\bin\fable.cmd doctor          # Windows
./.fable/bin/fable doctor            # POSIX
```

## Path B — Zero-clone via `npx github:` + `--link github`

No clone to keep around. Runs straight from the pushed GitHub source; npx fetches
the repo (zero runtime deps) and runs the `fable` bin. No publish required.

```bash
npx -y github:surebeli/fable-5-anything install --project . --link github --yes
# or the bootstrap scripts (default --link github):
scripts/install.ps1 -Project .       # Windows
sh scripts/install.sh .              # POSIX
```

The generated shims invoke `npx -y github:surebeli/fable-5-anything … --project
"<your-project>"`, so each call re-resolves fable from GitHub. `link: github` is
recorded in the lockfile. First call per machine pays npx's fetch; subsequent
calls use npx's cache.

## Link modes summary

| `--link` | Shim invokes | Needs |
|---|---|---|
| `path` (default) | `node "<clone>/bin/fable.js"` | a local clone |
| `github` | `npx -y github:surebeli/fable-5-anything` | network (no publish) |
| `global` | `fable` | a global install on PATH |
| `npx` | `npx -y fable-5-anything` | a future `npm publish` |

For source deployment, use **`path`** (clone) or **`github`** (zero-clone). `npx`
is reserved for after an eventual registry publish; `global` requires putting
`fable` on PATH yourself (e.g. `npm i -g .` from the clone, or `npm link`).

## Host integrations work the same either way

Once installed, the per-host setup commands are independent of the deploy path:

- `fable codex setup --project . --apply` — charter + `codex mcp add fable`
- `fable copilot setup --project . --apply` — charter + `copilot mcp add fable`
- `fable grok setup --project . --apply` — charter + `grok mcp add fable`
- `fable kimi setup --project .` — fable skill + charter (`--skills-dir` / `extra_skill_dirs`)

The fable MCP server is launched via the same entry the shim resolves, so the
host registrations track your chosen deploy path.

## Not in scope here

Publishing to the npm registry (`npm publish`, the `--link npx`/`global` ergonomic
paths, version tags, and PR/launch material) is a separate release step. The
package is already publish-ready (`package.json` has `bin`, `files`, `engines`,
`repository`), but no publish is performed.
