import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../src/version.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');

describe('version', () => {
  it('VERSION is a non-empty semver-ish string', () => {
    assert.strictEqual(typeof VERSION, 'string');
    assert.ok(/^\d+\.\d+\.\d+/.test(VERSION), `unexpected VERSION: ${VERSION}`);
  });

  it('VERSION matches package.json version (single source of truth)', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
    assert.strictEqual(VERSION, pkg.version);
  });
});
