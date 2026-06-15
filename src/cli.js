import { resolve, isAbsolute } from 'node:path';
import { writeFileSync } from 'node:fs';
import { defaultConfig, readConfigFile, writeConfig } from './config.js';
import { readHandoff, validate } from './handoff.js';
import { assemble, smokePrompt } from './prompt.js';
import { buildCommand, runOpenCode } from './opencode.js';
import { install } from './install.js';
import { doctorChecks } from './doctor.js';
import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';

function parseArgs(argv) {
  if (argv.length === 0) return { command: 'help' };

  const command = argv[0];
  const opts = {};
  let positional = [];

  for (let i = 1; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        opts[key] = argv[i + 1];
        i++;
      } else {
        opts[key] = true;
      }
    } else {
      positional.push(argv[i]);
    }
  }

  return { command, opts, positional };
}

function getConfigBase(opts) {
  if (opts.config) return resolve(opts.config);
  if (opts.project) return resolve(opts.project);
  return process.cwd();
}

function resolveHandoffPath(handoffPath, opts) {
  if (isAbsolute(handoffPath)) return handoffPath;
  if (opts.project) return resolve(opts.project, handoffPath);
  return resolve(handoffPath);
}

function showHelp() {
  console.log(`fable — portable prompt governance CLI

Usage:
  fable init --cwd <dir> --runtime <name> --model <name> [--yes]
    Initialize .fable/config.json in a project directory.

  fable install --project <dir> --runtime <name> --model <name> [--yes]
    Bootstrap a project with .fable/ config, handoffs, README, shims,
    .gitignore, and AGENTS.md section. Safe re-run preserves user files.

  fable doctor --project <dir>
    Check config, adapter, core, and handoff. For an opencode project also
    checks the opencode dry-run command shape and opencode PATH; for other
    runtimes reports the overlay/planned status instead. Always checks the
    AGENTS.md fable section, .gitignore runs entry, and local shim. No model calls.

  fable build-prompt --handoff <path> [--config <path>] [--project <dir>] [--out <path>]
    Assemble a dispatch prompt from core + adapter + handoff.

  fable smoke [--config <path>] [--project <dir>] [--execute]
    Run PONG smoke check. Dry-run by default; --execute runs real opencode.

  fable run <handoff> [--config <path>] [--project <dir>] [--dry-run]
    Execute an opencode run with the assembled prompt. Defaults to real run.

  fable runtime [<name>] [--list]
    Show how fable injects into a runtime (status, injection mode, whether it
    overlays or replaces the host system prompt). No args lists all runtimes.

  fable --help
    Show this help.

After install, call fable from within your project via:
  .fable\\bin\\fable.cmd doctor
  .fable\\bin\\fable.cmd build-prompt .fable/handoffs/example.md

Examples:
  fable install --project ../my-project --runtime opencode --model tokenbox/deepseek-v4-pro --yes
  fable doctor --project ../my-project
  fable build-prompt --project ../my-project --handoff .fable/handoffs/example.md
  fable smoke --project ../my-project --dry-run
  fable run .fable/handoffs/example.md --project . --dry-run`);
}

function cmdInit(opts) {
  const cwd = resolve(opts.cwd || process.cwd());
  const runtime = opts.runtime || 'opencode';
  const model = opts.model || 'tokenbox/deepseek-v4-pro';

  const config = defaultConfig(runtime, model);
  writeConfig(cwd, config);
  console.log(`Created ${cwd}/.fable/config.json`);
  console.log(JSON.stringify(config, null, 2));
}

function cmdInstall(opts) {
  if (!opts.project) {
    console.error('Error: --project <dir> is required');
    process.exit(1);
  }
  const runtime = opts.runtime || 'opencode';
  const model = opts.model || 'tokenbox/deepseek-v4-pro';

  const result = install({ projectDir: opts.project, runtime, model });
  console.log(`\nInstalled fable into ${result.project}`);
  console.log(JSON.stringify(result.config, null, 2));
}

function cmdDoctor(opts) {
  const projectDir = resolve(opts.project || '.');
  const configBase = getConfigBase({ project: projectDir });
  let config;
  try {
    config = readConfigFile(configBase);
  } catch (e) {
    console.error('Error: Could not read config. Run fable install first.');
    process.exit(1);
  }

  const checks = doctorChecks({ projectDir, config });
  let allOk = true;

  for (const c of checks) {
    const icon = c.status === 'ok' ? '  PASS' : c.status === 'warn' ? '  WARN' : '  FAIL';
    const label = (c.check + ':').padEnd(24);
    console.log(`${icon}  ${label} ${c.detail}`);
    if (c.status === 'fail') allOk = false;
  }

  if (allOk) {
    console.log('\nAll checks passed.');
  }
  process.exit(allOk ? 0 : 1);
}

function cmdBuildPrompt(opts) {
  if (!opts.handoff) {
    console.error('Error: --handoff <path> is required');
    process.exit(1);
  }

  const handoffPath = resolveHandoffPath(opts.handoff, opts);
  const configBase = getConfigBase(opts);
  const config = readConfigFile(configBase);

  const content = readHandoff(handoffPath);
  const vr = validate(content);
  if (!vr.valid) {
    console.error(`Error: Handoff missing required sections: ${vr.missing.join(', ')}`);
    process.exit(1);
  }

  const prompt = assemble({ handoffPath, config });

  if (opts.out) {
    writeFileSync(resolve(opts.out), prompt);
    console.log(`Wrote prompt to ${opts.out}`);
  } else {
    process.stdout.write(prompt);
  }
}

function cmdSmoke(opts) {
  const configBase = getConfigBase(opts);
  const config = readConfigFile(configBase);
  const prompt = smokePrompt();
  const execute = opts.execute === true || opts.execute === 'true';

  const { cmd, args } = buildCommand({ prompt, model: config.model });

  if (execute) {
    console.log(`Executing: opencode ${args.slice(2).join(' ')}`);
    const projectDir = opts.project ? resolve(opts.project) : process.cwd();
    const result = runOpenCode({ prompt, model: config.model, projectDir });
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log('DRY-RUN — would execute:');
    console.log(`${cmd} ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`);
  }
}

function cmdRun(opts, positional) {
  let handoffPath = positional[0] || opts.handoff;
  if (!handoffPath) {
    console.error('Error: <handoff> argument is required');
    process.exit(1);
  }
  handoffPath = resolveHandoffPath(handoffPath, opts);

  const configBase = getConfigBase(opts);
  const config = readConfigFile(configBase);

  const content = readHandoff(handoffPath);
  const vr = validate(content);
  if (!vr.valid) {
    console.error(`Error: Handoff missing required sections: ${vr.missing.join(', ')}`);
    process.exit(1);
  }

  const prompt = assemble({ handoffPath, config });
  const dryRun = opts['dry-run'] === true || opts['dry-run'] === 'true';

  if (dryRun) {
    const { cmd, args } = buildCommand({ prompt, model: config.model });
    console.log('DRY-RUN — would execute:');
    console.log(`${cmd} ${args.map(a => a.includes(' ') ? `"${a}"` : a).join(' ')}`);
  } else {
    console.log(`Executing opencode run with ${handoffPath}...`);
    const projectDir = opts.project ? resolve(opts.project) : process.cwd();
    const result = runOpenCode({ prompt, model: config.model, projectDir });
    console.log(JSON.stringify(result, null, 2));
  }
}

function cmdRuntime(opts, positional) {
  const caps = loadCapabilities();

  if (opts.list || positional[0] === '--list' || (!positional[0] && !opts.list)) {
    if (!positional[0] && !opts.list) {
      // bare `fable runtime` behaves as --list
    }
    console.log('Known runtimes:\n');
    for (const name of listRuntimes()) {
      const r = caps[name];
      console.log(`  ${name.padEnd(10)} ${r.status.padEnd(14)} ${r.hostSystemPolicy} / ${r.injectionMode}`);
    }
    console.log('\nRun: fable runtime <name>   for details.');
    return;
  }

  const name = positional[0];
  const r = getRuntime(name);
  if (!r) {
    console.error(`Unknown runtime: ${name}. Known: ${listRuntimes().join(', ')}. Run: fable runtime --list`);
    process.exit(1);
  }

  const replaces = r.hostSystemPolicy === 'system-replace-when-user-owned';
  console.log(`runtime:            ${name}`);
  console.log(`status:             ${r.status}`);
  console.log(`injection mode:     ${r.injectionMode}`);
  console.log(`host system policy: ${r.hostSystemPolicy}`);
  console.log(`adapter:            ${r.adapter === null ? '(none — reference only)' : r.adapter}`);
  console.log(`implemented cmds:   ${r.commandSupport.length ? r.commandSupport.join(', ') : '(none)'}`);
  console.log(`host system prompt: ${replaces ? 'fable may REPLACE it when the user owns the session' : 'authoritative — fable OVERLAYS governance, does not replace it'}`);
  console.log(`notes:              ${r.notes}`);
}

export function main(argv) {
  const { command, opts, positional } = parseArgs(argv);

  if (opts.help || command === 'help' || command === '--help') {
    showHelp();
    return;
  }

  switch (command) {
    case 'init':
      cmdInit(opts);
      break;
    case 'install':
      cmdInstall(opts);
      break;
    case 'doctor':
      cmdDoctor(opts);
      break;
    case 'build-prompt':
      cmdBuildPrompt(opts);
      break;
    case 'smoke':
      cmdSmoke(opts);
      break;
    case 'run':
      cmdRun(opts, positional);
      break;
    case 'runtime':
      cmdRuntime(opts, positional);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}
