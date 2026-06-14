import { readFileSync } from 'node:fs';

const REQUIRED_SECTIONS = ['Goal', 'Background', 'Acceptance', 'Return'];

export function readHandoff(path) {
  return readFileSync(path, 'utf-8');
}

export function validate(content) {
  const missing = [];
  for (const section of REQUIRED_SECTIONS) {
    const headingRegex = new RegExp(`^##\\s+.*${section}`, 'mi');
    if (!headingRegex.test(content)) {
      missing.push(section);
    }
  }
  return { valid: missing.length === 0, missing };
}
