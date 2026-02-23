# AOT Performance Comparison & Integrity Report

## How to run

```bash
# 1. Build AOT server
npm run build

# 2. Run benchmark (spawns AOT + baseline, runs autocannon, prints table)
node test/bench-report.js

# 3. Run integration tests (server must be running, or use START_SERVER=1)
node test/integration.test.mjs
# Or: START_SERVER=1 node test/integration.test.mjs

# 4. Cold start only (optional)
# Start server in background, measure time to first __health 200.
```

## Performance comparison table (template)

Run `node test/bench-report.js` to fill this. Example:

| Metric | AOT | Baseline (runtime) | Delta / Regression |
|--------|-----|--------------------|--------------------|
| Cold start (ms) | _measured_ | _measured_ | AOT typically similar or faster (no schema loop init) |
| POST /register RPS | _measured_ | _measured_ | AOT expected higher (inlined validation + PREP) |
| POST /register p99 (ms) | _measured_ | _measured_ | AOT expected lower |
| POST /users (auth+validate+save) RPS | _measured_ | _measured_ | AOT expected higher |
| POST /users p99 (ms) | _measured_ | _measured_ | AOT expected lower |

**Regression flag:** If AOT RPS is lower than baseline or p99 is higher by more than ~10%, investigate (cold DB, unique constraint on /register, or machine load).

## Execution integrity (“still works” check)

Integration tests (`test/integration.test.mjs`) verify:

| Test | What it checks |
|------|----------------|
| validate() rejects invalid types | POST /register with `username: 12345` → 400, message about string |
| validate() rejects missing required | POST /register without `role` → 400 |
| validate() rejects invalid enum | POST /register with `role: 'superadmin'` → 400 |
| auth protects route | POST /users without `Authorization: Bearer` → 401 |
| auth accepts valid token | Register → Login → POST /users with token → 200/201, body has id or success |
| sugar save | POST /register → response has `id`; GET /users/:id returns same user |

**Regression:** If any integration test fails after an AOT/codegen change, treat as a logic regression and fix before release.

## Cold start measurement

- **AOT:** Time from `node generated/server.js` until `GET /__health` returns 200. Includes: connect DB, PREP all statements, load routes.
- **Baseline:** Time from `node test/server-baseline.js` until `GET /__health` returns 200. Includes: connect DB, createValidator/createSugar (no PREP).

Bench script measures both and prints them in the comparison table.
