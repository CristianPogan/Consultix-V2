# PIPELINE.AI — Lead Generation Agent

A React-based lead generation platform with a 5-step workflow: Define ICP → Discover → Enrich → Personalize → Outreach.

## Local Development

```bash
npm install
npm run dev      # Start Vite dev server (with hot reload)
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
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
├── pipeline-demo.jsx    # Main React app (unchanged)
├── src/
│   └── main.jsx         # React entry point
├── index.html           # HTML entry for Vite
├── vite.config.js      # Vite build configuration
├── server.js            # Express server (Heroku production)
├── Procfile             # Heroku process definition
├── package.json
└── README.md
```
