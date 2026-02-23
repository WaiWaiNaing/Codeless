/**
 * Codeless v4 – Compiler entry: load config, parse, generate, write.
 * Used by cli/build.js and cli/dev.ts.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { resolveModules } from './resolver.js';
import { generate } from './codegen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { DEFAULTS } from '../shared/defaults.js';

/**
 * Load codeless.config.js from root. Returns resolved paths and options.
 * @param {string} [rootDir] - Project root (default: two levels up from src/compiler)
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
      migrations: { table: '_codeless_migrations', dir: path.join(root, 'migrations') },
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

/**
 * Compile api.cls → generated/server.js + types.d.ts.
 * @param {string} [rootDir] - Project root
 * @returns {{ config: object, output: { server: string, types: string } }}
 * @throws {Error} on parse/generate/write failure
 */
export async function compile(rootDir) {
  const config = await loadConfig(rootDir);
  const { entry, output, adapter } = config;
  if (!fs.existsSync(entry)) {
    throw new Error(`Entry file not found: ${entry}`);
  }
  const ast = resolveModules(entry, config.root);
  const relRuntime = path.relative(path.dirname(output.server), config.root).replace(/\\/g, '/') || '.';
  const { server, types } = generate(ast, {
    adapter,
    serverPath: output.server,
    runtimeDir: path.join(relRuntime, 'src', 'runtime'),
  });
  const outDir = path.dirname(output.server);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(output.server, server, 'utf-8');
  fs.writeFileSync(output.types, types, 'utf-8');
  return { config, output: config.output };
}
