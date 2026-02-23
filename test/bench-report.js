#!/usr/bin/env node
/**
 * AOT vs Baseline benchmark: RPS, p99 latency, cold start.
 * Uses autocannon. Run: node test/bench-report.js
 * Requires: npm install autocannon (devDependency)
 */
import { spawn } from 'child_process';
import autocannon from 'autocannon';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const AOT_PORT = 3000;
const BASELINE_PORT = 3001;
const DURATION = 5;
const BODY_REGISTER = JSON.stringify({
  username: 'benchuser',
  email: 'bench@test.com',
  role: 'viewer',
  age: 25,
});
const BODY_USER = JSON.stringify({
  username: 'benchuser2',
  email: 'bench2@test.com',
  role: 'editor',
  age: 30,
});

function runServer(script, port, env = {}) {
  const child = spawn('node', [script], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(port), DB_FILE: port === BASELINE_PORT ? 'test/bench.db' : 'codeless.db', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return child;
}

function waitForHealth(port, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const url = `http://127.0.0.1:${port}/__health`;
    function tryFetch() {
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
        .then(() => resolve(Date.now() - start))
        .catch(() => {
          if (Date.now() - start > timeoutMs) reject(new Error('Health timeout'));
          else setTimeout(tryFetch, 50);
        });
    }
    tryFetch();
  });
}

function getToken(port) {
  return fetch(`http://127.0.0.1:${port}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: BODY_REGISTER,
  })
    .then((r) => r.json())
    .then(() =>
      fetch(`http://127.0.0.1:${port}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'benchuser' }),
      })
    )
    .then((r) => r.json())
    .then((data) => data.token);
}

function runAutocannon(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const config = {
      url,
      duration: DURATION,
      connections: 10,
      pipelining: 1,
      ...opts,
    };
    autocannon(config, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

function extractStats(result) {
  const requests = result.requests || {};
  const latency = result.latency || {};
  const total = requests.total ?? 0;
  const durationSec = (result.finish && result.start) ? (result.finish - result.start) / 1000 : DURATION;
  return {
    rps: Math.round(total / durationSec),
    p99: latency.p99_5 ?? latency.p99 ?? latency.p999 ?? latency.mean ?? 0,
    totalRequests: total,
  };
}

function kill(child) {
  return new Promise((resolve) => {
    if (!child || child.killed) {
      resolve();
      return;
    }
    child.once('exit', resolve);
    child.kill('SIGTERM');
    setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch (_) {}
      resolve();
    }, 3000);
  });
}

async function main() {
  console.log('Codeless v4 – AOT vs Baseline Benchmark\n');
  const report = { coldStart: {}, register: {}, users: {} };

  // Ensure generated server exists
  const aotPath = path.join(ROOT, 'generated', 'server.js');
  const baselinePath = path.join(ROOT, 'test', 'server-baseline.js');
  if (!fs.existsSync(aotPath)) {
    console.error('Run: npm run build  (generate generated/server.js first)');
    process.exit(1);
  }
  if (!fs.existsSync(baselinePath)) {
    console.error('Missing test/server-baseline.js');
    process.exit(1);
  }

  // Cold start: AOT
  console.log('Measuring AOT cold start...');
  const aotProc = runServer(aotPath, AOT_PORT);
  try {
    report.coldStart.aot = await waitForHealth(AOT_PORT);
    console.log(`  AOT ready in ${report.coldStart.aot} ms`);
  } finally {
    await kill(aotProc);
  }

  // Cold start: Baseline
  console.log('Measuring Baseline cold start...');
  const baseProc = runServer(baselinePath, BASELINE_PORT);
  try {
    report.coldStart.baseline = await waitForHealth(BASELINE_PORT);
    console.log(`  Baseline ready in ${report.coldStart.baseline} ms`);
  } finally {
    await kill(baseProc);
  }

  await new Promise((r) => setTimeout(r, 500));

  // Benchmark POST /register (Validation + Save) – AOT
  console.log('\nBenchmarking AOT POST /register...');
  const aotProc2 = runServer(aotPath, AOT_PORT);
  await waitForHealth(AOT_PORT);
  try {
    const resRegisterAot = await runAutocannon(`http://127.0.0.1:${AOT_PORT}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: BODY_REGISTER,
    });
    report.register.aot = extractStats(resRegisterAot);
    console.log(`  RPS: ${report.register.aot.rps}, p99: ${report.register.aot.p99} ms`);
  } finally {
    await kill(aotProc2);
  }

  await new Promise((r) => setTimeout(r, 500));

  // Benchmark POST /register – Baseline
  console.log('Benchmarking Baseline POST /register...');
  const baseProc2 = runServer(baselinePath, BASELINE_PORT);
  await waitForHealth(BASELINE_PORT);
  try {
    const resRegisterBase = await runAutocannon(`http://127.0.0.1:${BASELINE_PORT}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: BODY_REGISTER,
    });
    report.register.baseline = extractStats(resRegisterBase);
    console.log(`  RPS: ${report.register.baseline.rps}, p99: ${report.register.baseline.p99} ms`);
  } finally {
    await kill(baseProc2);
  }

  await new Promise((r) => setTimeout(r, 500));

  // Benchmark POST /users (Auth + Validation + Save) – AOT
  console.log('\nBenchmarking AOT POST /users (auth + validate + save)...');
  const aotProc3 = runServer(aotPath, AOT_PORT);
  await waitForHealth(AOT_PORT);
  let tokenAot;
  try {
    tokenAot = await getToken(AOT_PORT);
    const resUsersAot = await runAutocannon(`http://127.0.0.1:${AOT_PORT}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenAot}` },
      body: BODY_USER,
    });
    report.users.aot = extractStats(resUsersAot);
    console.log(`  RPS: ${report.users.aot.rps}, p99: ${report.users.aot.p99} ms`);
  } finally {
    await kill(aotProc3);
  }

  await new Promise((r) => setTimeout(r, 500));

  // Benchmark POST /users – Baseline
  console.log('Benchmarking Baseline POST /users (auth + validate + save)...');
  const baseProc3 = runServer(baselinePath, BASELINE_PORT);
  await waitForHealth(BASELINE_PORT);
  try {
    const tokenBase = await getToken(BASELINE_PORT);
    const resUsersBase = await runAutocannon(`http://127.0.0.1:${BASELINE_PORT}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenBase}` },
      body: BODY_USER,
    });
    report.users.baseline = extractStats(resUsersBase);
    console.log(`  RPS: ${report.users.baseline.rps}, p99: ${report.users.baseline.p99} ms`);
  } finally {
    await kill(baseProc3);
  }

  // Table
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE COMPARISON (AOT vs Baseline)');
  console.log('='.repeat(60));
  console.log('Metric              | AOT        | Baseline   | Delta');
  console.log('-'.repeat(60));
  console.log(`Cold start (ms)     | ${String(report.coldStart.aot).padStart(9)} | ${String(report.coldStart.baseline).padStart(9)} | ${report.coldStart.aot <= report.coldStart.baseline ? 'AOT faster' : 'Baseline faster'}`);
  console.log(`POST /register RPS  | ${String(report.register.aot.rps).padStart(9)} | ${String(report.register.baseline.rps).padStart(9)} | ${report.register.aot.rps >= report.register.baseline.rps ? 'AOT better' : 'Baseline better'}`);
  console.log(`POST /register p99  | ${String(report.register.aot.p99).padStart(9)} | ${String(report.register.baseline.p99).padStart(9)} | ${report.register.aot.p99 <= report.register.baseline.p99 ? 'AOT better' : 'Baseline better'}`);
  console.log(`POST /users RPS     | ${String(report.users.aot.rps).padStart(9)} | ${String(report.users.baseline.rps).padStart(9)} | ${report.users.aot.rps >= report.users.baseline.rps ? 'AOT better' : 'Baseline better'}`);
  console.log(`POST /users p99     | ${String(report.users.aot.p99).padStart(9)} | ${String(report.users.baseline.p99).padStart(9)} | ${report.users.aot.p99 <= report.users.baseline.p99 ? 'AOT better' : 'Baseline better'}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
