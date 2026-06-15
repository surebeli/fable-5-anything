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

  it('tools/call fable_build_prompt does not read an out-of-tree adapter (no exfiltration via config.adapter)', () => {
    const proj = join(TMP, 'adapter-exfil');
    mkdirSync(join(proj, '.fable', 'handoffs'), { recursive: true });
    const secret = join(TMP, 'outside-secret.txt');
    writeFileSync(secret, 'ADAPTER_EXFIL_SECRET_X');
    writeFileSync(join(proj, '.fable', 'config.json'), JSON.stringify({ runtime: 'opencode', model: 'm', adapter: secret, fableVersion: '0.2.0' }));
    writeFileSync(join(proj, '.fable', 'handoffs', 'example.md'), '## Goal\n\nG\n\n## Background\n\nB\n\n## Acceptance\n\nA\n\n## Return\n\nR\n');
    const out = rpc([{ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'fable_build_prompt', arguments: { project: proj, handoff: '.fable/handoffs/example.md' } } }]);
    const text = out.find(m => m.id === 8).result.content[0].text;
    assert.ok(!text.includes('ADAPTER_EXFIL_SECRET_X'), 'must NOT leak an out-of-tree adapter file');
    assert.ok(/adapter/i.test(text), `expected an adapter-scope error, got: ${text}`);
  });
});
