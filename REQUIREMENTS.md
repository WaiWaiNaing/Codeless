# Codeless Framework — Requirements & Specification

A single reference for developers working with or extending the Codeless backend framework. For setup, examples, and v3/v4 differences, see [Readme.md](Readme.md).

---

## 1. What is Codeless?

- **Purpose:** Minimal, Vue-inspired backend framework for Node.js. You write a `.cls` file; the engine compiles it to Express + SQLite (or PostgreSQL) with validation and optional JWT auth.
- **Engines:** **v4 (recommended)** — compile-time codegen, no `new Function`/vm2. **v3** — legacy runtime interpreter.
- **File extension:** All backend logic lives in `.cls` files.

---

## 2. Language Blocks

| Block   | Purpose |
|---------|--------|
| `data`  | Defines a table/schema: column types, optional fields, validation. Table name is used by `sugar` and must match. |
| `do`    | Business logic (actions). Signature: `(data, db, sugar, req)`. Use `sugar` for safe DB access. |
| `route` | HTTP routing: `METHOD "/path" => step1, step2, ...` (e.g. `auth`, `validate(Schema)`, action name). |

---

## 3. Schema (`data` block)

- **Optional field:** suffix with `?` (e.g. `age: Number?`).
- **Types:**  
  `String`, `String(min:N, max:N)` · `Number`, `Number(min:N, max:N)` · `Boolean` · `Enum(a|b|c)` (pipe-separated).

Example:

```cls
data User {
    username: String(min:3, max:50),
    email: String(max:255),
    role: Enum(admin|editor|viewer),
    age: Number(min:0, max:150)?
}
```

- Table name (e.g. `User`) is allowlisted for `sugar`; use the same name in `sugar.save('User', data)` etc.

---

## 4. Logic (`do` block)

- Every `do` receives **`(data, db, sugar, req)`**. Prefer **`sugar`** over raw `db` (SQL-injection safe, allowlisted tables).
- **`data`** is merged from `req.query`, `req.params`, and `req.body` (body overrides params overrides query). For `GET /users/:id`, use `data.id` or `req.params.id`.
- Return a **plain object** (serialized to JSON). Use `return { success: true };` or return the result of `sugar.save` / `sugar.all` etc.
- **No `require`/`import`** in `.cls` files; runtime injects `data`, `db`, `sugar`, `req`.

### Sugar API (safe, allowlisted table names)

| Method | Description |
|--------|-------------|
| `sugar.save(table, data)` | Insert row (async). Returns `{ id, changes }`. |
| `sugar.all(table, where?, orderBy?)` | All rows (async). |
| `sugar.find(table, id)` | One row by primary key (async). |
| `sugar.update(table, id, data)` | Update row (async). |
| `sugar.remove(table, id)` | Delete row (async). |
| `sugar.query(sql, ...params)` | Raw prepared statement when needed (async). |

Table names must match a `data` block name.

---

## 5. Routing (`route` block)

- Format: **`METHOD "/path" => step1, step2, ...`** (or `=> [ step1, step2 ]`).
- **Pipeline steps:**
  - **`auth`** — Bearer token required (JWT); 401 if missing or invalid.
  - **`validate(SchemaName)`** — Validates request body/params against the `data` definition; 400 on failure.
  - **Action name** — Invokes the corresponding `do` block with current context.

Example:

```cls
route {
    GET    "/users"       => listUsers
    GET    "/users/:id"   => getUser
    POST   "/users"       => auth, validate(User), createUser
    POST   "/comments"    => validate(Comment), createComment
}
```

---

## 6. Configuration

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port. |
| `CLS_FILE` | `./api.cls` | Path to `.cls` entry (v3). |
| `DB_FILE` | `codeless.db` | SQLite database path. |
| `JWT_SECRET` | (dev default) | **Required in production** for JWT auth. |
| `JWT_EXPIRY` | `1h` | Access token expiry. |
| `REFRESH_TOKEN_EXPIRY` | `7d` | Refresh token expiry (if used). |
| `WATCH` | `true` | Set to `false` to disable hot-reload (v3). |

### v4 config (`codeless.config.js`)

- `entry`, `output.server`, `output.types`
- `adapter`: `'sqlite'` \| `'postgres'`
- `database.sqlite.path`, `database.postgres.connectionString`
- `migrations.table`, `migrations.dir`

---

## 7. Constraints (for AI / code generation)

- **File extension:** `.cls`.
- **No imports** in `.cls` files.
- **Actions** always receive `(data, db, sugar, req)`.
- **Responses:** return a plain object (JSON-serializable).
- Prefer **`sugar`** over raw `db.prepare`; table names must match a `data` block.

---

## 8. Commands (v4 recommended)

```bash
npm run build              # Compile api.cls → generated/server.js + types.d.ts
npm run dev                # Watch .cls, rebuild and run (hot restart)
npm run check              # Static analysis (schema, security, routes)
npm run migrate            # Apply migrations (SQLite)
npm run start:generated    # Run generated server (production)
```

**Test version (separate DB and port):**

- When `NODE_ENV=test`, config uses database path `codeless.test.db` (unless `DB_FILE` is set).
- Use test commands so development/production data is not touched:

```bash
npm run migrate:test       # Apply migrations to codeless.test.db
npm run start:test         # Run server on port 3001 with codeless.test.db
npm test                   # Run check + build (smoke test)
```

v3 legacy: `npm start` (uses `src/legacy/compiler-v3.js`).

---

## 9. Error handling

- **Validation errors** (`validate(Schema)`): status **400**, body `{ error: 'Validation Error', message: '...' }`.
- **Auth failure:** status **401**, body `{ error: 'Unauthorized', message: '...' }`.
- **Action errors:** status **500** (or `err.status` if set on the thrown error).

---

## 10. Sharing with another developer

- Point them to this file (**REQUIREMENTS.md**) for the language and constraints.
- Use **Readme.md** for installation, examples, auth flow, and v3/v4 architecture.
- For editor/LLM support: add Codeless rules to **`.cursorrules`** and set **Files: Associations** → `*.cls` → `javascript`.
- Reference **`api.cls`** and **`src/compiler/`** when generating or modifying `.cls` files and routes.
- **Layout:** `src/compiler/` (lexer, parser, codegen, compile, source-utils); `src/runtime/` (auth, validator, sugar, index); `src/runtime/adapters/` (sqlite, postgres); `src/cli/` (build, dev, check, migrate); **`bin/codeless.js`** — CLI bridge. Run: `node bin/codeless.js build|check|migrate|dev` or `npx codeless <cmd>`.
