/**
 * Codeless v4 – DatabaseAdapter interface (SOLID)
 * All adapters (sqlite, postgres) must implement this contract.
 */

/**
 * @typedef {'asc'|'desc'} SortDirection
 * @typedef {{ field: string, direction: SortDirection }} OrderBy
 */

/**
 * Base adapter: defines the interface. Subclasses implement all methods.
 * @abstract
 */
export class DatabaseAdapter {
  /**
   * Connect to the database. Must be called before any other method.
   * @returns {Promise<void>}
   */
  async connect() {
    throw new Error('DatabaseAdapter.connect() must be implemented');
  }

  /**
   * Run a raw query (SELECT only in safe sugar context). Returns rows.
   * @param {string} sql
   * @param {unknown[]} [params]
   * @returns {Promise<unknown[]>}
   */
  async query(sql, params = []) {
    throw new Error('DatabaseAdapter.query() must be implemented');
  }

  /**
   * Insert a row. Returns { id, changes }.
   * @param {string} table
   * @param {Record<string, unknown>} data
   * @returns {Promise<{ id: number, changes?: number }>}
   */
  async insert(table, data) {
    throw new Error('DatabaseAdapter.insert() must be implemented');
  }

  /**
   * Update row by id. Returns { updated: boolean }.
   * @param {string} table
   * @param {number} id
   * @param {Record<string, unknown>} data
   * @returns {Promise<{ updated: boolean }>}
   */
  async update(table, id, data) {
    throw new Error('DatabaseAdapter.update() must be implemented');
  }

  /**
   * Delete row by id. Returns { deleted: boolean }.
   * @param {string} table
   * @param {number} id
   * @returns {Promise<{ deleted: boolean }>}
   */
  async delete(table, id) {
    throw new Error('DatabaseAdapter.delete() must be implemented');
  }

  /**
   * Find one row by id. Returns row or null.
   * @param {string} table
   * @param {number} id
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async findById(table, id) {
    throw new Error('DatabaseAdapter.findById() must be implemented');
  }

  /**
   * List rows with optional where and orderBy.
   * @param {string} table
   * @param {Record<string, unknown>} [where]
   * @param {OrderBy|null} [orderBy]
   * @returns {Promise<unknown[]>}
   */
  async findAll(table, where = {}, orderBy = null) {
    throw new Error('DatabaseAdapter.findAll() must be implemented');
  }

  /**
   * Run a callback inside a transaction.
   * @param {(adapter: DatabaseAdapter) => Promise<unknown>} callback
   * @returns {Promise<unknown>}
   */
  async transaction(callback) {
    throw new Error('DatabaseAdapter.transaction() must be implemented');
  }
}

export default DatabaseAdapter;
