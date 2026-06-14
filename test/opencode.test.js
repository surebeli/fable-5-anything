import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildCommand } from '../src/opencode.js';

describe('opencode command building', () => {
  it('buildCommand includes required opencode flags', () => {
    const { cmd, args } = buildCommand({
      prompt: 'Reply exactly PONG and nothing else.',
      model: 'tokenbox/deepseek-v4-pro'
    });
    assert.strictEqual(cmd, 'opencode');
    assert.ok(args.includes('--dangerously-skip-permissions'));
    assert.ok(args.includes('--print-logs'));
    assert.ok(args.includes('--format'));
    assert.ok(args.includes('json'));
    assert.ok(args.includes('--pure'));
    assert.ok(args.includes('--model'));
    assert.ok(args.includes('tokenbox/deepseek-v4-pro'));
  });

  it('buildCommand includes the prompt as first positional arg after run', () => {
    const prompt = 'Reply exactly PONG and nothing else.';
    const { args } = buildCommand({ prompt, model: 'test/model' });
    assert.strictEqual(args[0], 'run');
    assert.strictEqual(args[1], prompt);
  });

  it('buildCommand display string contains all required flags', () => {
    const { display } = buildCommand({
      prompt: 'PONG',
      model: 'my-model'
    });
    assert.ok(display.includes('--dangerously-skip-permissions'));
    assert.ok(display.includes('--print-logs'));
    assert.ok(display.includes('--format json'));
    assert.ok(display.includes('--pure'));
    assert.ok(display.includes('--model my-model'));
  });
});
