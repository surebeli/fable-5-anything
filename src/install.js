import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defaultConfig, PKG_ROOT } from './config.js';

const EXAMPLE_HANDOFF = `# Example Handoff

## Goal

Verify that fable correctly assembles and dispatches a prompt.

## Background

fable-5-anything provides portable prompt governance for non-Claude agent runtimes.
This example handoff demonstrates the minimum contract format required by the portable core.

## Acceptance

- The assembled prompt must contain the Portable Agent Core
- The assembled prompt must contain the runtime adapter
- The assembled prompt must contain this handoff content

## Return

Write the result to .fable/runs/example-result.md.
`;

const FABLE_README = `# .fable/

This directory is managed by fable-5-anything.

- \`config.json\` — runtime and model configuration
- \`handoffs/\` — handoff files for task dispatch
- \`runs/\` — captured run output (git-ignored)
- \`bin/\` — local fable command shims

Do not commit \`runs/\` to version control.
`;

const AGENTS_SECTION = '\n\n<!-- FABLE-START -->\n## Fable Integration\n\nThis project uses [fable-5-anything](https://github.com/surebeli/fable-5-anything) for\nportable prompt governance. Handoff tasks are dispatched via:\n\n```bash\nfable run .fable/handoffs/example.md --project .\n```\n\nSee `.fable/README.md` for details.\n<!-- FABLE-END -->\n';

function safeWriteTemplate(filePath, templateContent, label) {
  if (existsSync(filePath)) {
    const existing = readFileSync(filePath, 'utf-8');
    if (existing === templateContent) {
      writeFileSync(filePath, templateContent);
      return `  (updated) ${label}`;
    }
    const newPath = filePath + '.new';
    writeFileSync(newPath, templateContent);
    return `  (skipped, user-modified) ${label} — template written to ${newPath}`;
  }
  writeFileSync(filePath, templateContent);
  return `  (created) ${label}`;
}

function createShims(shimDir, project, fableRepo) {
  const fableJS = join(fableRepo, 'bin', 'fable.js');

  const cmdContent = `@echo off\r\nnode "${fableJS}" %* --project "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable.cmd'), cmdContent);

  const ps1Content = `node "${fableJS}" @args "--project" "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable.ps1'), ps1Content);

  const shContent = `#!/usr/bin/env sh\r\nnode "${fableJS}" "$@" --project "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable'), shContent);
}

export function install({ projectDir, runtime, model }) {
  const project = resolve(projectDir);
  const fableDir = join(project, '.fable');
  const handoffsDir = join(fableDir, 'handoffs');
  const runsDir = join(fableDir, 'runs');
  const shimDir = join(fableDir, 'bin');
  const summary = [];

  for (const dir of [fableDir, handoffsDir, runsDir, shimDir]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  const config = defaultConfig(runtime, model);
  writeFileSync(join(fableDir, 'config.json'), JSON.stringify(config, null, 2) + '\n');

  summary.push(safeWriteTemplate(join(handoffsDir, 'example.md'), EXAMPLE_HANDOFF, '.fable/handoffs/example.md'));
  summary.push(safeWriteTemplate(join(fableDir, 'README.md'), FABLE_README, '.fable/README.md'));

  createShims(shimDir, project, PKG_ROOT);
  summary.push(`  (created) .fable/bin/fable.cmd, fable.ps1, fable`);

  const gitignorePath = join(project, '.gitignore');
  const gitignoreEntry = '.fable/runs/\n';
  if (existsSync(gitignorePath)) {
    const existing = readFileSync(gitignorePath, 'utf-8');
    if (!existing.includes('.fable/runs/')) {
      writeFileSync(gitignorePath, existing + (existing.endsWith('\n') ? '' : '\n') + gitignoreEntry);
    }
  } else {
    writeFileSync(gitignorePath, gitignoreEntry);
  }

  const agentsPath = join(project, 'AGENTS.md');
  if (existsSync(agentsPath)) {
    const existing = readFileSync(agentsPath, 'utf-8');
    if (!existing.includes('<!-- FABLE-START -->')) {
      writeFileSync(agentsPath, existing + AGENTS_SECTION);
    }
  } else {
    writeFileSync(agentsPath, '# AGENTS.md\n' + AGENTS_SECTION);
  }

  console.log(summary.join('\n'));
  return { project, config };
}
