#!/usr/bin/env node
/**
 * Codeless v4 – Dev server with hot restart
 * Watches .cls files, recompiles on change, restarts the generated server.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, ChildProcess } from 'child_process';
import chokidar from 'chokidar';
import chalk from 'chalk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

interface CompileResult {
  config: { output: { server: string }; server?: { port?: number } };
  output: { server: string; types: string };
}

let serverProcess: ChildProcess | null = null;
let serverPath: string | null = null;

function log(msg: string, style: 'info' | 'success' | 'error' | 'warn' = 'info') {
  const prefix = chalk.gray('[codeless]');
  switch (style) {
    case 'success':
      console.log(prefix, chalk.green(msg));
      break;
    case 'error':
      console.error(prefix, chalk.red(msg));
      break;
    case 'warn':
      console.warn(prefix, chalk.yellow(msg));
      break;
    default:
      console.log(prefix, msg);
  }
}

async function runCompile(): Promise<CompileResult | null> {
  const { compile } = await import('../compiler/compile.js');
  try {
    const result = (await compile(ROOT)) as CompileResult;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Compilation failed: ${message}`, 'error');
    if (err instanceof Error && err.stack) {
      console.error(chalk.gray(err.stack));
    }
    return null;
  }
}

function startServer(serverPath: string, port: number): ChildProcess {
  const child = spawn('node', [serverPath], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
  });
  child.on('error', (err) => {
    log(`Server process error: ${err.message}`, 'error');
  });
  child.on('exit', (code, signal) => {
    if (code !== null && code !== 0 && signal !== 'SIGTERM' && signal !== 'SIGKILL') {
      log(`Server exited with code ${code}`, 'warn');
    }
  });
  return child;
}

function killServer(): void {
  if (!serverProcess) return;
  serverProcess.kill('SIGTERM');
  serverProcess = null;
}

async function rebuildAndRestart(changedFile?: string): Promise<void> {
  const result = await runCompile();
  if (!result) {
    if (changedFile) {
      log(`Keeping previous server running. Fix errors and save again.`, 'warn');
    }
    return;
  }

  const { output, config } = result;
  const port = config.server?.port ?? 3000;

  killServer();

  serverPath = output.server;
  serverProcess = startServer(output.server, port);

  if (changedFile) {
    const relative = path.relative(ROOT, changedFile);
    log(chalk.bold(`🚀 Server reloaded due to changes in ${relative}`), 'success');
  }
}

function main(): void {
  log(chalk.cyan('Starting Codeless v4 dev server...'));

  // Watch only .cls in project root (and entry dir if different) to avoid EMFILE
  const glob = path.join(ROOT, '**/*.cls');
  const watcher = chokidar.watch(glob, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 150 },
    ignored: [/(^|[/\\])node_modules([/\\]|$)/, /([/\\])\.git([/\\]|$)/],
  });

  watcher.on('change', (filePath) => {
    log(`Change detected: ${path.relative(ROOT, filePath)}`);
    rebuildAndRestart(filePath);
  });

  watcher.on('add', (filePath) => {
    log(`New .cls file: ${path.relative(ROOT, filePath)}`);
    rebuildAndRestart(filePath);
  });

  watcher.on('ready', () => {
    log('Watching .cls files...');
    rebuildAndRestart();
  });

  watcher.on('error', (err: unknown) => {
    log(`Watcher error: ${err instanceof Error ? err.message : String(err)}`, 'error');
  });

  process.on('SIGINT', () => {
    log('Shutting down...');
    killServer();
    watcher.close();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    killServer();
    watcher.close();
    process.exit(0);
  });
}

main();
