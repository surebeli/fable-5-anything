import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { VERSION } from './version.js';
import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';
import { readConfigFile } from './config.js';
import { assemble } from './prompt.js';
import { readHandoff, validate } from './handoff.js';
import { doctorChecks } from './doctor.js';

const PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  { name: 'fable_runtime', description: 'List fable runtimes, or describe one (status, injection mode, overlay vs replace).',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'runtime name; omit to list all' } } } },
  { name: 'fable_build_prompt', description: 'Assemble a fable governance prompt from a project config and a handoff file.',
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, handoff: { type: 'string' } }, required: ['project', 'handoff'] } },
  { name: 'fable_doctor', description: 'Run fable doctor checks for a project and return their statuses.',
    inputSchema: { type: 'object', properties: { project: { type: 'string' } }, required: ['project'] } }
];

function toolRuntime(args) {
  if (args && args.name) {
    const r = getRuntime(args.name);
    return r ? JSON.stringify({ name: args.name, ...r }, null, 2) : `Unknown runtime: ${args.name}. Known: ${listRuntimes().join(', ')}`;
  }
  const caps = loadCapabilities();
  return JSON.stringify(Object.keys(caps).map(n => ({ name: n, status: caps[n].status, injectionMode: caps[n].injectionMode, hostSystemPolicy: caps[n].hostSystemPolicy })), null, 2);
}
function toolBuildPrompt(args) {
  const config = readConfigFile(resolve(args.project));
  const handoffPath = resolve(args.project, args.handoff);
  const vr = validate(readHandoff(handoffPath));
  if (!vr.valid) return `Handoff missing required sections: ${vr.missing.join(', ')}`;
  return assemble({ handoffPath, config });
}
function toolDoctor(args) {
  const projectDir = resolve(args.project);
  const config = readConfigFile(projectDir);
  return doctorChecks({ projectDir, config }).map(c => `${c.status.toUpperCase()} ${c.check}: ${c.detail}`).join('\n');
}
function callTool(name, args) {
  if (name === 'fable_runtime') return toolRuntime(args);
  if (name === 'fable_build_prompt') return toolBuildPrompt(args);
  if (name === 'fable_doctor') return toolDoctor(args);
  throw new Error(`Unknown tool: ${name}`);
}

export function handleMessage(msg) {
  const { id, method, params } = msg;
  if (method === 'notifications/initialized') return null;
  if (method === 'initialize') {
    return { jsonrpc: '2.0', id, result: { protocolVersion: (params && params.protocolVersion) || PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: 'fable', version: VERSION } } };
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} };
  if (method === 'tools/list') return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
  if (method === 'tools/call') {
    const targs = (params && params.arguments) || {};
    try {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: callTool(params && params.name, targs) }] } };
    } catch (e) {
      return { jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true } };
    }
  }
  if (id !== undefined && id !== null) return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } };
  return null;
}

export function startMcpServer() {
  const rl = createInterface({ input: process.stdin, terminal: false });
  rl.on('line', (line) => {
    const t = line.trim();
    if (!t) return;
    let msg;
    try { msg = JSON.parse(t); } catch { return; }
    const res = handleMessage(msg);
    if (res !== null && res !== undefined) process.stdout.write(JSON.stringify(res) + '\n');
  });
}
