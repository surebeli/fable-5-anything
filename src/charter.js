import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

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
