import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import { resolve, join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const ROOT = resolve(__dirname, '..');
const BIN = resolve(ROOT, 'bin', 'fable.js');
const TMP = resolve(ROOT, `.tmp-test-mcp-${process.pid}`);
after(() => { if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); });

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

  it('tools/list returns only fable_runtime', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 2, method: 'tools/list' }]);
    const names = out.find(m => m.id === 2).result.tools.map(t => t.name);
    assert.deepStrictEqual(names, ['fable_runtime']);
  });

  it('tools/call fable_runtime returns text content listing opencode', () => {
    const out = rpc([{ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'fable_runtime', arguments: {} } }]);
    const res = out.find(m => m.id === 3).result;
    assert.ok(res.content[0].text.includes('opencode'));
  });

});
