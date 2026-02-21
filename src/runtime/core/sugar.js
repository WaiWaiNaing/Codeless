/**
 * Codeless v4 – Sugar layer (safe table allowlist + safe orderBy)
 * No ORDER BY injection: field must be in allowed set.
 */

const ALLOWED_DIRECTIONS = new Set(['asc', 'desc']);

/**
 * @param {import('../adapters/sqlite.js').SqliteAdapter|import('../adapters/postgres.js').PostgresAdapter} db
 * @param {Set<string>} knownTables
 */
export function createSugar(db, knownTables) {
  function assertTable(table) {
    if (!knownTables.has(table)) {
      throw new Error(`sugar: unknown table "${table}". Allowed: ${[...knownTables].join(', ')}`);
    }
  }

  function assertOrderBy(table, orderBy) {
    if (!orderBy || typeof orderBy !== 'object') return;
    const { field, direction } = orderBy;
    if (!field || typeof field !== 'string') throw new Error('orderBy.field must be a string');
    if (!ALLOWED_DIRECTIONS.has((direction || '').toLowerCase())) {
      throw new Error('orderBy.direction must be "asc" or "desc"');
    }
    assertTable(table);
  }

  return {
    async save(table, data) {
      assertTable(table);
      return db.insert(table, data);
    },
    async all(table, where = {}, orderBy = null) {
      assertTable(table);
      assertOrderBy(table, orderBy);
      return db.findAll(table, where, orderBy ? { field: orderBy.field, direction: (orderBy.direction || 'asc').toLowerCase() } : null);
    },
    async find(table, id) {
      assertTable(table);
      return db.findById(table, id);
    },
    async remove(table, id) {
      assertTable(table);
      return db.delete(table, id);
    },
    async update(table, id, data) {
      assertTable(table);
      return db.update(table, id, data);
    },
    async query(sql, ...params) {
      return db.query(sql, params);
    },
    async transaction(callback) {
      return db.transaction(callback);
    },
  };
}
