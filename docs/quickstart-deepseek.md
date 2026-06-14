# Quickstart: DeepSeek + opencode

Get from zero to executing a handoff with fable in 5 minutes.

## Prerequisites

- Node.js 18+
- opencode CLI installed and configured with a DeepSeek model

## 1. Clone

```bash
git clone https://github.com/surebeli/fable-5-anything
cd fable-5-anything
```

## 2. Initialize your project

```bash
node bin/fable.js init --cwd . --runtime opencode --model tokenbox/deepseek-v4-pro --yes
```

This creates `.fable/config.json`:
```json
{
  "runtime": "opencode",
  "model": "tokenbox/deepseek-v4-pro",
  "adapter": "adapters/opencode.md",
  "fableVersion": "0.1.0"
}
```

## 3. Build a prompt

```bash
node bin/fable.js build-prompt \
  --handoff examples/deepseek-handoff.md \
  --config examples/fable.config.json
```

## 4. Run a smoke check

Dry-run (print the command without executing):
```bash
node bin/fable.js smoke --config examples/fable.config.json
```

Run for real:
```bash
node bin/fable.js smoke --config examples/fable.config.json --execute
```

## 5. Execute a handoff

```bash
node bin/fable.js run examples/deepseek-handoff.md --config examples/fable.config.json
```

Dry-run to inspect the command before executing:
```bash
node bin/fable.js run examples/deepseek-handoff.md --config examples/fable.config.json --dry-run
```

## 6. Run tests

```bash
npm test
```

## What's next

- Write your own handoff files following the Goal / Background / Acceptance / Return contract.
- Use `fable run <your-handoff.md>` to dispatch tasks to opencode with the portable core rules.
- Check `.fable/runs/` for captured run output.
