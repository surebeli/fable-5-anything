import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PKG_ROOT } from './config.js';
import { syncCharter, FABLE_BLOCK_OPENCODE, buildInlineCharterBlock, wireOpencodeGovernance } from './charter.js';
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

function showHelp() {
  console.log(`fable — portable prompt governance (governance-only)

Usage:
  fable governance --project <dir>
    Inline the full portable core into AGENTS.md + CLAUDE.md (host-agnostic).

  fable charter sync --project <dir> [--runtime <name>] [--all] [--force]
    Seed/refresh the AGENTS.md + CLAUDE.md fable block (plus a runtime's charter files).

  fable runtime [<name>] [--list]
    Show how fable overlays governance onto a runtime (injection mode, overlay vs replace).

  fable codex   setup --project <dir> [--apply] [--via path|github]
  fable copilot setup --project <dir> [--apply] [--via path|github]
  fable grok    setup --project <dir> [--apply] [--via path|github]
    Seed the charter and register the read-only fable MCP server (governance metadata).

  fable kimi    setup --project <dir>
    Seed the charter and write the fable Kimi skill (.fable/skills/fable/SKILL.md).

  fable opencode setup --project <dir>
    Seed a slim charter, copy the portable core into .fable/, and wire opencode.json instructions.

  fable mcp-server
    Start the fable MCP server (stdio) exposing the read-only fable_runtime tool.

  fable --version | --help

For background DISPATCH to vendor CLIs (the former Mode B), use hopper-plugin:
  https://github.com/surebeli/hopper-plugin  (governance reaches dispatched vendors
  via the AGENTS.md/CLAUDE.md charter this tool installs, or hopper's GOVERNANCE.md overlay).`);
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
    const rtName = opts.runtime || 'opencode';
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
  console.log('Kimi 0.17.1+ auto-loads AGENTS.md (so it is already governed); older Kimi reads only skills → `fable kimi setup`. opencode users who prefer a slim charter + opencode.json instructions can use `fable opencode setup`.');
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
