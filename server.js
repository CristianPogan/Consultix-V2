import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
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

// API routes (must be before static)
app.use('/api/icp-profiles', icpProfilesRouter);
app.use('/api/lead-lists', leadListsRouter);
app.use('/api/companies', companiesRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/prompts', promptsRouter);

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
