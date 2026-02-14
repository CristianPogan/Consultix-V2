import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './api/auth.js';
import authRouter from './api/routes/auth.js';
import icpProfilesRouter from './api/routes/icp-profiles.js';
import leadListsRouter from './api/routes/lead-lists.js';
import companiesRouter from './api/routes/companies.js';
import leadsRouter from './api/routes/leads.js';
import promptsRouter from './api/routes/prompts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Auth route (public) — POST /api/auth/token exchanges apiKey for JWT
app.use('/api/auth', authRouter);

// Protected API routes — require Authorization: Bearer <token>
app.use('/api/icp-profiles', authMiddleware, icpProfilesRouter);
app.use('/api/lead-lists', authMiddleware, leadListsRouter);
app.use('/api/companies', authMiddleware, companiesRouter);
app.use('/api/leads', authMiddleware, leadsRouter);
app.use('/api/prompts', authMiddleware, promptsRouter);

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: serve index.html for any non-file requests (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
