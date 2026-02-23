/**
 * Codeless v4 – Module Resolver
 * Handles import statements, resolves .cls files, and completely deduplicates AST nodes to prevent Diamond Dependency issues.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from './parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves and loads all imported modules, merging their ASTs and deduplicating records
 * @param {string} entryFile - Path to the main .cls file
 * @param {string} [rootDir] - Project root directory
 * @returns {import('./parser.js').AST} Merged AST from all files
 */
export function resolveModules(entryFile, rootDir) {
  const root = rootDir ? path.resolve(rootDir) : path.dirname(entryFile);
  const loading = new Set();
  const resolvedASTs = new Map();

  function resolvePath(importPath, fromFile) {
    let normalized = importPath.replace(/\.cls$/, '');
    if (!normalized.endsWith('.cls')) normalized += '.cls';
    if (normalized.startsWith('./') || normalized.startsWith('../')) {
      return path.resolve(path.dirname(fromFile), normalized);
    }
    if (path.isAbsolute(normalized)) return normalized;
    return path.resolve(root, normalized);
  }

  function loadModule(filePath) {
    const normalizedPath = path.normalize(filePath);
    if (loading.has(normalizedPath)) {
      throw new Error(`Circular dependency detected: ${normalizedPath} is already being loaded`);
    }
    if (resolvedASTs.has(normalizedPath)) return;
    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Import not found: ${normalizedPath} (resolved from ${filePath})`);
    }

    loading.add(normalizedPath);
    try {
      const source = fs.readFileSync(normalizedPath, 'utf-8');
      const ast = parse(source);
      resolvedASTs.set(normalizedPath, ast);

      for (const imp of ast.imports) {
        const importedPath = resolvePath(imp.path, normalizedPath);
        loadModule(importedPath);
      }
    } finally {
      loading.delete(normalizedPath);
    }
  }

  const entryPath = path.isAbsolute(entryFile) ? entryFile : path.resolve(root, entryFile);
  loadModule(entryPath);

  const mergedAST = { dataBlocks: [], doBlocks: [], routeLines: [], migrations: [], imports: [] };
  const seenDataBlocks = new Set();
  const seenDoBlocks = new Set();
  const seenRoutes = new Set();

  for (const ast of resolvedASTs.values()) {
    for (const b of ast.dataBlocks) {
      if (!seenDataBlocks.has(b.name)) { seenDataBlocks.add(b.name); mergedAST.dataBlocks.push(b); }
    }
    for (const b of ast.doBlocks) {
      if (!seenDoBlocks.has(b.name)) { seenDoBlocks.add(b.name); mergedAST.doBlocks.push(b); }
    }
    for (const r of ast.routeLines) {
      const key = `${r.method} ${r.path}`;
      if (!seenRoutes.has(key)) { seenRoutes.add(key); mergedAST.routeLines.push(r); }
    }
    for (const m of ast.migrations) {
      mergedAST.migrations.push(m);
    }
  }

  return mergedAST;
}
