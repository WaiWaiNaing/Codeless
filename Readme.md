# Codeless v4

A minimal, high-performance backend framework for Node.js. Build production-ready APIs in a single `.cls` file using a declarative syntax. The framework compiles your logic into a native Express + SQLite (or PostgreSQL) server with built-in validation and JWT authentication.

**v4** features an **Ahead-of-Time (AOT)** compiler: it generates static JavaScript code instead of using runtime interpretation. This ensures maximum security (no `eval` or `vm2`) and near-native execution speed.

---

## Installation

**From the repository (Development):**

```bash
git clone <your-repo-url>
cd Codeless
npm install
```

**As a dependency (When published):**

```bash
npm install codeless
npx codeless build
```

**Prerequisites:** Node.js 18+. The framework utilizes `tsx` for high-speed TypeScript execution in development mode.

---

## Quick Start

1. **Create `api.cls`** in your project root:

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

2. **Configure** (Optional). Create `codeless.config.js`:

```js
import { defineConfig } from 'codeless';
export default defineConfig({ entry: './api.cls' });
```

3. **Initialize Database** (Run migrations):

```bash
npx codeless migrate
```

4. **Launch Development Server** (Hot Reload enabled):

```bash
npx codeless dev
```

---

## Commands

| Command | Description |
| --- | --- |
| `codeless dev` | Watch `.cls` files, re-compile, and restart the server automatically. |
| `codeless build` | Compile `api.cls` into `generated/server.js` and `generated/types.d.ts`. |
| `codeless check` | Perform static analysis (Security scan, schema integrity, and circular deps). |
| `codeless migrate` | Apply SQL migrations. Use `-t` for the test environment. |

---

## Architecture & Ownership

To keep the project "Solid," Codeless strictly separates framework logic from application logic:

| Area | Owner | Description |
| --- | --- | --- |
| **`/src`** | Framework | The engine (Compiler, Runtime, Adapters). **Do not edit.** |
| **`/generated`** | Framework | Optimized output files. Overwritten on every build. |
| **`api.cls`** | **Developer** | Your Single Source of Truth for schemas and business logic. |
| **`codeless.config.js`** | **Developer** | Environment settings and database adapters. |

---

## Security Best Practices

### The Sugar API

Always prefer the **`sugar`** object for database operations. It ensures:

1. **Table Allowlisting:** Only tables defined in your `data` blocks can be accessed.
2. **SQL Injection Protection:** All queries are automatically parameterized.

```js
// Safe CRUD
sugar.save('Task', data);
sugar.all('Task', { status: 'active' }, { field: 'createdAt', direction: 'desc' });

// Raw SQL (Always use parameters)
sugar.query("SELECT * FROM Task WHERE userId = ?", req.user.id);
```

---

## Language Specifications

| Block | Purpose | Features |
| --- | --- | --- |
| `data` | Schema Definition | `String`, `Number`, `Boolean`, `Enum`, `Password`. Supports `min/max` constraints. |
| `do` | Business Logic | Async functions receiving `(data, db, sugar, req)`. No manual imports required. |
| `route` | Pipeline Routing | Supports middleware chaining: `auth`, `validate(Schema)`, and custom actions. |

---

## License

**MIT License**

Copyright (c) 2024-2026 Wai Wai Naing

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

**THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.**
