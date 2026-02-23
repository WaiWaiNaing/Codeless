/**
 * Codeless v4 – Compiler entry: load config, parse, generate, write.
 * Used by cli/build.js and cli/dev.ts.
 */

import fs from 'fs';
import path from 'path';
import { resolveModules } from './resolver.js';
import { generate } from './codegen.js';
import { loadConfig } from '../config/load-config.js';

// Re-export for CLI and programmatic use
export { loadConfig };

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
