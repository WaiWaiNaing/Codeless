/**
 * Codeless v4 – Production configuration
 * @type {import('./cli/config-types.js').CodelessConfig}
 */
export default {
  entry: './api.cls',
  output: {
    server: './generated/server.js',
    types: './generated/types.d.ts',
  },
  adapter: 'sqlite', // 'sqlite' | 'postgres'
  database: {
    sqlite: { path: process.env.DB_FILE || 'codeless.db' },
    postgres: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
    },
  },
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  migrations: {
    table: '_codeless_migrations',
    dir: './migrations',
  },
  plugins: [],
};
