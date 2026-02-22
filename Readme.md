# Codeless v4

A minimal, Vue-inspired backend framework for Node.js. Write APIs in a single `.cls` file using `data`, `do`, and `route`. The framework compiles to Express + SQLite (or PostgreSQL) with validation and optional JWT auth.

**v4** uses compile-time code generation: no `new Function`, no vm2. You edit `api.cls` and `codeless.config.js`; the framework owns the compiler and runtime under `/src` and writes output to `/generated`.

---

## Installation

**From the repo (development):**

```bash
git clone <your-repo-url>
cd Codeless
npm install
```

**As a dependency (when published):**

```bash
npm install codeless
npx codeless build
```

**Prerequisites:** Node.js 18+. For TypeScript CLI commands (`dev`, `check`), the project uses `tsx` (in devDependencies).

---

## Quick Start

1. **Create `api.cls`** in the project root with one schema, one action, and one route:

```cls
data Task {
    title: String(max:200),
    done: Boolean?
}

do listTasks(data) {
    return sugar.all('Task');
}

do createTask(data) {
    return sugar.save('Task', data);
}

route {
    GET  "/tasks"   => listTasks
    POST "/tasks"   => validate(Task), createTask
}
```

2. **Configure** (optional). Create `codeless.config.js` or rely on defaults:

```js
import { defineConfig } from 'codeless';
export default defineConfig({ entry: './api.cls' });
```

3. **Run migrations** so the table exists (first time only):

```bash
npx codeless migrate
```

4. **Start the dev server** (watch mode, hot restart):

```bash
npx codeless dev
```

5. **Call the API:** `GET http://localhost:3000/tasks`, `POST http://localhost:3000/tasks` with body `{ "title": "Learn Codeless", "done": false }`.

Health check: `GET http://localhost:3000/__health` → `{ "status": "ok", "engine": "Codeless v4" }`.

---

## Commands

Use the `codeless` CLI (via `npx codeless <command>` or `npm run <script>`):

| Command | Description |
|--------|-------------|
| `codeless dev` | Watch `.cls` files, rebuild and run the server (hot restart). Spawns the watcher from `src/cli/dev.ts`. |
| `codeless build` | Compile `api.cls` → `generated/server.js` + `generated/types.d.ts`. |
| `codeless check` | Static analysis: schema integrity, security (forbidden keywords), route validation, circular dependencies. |
| `codeless migrate` | Apply versioned SQL migrations (SQLite). Use `--test` / `-t` for test DB. |

**Examples:**

```bash
npx codeless              # show help
npx codeless build        # compile
npx codeless dev          # development server with watch
npx codeless check        # run checks
npx codeless migrate      # run migrations
npx codeless migrate -t   # run migrations on test DB
```

**NPM scripts** (same behavior): `npm run build`, `npm run dev`, `npm run check`, `npm run migrate`.

**Production:** After `codeless build`, run `node generated/server.js` (or `npm run start:generated`).

---

## Folder Rules

| Area | Owner | What you do |
|------|--------|-------------|
| **`/src`** | Framework | Do not edit. Contains compiler, runtime, adapters, and CLI. |
| **`/generated`** | Framework | Do not edit. Generated `server.js` and `types.d.ts`; overwritten on each build. |
| **`api.cls`** | You | Your API: `data`, `do`, and `route` blocks. |
| **`codeless.config.js`** | You | Entry file, output paths, adapter (sqlite/postgres), DB and server options. Use `defineConfig` from `codeless` for defaults. |
| **`/migrations`** | You | Add `.sql` migration files; run `codeless migrate` to apply. |

You own the **surface** of the app (`api.cls`, config, migrations). The framework owns **how** it’s compiled and run (`/src`, `/generated`).

---

## Best Practices

### Use `sugar` for SQL safety

- Prefer **`sugar`** over raw database access. Table names are allowlisted (must match a `data` block), so you avoid SQL injection from user input in table/column names.
- **Safe:** `sugar.save('Task', data)`, `sugar.all('Task')`, `sugar.find('Task', id)`, `sugar.update('Task', id, data)`, `sugar.remove('Task', id)`.
- **When you need raw SQL** (e.g. joins), use **`sugar.query(sql, ...params)`** with parameterized queries only (e.g. `?` placeholders and pass values as arguments). Never concatenate user input into SQL strings.

### Other tips

- Keep **no `require`/`import`** in `.cls` files; the runtime injects `data`, `db`, `sugar`, `req`.
- Return **plain objects** from `do` blocks (they are JSON-serialized).
- Use **`validate(Schema)`** in the route pipeline so request bodies are validated before reaching your action.
- Use **`auth`** in the pipeline for routes that require a valid JWT.

---

## Language at a glance

| Block | Purpose |
|-------|--------|
| `data` | Schema/table: types, optional `?`, `String(min/max)`, `Number(min/max)`, `Boolean`, `Enum(a|b|c)`. |
| `do` | Business logic. Receives `(data, db, sugar, req)`. Use `sugar` for CRUD. |
| `route` | HTTP: `METHOD "/path" => step1, step2, ...`. Steps: `auth`, `validate(Schema)`, or action name. |

**Pipeline example:**

```cls
route {
    GET    "/users"       => listUsers
    GET    "/users/:id"   => getUser
    POST   "/users"       => auth, validate(User), createUser
}
```

---

## Configuration

**`codeless.config.js`** — use `defineConfig` for defaults and env-aware values:

```js
import { defineConfig } from 'codeless';
export default defineConfig({
  entry: './api.cls',
  output: { server: './generated/server.js', types: './generated/types.d.ts' },
  adapter: 'sqlite',  // or 'postgres'
  database: {
    sqlite: {},       // path from DB_FILE or codeless.test.db when NODE_ENV=test
    postgres: { connectionString: process.env.DATABASE_URL },
  },
  server: { port: parseInt(process.env.PORT || '3000', 10) },
  migrations: { table: '_codeless_migrations', dir: './migrations' },
  plugins: [],
});
```

**Environment:** `PORT`, `DB_FILE`, `JWT_SECRET`, `DATABASE_URL`, `NODE_ENV` (e.g. `test` for test DB). See REQUIREMENTS.md for a full list.

---

## Error handling

- **400** — Validation failed (`validate(Schema)`).
- **401** — Unauthorized (missing or invalid `Authorization: Bearer`).
- **500** — Action error (or use `err.status` on thrown error).

---

## More

- **Full example:** see `api.cls` in this repo (User, Post, Comment, auth, raw SQL).
- **Spec and constraints:** see **REQUIREMENTS.md**.
- **v3 (legacy):** `npm start` runs the runtime interpreter; use v4 (`codeless build` + `generated/server.js`) for production.

---

## License

[Your chosen license, e.g. MIT]
