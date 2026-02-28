# AGENTS.md

## Cursor Cloud specific instructions

### Architecture
Single full-stack application (not a monorepo): React/Vite frontend + Express 4 backend + PostgreSQL. The Express server on port 5001 serves both the REST API (`/api/*`) and the built frontend from `dist/`. In development, the Vite dev server on port 5173 proxies `/api` to the backend.

### Services
| Service | Command | Port | Notes |
|---------|---------|------|-------|
| PostgreSQL | `sudo pg_ctlcluster 16 main start` | 5432 | Must be running before backend |
| Express backend | `node server.js` | 5001 | Requires `.env` with DB creds |
| Vite dev server | `npm run dev` | 5173 | Proxies API to :5001; use for frontend hot-reload |

### Running the app
1. Start PostgreSQL: `sudo pg_ctlcluster 16 main start`
2. Start backend: `cd /workspace && node server.js &`
3. Start Vite dev server: `cd /workspace && npx vite --host 0.0.0.0 --port 5173 &`

### Key gotchas
- **Node.js 20.x required** — `package.json` specifies `"engines": {"node": "20.x"}`. Use `nvm use 20` before running any commands.
- **No ESLint/TypeScript** — the project is pure JavaScript. `npm run build` (Vite build) is the primary code check.
- **Test command rebuilds frontend** — `npm test` runs `pretest` → `npm run build` before tests. To skip the rebuild when iterating on backend-only changes, run `node --test tests/api.test.js` directly.
- **Tests need env vars** — `NODE_ENV=test DB_PASSWORD=<pw> JWT_API_KEY=<key> npm test`. See `.env.example` for all vars.
- **Database auto-migrates** — `api/db.js` creates/alters tables lazily on first access. Core tables (organisations, leads, companies, etc.) must exist beforehand. The seed scripts (`npm run seed-organisations` and `npm run seed-signup-token`) bootstrap required data.
- **Signup requires access token** — users must provide a valid signup token (seeded via `npm run seed-signup-token`; default token: `KLNY9NIhBFNPGFjw`).
- **`.env` file** — must include `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, and `JWT_API_KEY`. See `.env.example`.
- **All external integrations are optional** — the app runs fully without any third-party API keys (Cloudinary, OpenAI, Anthropic, etc.). Features depending on them gracefully degrade.

### Standard commands
See `README.md` for the full list. Key ones:
- `npm run dev` — Vite dev server with hot reload
- `npm run build` — production build to `dist/`
- `npm test` — run API tests (rebuilds first)
- `npm run test:all` — run all test suites
