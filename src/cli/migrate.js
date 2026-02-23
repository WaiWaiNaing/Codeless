#!/usr/bin/env node
/**
 * Codeless v4 – Migrate (apply versioned migrations from .cls or migrations dir)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DEFAULTS } from '../config/defaults.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = process.cwd();

async function loadConfig() {
  const configPath = path.join(root, 'codeless.config.js');
  let adapter = 'sqlite';
  let dbPath = path.join(root, process.env.DB_FILE || (process.env.NODE_ENV === 'test' ? DEFAULTS.DB_FILE_TEST : DEFAULTS.DB_FILE));
  let migrationsTable = '_codeless_migrations';
  if (fs.existsSync(configPath)) {
    const mod = await import(pathToFileURL(configPath).href);
    const c = mod.default || mod;
    adapter = c.adapter || 'sqlite';
    dbPath = c.database?.sqlite?.path || dbPath;
    migrationsTable = c.migrations?.table || migrationsTable;
  }
  return { adapter, dbPath, migrationsTable };
}

function ensureMigrationsTable(db, table) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS "${table}" (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT UNIQUE NOT NULL,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `);
}

function getAppliedVersions(db, table) {
  const rows = db.prepare(`SELECT version FROM "${table}" ORDER BY id`).all();
  return new Set(rows.map((r) => r.version));
}

async function main() {
  const { adapter, dbPath, migrationsTable } = await loadConfig();
  if (adapter !== 'sqlite') {
    console.log('Only SQLite migrations are implemented in this CLI. Use Postgres manually or extend this script.');
    process.exit(0);
  }
  const Database = (await import('better-sqlite3')).default;
  const db = new Database(dbPath);
  ensureMigrationsTable(db, migrationsTable);
  const applied = getAppliedVersions(db, migrationsTable);

  // Load migrations from api.cls (parser) or from migrations/*.sql / migrations/*.cls
  const migrationsDir = path.join(root, 'migrations');
  const migrations = [];
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));
    for (const f of files.sort()) {
      const version = f.replace(/\.sql$/, '');
      if (applied.has(version)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf-8');
      migrations.push({ version, sql });
    }
  }

  for (const { version, sql } of migrations) {
    console.log('Applying', version);
    db.exec(sql);
    db.prepare(`INSERT INTO "${migrationsTable}" (version) VALUES (?)`).run(version);
  }
  if (migrations.length === 0) console.log('No new migrations.');
  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
