import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validate } from '../src/handoff.js';

describe('handoff validation', () => {
  const validHandoff = `# Test Handoff

## Goal

Achieve something.

## Background

Some context.

## Acceptance

Must pass.

## Return

Write to result.md.
`;

  it('passes when all four sections are present', () => {
    const result = validate(validHandoff);
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.missing, []);
  });

  it('fails when Goal is missing', () => {
    const content = validHandoff.replace('## Goal', '## Objective');
    const result = validate(content);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missing.includes('Goal'));
  });

  it('fails when Background is missing', () => {
    const content = validHandoff.replace('## Background', '## Context');
    const result = validate(content);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missing.includes('Background'));
  });

  it('fails when Acceptance is missing', () => {
    const content = validHandoff.replace('## Acceptance', '## Criteria');
    const result = validate(content);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missing.includes('Acceptance'));
  });

  it('fails when Return is missing', () => {
    const content = validHandoff.replace('## Return', '## Output');
    const result = validate(content);
    assert.strictEqual(result.valid, false);
    assert.ok(result.missing.includes('Return'));
  });

  it('fails with all four missing when handoff is empty', () => {
    const result = validate('');
    assert.strictEqual(result.valid, false);
    assert.deepStrictEqual(result.missing, ['Goal', 'Background', 'Acceptance', 'Return']);
  });

  it('detects sections case-insensitively (word boundary)', () => {
    const content = `## Goal and Scope\n\n## background\n\n## Acceptance Criteria\n\n## return channel`;
    const result = validate(content);
    assert.strictEqual(result.valid, true);
  });
});
