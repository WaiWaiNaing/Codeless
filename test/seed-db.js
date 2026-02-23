#!/usr/bin/env node
/**
 * Seed the User table with 10,000 dummy records for DB benchmark (/db-test).
 * Run: node test/seed-db.js
 * Uses DB_FILE or codeless.db. Run migrations first if the table doesn't exist.
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DB_PATH = process.env.DB_FILE || path.join(ROOT, 'codeless.db');

const ROLES = ['admin', 'editor', 'viewer'];
const COUNT = 10_000;

const db = new Database(DB_PATH);

// Ensure User table exists (same schema as migrations/001_initial.sql)
db.exec(`
  CREATE TABLE IF NOT EXISTS "User" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    age INTEGER
  )
`);

const insert = db.prepare(
  'INSERT INTO "User" (username, email, role, age) VALUES (?, ?, ?, ?)'
);

const insertMany = db.transaction((n) => {
  for (let i = 1; i <= n; i++) {
    const role = ROLES[i % ROLES.length];
    insert.run(
      `user_${i}`,
      `user${i}@bench.local`,
      role,
      20 + (i % 80)
    );
  }
});

console.log(`Seeding ${COUNT} rows into User at ${DB_PATH}...`);
const start = Date.now();
insertMany(COUNT);
console.log(`Done in ${Date.now() - start} ms. Row count:`, db.prepare('SELECT COUNT(*) as n FROM "User"').get().n);
db.close();
