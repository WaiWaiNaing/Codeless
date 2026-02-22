/**
 * Codeless v4 – Module Resolver
 * Handles import statements, resolves .cls files, and merges ASTs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from './parser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolves and loads all imported modules, merging their ASTs
 * @param {string} entryFile - Path to the main .cls file
 * @param {string} [rootDir] - Project root directory
 * @returns {import('./parser.js').AST} Merged AST from all files
 */
export function resolveModules(entryFile, rootDir) {
  const root = rootDir ? path.resolve(rootDir) : path.dirname(entryFile);
  const visited = new Set();
  const resolved = new Map();
  const loading = new Set();

  /**
   * Resolve a file path relative to the current file
   */
  function resolvePath(importPath, fromFile) {
    let normalized = importPath.replace(/\.cls$/, '');
    if (!normalized.endsWith('.cls')) {
      normalized += '.cls';
    }

    if (normalized.startsWith('./') || normalized.startsWith('../')) {
      return path.resolve(path.dirname(fromFile), normalized);
    }

    if (path.isAbsolute(normalized)) {
      return normalized;
    }

    return path.resolve(root, normalized);
  }

  /**
   * Load and parse a .cls file, recursively resolving its imports
   */
  function loadModule(filePath) {
    const normalizedPath = path.normalize(filePath);

    if (loading.has(normalizedPath)) {
      throw new Error(`Circular dependency detected: ${normalizedPath} is already being loaded`);
    }

    if (resolved.has(normalizedPath)) {
      return resolved.get(normalizedPath);
    }

    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Import not found: ${normalizedPath} (resolved from ${filePath})`);
    }

    loading.add(normalizedPath);
    visited.add(normalizedPath);

    try {
      const source = fs.readFileSync(normalizedPath, 'utf-8');
      const ast = parse(source);

      for (const imp of ast.imports) {
        const importedPath = resolvePath(imp.path, normalizedPath);
        const importedAST = loadModule(importedPath);
        
        ast.dataBlocks.push(...importedAST.dataBlocks);
        ast.doBlocks.push(...importedAST.doBlocks);
        ast.routeLines.push(...importedAST.routeLines);
        ast.migrations.push(...importedAST.migrations);
      }

      resolved.set(normalizedPath, ast);

      return ast;
    } finally {
      loading.delete(normalizedPath);
    }
  }

  const entryPath = path.isAbsolute(entryFile) 
    ? entryFile 
    : path.resolve(root, entryFile);
  
  const mainAST = loadModule(entryPath);

  return {
    dataBlocks: mainAST.dataBlocks,
    doBlocks: mainAST.doBlocks,
    routeLines: mainAST.routeLines,
    migrations: mainAST.migrations,
    imports: [],
  };
}
