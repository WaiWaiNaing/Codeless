<p align="center">
  <img src="https://img.shields.io/badge/Codeless-v4-2d3748?style=for-the-badge" alt="Codeless v4" />
</p>

<p align="center">
  <a href="#benchmarks"><img src="https://img.shields.io/badge/Performance-22k%2B%20RPS-brightgreen?style=flat-square" alt="22k+ RPS" /></a>
  <a href="#security"><img src="https://img.shields.io/badge/Security-Audited-blue?style=flat-square" alt="Security Audited" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Production-Ready-green?style=flat-square" alt="Production Ready" /></a>
  <a href="#license"><img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js" alt="Node 18+" />
</p>

---

# Codeless v4

**An AOT-optimized DSL engine for Node.js** that compiles high-level schemas and actions into lean, JIT-friendly JavaScript. Build production-ready APIs with **Go-like performance** and the flexibility of Node.js.

- **Ahead-of-Time (AOT) Compilation** — Your `.cls` DSL is compiled to static Express route handlers. No runtime interpretation, no `eval`, no middleware overhead.
- **Security Audited** — Prototype pollution guards, strict type validation, parameterized SQL, and JWT algorithm enforcement are built in and verified.
- **High Concurrency** — SQLite WAL mode, prepared statements, and configurable `busy_timeout` for 13k+ RPS under load.

---

## Table of Contents

- [Benchmarks](#benchmarks)
- [Key Features](#key-features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [DSL Overview](#dsl-overview)
- [Commands](#commands)
- [Security](#security)
- [License](#license)

---

## Benchmarks

Codeless v4 is built for throughput. All numbers from **autocannon** on typical hardware (single process, SQLite WAL).

| Scenario | Codeless v4 AOT | Typical Express | Advantage |
|----------|-----------------|-----------------|-----------|
| **Plain ping** (no DB) | **~22,000+ RPS** | ~2,000–3,000 RPS | **~4×–5×** |
| **DB read** (SQLite, 100 conn) | **13,143 RPS** | ~2,500–4,000 RPS | **~4×** |
| **Avg latency** (DB read) | **~7 ms** | ~25–50 ms | Lower tail latency |

*Run your own: `npm run build` → `node generated/server.js` → `autocannon -c 100 -d 30 http://localhost:3000/db-test` (seed DB first with `node test/seed-db.js`).*

---

## Key Features

| Feature | Description |
|--------|-------------|
| **AOT Compilation** | DSL compiles directly to optimized route handlers. No middleware stack, no runtime schema loops. |
| **Built-in Security** | Passed security audit: prototype pollution protection, strict type validation, parameterized AOT queries, JWT algorithm enforcement and secret guards. |
| **Database** | Native **SQLite** and **PostgreSQL** support. WAL mode, `busy_timeout`, and retry-friendly design for high concurrency. |
| **Type-Safe DSL** | `data` blocks with `String`, `Number`, `Boolean`, `Enum`, optional fields, and min/max constraints. Generated TypeScript types. |
| **Pipeline Routing** | `auth`, `validate(Schema)`, and action steps in a single declarative route block. |

---

## Installation

**From source (development):**

```bash
git clone <your-repo-url>
cd Codeless
npm install
```

**Prerequisites:** Node.js 18+. Uses ESM and optional `tsx` for dev.

---

## Quick Start

1. **Build** the project (compile `.cls` → `generated/server.js`):

```bash
npx codeless build
```

2. **Run** the generated server:

```bash
node generated/server.js
```

3. **(Optional)** Apply migrations and use dev mode:

```bash
npx codeless migrate
npx codeless dev   # watch + hot restart
```

---

## DSL Overview

Your API lives in `.cls` files: **data** (schemas), **do** (actions), and **route** (HTTP pipelines).

### Data (schemas)

```cls
data User {
    username: String(min:3, max:50),
    email: String(max:255),
    role: Enum(admin|editor|viewer),
    age: Number(min:0, max:150)?
}

data Post {
    title: String(min:1, max:200),
    content: String(max:5000),
    status: Enum(draft|published|archived),
    authorId: Number
}
```

### Do blocks (business logic)

Use the **sugar** API for safe, allowlisted CRUD and **SELECT**-only raw queries:

```cls
do listUsers(data) {
    return sugar.all('User');
}

do createUser(data) {
    return sugar.save('User', data);
}

do getUser(data) {
    const id = parseInt(data.id ?? data.params?.id);
    const user = sugar.find('User', id);
    if (!user) throw Object.assign(new Error('User not found'), { status: 404 });
    return user;
}

do listPosts(data) {
    return sugar.query(
        `SELECT p.*, u.username as authorName
         FROM "Post" p
         LEFT JOIN "User" u ON p.authorId = u.id
         ORDER BY p.id DESC`
    );
}
```

### Routes (pipelines)

Chain **auth**, **validate(Schema)**, and action names:

```cls
route {
    GET    "/ping"       => ping
    GET    "/db-test"    => dbTest

    POST   "/login"      => login
    POST   "/register"   => validate(User), createUser

    GET    "/users"      => listUsers
    GET    "/users/:id"  => getUser
    POST   "/users"      => auth, validate(User), createUser

    GET    "/posts"      => listPosts
    POST   "/posts"      => auth, validate(Post), createPost
    DELETE "/posts/:id"  => auth, deletePost
}
```

### Imports

Compose multiple `.cls` files from your entry (e.g. `api.cls`):

```cls
import "./models.cls"
import "./handlers.cls"
```

---

## Commands

| Command | Description |
|--------|-------------|
| `npx codeless build` | Compile `api.cls` → `generated/server.js` + `generated/types.d.ts`. |
| `npx codeless dev` | Watch `.cls` files, rebuild and restart the server (hot reload). |
| `npx codeless check` | Static analysis: schema integrity, security scan, circular deps. |
| `npx codeless migrate` | Apply SQL migrations. Use `-t` for test DB. |

---

## Project structure

The framework is organized for clarity and scalability:

| Path | Purpose |
|------|---------|
| `src/core/` | Shared config and constants (e.g. `defaults.js`). |
| `src/compiler/` | Compiler entry (`compile.js`) and subpackages: |
| `src/compiler/parse/` | Lexer, parser, and source utilities. |
| `src/compiler/codegen/` | AOT code generation and validation codegen. |
| `src/compiler/resolve/` | Module resolution and AST merging for `.cls` imports. |
| `src/runtime/` | Runtime used by generated server (adapters, auth, errors, etc.). |
| `src/cli/` | CLI commands: build, dev, check, migrate. |

Generated output goes to `generated/server.js` and `generated/types.d.ts`.

---

## Security

Codeless v4 is designed and audited for production use:

- **Prototype pollution protection** — Request context uses validated/null-prototype data; schema iteration does not rely on user-controlled keys.
- **Strict type validation** — AOT-generated validators with number coercion guards and enum allowlists.
- **SQL injection prevention** — All table CRUD uses prepared statements; `sugar.query` is **SELECT-only** and parameterized; AOT allowlist protects `findAll` column names.
- **JWT security** — Algorithm restricted to `HS256`; authorization header normalized (array/string); no algorithm confusion.
- **Database** — SQLite WAL + `busy_timeout` for predictable behavior under contention; no raw string interpolation in generated SQL.

---

## License

**MIT License**

Copyright (c) 2024–2026 Wai Wai Naing.

See the [LICENSE](LICENSE) file for full text.
