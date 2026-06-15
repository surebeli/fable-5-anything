import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(join(__dirname, '..'));

const FRONTMATTER = `---
name: fable
description: Portable prompt governance for this project. Read the project first; obey the handoff contract (Goal/Background/Acceptance/Return); use TDD/acceptance gates; make minimal scoped changes; preserve user work; verify before completion; write result/review artifacts. The host system prompt and tool rules remain authoritative; fable overlays governance and never overrides host rules.
---
`;

export function buildKimiSkill() {
  const core = readFileSync(join(PKG_ROOT, 'prompts', 'portable-agent-core.md'), 'utf-8');
  const adapter = readFileSync(join(PKG_ROOT, 'adapters', 'kimi.md'), 'utf-8');
  return `${FRONTMATTER}\n# Fable Governance (portable core)\n\n${core}\n\n# Kimi runtime adapter\n\n${adapter}\n`;
}

export function writeKimiSkill({ project }) {
  const dir = join(resolve(project), '.fable', 'skills', 'fable');
  mkdirSync(dir, { recursive: true });
  const p = join(dir, 'SKILL.md');
  writeFileSync(p, buildKimiSkill());
  return p;
}
