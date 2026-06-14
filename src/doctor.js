import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveAdapterPath, resolveCorePath } from './config.js';
import { buildCommand } from './opencode.js';
import { smokePrompt } from './prompt.js';

function checkOpenCodeInPath() {
  try {
    const result = spawnSync('opencode', ['--version'], {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    if (result.status === 0 && (result.stdout || result.stderr)) {
      const ver = (result.stdout || result.stderr).trim().split('\n')[0];
      return { check: 'opencode path', status: 'ok', detail: `opencode ${ver}` };
    }
    return { check: 'opencode path', status: 'fail', detail: 'opencode --version exited non-zero' };
  } catch (e) {
    return { check: 'opencode path', status: 'fail', detail: 'opencode not found in PATH' };
  }
}

function checkFableAgentsSection(project) {
  const agentsPath = join(project, 'AGENTS.md');
  if (!existsSync(agentsPath)) {
    return { check: 'AGENTS fable', status: 'fail', detail: 'AGENTS.md not found' };
  }
  const content = readFileSync(agentsPath, 'utf-8');
  if (content.includes('<!-- FABLE-START -->')) {
    return { check: 'AGENTS fable', status: 'ok', detail: 'fable section present' };
  }
  return { check: 'AGENTS fable', status: 'fail', detail: 'fable section missing (<!-- FABLE-START --> not found)' };
}

function checkGitignoreRuns(project) {
  const gitignorePath = join(project, '.gitignore');
  if (!existsSync(gitignorePath)) {
    return { check: 'gitignore runs', status: 'fail', detail: '.gitignore not found' };
  }
  const content = readFileSync(gitignorePath, 'utf-8');
  if (content.includes('.fable/runs/')) {
    return { check: 'gitignore runs', status: 'ok', detail: '.fable/runs/ is git-ignored' };
  }
  return { check: 'gitignore runs', status: 'fail', detail: '.fable/runs/ not in .gitignore' };
}

function checkLocalShim(project) {
  const cmdShim = join(project, '.fable', 'bin', 'fable.cmd');
  const ps1Shim = join(project, '.fable', 'bin', 'fable.ps1');
  const posixShim = join(project, '.fable', 'bin', 'fable');
  if (existsSync(cmdShim) && existsSync(ps1Shim) && existsSync(posixShim)) {
    return { check: 'local shim', status: 'ok', detail: join(project, '.fable', 'bin') };
  }
  const missing = [];
  if (!existsSync(cmdShim)) missing.push('fable.cmd');
  if (!existsSync(ps1Shim)) missing.push('fable.ps1');
  if (!existsSync(posixShim)) missing.push('fable');
  return { check: 'local shim', status: 'fail', detail: `missing: ${missing.join(', ')}` };
}

export function doctorChecks({ projectDir, config }) {
  const checks = [];
  const project = resolve(projectDir);

  const configPath = join(project, '.fable', 'config.json');
  if (existsSync(configPath)) {
    try {
      JSON.parse(readFileSync(configPath, 'utf-8'));
      checks.push({ check: 'config', status: 'ok', detail: configPath });
    } catch (e) {
      checks.push({ check: 'config', status: 'fail', detail: `Invalid JSON: ${e.message}` });
    }
  } else {
    checks.push({ check: 'config', status: 'fail', detail: `${configPath} not found` });
  }

  try {
    const adapterPath = resolveAdapterPath(config);
    if (existsSync(adapterPath)) {
      checks.push({ check: 'adapter', status: 'ok', detail: adapterPath });
    } else {
      checks.push({ check: 'adapter', status: 'fail', detail: `${adapterPath} not found` });
    }
  } catch (e) {
    checks.push({ check: 'adapter', status: 'fail', detail: e.message });
  }

  try {
    const corePath = resolveCorePath();
    if (existsSync(corePath)) {
      checks.push({ check: 'core', status: 'ok', detail: corePath });
    } else {
      checks.push({ check: 'core', status: 'fail', detail: `${corePath} not found` });
    }
  } catch (e) {
    checks.push({ check: 'core', status: 'fail', detail: e.message });
  }

  const handoffPath = join(project, '.fable', 'handoffs', 'example.md');
  if (existsSync(handoffPath)) {
    checks.push({ check: 'handoff', status: 'ok', detail: handoffPath });
  } else {
    checks.push({ check: 'handoff', status: 'fail', detail: `${handoffPath} not found` });
  }

  try {
    const prompt = smokePrompt();
    const { cmd } = buildCommand({ prompt, model: config.model });
    checks.push({
      check: 'opencode dry-run',
      status: 'ok',
      detail: `${cmd} run "<prompt>" --model ${config.model} --dangerously-skip-permissions --print-logs --format json --pure`
    });
  } catch (e) {
    checks.push({ check: 'opencode dry-run', status: 'fail', detail: e.message });
  }

  checks.push(checkOpenCodeInPath());
  checks.push(checkFableAgentsSection(project));
  checks.push(checkGitignoreRuns(project));
  checks.push(checkLocalShim(project));

  return checks;
}
