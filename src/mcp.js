import { createInterface } from 'node:readline';
import { VERSION } from './version.js';
import { loadCapabilities, getRuntime, listRuntimes } from './runtime.js';

const PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  { name: 'fable_runtime', description: 'List fable runtimes, or describe one (status, injection mode, overlay vs replace).',
    inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'runtime name; omit to list all' } } } }
];

function toolRuntime(args) {
  if (args && args.name) {
    const r = getRuntime(args.name);
    return r ? JSON.stringify({ name: args.name, ...r }, null, 2) : `Unknown runtime: ${args.name}. Known: ${listRuntimes().join(', ')}`;
  }
  const caps = loadCapabilities();
  return JSON.stringify(Object.keys(caps).map(n => ({ name: n, status: caps[n].status, injectionMode: caps[n].injectionMode, hostSystemPolicy: caps[n].hostSystemPolicy })), null, 2);
}
function callTool(name, args) {
  if (name === 'fable_runtime') return toolRuntime(args);
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
