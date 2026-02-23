/**
 * Execution integrity tests for AOT server: validate(), auth, sugar save.
 * Run: node test/integration.test.mjs
 * Expects: AOT server already running on PORT (default 3000), or set START_SERVER=1 to spawn it.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = parseInt(process.env.PORT || '3000', 10);
const BASE = `http://127.0.0.1:${PORT}`;

let serverProcess = null;

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function waitForHealth(timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/__health`);
      if (res.ok) return true;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 100));
  }
  return false;
}

function startServer() {
  const script = path.join(ROOT, 'generated', 'server.js');
  serverProcess = spawn('node', [script], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT), DB_FILE: 'test/integration.db' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('validate() rejects invalid types (number instead of string)', async () => {
  const { status, body } = await fetchJson(`${BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({
      username: 12345,
      email: 'a@b.com',
      role: 'viewer',
    }),
  });
  if (status !== 400) throw new Error(`Expected 400, got ${status}: ${JSON.stringify(body)}`);
  if (!String(body?.message || body?.error || '').toLowerCase().includes('string')) {
    throw new Error(`Expected validation error about type, got: ${JSON.stringify(body)}`);
  }
  return true;
});

test('validate() rejects missing required field', async () => {
  const { status } = await fetchJson(`${BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ username: 'abc', email: 'a@b.com' }),
  });
  if (status !== 400) throw new Error(`Expected 400 for missing role, got ${status}`);
  return true;
});

test('validate() rejects invalid enum', async () => {
  const { status } = await fetchJson(`${BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ username: 'abc', email: 'a@b.com', role: 'superadmin' }),
  });
  if (status !== 400) throw new Error(`Expected 400 for invalid enum, got ${status}`);
  return true;
});

test('auth middleware protects POST /users without token', async () => {
  const { status } = await fetchJson(`${BASE}/users`, {
    method: 'POST',
    body: JSON.stringify({ username: 'u1', email: 'u1@x.com', role: 'viewer' }),
  });
  if (status !== 401) throw new Error(`Expected 401 without token, got ${status}`);
  return true;
});

test('auth middleware accepts valid token for POST /users', async () => {
  const reg = await fetchJson(`${BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ username: 'authuser', email: 'auth@x.com', role: 'editor', age: 28 }),
  });
  if (reg.status !== 200 && reg.status !== 201) throw new Error(`Register failed: ${reg.status}`);
  const login = await fetchJson(`${BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ username: 'authuser' }),
  });
  if (login.status !== 200) throw new Error(`Login failed: ${login.status}`);
  const token = login.body?.token;
  if (!token) throw new Error('No token in login response');
  const create = await fetchJson(`${BASE}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username: 'newuser', email: 'new@x.com', role: 'viewer' }),
  });
  if (create.status !== 200 && create.status !== 201) {
    throw new Error(`POST /users with auth failed: ${create.status} ${JSON.stringify(create.body)}`);
  }
  if (create.body?.id == null && create.body?.success == null) {
    throw new Error('Expected id or success in response: ' + JSON.stringify(create.body));
  }
  return true;
});

test('sugar save: POST /register persists and returns id', async () => {
  const uname = 'saveuser' + Date.now();
  const { status, body } = await fetchJson(`${BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ username: uname, email: 'save@x.com', role: 'viewer', age: 22 }),
  });
  if (status !== 200 && status !== 201) throw new Error(`Register failed: ${status} ${JSON.stringify(body)}`);
  if (body?.id == null) throw new Error('Expected id in response: ' + JSON.stringify(body));
  const get = await fetchJson(`${BASE}/users/${body.id}`);
  if (get.status !== 200) throw new Error(`GET /users/:id failed: ${get.status}`);
  if (get.body?.username !== uname) throw new Error(`Expected username ${uname}, got ${get.body?.username}`);
  return true;
});

async function main() {
  if (process.env.START_SERVER === '1') {
    const fs = await import('fs');
    const dbPath = path.join(ROOT, 'test', 'integration.db');
    if (!fs.existsSync(dbPath)) {
      const Database = (await import('better-sqlite3')).default;
      const db = new Database(dbPath);
      db.exec(`
        CREATE TABLE "User" (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL, age INTEGER);
        CREATE TABLE "Post" (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, status TEXT NOT NULL, authorId INTEGER NOT NULL);
        CREATE TABLE "Comment" (id INTEGER PRIMARY KEY AUTOINCREMENT, postId INTEGER NOT NULL, text TEXT NOT NULL, author TEXT);
      `);
      db.close();
    }
    startServer();
    const ok = await waitForHealth();
    if (!ok) {
      console.error('Server did not become ready');
      process.exit(1);
    }
  } else {
    const ok = await waitForHealth(3000);
    if (!ok) {
      console.error('Server not running. Start with: node generated/server.js  or set START_SERVER=1');
      process.exit(1);
    }
  }

  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('  ✓', name);
    } catch (err) {
      console.error('  ✗', name, err.message);
      failed++;
    }
  }

  if (serverProcess) stopServer();

  console.log('\n' + (failed ? `Failed: ${failed}/${tests.length}` : `All ${tests.length} integrity checks passed.`));
  process.exit(failed ? 1 : 0);
}

main();
