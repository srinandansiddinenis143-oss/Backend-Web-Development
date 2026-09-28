# Supporting Layers — Untangle a Scattered Express API

Refactor a working but messy `articles-api` into three supporting layers: `validators/`, `utils/`, and `config/`. Behaviour must not change.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the server:
   ```bash
   npm start
   ```

## Tasks

The app currently has validation inline in routes and environment variables read in several files. Reorganise it:

1. `validators/article.validator.js` — move the inline `createArticle` / `updateArticle` chains here; import them in `routes/articles.js`.
2. `utils/AppError.js`, `utils/asyncHandler.js`, `utils/validateRequest.js` — create these pure helpers (no imports from app layers).
3. `config/index.js` — the **only** file that reads runtime environment variables; export `{ port, nodeEnv, jwtSecret, maxArticles }` with sane defaults.
4. Update `app.js` and `services/articlesService.js` to import from `config` instead of reading environment variables directly.
5. Add `.env.example` (committed) listing every variable, and make sure `.env` is in `.gitignore`.

This README contains the full brief. The repository and API behavior should remain unchanged.

## Self-Audit

After refactoring, this should return only `config/index.js`:
```bash
grep -rn 'process[.]env' . | grep -v node_modules
```
