import { mkdirSync, writeFileSync, readFileSync, existsSync, chmodSync, copyFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { defaultConfig, PKG_ROOT } from './config.js';
import { VERSION } from './version.js';
import { syncCharter } from './charter.js';

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

// Single source of truth for how the shims/lockfile resolve fable.
// `posix: true` forces forward slashes for the POSIX `fable` shell script and
// the portable, version-controlled fable.lock.json. The native (Windows) shims
// keep platform separators so the generated .cmd/.ps1 stay byte-identical.
function pathEntry(fableRepo, { posix = false } = {}) {
  const native = join(fableRepo, 'bin', 'fable.js');
  return posix ? native.split(sep).join('/') : native;
}

function shimInvocation(link, fableRepo, { posix = false } = {}) {
  if (link === 'global') return 'fable';
  if (link === 'npx') return 'npx -y fable-5-anything';
  if (link === 'github') return 'npx -y github:surebeli/fable-5-anything';
  return `node "${pathEntry(fableRepo, { posix })}"`; // default: 'path'
}

function createShims(shimDir, project, fableRepo, link) {
  // Windows shims keep native separators (byte-identical to prior behavior).
  const nativeInv = shimInvocation(link, fableRepo);
  // The POSIX `fable` shell script must use forward slashes so it is portable
  // to real Unix systems (commit: 可移植 shim).
  const posixInv = shimInvocation(link, fableRepo, { posix: true });

  const cmdContent = `@echo off\r\n${nativeInv} %* --project "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable.cmd'), cmdContent);

  const ps1Content = `${nativeInv} @args "--project" "${project}"\r\n`;
  writeFileSync(join(shimDir, 'fable.ps1'), ps1Content);

  const shContent = `#!/usr/bin/env sh\n${posixInv} "$@" --project "${project}"\n`;
  const posixShim = join(shimDir, 'fable');
  writeFileSync(posixShim, shContent);
  try { chmodSync(posixShim, 0o755); } catch { /* chmod is a no-op on Windows */ }
}

// Entry recorded in the portable, version-controlled fable.lock.json — always
// uses forward slashes so the path mode lockfile is platform-neutral.
function lockEntry(link, fableRepo) {
  if (link === 'global') return 'fable';
  if (link === 'npx') return 'npx -y fable-5-anything';
  if (link === 'github') return 'npx -y github:surebeli/fable-5-anything';
  return pathEntry(fableRepo, { posix: true });
}

export function install({ projectDir, runtime, model, link = 'path' }) {
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

  createShims(shimDir, project, PKG_ROOT, link);
  summary.push(`  (created) .fable/bin/fable.cmd, fable.ps1, fable`);

  const lock = {
    fableVersion: VERSION,
    link,
    entry: lockEntry(link, PKG_ROOT),
    installedFrom: PKG_ROOT
  };
  writeFileSync(join(fableDir, 'fable.lock.json'), JSON.stringify(lock, null, 2) + '\n');
  summary.push(`  (created) .fable/fable.lock.json`);

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

  syncCharter({ project, files: ['AGENTS.md', 'CLAUDE.md'] });
  summary.push('  (charter) AGENTS.md, CLAUDE.md');

  console.log(summary.join('\n'));
  return { project, config };
}

// Make the FULL fable portable core govern every opencode session: copy the
// portable core into the project's .fable/ and wire it (plus AGENTS.md) into
// opencode.json `instructions`, which opencode auto-loads each run. Preserves
// any existing opencode.json keys (e.g. mcp); idempotent (dedupes instructions).
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
