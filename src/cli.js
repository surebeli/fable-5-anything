import { resolve, isAbsolute } from 'node:path';
import { writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { defaultConfig, readConfigFile, writeConfig, PKG_ROOT } from './config.js';
import { readHandoff, validate } from './handoff.js';
import { assemble, smokePrompt } from './prompt.js';
import { buildCommand, runOpenCode } from './opencode.js';
import { install, wireOpencodeGovernance, buildInlineCharterBlock } from './install.js';
import { doctorChecks } from './doctor.js';
import { syncCharter, FABLE_BLOCK_OPENCODE } from './charter.js';
import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';
import { writeKimiSkill } from './skill.js';
import { startMcpServer } from './mcp.js';
import { VERSION } from './version.js';

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

Two install modes (see docs/install-modes.md):
  - governance-only:  fable governance --project <dir>   (host-agnostic)
  - full (+dispatch): fable install --project <dir> ... then fable <host> setup
  (AI assistants: ask the user which mode before installing.)

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

  fable charter sync --project <dir> [--runtime <name>] [--all] [--force]
    Seed/refresh portable charter files (AGENTS.md + CLAUDE.md by default, plus
    the runtime's extra charter files) with the idempotent fable block.

  fable codex setup --project <dir> [--apply] [--via path|github]
    Seed the charter (AGENTS.md + CLAUDE.md + codex charter files) and print the
    codex mcp add command. With --apply, run codex mcp add to register the server.
    Use --via github for zero-clone/no-publish deploys (registers npx -y github:...).

  fable kimi setup --project <dir>
    Seed the charter (AGENTS.md + CLAUDE.md + kimi charter files), write the fable
    skill to .fable/skills/fable/SKILL.md, and print --skills-dir / extra_skill_dirs
    registration for Kimi.

  fable copilot setup --project <dir> [--apply] [--via path|github]
    Seed the charter (AGENTS.md + CLAUDE.md + .github/copilot-instructions.md) and
    print the copilot mcp add command (reusing the fable MCP server). With --apply,
    run copilot mcp add to register the server.

  fable grok setup --project <dir> [--apply] [--via path|github]
    Seed the charter (AGENTS.md + CLAUDE.md) and print the grok mcp add command
    (reusing the fable MCP server). With --apply, run grok mcp add to register it.

  fable governance --project <dir>
    Governance-only mode (HOST-AGNOSTIC): install just the constitution into agent
    context — no executor / handoffs / shims, no host-specific wiring. Embeds the
    full portable core into AGENTS.md + CLAUDE.md, which every markdown-charter host
    auto-loads (opencode, Codex, Claude Code, Grok, Copilot). Zero .fable/.
    (Kimi loads skills -> fable kimi setup. Slim opencode charter + opencode.json
    instructions -> fable opencode setup. Host-specific params belong to full mode.)

  fable opencode setup --project <dir>
    Make the full fable portable core govern every opencode session: seed the
    charter, copy the portable core into .fable/, and wire opencode.json
    "instructions" (preserves existing keys; idempotent).

  fable mcp-server  —  Start the fable MCP server (stdio) for codex mcp add / other MCP hosts.

  fable --version
    Print the fable version.

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
  const link = opts.link || 'path';
  if (!['path', 'global', 'npx', 'github'].includes(link)) {
    console.error(`Error: --link must be one of path|global|npx|github (got "${link}")`);
    process.exit(1);
  }

  const result = install({ projectDir: opts.project, runtime, model, link });
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

function requireOpencode(config, what) {
  if (config.runtime !== 'opencode') {
    console.error(`Error: '${what}' only supports the opencode runtime (this project is '${config.runtime}'). ` +
      `Use 'fable build-prompt' to assemble the governance prompt, or 'fable ${config.runtime} setup' for that host's overlay integration.`);
    process.exit(1);
  }
}

function cmdSmoke(opts) {
  const configBase = getConfigBase(opts);
  const config = readConfigFile(configBase);
  requireOpencode(config, 'smoke');
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
  requireOpencode(config, 'run');

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

function cmdCharter(opts, positional) {
  const sub = positional[0];
  if (sub !== 'sync') {
    console.error('Usage: fable charter sync --project <dir> [--runtime <name>] [--all]');
    process.exit(1);
  }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  if (opts.all) {
    for (const r of Object.values(caps)) for (const f of r.charterFiles) set.add(f);
  } else {
    const rtName = opts.runtime || (() => { try { return readConfigFile(project).runtime; } catch { return 'opencode'; } })();
    const rt = caps[rtName];
    if (rt) for (const f of rt.charterFiles) set.add(f);
  }
  const written = syncCharter({ project, files: [...set], force: opts.force === true || opts.force === 'true' });
  for (const w of written) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
}

function mcpLaunchParts(via) {
  if (via === 'github') return ['npx', '-y', 'github:surebeli/fable-5-anything', 'mcp-server'];
  return ['node', resolve(PKG_ROOT, 'bin', 'fable.js'), 'mcp-server']; // default: 'path'
}

function registerMcp(hostCli, opts) {
  const via = opts.via || 'path';
  if (!['path', 'github'].includes(via)) {
    console.error(`Error: --via must be one of path|github (got "${via}")`);
    process.exit(1);
  }
  const parts = mcpLaunchParts(via);
  const addCmd = `${hostCli} mcp add fable -- ${parts.map(p => (p.includes(' ') ? `"${p}"` : p)).join(' ')}`;
  if (opts.apply) {
    const r = spawnSync(hostCli, ['mcp', 'add', 'fable', '--', ...parts], { encoding: 'utf-8', stdio: 'inherit' });
    console.log(r.status === 0 ? `Registered fable MCP server with ${hostCli}.` : `${hostCli} mcp add failed; run manually:\n  ${addCmd}`);
  } else {
    console.log(`\nTo register the fable MCP server with ${hostCli}, run:`);
    console.log('  ' + addCmd);
    console.log('(or re-run with --apply; use --via github for zero-clone/no-publish deploys)');
  }
}

function cmdCodex(opts, positional) {
  if (positional[0] !== 'setup') { console.error('Usage: fable codex setup --project <dir> [--apply]'); process.exit(1); }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  for (const f of (caps.codex ? caps.codex.charterFiles : [])) set.add(f);
  for (const w of syncCharter({ project, files: [...set] })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  registerMcp('codex', opts);
}

function cmdKimi(opts, positional) {
  if (positional[0] !== 'setup') { console.error('Usage: fable kimi setup --project <dir>'); process.exit(1); }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  for (const f of (caps.kimi ? caps.kimi.charterFiles : [])) set.add(f);
  for (const w of syncCharter({ project, files: [...set] })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  writeKimiSkill({ project });
  console.log('  (skill)   .fable/skills/fable/SKILL.md');
  const skillsDir = resolve(project, '.fable', 'skills');
  console.log('\nUse the fable skill in Kimi:');
  console.log(`  kimi --skills-dir "${skillsDir}" -p "<your task>"`);
  console.log('Or register permanently in ~/.kimi-code/config.toml:');
  console.log(`  extra_skill_dirs = ["${skillsDir}"]`);
}

function cmdCopilot(opts, positional) {
  if (positional[0] !== 'setup') { console.error('Usage: fable copilot setup --project <dir> [--apply]'); process.exit(1); }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  for (const f of (caps.copilot ? caps.copilot.charterFiles : [])) set.add(f);
  for (const w of syncCharter({ project, files: [...set] })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  registerMcp('copilot', opts);
}

function cmdGrok(opts, positional) {
  if (positional[0] !== 'setup') { console.error('Usage: fable grok setup --project <dir> [--apply]'); process.exit(1); }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  for (const f of (caps.grok ? caps.grok.charterFiles : [])) set.add(f);
  for (const w of syncCharter({ project, files: [...set] })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  registerMcp('grok', opts);
}

function cmdGovernance(opts) {
  const project = resolve(opts.project || '.');
  // Mode A is HOST-AGNOSTIC: embed the full portable core into the universal
  // charter files (AGENTS.md + CLAUDE.md) that every markdown-charter host
  // auto-loads (opencode, Codex, Claude Code, Grok, Copilot). No host param and
  // no host-specific wiring (opencode.json, MCP, skills-dir) — that is Mode B /
  // `fable <host> setup`.
  const block = buildInlineCharterBlock();
  for (const w of syncCharter({ project, files: ['AGENTS.md', 'CLAUDE.md'], force: true, block })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  console.log('\nGovernance-only (host-agnostic): the full portable core is embedded in AGENTS.md + CLAUDE.md.');
  console.log('Every host that auto-loads these charter files (opencode, Codex, Claude Code, Grok, Copilot) now follows the full constitution — no .fable/, no host-specific config.');
  console.log('Kimi loads skills, not charter markdown → use `fable kimi setup`. opencode users who prefer a slim charter + opencode.json instructions can use `fable opencode setup`.');
}

function cmdOpencode(opts, positional) {
  if (positional[0] !== 'setup') { console.error('Usage: fable opencode setup --project <dir>'); process.exit(1); }
  const project = resolve(opts.project || '.');
  const caps = loadCapabilities();
  const set = new Set(['AGENTS.md', 'CLAUDE.md']);
  for (const f of (caps.opencode ? caps.opencode.charterFiles : [])) set.add(f);
  for (const w of syncCharter({ project, files: [...set], block: FABLE_BLOCK_OPENCODE, force: true })) console.log(`  ${w.action.padEnd(9)} ${w.file}`);
  const r = wireOpencodeGovernance({ projectDir: project });
  console.log('  (core)    .fable/portable-agent-core.md');
  console.log('  (config)  opencode.json instructions: ' + r.instructions.join(', '));
  console.log('\nEvery opencode session in this project now loads AGENTS.md + the full fable portable core.');
}

export function main(argv) {
  const { command, opts, positional } = parseArgs(argv);

  if (opts.help || command === 'help' || command === '--help') {
    showHelp();
    return;
  }

  if (opts.version || command === 'version' || command === '--version') {
    console.log(VERSION);
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
    case 'charter':
      cmdCharter(opts, positional);
      break;
    case 'codex':
      cmdCodex(opts, positional);
      break;
    case 'kimi':
      cmdKimi(opts, positional);
      break;
    case 'copilot':
      cmdCopilot(opts, positional);
      break;
    case 'grok':
      cmdGrok(opts, positional);
      break;
    case 'governance':
      cmdGovernance(opts);
      break;
    case 'opencode':
      cmdOpencode(opts, positional);
      break;
    case 'mcp-server':
      startMcpServer();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}
