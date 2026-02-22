/**
 * Codeless v4 – Framework entry & DX helpers
 * Use defineConfig in codeless.config.js for typed config with defaults.
 */

/**
 * Default configuration values (used when a key is omitted)
 */
const DEFAULT_CONFIG = {
  entry: './api.cls',
  output: {
    server: './generated/server.js',
    types: './generated/types.d.ts',
  },
  adapter: 'sqlite',
  database: {
    sqlite: { path: 'codeless.db' },
    postgres: { connectionString: undefined, ssl: false },
  },
  server: { port: 3000 },
  migrations: {
    table: '_codeless_migrations',
    dir: './migrations',
  },
  plugins: [],
};

/**
 * Deep-merge defaults with user config (shallow merge per top-level key).
 * Environment-aware: database.sqlite.path uses DB_FILE or NODE_ENV=test → codeless.test.db.
 *
 * @param {Partial<import('./src/cli/config-types.js').CodelessConfig>} config - User config (partial)
 * @returns {import('./src/cli/config-types.js').CodelessConfig} Full config with defaults
 *
 * @example
 * // codeless.config.js
 * import { defineConfig } from 'codeless';
 * export default defineConfig({
 *   entry: './api.cls',
 *   adapter: 'postgres',
 *   database: { postgres: { connectionString: process.env.DATABASE_URL } },
 * });
 */
export function defineConfig(config = {}) {
  const dbPath =
    process.env.DB_FILE ||
    (process.env.NODE_ENV === 'test' ? 'codeless.test.db' : 'codeless.db');

  return {
    ...DEFAULT_CONFIG,
    ...config,
    entry: config.entry ?? DEFAULT_CONFIG.entry,
    output: {
      ...DEFAULT_CONFIG.output,
      ...config.output,
    },
    adapter: config.adapter ?? DEFAULT_CONFIG.adapter,
    database: {
      sqlite: {
        ...DEFAULT_CONFIG.database.sqlite,
        ...config.database?.sqlite,
        path: config.database?.sqlite?.path ?? dbPath,
      },
      postgres: {
        ...DEFAULT_CONFIG.database.postgres,
        ...config.database?.postgres,
        connectionString:
          config.database?.postgres?.connectionString ??
          process.env.DATABASE_URL,
        ssl:
          config.database?.postgres?.ssl ??
          (process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: true }
            : false),
      },
    },
    server: {
      ...DEFAULT_CONFIG.server,
      ...config.server,
      port:
        config.server?.port ??
        parseInt(process.env.PORT || String(DEFAULT_CONFIG.server.port), 10),
    },
    migrations: {
      ...DEFAULT_CONFIG.migrations,
      ...config.migrations,
    },
    plugins: config.plugins ?? DEFAULT_CONFIG.plugins,
  };
}

export { defineConfig as default };
