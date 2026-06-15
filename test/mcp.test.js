import { describe, it } from 'node:test';
import assert from 'node:assert';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const BIN = resolve(ROOT, 'bin', 'fable.js');

function rpc(lines) {
  const r = spawnSync('node', [BIN, 'mcp-server'], { input: lines.map(l => JSON.stringify(l)).join('\n') + '\n', encoding: 'utf-8', timeout: 30000, cwd: ROOT });
  return r.stdout.trim().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

describe('mcp-server', () => {
  it('initialize returns serverInfo fable', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }]);
    const init = out.find(m => m.id === 1);
    assert.ok(init && init.result && init.result.serverInfo.name === 'fable');
    assert.ok(init.result.capabilities.tools);
  });

  it('tools/list returns fable_runtime, fable_build_prompt, fable_doctor', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 2, method: 'tools/list' }]);
    const names = out.find(m => m.id === 2).result.tools.map(t => t.name);
    for (const n of ['fable_runtime', 'fable_build_prompt', 'fable_doctor']) assert.ok(names.includes(n), `missing ${n}`);
  });

  it('tools/call fable_runtime returns text content listing opencode', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'fable_runtime', arguments: {} } }]);
    const res = out.find(m => m.id === 3).result;
    assert.ok(res.content[0].text.includes('opencode'));
  });

  it('tools/call fable_build_prompt rejects a handoff path escaping the project root', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'fable_build_prompt', arguments: { project: ROOT, handoff: '../../../../Windows/System32/drivers/etc/hosts' } } }]);
    const res = out.find(m => m.id === 7).result;
    assert.ok(/escapes the project root/i.test(res.content[0].text), `expected scope rejection, got: ${res.content[0].text}`);
  });
});
