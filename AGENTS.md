# AGENTS.md

## Cursor Cloud specific instructions

### Architecture
Single-product monolith: React 18 + Vite frontend, Express + Node.js backend, PostgreSQL database.
- Backend serves API on port 5001 (`node server.js`)
- Vite dev server on port 5173, proxies `/api` to the backend on port 5001
- All data scoped by `org_id` from JWT

### Required env vars for local development
Override system-level env vars since the VM may have pre-existing remote DB credentials.
Set `DATABASE_URL=""` to force individual var path in `api/db.js`. Then set `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` to point to local Postgres, and set `JWT_SECRET` and `JWT_API_KEY` to any non-empty values. See `.env.example` for the full list.

### Starting services
1. Start PostgreSQL: `sudo pg_ctlcluster 16 main start`
2. Start backend: `node server.js` (port 5001)
3. Start frontend: `npx vite --host 0.0.0.0 --port 5173`

### Running tests
```bash
NODE_ENV=test npm test
```
Tests require a running PostgreSQL with the schema initialized and `JWT_API_KEY` set. The `pretest` script runs `npm run build` (Vite build) before tests since they import `server.js` which serves `dist/`.

### Gotchas
- The VM has pre-existing `DATABASE_URL`, `DB_HOST`, `DB_USER`, `DB_PASSWORD` env vars pointing to a remote Heroku database. You **must** override these to use local Postgres (set `DATABASE_URL=""` to force individual var path in `api/db.js`).
- `db.js` uses `ssl: { rejectUnauthorized: false }` for all connections. Local Postgres on Ubuntu 24.04 handles this gracefully (SSL negotiation falls back to non-SSL).
- No ESLint/linting config exists in this project.
- The `package.json` requires `node: "20.x"` but Node 22 works fine.
- Many tables are auto-created by route handlers on first access. Core tables (`organisations`, `companies`, `leads`, `lead_lists`, `icp_profiles`, `messaging_copies`) must be created beforehand.
- Signup requires an access token; the default token `KLNY9NIhBFNPGFjw` is auto-seeded in the `signup_access_tokens` table by `db.js`.
- At least one row must exist in the `organisations` table for the auth token exchange (`/api/auth/token`) to work.
