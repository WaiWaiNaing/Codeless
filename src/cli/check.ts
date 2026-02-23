#!/usr/bin/env node
/**
 * Codeless v4 – Static analysis (check) CLI
 * Schema integrity, security scan, route validation, circular dependency.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();

const VALID_SCHEMA_TYPES = new Set([
  'String',
  'Number',
  'Boolean',
  'Enum',
  'Date',
  'Password',
]);

const FORBIDDEN_PATTERNS = [
  { pattern: /\brequire\s*\(/g, keyword: 'require' },
  { pattern: /\bimport\s*\(/g, keyword: 'import' },
  { pattern: /\bprocess\b/g, keyword: 'process' },
  { pattern: /\beval\s*\(/g, keyword: 'eval' },
  { pattern: /\bchild_process\b/g, keyword: 'child_process' },
  { pattern: /\bFunction\s*\(/g, keyword: 'Function' },
  { pattern: /\bglobal\s*[=.]/g, keyword: 'global' },
  { pattern: /\b__dirname\b/g, keyword: '__dirname' },
  { pattern: /\b__filename\b/g, keyword: '__filename' },
];

interface CheckIssue {
  line: number;
  rule: string;
  message: string;
}

function lineOffsetInBody(body: string, index: number): number {
  return body.slice(0, index).split('\n').length;
}

async function runCheck(): Promise<CheckIssue[]> {
  const { loadConfig } = await import('../compiler/compile.js');
  const { parse } = await import('../compiler/parser.js');
  const config = await loadConfig(ROOT);
  const entry = config.entry as string;
  const fs = await import('fs');
  if (!fs.existsSync(entry)) {
    throw new Error(`Entry file not found: ${entry}`);
  }
  const { resolveModules } = await import('../compiler/resolver.js');
  let ast: {
    dataBlocks: Array<{ name: string; fields: Array<{ name: string; type: string; optional?: boolean; args?: Record<string, unknown> }> }>;
    doBlocks: Array<{ name: string; body: string; line: number }>;
    routeLines: Array<{
      method: string;
      path: string;
      pipeline: Array<{ kind: string; name?: string; schema?: string }>;
    }>;
  };
  try {
    ast = resolveModules(entry, config.root) as typeof ast;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Resolve failed: ${msg}`);
  }

  const issues: CheckIssue[] = [];
  const dataBlockNames = new Set(ast.dataBlocks.map((b) => b.name));
  const doBlockNames = new Set(ast.doBlocks.map((d) => d.name));

  // ─── 1. Schema Integrity ─────────────────────────────────────────────
  for (const block of ast.dataBlocks) {
    for (const field of block.fields) {
      const t = field.type;
      const isValidBuiltin = VALID_SCHEMA_TYPES.has(t);
      const isOtherBlock = dataBlockNames.has(t);
      if (!isValidBuiltin && !isOtherBlock) {
        issues.push({
          line: 0,
          rule: 'Schema Integrity',
          message: `data ${block.name}: field "${field.name}" has invalid type "${t}". Valid types: ${[...VALID_SCHEMA_TYPES].join(', ')}, or another data block name.`,
        });
      }
    }
  }

  // ─── 2. Security Scan (do blocks) ────────────────────────────────────
  for (const block of ast.doBlocks) {
    const body = block.body;
    const bodyStartLine = block.line + 1;
    for (const { pattern, keyword } of FORBIDDEN_PATTERNS) {
      pattern.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(body)) !== null) {
        const line = bodyStartLine + lineOffsetInBody(body, m.index) - 1;
        issues.push({
          line,
          rule: 'Security Scan',
          message: `do ${block.name}: forbidden keyword "${keyword}" is not allowed in action bodies.`,
        });
      }
    }
  }

  // ─── 3. Route Validation ─────────────────────────────────────────────
  for (const route of ast.routeLines) {
    for (const step of route.pipeline) {
      if (step.kind === 'action' && step.name) {
        if (!doBlockNames.has(step.name)) {
          issues.push({
            line: 0,
            rule: 'Route Validation',
            message: `Route ${route.method} ${route.path}: action "${step.name}" is not defined in any do block.`,
          });
        }
      }
      if (step.kind === 'validate' && step.schema) {
        if (!dataBlockNames.has(step.schema)) {
          issues.push({
            line: 0,
            rule: 'Route Validation',
            message: `Route ${route.method} ${route.path}: validate(${step.schema}) references unknown schema. No data block named "${step.schema}".`,
          });
        }
      }
    }
  }

  // ─── 4. Circular Dependency (data block references) ───────────────────
  const refs = new Map<string, string[]>();
  for (const block of ast.dataBlocks) {
    const used: string[] = [];
    for (const field of block.fields) {
      if (dataBlockNames.has(field.type) && field.type !== block.name) {
        used.push(field.type);
      }
    }
    refs.set(block.name, used);
  }
  const visited = new Set<string>();
  const stack = new Set<string>();
  const pathStack: string[] = [];
  const reportedCycles = new Set<string>();

  function visit(name: string): boolean {
    if (stack.has(name)) {
      const idx = pathStack.indexOf(name);
      const cycle = [...pathStack.slice(idx), name];
      const cycleKey = [...new Set(cycle)].sort().join('→');
      if (!reportedCycles.has(cycleKey)) {
        reportedCycles.add(cycleKey);
        issues.push({
          line: 0,
          rule: 'Circular Dependency',
          message: `Data blocks have a circular reference: ${cycle.join(' → ')}. This can break table creation order or cause infinite recursion.`,
        });
      }
      return true;
    }
    if (visited.has(name)) return false;
    visited.add(name);
    stack.add(name);
    pathStack.push(name);
    for (const next of refs.get(name) ?? []) {
      visit(next);
    }
    pathStack.pop();
    stack.delete(name);
    return false;
  }
  for (const block of ast.dataBlocks) {
    visit(block.name);
  }

  return issues;
}

function main(): void {
  const prefix = chalk.gray('[codeless check]');
  runCheck()
    .then((issues) => {
      if (issues.length === 0) {
        console.log(prefix, chalk.green('✅ All checks passed. Your DSL is production-ready.'));
        process.exit(0);
      }
      console.error(prefix, chalk.red(`Found ${issues.length} issue(s):\n`));
      for (const issue of issues) {
        const linePart = issue.line > 0 ? chalk.cyan(`  Line ${issue.line}: `) : '  ';
        console.error(linePart + chalk.yellow(`[${issue.rule}] `) + issue.message);
      }
      process.exit(1);
    })
    .catch((err) => {
      console.error(prefix, chalk.red(err instanceof Error ? err.message : String(err)));
      process.exit(1);
    });
}

main();
