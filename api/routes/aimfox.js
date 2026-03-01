import { Router } from 'express';
import { getIntegrationCredentials, getApiKeyFromCredentials } from '../db.js';
import {
  checkApiKey,
  getAccounts,
  getAllCampaigns,
  getCampaignById,
  pauseCampaign,
  resumeCampaign,
  addLeadsToCampaign,
  addLeadToCampaign,
  getLeadById,
  searchLeads,
  getConversations,
  getOverallStats,
  getCampaignMetrics,
  getInteractions,
  getRecentLeads,
} from '../services/aimfox-service.js';

const router = Router();

async function requireAimFoxKey(req) {
  const orgId = req.orgId;
  if (!orgId) throw Object.assign(new Error('Organization required'), { status: 401 });
  const row = await getIntegrationCredentials(orgId, 'aimfox');
  const apiKey = getApiKeyFromCredentials(row);
  const campaignId = row?.credentials_json?.campaign_id || row?.credentials_json?.campaignId || null;
  if (!apiKey) {
    if (process.env.AIMFOX_API_KEY) {
      return {
        apiKey: process.env.AIMFOX_API_KEY,
        defaultCampaignId: process.env.AIMFOX_CAMPAIGN_ID || campaignId,
      };
    }
    throw Object.assign(new Error('AimFox not connected. Add your API key in Settings > Integrations.'), { status: 400 });
  }
  return { apiKey, defaultCampaignId: campaignId };
}

// ── Accounts (LinkedIn accounts connected to AimFox) ─────────────────────────

// GET /api/aimfox/accounts
router.get('/accounts', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const data = await getAccounts(apiKey);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Campaigns ─────────────────────────────────────────────────────────────────

// GET /api/aimfox/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const { outreach_type, accepts_profiles } = req.query;
    const data = await getAllCampaigns(apiKey, {
      outreachType: outreach_type || null,
      acceptsProfiles: accepts_profiles !== undefined ? accepts_profiles === 'true' : null,
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/aimfox/campaigns/:id
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const data = await getCampaignById(apiKey, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/aimfox/campaigns/:id/pause
router.post('/campaigns/:id/pause', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const data = await pauseCampaign(apiKey, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/aimfox/campaigns/:id/resume
router.post('/campaigns/:id/resume', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const data = await resumeCampaign(apiKey, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/aimfox/campaigns/:id/metrics
router.get('/campaigns/:id/metrics', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const data = await getCampaignMetrics(apiKey, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/aimfox/campaigns/:id/leads  (add leads to a specific campaign)
router.post('/campaigns/:id/leads', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const { leads } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }
    const data = await addLeadsToCampaign(apiKey, req.params.id, leads);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/aimfox/campaigns/add-leads  (uses default campaign ID from credentials)
router.post('/campaigns/add-leads', async (req, res) => {
  try {
    const { apiKey, defaultCampaignId } = await requireAimFoxKey(req);
    const { leads, campaignId } = req.body;
    const cid = campaignId || defaultCampaignId;
    if (!cid) return res.status(400).json({ error: 'campaignId is required (none configured in settings)' });
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }
    const data = await addLeadsToCampaign(apiKey, cid, leads);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Leads ─────────────────────────────────────────────────────────────────────

// POST /api/aimfox/leads/lookup  (search leads)
router.post('/leads/lookup', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const { leadId, keywords, locations, labels, start, count } = req.body;
    if (leadId) {
      const data = await getLeadById(apiKey, leadId);
      return res.json(data);
    }
    const data = await searchLeads(apiKey, { keywords, locations, labels, start, count });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Conversations / Inbox ─────────────────────────────────────────────────────

// GET /api/aimfox/conversations
router.get('/conversations', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const { in_app, before, campaigns } = req.query;
    const data = await getConversations(apiKey, {
      inApp: in_app !== 'false',
      before: before ? Number(before) : null,
      campaigns: campaigns ? JSON.parse(campaigns) : null,
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/aimfox/conversations  (same endpoint, body-based params for compatibility with frontend)
router.post('/conversations', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const { inApp = true, before, campaigns } = req.body || {};
    const data = await getConversations(apiKey, { inApp, before, campaigns });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────

// POST /api/aimfox/stats
router.post('/stats', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const { campaignIds = [] } = req.body || {};
    const data = await getOverallStats(apiKey, { campaignIds });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Analytics ─────────────────────────────────────────────────────────────────

// GET /api/aimfox/analytics/interactions
router.get('/analytics/interactions', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const { from, to, bucket, account_ids } = req.query;
    const data = await getInteractions(apiKey, {
      from: from ? Number(from) : null,
      to: to ? Number(to) : null,
      bucket: bucket || '1 day',
      accountIds: account_ids ? JSON.parse(account_ids) : [],
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/aimfox/analytics/recent-leads  (equivalent of HeyReach /network)
router.get('/analytics/recent-leads', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const data = await getRecentLeads(apiKey);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/aimfox/network  (alias for recent-leads, for parity with HeyReach /network route)
router.post('/network', async (req, res) => {
  try {
    const { apiKey } = await requireAimFoxKey(req);
    const data = await getRecentLeads(apiKey);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
