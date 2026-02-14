# PIPELINE.AI — Lead Generation Agent

A React-based lead generation platform with a 5-step workflow: Define ICP → Discover → Enrich → Personalize → Outreach.

## Local Development

```bash
npm install
npm run dev      # Start Vite dev server (with hot reload)
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
npm start        # Run Express server (serves dist/ + API)
```

### API & Database

The app includes REST APIs that read/write to PostgreSQL:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/icp-profiles` | GET, POST | ICP profile CRUD |
| `/api/icp-profiles/default` | GET | Default ICP form values |
| `/api/lead-lists` | GET, POST | Lead lists |
| `/api/companies` | GET, POST | Companies (discovery) |
| `/api/leads` | GET, POST, PUT | Leads / contacts |
| `/api/prompts` | GET, POST | Saved personalization prompts |
| `/api/prompts/defaults` | GET | Built-in prompt templates |

Set `DATABASE_URL` (Heroku Postgres) or `DB_HOST`, `DB_USER`, `DB_PASSWORD` etc. See `.env.example`.

### Tests

```bash
NODE_ENV=test DB_PASSWORD=your_password npm test
```

## Heroku Deployment

### Prerequisites

- [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli) installed
- Heroku account
- Git repository initialized

### Deploy Steps

1. **Login to Heroku**
   ```bash
   heroku login
   ```

2. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```
   Or let Heroku generate a name:
   ```bash
   heroku create
   ```

3. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

4. **Open the app**
   ```bash
   heroku open
   ```

### Build Process

On each deploy, Heroku will:

1. Detect Node.js from `package.json`
2. Run `npm install` (including devDependencies for the build phase)
3. Run `heroku-postbuild` → `npm run build` (Vite builds the React app to `dist/`)
4. Start the web dyno with `node server.js` (Procfile)

The Express server serves the built static files from `dist/` and supports client-side routing via SPA fallback.

### Project Structure

```
├── src/
│   ├── pipeline-code.jsx  # Main React app
│   ├── main.jsx           # React entry point
│   └── api.js             # API client
├── api/
│   ├── db.js              # PostgreSQL pool
│   └── routes/            # API route handlers
├── index.html
├── vite.config.js
├── server.js              # Express server (API + static)
├── Procfile
├── tests/api.test.js      # API unit tests
└── package.json
```
