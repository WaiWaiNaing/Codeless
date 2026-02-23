/**
 * Codeless v4 – SQLite adapter (implements DatabaseAdapter)
 */

import Database from 'better-sqlite3';
import { DatabaseAdapter } from './base.js';

export class SqliteAdapter extends DatabaseAdapter {
  constructor(path = 'codeless.db') {
    super();
    this.path = path;
    this.db = null;
  }

  async connect() {
    this.db = new Database(this.path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async query(sql, params = []) {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const sql = `INSERT INTO "${table}" (${keys.map((k) => `"${k}"`).join(', ')}) VALUES (${placeholders})`;
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...Object.values(data));
    return { id: result.lastInsertRowid, changes: result.changes };
  }

  async update(table, id, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return { updated: false };
    const sets = keys.map((k) => `"${k}" = ?`).join(', ');
    const sql = `UPDATE "${table}" SET ${sets} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...Object.values(data), id);
    return { updated: result.changes > 0 };
  }

  async delete(table, id) {
    const sql = `DELETE FROM "${table}" WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    const result = stmt.run(id);
    return { deleted: result.changes > 0 };
  }

  async findById(table, id) {
    const sql = `SELECT * FROM "${table}" WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    return stmt.get(id) ?? null;
  }

  /**
   * Safe list: orderBy must be { field: string, direction: 'asc'|'desc' } and field allowed by schema.
   * @param {string} table
   * @param {object} [where]
   * @param {{ field: string, direction: 'asc'|'desc' }} [orderBy]
   */
  async findAll(table, where = {}, orderBy = null) {
    let sql = `SELECT * FROM "${table}"`;
    const params = [];
    if (Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map((k) => `"${k}" = ?`);
      params.push(...Object.values(where));
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) {
      const dir = orderBy.direction === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY "${orderBy.field}" ${dir}`;
    }
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  async transaction(callback) {
    const run = this.db.transaction(() => {
      return callback(this);
    });
    return run();
  }
}
