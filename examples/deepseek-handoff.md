# DeepSeek Handoff — Example

## Goal

Verify that fable build-prompt correctly assembles a dispatch prompt containing
the portable agent core, the opencode adapter, and this handoff content.

## Background

fable-5-anything provides a CLI for building prompts that combine a portable
behavior core with a runtime adapter. This example handoff demonstrates the
minimum handoff contract format required by the portable core.

## Acceptance

The assembled prompt must contain:
- `Portable Agent Core` heading
- `opencode Adapter` heading
- The text of this handoff file

## Return

Write the result to `build-prompt-output.txt`.

This example handoff obeys all constitutional rules in
prompts/portable-agent-core.md. If there is a conflict, the portable core wins.
