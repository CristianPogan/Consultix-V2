import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './api/auth.js';
import { ensureProjectStatsColumns } from './api/db.js';
import authRouter from './api/routes/auth.js';
import icpProfilesRouter from './api/routes/icp-profiles.js';
import leadListsRouter from './api/routes/lead-lists.js';
import companiesRouter from './api/routes/companies.js';
import leadsRouter from './api/routes/leads.js';
import promptsRouter from './api/routes/prompts.js';
import leadGenerationRouter from './api/routes/lead-generation.js';
import settingsRouter from './api/routes/settings.js';
import integrationsRouter from './api/routes/integrations.js';
import statsRouter from './api/routes/stats.js';
import organisationsRouter from './api/routes/organisations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Auth route (public) — POST /api/auth/token exchanges apiKey for JWT
app.use('/api/auth', authRouter);

// Protected API routes — require Authorization: Bearer <token>
app.use('/api/icp-profiles', authMiddleware, icpProfilesRouter);
app.use('/api/lead-lists', authMiddleware, leadListsRouter);
app.use('/api/companies', authMiddleware, companiesRouter);
app.use('/api/leads', authMiddleware, leadsRouter);
app.use('/api/prompts', authMiddleware, promptsRouter);
app.use('/api/lead-generation', authMiddleware, leadGenerationRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/integrations', authMiddleware, integrationsRouter);
app.use('/api/stats', authMiddleware, statsRouter);
app.use('/api/organisations', authMiddleware, organisationsRouter);

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: serve index.html for any non-file requests (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  ensureProjectStatsColumns().catch(() => {});
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
