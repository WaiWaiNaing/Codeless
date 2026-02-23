/**
 * Codeless v4 – QueryBuilder: SQL preparation logic for AOT-generated server
 * Single place for INSERT/UPDATE/DELETE/SELECT by id. Generated code calls prepareAll() at startup.
 */

/**
 * Build INSERT SQL for a table.
 * @param {string} table
 * @param {string[]} columns
 * @param {'sqlite'|'postgres'} adapter
 * @returns {string}
 */
export function insertSql(table, columns, adapter) {
  const cols = columns.map((c) => `"${c}"`).join(', ');
  const params = adapter === 'sqlite' ? columns.map(() => '?').join(', ') : columns.map((_, i) => `$${i + 1}`).join(', ');
  const returning = adapter === 'postgres' ? ' RETURNING id' : '';
  return `INSERT INTO "${table}" (${cols}) VALUES (${params})${returning}`;
}

/**
 * Build UPDATE SQL for a table.
 * @param {string} table
 * @param {string[]} columns
 * @param {'sqlite'|'postgres'} adapter
 * @returns {string}
 */
export function updateSql(table, columns, adapter) {
  if (columns.length === 0) return `UPDATE "${table}" SET id = id WHERE id = ?`;
  const sets = adapter === 'sqlite'
    ? columns.map((c) => `"${c}" = ?`).join(', ')
    : columns.map((c, i) => `"${c}" = $${i + 1}`).join(', ');
  const idParam = adapter === 'sqlite' ? '?' : `$${columns.length + 1}`;
  return `UPDATE "${table}" SET ${sets} WHERE id = ${idParam}`;
}

/**
 * Build DELETE SQL for a table.
 * @param {string} table
 * @param {'sqlite'|'postgres'} adapter
 * @returns {string}
 */
export function deleteSql(table, adapter) {
  return adapter === 'sqlite' ? `DELETE FROM "${table}" WHERE id = ?` : `DELETE FROM "${table}" WHERE id = $1`;
}

/**
 * Build SELECT by id SQL for a table.
 * @param {string} table
 * @param {'sqlite'|'postgres'} adapter
 * @returns {string}
 */
export function findByIdSql(table, adapter) {
  return adapter === 'sqlite' ? `SELECT * FROM "${table}" WHERE id = ?` : `SELECT * FROM "${table}" WHERE id = $1`;
}

/**
 * Build the PREP object used by AOT db helpers. Called once at server startup.
 * @param {'sqlite'|'postgres'} adapterKind
 * @param {import('./adapters/base.js').DatabaseAdapter} db - Connected adapter instance
 * @param {Record<string, string[]>} tableCols - { TableName: ['col1','col2'], ... }
 * @returns {Record<string, { insert: unknown, update: unknown, delete: unknown, findById: unknown }>}
 */
export function prepareAll(adapterKind, db, tableCols) {
  const PREP = {};
  for (const [table, columns] of Object.entries(tableCols)) {
    if (adapterKind === 'sqlite') {
      const raw = /** @type {import('./adapters/sqlite.js').SqliteAdapter} */ (db).db;
      PREP[table] = {
        insert: raw.prepare(insertSql(table, columns, 'sqlite')),
        update: raw.prepare(updateSql(table, columns, 'sqlite')),
        delete: raw.prepare(deleteSql(table, 'sqlite')),
        findById: raw.prepare(findByIdSql(table, 'sqlite')),
      };
    } else {
      PREP[table] = {
        insert: { name: `${table}_insert`, text: insertSql(table, columns, 'postgres') },
        update: { name: `${table}_update`, text: updateSql(table, columns, 'postgres') },
        delete: { name: `${table}_delete`, text: deleteSql(table, 'postgres') },
        findById: { name: `${table}_findById`, text: findByIdSql(table, 'postgres') },
      };
    }
  }
  return PREP;
}

export default { insertSql, updateSql, deleteSql, findByIdSql, prepareAll };
