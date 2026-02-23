/**
 * Codeless v4 – PostgreSQL adapter (implements DatabaseAdapter)
 * Requires: pg package
 */

import { DatabaseAdapter } from './base.js';

export class PostgresAdapter extends DatabaseAdapter {
  constructor(connectionString) {
    super();
    this.connectionString = connectionString;
    this.pool = null;
  }

  async connect() {
    const { default: pg } = await import('pg');
    this.pool = new pg.Pool({ connectionString: this.connectionString });
  }

  async _query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async insert(table, data) {
    const keys = Object.keys(data);
    const cols = keys.map((k) => `"${k}"`).join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING id`;
    const rows = await this._query(sql, Object.values(data));
    return { id: rows[0]?.id, changes: 1 };
  }

  async update(table, id, data) {
    const keys = Object.keys(data);
    if (keys.length === 0) return { updated: false };
    const sets = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
    const sql = `UPDATE "${table}" SET ${sets} WHERE id = $${keys.length + 1}`;
    const result = await this.pool.query(sql, [...Object.values(data), id]);
    return { updated: (result.rowCount ?? 0) > 0 };
  }

  async delete(table, id) {
    const result = await this.pool.query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
    return { deleted: (result.rowCount ?? 0) > 0 };
  }

  async findById(table, id) {
    const rows = await this._query(`SELECT * FROM "${table}" WHERE id = $1`, [id]);
    return rows[0] ?? null;
  }

  async findAll(table, where = {}, orderBy = null) {
    let sql = `SELECT * FROM "${table}"`;
    const params = [];
    let n = 1;
    if (Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map((k) => `"${k}" = $${n++}`);
      params.push(...Object.values(where));
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (orderBy) {
      const dir = orderBy.direction === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY "${orderBy.field}" ${dir}`;
    }
    return this._query(sql, params);
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(this);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}
