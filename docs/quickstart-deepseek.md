# Quickstart: DeepSeek + opencode Governance

Use fable to make opencode sessions that target a DeepSeek model follow the
portable governance core.

## Prerequisites

- Node.js 18+
- opencode CLI installed and configured with your DeepSeek model

## 1. Clone

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
```

## 2. Wire governance into your project

```bash
node bin/fable.js opencode setup --project <your-project>
```

This seeds the charter, copies the portable core to
`<your-project>/.fable/portable-agent-core.md`, and wires
`<your-project>/opencode.json` `instructions`.

## 3. Verify opencode loads the charter

From your project:

```bash
opencode run "What governance rules must you follow in this repo? List them."
```

The response should reflect the fable portable core and the host's own opencode
rules. Host rules remain authoritative.

## Dispatch

fable no longer dispatches tasks itself. For background dispatch to vendor CLIs,
use [hopper-plugin](https://github.com/surebeli/hopper-plugin).
