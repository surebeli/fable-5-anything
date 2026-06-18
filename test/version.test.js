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

  it('package.json has distribution metadata for npx/publish', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'));
    assert.ok(/^\d+\.\d+\.\d+/.test(pkg.version), `version should be semver, got: ${pkg.version}`);
    assert.ok(Array.isArray(pkg.files) && pkg.files.includes('src/'), 'files must whitelist src/');
    assert.ok(pkg.files.includes('adapters/') && pkg.files.includes('prompts/'), 'files must include adapters/ and prompts/');
    assert.ok(pkg.engines && pkg.engines.node, 'engines.node required');
    assert.ok(pkg.repository && /github\.com\/surebeli\/fable-5-anything/.test(pkg.repository.url || ''), 'repository.url required');
    assert.ok(Array.isArray(pkg.keywords) && pkg.keywords.length > 0, 'keywords required');
    assert.strictEqual(pkg.bin.fable, './bin/fable.js', 'bin entry preserved');
  });
});

import { spawnSync } from 'node:child_process';
const BIN = resolve(ROOT, 'bin', 'fable.js');
function fable(args) {
  return spawnSync('node', [BIN, ...args], { encoding: 'utf-8', timeout: 30000, cwd: ROOT });
}

describe('fable --version command', () => {
  it('--version prints the version and exits 0', () => {
    const r = fable(['--version']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes(VERSION), `stdout should include ${VERSION}, got: ${r.stdout}`);
  });

  it('version subcommand prints the version and exits 0', () => {
    const r = fable(['version']);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes(VERSION));
  });
});

import { existsSync } from 'node:fs';

describe('bootstrap scripts', () => {
  it('scripts/install.ps1 exists and runs npx github governance install', () => {
    const p = resolve(ROOT, 'scripts', 'install.ps1');
    assert.ok(existsSync(p));
    const t = readFileSync(p, 'utf-8');
    assert.ok(t.includes('npx'), 'should use npx');
    assert.ok(t.includes('github:surebeli/fable-5-anything'), 'should reference the github package');
    assert.ok(t.includes('governance'), 'should call fable governance');
    assert.ok(t.includes('--project "$Project"'), 'should pass the target project');
    assert.ok(!t.includes(' install '), 'should not call removed fable install');
  });

  it('scripts/install.sh exists and runs npx github governance install', () => {
    const p = resolve(ROOT, 'scripts', 'install.sh');
    assert.ok(existsSync(p));
    const t = readFileSync(p, 'utf-8');
    assert.ok(t.includes('#!/usr/bin/env sh') || t.includes('#!/bin/sh'));
    assert.ok(t.includes('npx'));
    assert.ok(t.includes('github:surebeli/fable-5-anything'));
    assert.ok(t.includes('governance'));
    assert.ok(t.includes('--project "$PROJECT"'));
    assert.ok(!t.includes(' install '), 'should not call removed fable install');
  });
});
