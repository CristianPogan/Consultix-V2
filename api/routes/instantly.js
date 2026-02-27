import { Router } from 'express';
import { getIntegrationCredentials, getApiKeyFromCredentials } from '../db.js';
import {
  listCampaigns,
  getCampaign,
  activateCampaign,
  pauseCampaign,
  getCampaignAnalytics,
  getCampaignAnalyticsOverview,
  createLead,
  getLead,
  listLeads,
  listAccounts,
  listEmails,
  getUnreadCount,
  listLeadLists,
  createLeadList,
} from '../services/instantly-service.js';

const router = Router();

async function requireInstantlyKey(req) {
  const orgId = req.orgId;
  if (!orgId) throw Object.assign(new Error('Organization required'), { status: 401 });
  const row = await getIntegrationCredentials(orgId, 'instantly');
  const apiKey = getApiKeyFromCredentials(row);
  const campaignId = row?.credentials_json?.campaign_id || row?.credentials_json?.campaignId || null;
  if (!apiKey) {
    if (process.env.INSTANTLY_API_KEY) {
      return {
        apiKey: process.env.INSTANTLY_API_KEY,
        defaultCampaignId: process.env.INSTANTLY_CAMPAIGN_ID || campaignId,
      };
    }
    throw Object.assign(new Error('Instantly not connected. Add your API key in Settings > Integrations.'), { status: 400 });
  }
  return { apiKey, defaultCampaignId: campaignId };
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

// GET /api/instantly/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const status = req.query.status !== undefined ? parseInt(req.query.status) : undefined;
    const data = await listCampaigns(apiKey, { limit, skip, status });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/instantly/campaigns/:id
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const data = await getCampaign(apiKey, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/instantly/campaigns/:id/activate
router.post('/campaigns/:id/activate', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const data = await activateCampaign(apiKey, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/instantly/campaigns/:id/pause
router.post('/campaigns/:id/pause', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const data = await pauseCampaign(apiKey, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /api/instantly/analytics
router.get('/analytics', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const { id } = req.query;
    const ids = req.query.ids ? (Array.isArray(req.query.ids) ? req.query.ids : [req.query.ids]) : undefined;
    const data = await getCampaignAnalytics(apiKey, { id, ids });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/instantly/analytics/overview
router.get('/analytics/overview', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const { id, start_date, end_date, campaign_status } = req.query;
    const ids = req.query.ids ? (Array.isArray(req.query.ids) ? req.query.ids : [req.query.ids]) : undefined;
    const data = await getCampaignAnalyticsOverview(apiKey, {
      id, ids, start_date, end_date,
      campaign_status: campaign_status !== undefined ? parseInt(campaign_status) : undefined,
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Leads ─────────────────────────────────────────────────────────────────────

// POST /api/instantly/leads  (add lead to campaign)
router.post('/leads', async (req, res) => {
  try {
    const { apiKey, defaultCampaignId } = await requireInstantlyKey(req);
    const { email, campaign, first_name, last_name, company_name, personalization, ...custom } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const cid = campaign || defaultCampaignId;
    if (!cid) return res.status(400).json({ error: 'campaign is required (none configured in settings)' });
    const data = await createLead(apiKey, { email, campaign: cid, first_name, last_name, company_name, personalization, ...custom });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/instantly/leads/bulk  (add multiple leads)
router.post('/leads/bulk', async (req, res) => {
  try {
    const { apiKey, defaultCampaignId } = await requireInstantlyKey(req);
    const { leads, campaign } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) return res.status(400).json({ error: 'leads array is required' });
    const cid = campaign || defaultCampaignId;
    if (!cid) return res.status(400).json({ error: 'campaign is required (none configured in settings)' });
    const results = [];
    for (const lead of leads) {
      try {
        const data = await createLead(apiKey, {
          email: lead.email,
          campaign: cid,
          first_name: lead.first_name || lead.firstName,
          last_name: lead.last_name || lead.lastName,
          company_name: lead.company_name || lead.company,
          personalization: lead.personalization || lead.personalizedMessage || '',
        });
        results.push({ email: lead.email, success: true, data });
      } catch (e) {
        results.push({ email: lead.email, success: false, error: e.message });
      }
    }
    res.json({ success: true, results });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/instantly/leads/list  (paginated lead list)
router.post('/leads/list', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const { campaign_id, limit, starting_after, email } = req.body;
    const data = await listLeads(apiKey, { campaign_id, limit, starting_after, email });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/instantly/leads/:id
router.get('/leads/:id', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const data = await getLead(apiKey, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Accounts ──────────────────────────────────────────────────────────────────

// GET /api/instantly/accounts
router.get('/accounts', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const data = await listAccounts(apiKey, { limit, skip });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Emails (Unibox) ──────────────────────────────────────────────────────────

// GET /api/instantly/emails
router.get('/emails', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    const { campaign_id, is_read } = req.query;
    const data = await listEmails(apiKey, { limit, skip, campaign_id, is_read: is_read !== undefined ? is_read === 'true' : undefined });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/instantly/emails/unread/count
router.get('/emails/unread/count', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const data = await getUnreadCount(apiKey);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Lead Lists ────────────────────────────────────────────────────────────────

// GET /api/instantly/lead-lists
router.get('/lead-lists', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    const data = await listLeadLists(apiKey, { limit, skip });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/instantly/lead-lists
router.post('/lead-lists', async (req, res) => {
  try {
    const { apiKey } = await requireInstantlyKey(req);
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const data = await createLeadList(apiKey, name);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
