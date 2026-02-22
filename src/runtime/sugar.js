/**
 * Codeless v4 – Sugar layer (safe table allowlist + safe orderBy + SELECT-only query)
 * ORDER BY field must be in table schema (passed from compiler).
 */

const ALLOWED_DIRECTIONS = new Set(['asc', 'desc']);

/** Allow only SELECT to prevent accidental or malicious writes via sugar.query. */
function assertSelectOnly(sql) {
  const trimmed = (typeof sql === 'string' ? sql : '').trim();
  if (!trimmed.toUpperCase().startsWith('SELECT')) {
    throw new Error(
      'sugar.query() is restricted to SELECT statements only. Use sugar.save/update/remove for writes.'
    );
  }
}

/**
 * @param {import('./adapters/sqlite.js').SqliteAdapter|import('./adapters/postgres.js').PostgresAdapter} db
 * @param {Set<string>} knownTables
 * @param {Record<string, string[]>} [tableColumns] - Optional map of table name → allowed column names (e.g. from compiler). Includes 'id'.
 */
export function createSugar(db, knownTables, tableColumns = {}) {
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
    const allowed = tableColumns[table];
    if (allowed && !allowed.includes(field)) {
      throw new Error(
        `sugar: orderBy.field "${field}" is not a valid column for table "${table}". Allowed: ${allowed.join(', ')}`
      );
    }
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
      assertSelectOnly(sql);
      return db.query(sql, params);
    },
    async transaction(callback) {
      return db.transaction(callback);
    },
  };
}
