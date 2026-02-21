# Codeless

A minimal, Vue-inspired backend framework for Node.js. Write APIs with a simple `.cls` syntax—no boilerplate, just `data`, `do`, and `route`. The engine compiles `.cls` to Express.js with SQLite (or PostgreSQL), validation, and optional auth.

**Engines:** **v4 (recommended)** — compile-time codegen, no `new Function`/vm2, adapter-based DB. **v3** — runtime interpreter with JWT, metrics, OpenAPI.

## Features

- **Lexer + parser** — Token-based parsing for `data`, `do`, `route`, and `migration`; do-block bodies extracted from source so JS (e.g. `sugar.save`) parses correctly.
- **SQLite** via `better-sqlite3`; **SQL injection protection** — table names allowlisted; **connection pooling** and **prepared statement cache** per connection.
- **Rich schema types** — `String(min/max, format:email, pattern)`, `Number(min/max, integer)`, `Enum`, `Boolean`, `Date`, `Password` (bcrypt); optional `?`; cross-field validation rules.
- **Implicit validation** — `validate(Schema)` in the route pipeline; `SchemaValidator` with type checks, custom validators, and cross-field rules.
- **JWT auth** — `auth` in the pipeline uses JWT (access + refresh tokens); role-based access via `requireRoles()`.
- **Rate limiting** — Global rate limit (window + max requests); optional per-route `rateLimit(N)` in pipeline.
- **Watch mode** — Hot-reload when `api.cls` changes.
- **Structured logging** — Pino with configurable level (`LOG_LEVEL`).
- **Prometheus metrics** — Route duration, active requests, DB query duration, validation errors; `GET /metrics`.
- **OpenAPI** — Auto-generated spec and Swagger UI at `GET /api-docs.json` and `/api-docs`.
- **No imports** in `.cls` files; runtime injects `data`, `db`, `sugar`, `req`. Optional **VM2 sandbox** for action execution (SafeActionExecutor).
- **Health** — `GET /__health` returns `{ status: 'ok', engine: 'Codeless Enterprise v3.0' }`.

## Prerequisites

- Node.js
- (Optional) Cursor or any editor; set **Files: Associations** → `*.cls` → `javascript` for highlighting.

## Installation

```bash
git clone <your-repo-url>
cd Codeless
npm install
```

## Configuration

Environment variables (or edit `CONFIG` in `compiler.js`):

| Variable       | Default      | Description              |
|----------------|--------------|--------------------------|
| `PORT`         | `3000`       | Server port              |
| `CLS_FILE`     | `./api.cls`  | Path to the `.cls` file  |
| `DB_FILE`      | `codeless.db`| SQLite database path     |
| `NODE_ENV`     | `development`| Environment             |
| `JWT_SECRET`   | (dev default)| **Required in production** for JWT auth |
| `JWT_EXPIRY`   | `1h`         | Access token expiry      |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token expiry  |
| `BCRYPT_ROUNDS`| `10`         | Password hashing rounds  |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `METRICS_ENABLED` | `true`   | Prometheus metrics       |
| `LOG_LEVEL`    | `info`       | Pino log level           |
| `WATCH`        | `true`       | Set to `false` to disable hot-reload |

## Language Overview

| Block   | Purpose |
|--------|--------|
| `data` | Defines SQLite table structure and validation schema (optional `?`, type args, enums). |
| `do`   | Defines business logic (functions). Receives `(data, db, sugar, req)`. |
| `route`| Maps HTTP method + path to a pipeline: `auth`, `validate(Schema)`, and action names. |

## Syntax

### 1. Schema (`data`)

- **Optional field:** `fieldName?`
- **String:** `String`, `String(min:N, max:N)`
- **Number:** `Number`, `Number(min:N, max:N)`
- **Enum:** `Enum(admin|editor|viewer)` (values separated by `|`)

```javascript
data User {
    username: String(min:3, max:50),
    email: String(max:255),
    role: Enum(admin|editor|viewer),
    age: Number(min:0, max:150)?
}
```

### 2. Logic (`do`)

Each action receives **`(data, db, sugar, req)`**. Use **`sugar`** for safe CRUD (table names are allowlisted):

- `sugar.save(table, data)` — insert row (async), returns `{ id, changes }`
- `sugar.all(table, where?, orderBy?)` — all rows (async)
- `sugar.find(table, id)` — one row by primary key (async)
- `sugar.update(table, id, data)` — update row (async)
- `sugar.remove(table, id)` — delete row (async)
- `sugar.transaction(callback)` — run callback in a transaction (async)
- `sugar.query(sql, ...params)` — raw prepared statement when needed (async)

In v3 all sugar methods are **async** (return Promises); actions can `return` or `return await` them.

**Context `data`** is merged from `req.query`, `req.params`, and `req.body` (body overrides params overrides query), so route params (e.g. `/users/:id`) are available as `data.id`.

```javascript
do getUser(data) {
    const id = parseInt(data.id ?? data.params?.id);
    const user = sugar.find('User', id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return user;
}
```

### 3. Routing (`route`) and pipeline

Format: `METHOD "/path" => step1, step2, ...` (or `=> [ step1, step2 ]`).

Pipeline steps:

- **`auth`** — Bearer token required; 401 if missing or wrong (uses `AUTH_SECRET`).
- **`validate(Schema)`** — Run the schema validator; 400 if body doesn’t match the `data` definition.
- **Action name** — Call the corresponding `do` block with current context.

```javascript
route {
    GET    "/users"      => listUsers
    GET    "/users/:id"  => getUser
    POST   "/users"      => auth, validate(User), createUser
    POST   "/comments"   => validate(Comment), createComment
}
```

## Full Example (v2.0)

See `api.cls` in this repo for a full example with User, Post, Comment, optional fields, enums, auth, and raw SQL via `sugar.query`.

Minimal snippet:

```javascript
data User {
    username: String(min:3, max:50),
    email: String(max:255),
    role: Enum(admin|editor|viewer)
}

do createUser(data) {
    return sugar.save('User', data);
}

do listUsers(data) {
    return sugar.all('User');
}

route {
    GET  "/users"  => listUsers
    POST "/users"  => auth, validate(User), createUser
}
```

## Running the engine

```bash
node compiler.js
```

- Server: `http://localhost:3000` (or `PORT`).
- Health: `GET /__health`. Metrics: `GET /metrics` (Prometheus). API docs: `GET /api-docs` (Swagger UI).
- Watch mode is on by default; edit `api.cls` and save to hot-reload routes.

## Error handling

- **Validation errors** (from `validate(Schema)`): status **400**, body `{ error: 'Validation Error', message: '...' }`.
- **Auth failure**: status **401**, body `{ error: 'Unauthorized', message: '...' }`.
- **Action errors**: status **500** (or `err.status` if you set it), with **per-action attribution** in the message (e.g. `[createUser] ...`).

## Constraints for AI / Code Generation

- **No imports** in `.cls` files.
- **Actions** receive `(data, db, sugar, req)`.
- **Responses:** return a plain object (serialized to JSON).
- **File extension:** `.cls`.
- Prefer **`sugar`** over raw `db.prepare` for table access (allowlisted names).

## Teaching Cursor (or any LLM)

1. Put the Codeless rules in **`.cursorrules`** in the project root.
2. **Files: Associations** → `*.cls` → `javascript`.
3. Reference `compiler.js` and `api.cls` when asking for new `.cls` files or routes.

---

## Codeless v4 – Production Architecture

v4 is a **compile-time** pipeline: parse `.cls` → generate real JS → run the compiled server. No runtime DSL execution, no `new Function`, no vm2.

### Structure

```
codeless/
  cli/           build.js, dev.js, migrate.js
  compiler/      lexer.js, parser.js, codegen.js
  runtime/       adapters (sqlite, postgres), core (validator, auth, sugar), plugins
  generated/     server.js, types.d.ts  ← output
  api.cls
  codeless.config.js
```

### Commands

```bash
npm run build:v4    # Compile api.cls → generated/server.js + types.d.ts
npm run dev:v4      # Watch api.cls, rebuild and run server
npm run migrate:v4  # Apply versioned migrations (SQLite)
npm run start:v4    # Run generated/server.js (production)
```

### Features

- **No dynamic evaluation** — generated server is plain JS; safe for production.
- **Adapter layer** — `SqliteAdapter` and `PostgresAdapter` share the same interface; switch via `codeless.config.js` → `adapter: 'sqlite'|'postgres'`.
- **Safe query builder** — `sugar.all(table, where, orderBy)` accepts `orderBy: { field, direction: 'asc'|'desc' }`; field is validated (no ORDER BY injection).
- **Versioned migrations** — system table `_codeless_migrations`; put `.sql` files in `migrations/` and run `migrate:v4`.
- **Type generation** — `generated/types.d.ts` with interfaces per `data` block for IDE/AI.
- **Plugin hook points** — `runtime/plugins`: `beforeAction`, `afterAction`, `onRouteRegister`.

### Config (`codeless.config.js`)

- `entry`, `output.server`, `output.types`
- `adapter`: `'sqlite'` | `'postgres'`
- `database.sqlite.path`, `database.postgres.connectionString`
- `migrations.table`, `migrations.dir`

---

## License

[Your chosen license, e.g. MIT]
