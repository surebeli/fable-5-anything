import { describe, it } from 'node:test';
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PKG_ROOT } from '../src/config.js';

describe('config', () => {
  it('PKG_ROOT points to the repo root', () => {
    assert.ok(existsSync(join(PKG_ROOT, 'package.json')));
  });
});
