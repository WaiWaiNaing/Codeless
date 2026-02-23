# Codeless v4 – Architecture & Package Layout

This document describes the modular structure of the Codeless v4 framework for maintainers and contributors.

## Directory Layout

```
codeless/
├── index.js              # Public entry: defineConfig()
├── tsconfig.json         # TypeScript config for CLI (check.ts, dev.ts)
├── update_codegen.mjs    # Internal script: patch src/compiler/codegen.js (maintainers only)
├── bin/
│   └── codeless.js       # CLI entry (build | dev | check | migrate)
├── src/
│   ├── config/           # Configuration (defaults, loadConfig, types)
│   │   ├── index.js
│   │   ├── defaults.js
│   │   ├── load-config.js
│   │   └── config-types.js
│   ├── compiler/         # AOT compiler (parse, resolve, codegen, compile)
│   │   ├── index.js      # Barrel: compile, loadConfig
│   │   ├── compile.js    # Compiler entry & loadConfig re-export
│   │   ├── resolver.js   # Module resolution & AST merge
│   │   ├── codegen.js    # AOT code generation
│   │   ├── parser.js     # DSL parser
│   │   ├── lexer.js      # Lexer
│   │   ├── aot-validation.js
│   │   ├── source-utils.js
│   │   └── types.js
│   ├── runtime/          # Generated server runtime (adapters, auth, errors, etc.)
│   │   ├── index.js      # Plugin API (runBeforeAction, runAfterAction)
│   │   ├── auth.js
│   │   ├── errors.js
│   │   ├── wrapAction.js
│   │   ├── queryBuilder.js
│   │   ├── sugar.js
│   │   ├── validator.js
│   │   └── adapters/
│   │       ├── base.js
│   │       ├── sqlite.js
│   │       └── postgres.js
│   └── cli/              # CLI commands (build, dev, check, migrate)
│       ├── build.js
│       ├── dev.ts
│       ├── check.ts
│       └── migrate.js
├── generated/            # Build output (server.js, types.d.ts) – not in npm package
├── test/                 # Integration tests, benchmarks, docs
└── package.json
```

## Root-level framework files

| File | Type | Purpose |
|------|------|---------|
| **tsconfig.json** | Framework config | TypeScript options for `src/cli/*.ts` and `src/compiler/*.d.ts`; used by `tsx` when running `codeless dev` and `codeless check`. |
| **update_codegen.mjs** | Framework tooling | One-off script that patches `src/compiler/codegen.js` (e.g. replace AOT block or sugar regex). For maintainers only; not part of the published package or normal build. |

Both are **framework files** (they configure or modify the engine), not application or user code.

## Module Boundaries

| Module    | Role | Consumed by |
|-----------|------|-------------|
| **config** | Defaults, `loadConfig()`, config types | compiler, CLI, index.js |
| **compiler** | Parse DSL → AST, resolve imports, codegen → server.js + types | CLI (build, dev, check) |
| **runtime** | Adapters, auth, errors, wrapAction, queryBuilder; used by *generated* server | Generated `server.js` (via relative or `codeless/runtime/*`) |
| **cli** | Commands that invoke compiler and config | `bin/codeless.js` |

## NPM Exports

The package exposes:

- **`codeless`** (default) – `defineConfig()` for `codeless.config.js`
- **`codeless/config`** – config barrel (DEFAULTS, loadConfig)
- **`codeless/config/defaults`** – DEFAULTS and `env()`
- **`codeless/config/load-config`** – `loadConfig()`
- **`codeless/runtime`** – runtime barrel (plugin API)
- **`codeless/runtime/*`** – auth, errors, wrapAction, queryBuilder, sugar, validator, adapters

Generated servers can import from `codeless/runtime/...` when the app depends on `codeless` and runs from a project directory (e.g. `generated/server.js` in the app).

## Extending the Framework

1. **New config keys** – Add in `src/config/defaults.js` and `config-types.js`, then merge in `load-config.js` or `defineConfig` in `index.js`.
2. **New CLI command** – Add a script in `src/cli/`, register it in `bin/codeless.js`, and (if needed) call compiler or config.
3. **New runtime behavior** – Add or change files under `src/runtime/`; ensure codegen emits the correct imports in `generated/server.js`.
4. **New compiler pass** – Add a step in `compile.js` (e.g. after `resolveModules`, before `generate`) or extend `codegen.js` / parser.

**Note:** The compiler expects `resolver.js`, `codegen.js`, `parser.js`, `lexer.js`, `aot-validation.js`, and `source-utils.js` to exist in `src/compiler/`. If your repo uses subdirs (e.g. `codegen/`, `parse/`, `resolve/`), add `index.js` barrels there and have `compile.js` import from them (e.g. `./codegen/index.js`).

## Build & Test

- **Build:** `npm run build` → runs `src/cli/build.js` → `compile()` → writes `generated/server.js` and `generated/types.d.ts`.
- **Dev:** `npm run dev` → watch `.cls`, rebuild, restart generated server.
- **Check:** `npm run check` → static analysis (schemas, security, routes, circular deps).
- **Test:** `npm run test` → check + build; `npm run test:integration` → run integration tests.
