#!/usr/bin/env node
/**
 * Codeless v4 – Dev (watch api.cls, rebuild, run generated server)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

let child = null;

function build() {
  const r = spawnSync('node', [path.join(__dirname, 'build.js')], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) throw new Error('Build failed');
}

function run() {
  const serverPath = path.join(root, 'generated', 'server.js');
  if (!fs.existsSync(serverPath)) {
    console.error('Run "node cli/build.js" first.');
    return;
  }
  if (child) child.kill();
  child = spawn('node', ['--experimental-vm-modules', serverPath], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
  });
  child.on('error', (err) => console.error(err));
}

function main() {
  const entry = path.join(root, 'api.cls');
  if (!fs.existsSync(entry)) {
    console.error('api.cls not found.');
    process.exit(1);
  }
  build();
  run();
  fs.watch(entry, () => {
    console.log('Change detected, rebuilding...');
    try {
      build();
      run();
    } catch (e) {
      console.error(e);
    }
  });
  console.log('Watching', entry, '- edit and save to rebuild.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
