/**
 * Type declarations for resolver.js
 */

import type { AST } from './types';

export function resolveModules(
  entryFile: string,
  rootDir?: string
): AST;
