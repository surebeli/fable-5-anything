import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function buildCommand({ prompt, model }) {
  const args = [
    'run',
    prompt,
    '--model', model,
    '--dangerously-skip-permissions',
    '--print-logs',
    '--format', 'json',
    '--pure'
  ];
  return {
    cmd: 'opencode',
    args,
    display: `opencode run "<prompt>" --model ${model} --dangerously-skip-permissions --print-logs --format json --pure`
  };
}

export function runOpenCode({ prompt, model, projectDir }) {
  const cwd = projectDir || process.cwd();
  const { cmd, args } = buildCommand({ prompt, model });
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    timeout: 300000,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  const output = {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error ? result.error.message : null
  };

  const runsDir = resolve(cwd, '.fable', 'runs');
  if (!existsSync(runsDir)) {
    mkdirSync(runsDir, { recursive: true });
  }
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const runPath = join(runsDir, `run-${ts}.json`);
  writeFileSync(runPath, JSON.stringify(output, null, 2) + '\n');

  return { ...output, runPath };
}
