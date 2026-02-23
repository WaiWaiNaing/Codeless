# Database benchmark: GET /db-test

## 1. Performance route

- **Route:** `GET /db-test` (public, no auth)
- **Action:** `dbTest()` → `sugar.query('SELECT * FROM "User" LIMIT ?', 20)` (first 20 rows from User)
- **Purpose:** Measure pure DB + framework overhead without JWT or validation.

## 2. Seed data

```bash
node test/seed-db.js
```

- Inserts **10,000** dummy rows into `User` (uses `DB_FILE` or `codeless.db`).
- Creates the table if missing. Run once before benchmarking so the table is large enough (testing on an empty table inflates RPS).

## 3. Database optimization check

### Pre-compiled SQL for /db-test

**Finding:** The `/db-test` path uses `aot_db.query(sql, params)`, which calls the adapter’s `db.query(sql, params)`. The adapter does `this.db.prepare(sql)` and `stmt.all(...params)` **on every request**, so this specific query is **not** pre-compiled at startup.

- **Pre-compiled at startup (in `generated/server.js`):** Table CRUD via `PREP['User']` — `insert`, `update`, `delete`, `findById` are created with `db.db.prepare(...)` once at top level.
- **Not pre-compiled:** Any `sugar.query(...)` / `aot_db.query(...)` (e.g. the `SELECT * FROM "User" LIMIT ?` used by `/db-test`) is prepared per request inside the adapter.

To pre-compile this query you’d add a dedicated prepared statement at startup (e.g. in codegen for this pattern) and use it in the handler instead of `aot_db.query()`.

### SQLite WAL (Write-Ahead Logging)

**Finding:** WAL is enabled.

- **Where:** `src/runtime/adapters/sqlite.js` in `connect()`:
  - `this.db.pragma('journal_mode = WAL');`
- **Effect:** Better concurrency for read-heavy load tests; readers don’t block writers.

## 4. Benchmarking

### Run the benchmark (30 s, 100 connections)

```bash
# 1. Seed (once)
node test/seed-db.js

# 2. Start server
npx codeless build && node generated/server.js

# 3. In another terminal
autocannon -c 100 -d 30 http://localhost:3000/db-test
```

### Interpreting results (DB-heavy workload)

- **Throughput (RPS):** Total requests per second. For a DB-bound route, this is limited by DB + event loop; compare before/after code or DB changes.
- **Latency:**
  - **mean / avg:** Average response time; good first summary.
  - **p50 (median):** Typical request; less affected by outliers than mean.
  - **p99 / p99.9:** Tail latency; important for “worst case” and SLA.
- **Latency vs throughput:** As you increase connections (`-c`), throughput may rise then flatten while latency grows (queueing). Where latency starts to climb quickly is often the practical limit for “good” throughput.
- **Non-2xx:** If you see timeouts or errors, reduce `-c` or check DB/connection limits and WAL/disk.

Optional: save a run for comparison:

```bash
autocannon -c 100 -d 30 http://localhost:3000/db-test -o db-test-result.json
```
