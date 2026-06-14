import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultConfig } from '../src/config.js';
import { assemble, smokePrompt } from '../src/prompt.js';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

describe('prompt assembly', () => {
  it('smokePrompt returns PONG text', () => {
    const p = smokePrompt();
    assert.strictEqual(p, 'Reply exactly PONG and nothing else.');
  });

  it('assembled prompt contains Portable Agent Core heading', () => {
    const cfg = defaultConfig();
    const handoffPath = resolve(__dirname, '..', 'examples', 'deepseek-handoff.md');
    const result = assemble({ handoffPath, config: cfg });
    assert.ok(result.includes('Portable Agent Core'));
  });

  it('assembled prompt contains opencode Adapter heading', () => {
    const cfg = defaultConfig();
    const handoffPath = resolve(__dirname, '..', 'examples', 'deepseek-handoff.md');
    const result = assemble({ handoffPath, config: cfg });
    assert.ok(result.includes('opencode Adapter'));
  });

  it('assembled prompt contains handoff content', () => {
    const cfg = defaultConfig();
    const handoffPath = resolve(__dirname, '..', 'examples', 'deepseek-handoff.md');
    const result = assemble({ handoffPath, config: cfg });
    assert.ok(result.includes('DeepSeek Handoff'));
    assert.ok(result.includes('## Goal'));
    assert.ok(result.includes('## Acceptance'));
    assert.ok(result.includes('## Return'));
  });

  it('assembled prompt references the handoff path and adapter name', () => {
    const cfg = defaultConfig();
    const handoffPath = resolve(__dirname, '..', 'examples', 'deepseek-handoff.md');
    const result = assemble({ handoffPath, config: cfg });
    assert.ok(result.includes(handoffPath));
    assert.ok(result.includes('opencode adapter'));
  });
});
