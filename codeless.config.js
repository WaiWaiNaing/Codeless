/**
 * Codeless v4 – Production configuration (defineConfig fills defaults)
 */
import { defineConfig } from './index.js';

export default defineConfig({
  entry: './api.cls',
  output: {
    server: './generated/server.js',
    types: './generated/types.d.ts',
  },
  adapter: 'sqlite',
  database: {
    sqlite: {}, // path from env: DB_FILE or NODE_ENV=test → codeless.test.db
    postgres: { connectionString: process.env.DATABASE_URL },
  },
  server: { port: parseInt(process.env.PORT || '3000', 10) },
  migrations: { table: '_codeless_migrations', dir: './migrations' },
  plugins: [],
});
