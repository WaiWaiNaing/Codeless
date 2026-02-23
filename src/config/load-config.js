/**
 * Codeless v4 – Load codeless.config.js and return resolved config
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DEFAULTS } from './defaults.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load codeless.config.js from root. Returns resolved paths and options.
 * @param {string} [rootDir] - Project root (default: two levels up from src/config)
 * @returns {Promise<import('./config-types.js').ResolvedConfig>}
 */
export async function loadConfig(rootDir) {
  const root = rootDir ? path.resolve(rootDir) : path.resolve(__dirname, '..', '..');
  const configPath = path.join(root, 'codeless.config.js');

  if (!fs.existsSync(configPath)) {
    return {
      root,
      entry: path.join(root, 'api.cls'),
      output: {
        server: path.join(root, 'generated', 'server.js'),
        types: path.join(root, 'generated', 'types.d.ts'),
      },
      adapter: 'sqlite',
      database: {},
      server: { port: DEFAULTS.PORT },
      migrations: {
        table: '_codeless_migrations',
        dir: path.join(root, 'migrations'),
      },
      plugins: [],
    };
  }

  const mod = await import(pathToFileURL(configPath).href);
  const c = mod.default || mod;

  return {
    root,
    entry: path.resolve(root, c.entry || 'api.cls'),
    output: {
      server: path.resolve(root, c.output?.server || 'generated/server.js'),
      types: path.resolve(root, c.output?.types || 'generated/types.d.ts'),
    },
    adapter: c.adapter || 'sqlite',
    database: c.database || {},
    server: c.server || {},
    migrations: c.migrations || {},
    plugins: c.plugins || [],
  };
}

export default loadConfig;
