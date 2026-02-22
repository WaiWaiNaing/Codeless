#!/usr/bin/env node
/**
 * Codeless v4 – CLI (build | dev | check | migrate)
 * Run: npx codeless <command> [options]
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { Command } from 'commander';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const VERSION = pkg.version || '1.4.0';

const CLI_SCRIPTS = {
  build: { script: 'build.js', runner: 'node' },
  migrate: { script: 'migrate.js', runner: 'node' },
  check: { script: 'check.ts', runner: 'tsx' },
  dev: { script: 'dev.ts', runner: 'tsx' },
};

function runCommand(name, extraArgs = []) {
  const config = CLI_SCRIPTS[name];
  if (!config) {
    console.error(`Unknown command: ${name}`);
    process.exit(1);
  }
  const scriptPath = path.join(ROOT, 'src', 'cli', config.script);
  const runner = config.runner === 'tsx' ? 'npx' : 'node';
  const args = config.runner === 'tsx' ? ['tsx', scriptPath, ...extraArgs] : [scriptPath, ...extraArgs];
  const result = spawnSync(runner, args, {
    stdio: 'inherit',
    cwd: ROOT,
  });
  process.exit(result.status != null ? result.status : result.signal ? 1 : 0);
}

const program = new Command();

program
  .name('codeless')
  .description('Codeless v4 – compile .cls to Express + SQLite')
  .version(VERSION);

program
  .command('build')
  .description('Compile api.cls → generated/server.js + types.d.ts')
  .action(() => runCommand('build'));

program
  .command('dev')
  .description('Watch .cls files, rebuild and run server (hot restart)')
  .action(() => runCommand('dev'));

program
  .command('check')
  .description('Static analysis: schema, security, routes, circular deps')
  .action(() => runCommand('check'));

program
  .command('migrate')
  .description('Apply versioned migrations (SQLite)')
  .option('-t, --test', 'Use test database (NODE_ENV=test)')
  .action((opts) => {
    if (opts.test) {
      process.env.NODE_ENV = 'test';
    }
    runCommand('migrate');
  });

program.parse();

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
