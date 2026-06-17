import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Self-contained PKG_ROOT (mirrors skill.js / runtime.js) so charter.js does not
// depend on the dispatch modules being removed in this change.
const PKG_ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));

// Universal, mode-neutral block. Used where the portable core may NOT live in a
// local file (fable install, codex/copilot/grok MCP setup, kimi skill) — so it
// must not name `.fable/portable-agent-core.md` (that would dangle).
export const FABLE_BLOCK = '<!-- FABLE-START -->\n## Fable Integration\n\nThis project uses [fable-5-anything](https://github.com/surebeli/fable-5-anything) for\nportable prompt governance: read the project first, obey the handoff contract\n(Goal/Background/Acceptance/Return), use TDD/acceptance gates, make minimal scoped\nchanges, preserve user work, and verify before completion. The full portable core\nis the source of truth, loaded via this charter or your host\'s instructions.\n\nThe host agent\'s own system prompt and tool rules remain authoritative; fable\noverlays project governance and never asks you to ignore host instructions.\n<!-- FABLE-END -->\n';

// Variant for commands that copy the core into the project and wire it via
// opencode.json instructions (fable governance default, fable opencode setup):
// names the core file because it actually exists in that mode.
export const FABLE_BLOCK_OPENCODE = '<!-- FABLE-START -->\n## Fable Integration\n\nThis project uses [fable-5-anything](https://github.com/surebeli/fable-5-anything) for\nportable prompt governance: read the project first, obey the handoff contract\n(Goal/Background/Acceptance/Return), use TDD/acceptance gates, make minimal scoped\nchanges, preserve user work, and verify before completion.\n\nThe full portable core is in `.fable/portable-agent-core.md`, auto-loaded into\nevery session via `opencode.json` `instructions` — treat it as the source of truth.\n\nThe host agent\'s own system prompt and tool rules remain authoritative; fable\noverlays project governance and never asks you to ignore host instructions.\n<!-- FABLE-END -->\n';

function headerFor(rel) {
  const base = rel.split(/[\\/]/).pop();
  if (base === 'CLAUDE.md') return '# CLAUDE.md\n';
  if (base === 'AGENTS.md') return '# AGENTS.md\n';
  if (base === 'copilot-instructions.md') return '# Copilot Instructions\n';
  return `# ${base}\n`;
}

export function syncCharter({ project, files, force = false, block = FABLE_BLOCK }) {
  const written = [];
  for (const rel of files) {
    const p = join(project, rel);
    const dir = dirname(p);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (existsSync(p)) {
      const existing = readFileSync(p, 'utf-8');
      if (existing.includes('<!-- FABLE-START -->')) {
        if (force) {
          // function replacement avoids `$`-sequence interpretation in `block`
          const refreshed = existing.replace(/<!-- FABLE-START -->[\s\S]*?<!-- FABLE-END -->\n?/, () => block);
          writeFileSync(p, refreshed);
          written.push({ file: rel, action: 'refreshed' });
        } else {
          written.push({ file: rel, action: 'present' });
        }
        continue;
      }
      writeFileSync(p, existing + (existing.endsWith('\n') ? '' : '\n') + '\n' + block);
      written.push({ file: rel, action: 'appended' });
    } else {
      writeFileSync(p, headerFor(rel) + '\n' + block);
      written.push({ file: rel, action: 'created' });
    }
  }
  return written;
}

// Build a charter block (with FABLE markers) containing the FULL portable core
// inline — used by the host-agnostic `fable governance` command (Mode A), which
// inlines the constitution straight into AGENTS.md / CLAUDE.md.
export function buildInlineCharterBlock() {
  const core = readFileSync(join(PKG_ROOT, 'prompts', 'portable-agent-core.md'), 'utf-8');
  return '<!-- FABLE-START -->\n## Fable Governance (portable core)\n\n' + core.trimEnd() + '\n\nThe host agent\'s own system prompt and tool rules remain authoritative; fable overlays project governance and never asks you to ignore host instructions.\n<!-- FABLE-END -->\n';
}

// Make the FULL fable portable core govern every opencode session: copy the
// portable core into the project's .fable/ and wire it (plus AGENTS.md) into
// opencode.json `instructions`. Preserves existing opencode.json keys; idempotent.
export function wireOpencodeGovernance({ projectDir }) {
  const project = resolve(projectDir);
  const fableDir = join(project, '.fable');
  if (!existsSync(fableDir)) mkdirSync(fableDir, { recursive: true });

  const coreDest = join(fableDir, 'portable-agent-core.md');
  copyFileSync(join(PKG_ROOT, 'prompts', 'portable-agent-core.md'), coreDest);

  const ocPath = join(project, 'opencode.json');
  let oc = { '$schema': 'https://opencode.ai/config.json' };
  if (existsSync(ocPath)) {
    try {
      oc = JSON.parse(readFileSync(ocPath, 'utf-8'));
    } catch (e) {
      throw new Error(`opencode.json is not valid JSON (refusing to overwrite): ${e.message}`);
    }
  }
  const want = ['AGENTS.md', '.fable/portable-agent-core.md'];
  const instructions = Array.isArray(oc.instructions) ? [...oc.instructions] : [];
  for (const w of want) if (!instructions.includes(w)) instructions.push(w);
  oc.instructions = instructions;
  writeFileSync(ocPath, JSON.stringify(oc, null, 2) + '\n');

  return { core: coreDest, opencodeJson: ocPath, instructions };
}
