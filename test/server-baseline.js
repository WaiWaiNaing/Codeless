/**
 * Baseline (interpreter-style) server for AOT benchmark comparison.
 * Uses runtime createValidator, createSugar, auth — no PREP, no inlined validation.
 * Run: node test/server-baseline.js (PORT=3001)
 */
import express from 'express';
import { createValidator } from '../src/runtime/validator.js';
import { createSugar } from '../src/runtime/sugar.js';
import { authMiddleware, signToken } from '../src/runtime/auth.js';
import { SqliteAdapter } from '../src/runtime/adapters/sqlite.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const DB_PATH = process.env.DB_FILE || 'test/bench.db';

const app = express();
app.use(express.json());

const db = new SqliteAdapter(DB_PATH);
await db.connect();

// Ensure User table exists for benchmark (no migrations dependency)
db.db.exec(`
  CREATE TABLE IF NOT EXISTS "User" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    age INTEGER
  )
`);

const knownTables = new Set(['User', 'Post', 'Comment']);
const tableColumns = {
  User: ['id', 'username', 'email', 'role', 'age'],
  Post: ['id', 'title', 'content', 'status', 'authorId'],
  Comment: ['id', 'postId', 'text', 'author'],
};
const sugar = createSugar(db, knownTables, tableColumns);

const validator_User = createValidator('User', {
  username: { type: 'string', required: true, min: 3, max: 50 },
  email: { type: 'string', required: true, max: 255 },
  role: { type: 'enum', required: true, enum: ['admin', 'editor', 'viewer'] },
  age: { type: 'number', required: false, min: 0, max: 150 },
});

async function login(data) {
  const users = await sugar.all('User');
  const user = users.find((u) => u.username === (data.username || data.body?.username));
  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });
  return { token: signToken({ sub: user.id, username: user.username }) };
}

async function createUser(data) {
  return sugar.save('User', data);
}

app.get('/__health', (req, res) => res.json({ status: 'ok', engine: 'baseline' }));

app.post('/login', async (req, res) => {
  try {
    const ctx = { ...req.query, ...req.params, ...(req.body || {}) };
    const result = await login(ctx);
    res.json(result ?? { success: true });
  } catch (err) {
    const status = err?.status ?? 500;
    res.status(status).json({ error: err?.message ?? String(err), message: err?.message ?? String(err) });
  }
});

app.post('/register', validator_User.middleware, async (req, res) => {
  try {
    const ctx = { ...req.query, ...req.params, ...(req.validated ?? req.body ?? {}) };
    const result = await createUser(ctx);
    res.json(result ?? { success: true });
  } catch (err) {
    const status = err?.status ?? 500;
    res.status(status).json({ error: err?.message ?? String(err), message: err?.message ?? String(err) });
  }
});

app.post('/users', authMiddleware, validator_User.middleware, async (req, res) => {
  try {
    const ctx = { ...req.query, ...req.params, ...(req.validated ?? req.body ?? {}) };
    const result = await createUser(ctx);
    res.json(result ?? { success: true });
  } catch (err) {
    const status = err?.status ?? 500;
    res.status(status).json({ error: err?.message ?? String(err), message: err?.message ?? String(err) });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`Baseline server on http://127.0.0.1:${PORT}`);
});
