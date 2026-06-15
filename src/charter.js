import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

export const FABLE_BLOCK = '<!-- FABLE-START -->\n## Fable Integration\n\nThis project uses [fable-5-anything](https://github.com/surebeli/fable-5-anything) for\nportable prompt governance. Follow the portable core in `.fable/` and the handoff\ncontract (Goal/Background/Acceptance/Return). Dispatch handoffs via:\n\n```bash\nfable run .fable/handoffs/example.md --project .\n```\n\nThe host agent\'s own system prompt and tool rules remain authoritative; fable\noverlays project governance and never asks you to ignore host instructions.\n<!-- FABLE-END -->\n';

function headerFor(rel) {
  const base = rel.split(/[\\/]/).pop();
  if (base === 'CLAUDE.md') return '# CLAUDE.md\n';
  if (base === 'AGENTS.md') return '# AGENTS.md\n';
  if (base === 'copilot-instructions.md') return '# Copilot Instructions\n';
  return `# ${base}\n`;
}

export function syncCharter({ project, files, force = false }) {
  const written = [];
  for (const rel of files) {
    const p = join(project, rel);
    const dir = dirname(p);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (existsSync(p)) {
      const existing = readFileSync(p, 'utf-8');
      if (existing.includes('<!-- FABLE-START -->')) {
        if (force) {
          const refreshed = existing.replace(/<!-- FABLE-START -->[\s\S]*?<!-- FABLE-END -->\n?/, FABLE_BLOCK);
          writeFileSync(p, refreshed);
          written.push({ file: rel, action: 'refreshed' });
        } else {
          written.push({ file: rel, action: 'present' });
        }
        continue;
      }
      writeFileSync(p, existing + (existing.endsWith('\n') ? '' : '\n') + '\n' + FABLE_BLOCK);
      written.push({ file: rel, action: 'appended' });
    } else {
      writeFileSync(p, headerFor(rel) + '\n' + FABLE_BLOCK);
      written.push({ file: rel, action: 'created' });
    }
  }
  return written;
}
