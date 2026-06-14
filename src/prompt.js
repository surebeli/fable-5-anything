import { readFileSync } from 'node:fs';
import { resolveCorePath, resolveAdapterPath } from './config.js';

export function assemble({ handoffPath, config }) {
  const corePath = resolveCorePath();
  const core = readFileSync(corePath, 'utf-8');

  const adapterPath = resolveAdapterPath(config);
  const adapter = readFileSync(adapterPath, 'utf-8');

  const handoff = readFileSync(handoffPath, 'utf-8');

  const taskPrompt = `Read ${handoffPath}. Follow the portable core and the ${config.runtime} adapter. Write the result to the return path specified in the handoff.`;

  return [core, adapter, handoff, taskPrompt].join('\n\n');
}

export function smokePrompt() {
  return 'Reply exactly PONG and nothing else.';
}
