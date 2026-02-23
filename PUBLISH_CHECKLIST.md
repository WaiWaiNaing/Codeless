# NPM Publish Checklist – Codeless v4

Use this before `npm publish` to avoid leaking secrets or dev-only files.

## 1. Git: Remove tracked files that should be ignored

If `generated/` or `.env` were ever committed, remove them from the Git index (files stay on disk, but Git will stop tracking them):

```bash
git rm -r --cached generated/ 2>/dev/null || true
git rm --cached .env 2>/dev/null || true
git commit -m "chore: stop tracking generated/ and .env"
```

Then ensure `.gitignore` includes them so they are not re-added.

## 2. What gets published (package.json `"files"`)

Only these are included in the NPM package:

- `index.js`
- `bin/`
- `src/`
- `tsconfig.json`
- `README.md`
- `LICENSE`

**Not published** (kept in Git only): `test/`, `update_codegen.mjs`, `codeless.config.js`, `api.cls`, `handlers.cls`, `models.cls`, `ARCHITECTURE.md`, `PUBLISH_CHECKLIST.md`, `.gitignore`, etc.

## 3. Entry points

- **main:** `"main": "index.js"` – default require/import.
- **bin:** `"bin": { "codeless": "./bin/codeless.js" }` – CLI.

## 4. Sensitive info / JWT in production

- **Defaults:** `JWT_SECRET` defaults to `changeme-secret` in **development** only.
- **Production guard:** In `src/runtime/auth.js`, when `NODE_ENV === 'production'`, `signToken()` and `createAuth()` throw if `JWT_SECRET` is unset or still `changeme-secret`.
- **Generated server:** If your codegen inlines `process.env.JWT_SECRET || 'changeme-secret'`, ensure production deployments **set `JWT_SECRET`** in the environment so the fallback is never used.
- **No hardcoded user paths** were found in framework source (only in `node_modules` and test/docs, which are not published).

## 5. Before you publish

1. Run `npm run test` (or at least `npm run build`).
2. Run `npm pack --dry-run` and confirm the file list has no `test/`, `update_codegen.mjs`, or `.env`.
3. Add a `LICENSE` file at the repo root if you want it in the package (e.g. MIT).
4. Ensure `README.md` exists (npm uses it for the package page); if your file is `Readme.md`, either rename it or add `"readme": "Readme.md"` to package.json.
