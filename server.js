import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware } from './api/auth.js';
import { ensureProjectStatsColumns, ensureCRMPipelineColumns, ensureProjectSettingsTable, ensureDiscountCodesReady } from './api/db.js';
import authRouter from './api/routes/auth.js';
import icpProfilesRouter from './api/routes/icp-profiles.js';
import leadListsRouter from './api/routes/lead-lists.js';
import companiesRouter from './api/routes/companies.js';
import leadsRouter from './api/routes/leads.js';
import promptsRouter from './api/routes/prompts.js';
import leadGenerationRouter from './api/routes/lead-generation.js';
import settingsRouter from './api/routes/settings.js';
import integrationsRouter from './api/routes/integrations.js';
import calendarRouter from './api/routes/calendar.js';
import statsRouter from './api/routes/stats.js';
import organisationsRouter from './api/routes/organisations.js';
import crmRouter from './api/routes/crm.js';
import aiSdrRouter from './api/routes/ai-sdr.js';
import aiCouncilRouter from './api/routes/ai-council.js';
import conversationsRouter from './api/routes/conversations.js';
import messagesRouter from './api/routes/messages.js';
import activityRouter from './api/routes/activity.js';
import auditRouter from './api/routes/audit.js';
import implementationRouter from './api/routes/implementation.js';
import workflowsRouter from './api/routes/workflows.js';
import messagingCopiesRouter from './api/routes/messaging-copies.js';
import campaignsRouter from './api/routes/campaigns.js';
import nichesRouter from './api/routes/niches.js';
import salesScriptsRouter from './api/routes/sales-scripts.js';
import callAnalysesRouter from './api/routes/call-analyses.js';
import contentPostsRouter from './api/routes/content-posts.js';
import trackedCompetitorsRouter from './api/routes/tracked-competitors.js';
import communityRouter from './api/routes/community.js';
import assistantRouter from './api/routes/assistant.js';
import billingRouter from './api/routes/billing.js';
import notificationsRouter from './api/routes/notifications.js';
import adminRouter from './api/routes/admin.js';
import heyreachRouter from './api/routes/heyreach.js';
import instantlyRouter from './api/routes/instantly.js';
import publicSurveyRouter from './api/routes/public-survey.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());

// Public routes (no auth required)
app.use('/api/auth', authRouter);
app.use('/api/public/surveys', publicSurveyRouter);

// Serve public survey page
app.get('/survey/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'survey.html'));
});
app.get('/survey/:id/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'survey.html'));
});

// Protected API routes — require Authorization: Bearer <token>
app.use('/api/icp-profiles', authMiddleware, icpProfilesRouter);
app.use('/api/lead-lists', authMiddleware, leadListsRouter);
app.use('/api/companies', authMiddleware, companiesRouter);
app.use('/api/leads', authMiddleware, leadsRouter);
app.use('/api/prompts', authMiddleware, promptsRouter);
app.use('/api/lead-generation', authMiddleware, leadGenerationRouter);
app.use('/api/settings', authMiddleware, settingsRouter);
app.use('/api/integrations', authMiddleware, integrationsRouter);
app.use('/api/calendar', authMiddleware, calendarRouter);
app.use('/api/stats', authMiddleware, statsRouter);
app.use('/api/organisations', authMiddleware, organisationsRouter);
app.use('/api/crm', authMiddleware, crmRouter);
app.use('/api/ai-sdr', authMiddleware, aiSdrRouter);
app.use('/api/ai-council', authMiddleware, aiCouncilRouter);
app.use('/api/conversations', authMiddleware, conversationsRouter);
app.use('/api/messages', authMiddleware, messagesRouter);
app.use('/api/activity', authMiddleware, activityRouter);
app.use('/api/audit', authMiddleware, auditRouter);
app.use('/api/implementation', authMiddleware, implementationRouter);
app.use('/api/workflows', authMiddleware, workflowsRouter);
app.use('/api/messaging-copies', authMiddleware, messagingCopiesRouter);
app.use('/api/campaigns', authMiddleware, campaignsRouter);
app.use('/api/niches', authMiddleware, nichesRouter);
app.use('/api/sales-scripts', authMiddleware, salesScriptsRouter);
app.use('/api/call-analyses', authMiddleware, callAnalysesRouter);
app.use('/api/content-posts', authMiddleware, contentPostsRouter);
app.use('/api/tracked-competitors', authMiddleware, trackedCompetitorsRouter);
app.use('/api/community', authMiddleware, communityRouter);
app.use('/api/assistant', authMiddleware, assistantRouter);
app.use('/api/billing', authMiddleware, billingRouter);
app.use('/api/notifications', authMiddleware, notificationsRouter);
app.use('/api/admin', authMiddleware, adminRouter);
app.use('/api/heyreach', authMiddleware, heyreachRouter);
app.use('/api/instantly', authMiddleware, instantlyRouter);

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback: serve index.html for any non-file requests (client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  ensureProjectStatsColumns().catch(() => {});
  ensureCRMPipelineColumns().catch(() => {});
  ensureProjectSettingsTable().catch(() => {});
  ensureDiscountCodesReady().catch(() => {});
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export { app };
