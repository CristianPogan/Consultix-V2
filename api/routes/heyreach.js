import { Router } from 'express';
import { getIntegrationCredentials, getApiKeyFromCredentials } from '../db.js';
import {
  getAllCampaigns,
  getCampaignById,
  pauseCampaign,
  resumeCampaign,
  addLeadsToCampaign,
  getLead,
  getConversations,
  getOverallStats,
  getAllLists,
  createEmptyList,
  getMyNetworkForSender,
} from '../services/heyreach-service.js';

const router = Router();

async function requireHeyReachKey(req) {
  const orgId = req.orgId;
  if (!orgId) throw Object.assign(new Error('Organization required'), { status: 401 });
  const row = await getIntegrationCredentials(orgId, 'heyreach');
  const apiKey = getApiKeyFromCredentials(row);
  const campaignId = row?.credentials_json?.campaign_id || row?.credentials_json?.campaignId || null;
  if (!apiKey) {
    if (process.env.HEYREACH_API_KEY) {
      return {
        apiKey: process.env.HEYREACH_API_KEY,
        defaultCampaignId: process.env.HEYREACH_CAMPAIGN_ID || campaignId,
      };
    }
    throw Object.assign(new Error('HeyReach not connected. Add your API key in Settings > Integrations.'), { status: 400 });
  }
  return { apiKey, defaultCampaignId: campaignId };
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

// GET /api/heyreach/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const data = await getAllCampaigns(apiKey, { offset, limit });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/heyreach/campaigns/:id
router.get('/campaigns/:id', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const data = await getCampaignById(apiKey, req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/heyreach/campaigns/:id/pause
router.post('/campaigns/:id/pause', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const data = await pauseCampaign(apiKey, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/heyreach/campaigns/:id/resume
router.post('/campaigns/:id/resume', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const data = await resumeCampaign(apiKey, req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/heyreach/campaigns/:id/leads
router.post('/campaigns/:id/leads', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
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

// POST /api/heyreach/campaigns/add-leads  (uses default campaign ID from credentials)
router.post('/campaigns/add-leads', async (req, res) => {
  try {
    const { apiKey, defaultCampaignId } = await requireHeyReachKey(req);
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

// POST /api/heyreach/leads/lookup
router.post('/leads/lookup', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const { profileUrl } = req.body;
    if (!profileUrl) return res.status(400).json({ error: 'profileUrl required' });
    const data = await getLead(apiKey, profileUrl);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Conversations / Inbox ─────────────────────────────────────────────────────

// POST /api/heyreach/conversations
router.post('/conversations', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const { offset = 0, limit = 50, campaignId, linkedInAccountId } = req.body;
    const data = await getConversations(apiKey, { offset, limit, campaignId, linkedInAccountId });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Stats ─────────────────────────────────────────────────────────────────────

// POST /api/heyreach/stats
router.post('/stats', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const { campaignIds = [], accountIds = [] } = req.body || {};
    const data = await getOverallStats(apiKey, { campaignIds, accountIds });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Lists ─────────────────────────────────────────────────────────────────────

// GET /api/heyreach/lists
router.get('/lists', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 50;
    const data = await getAllLists(apiKey, { offset, limit });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/heyreach/lists
router.post('/lists', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const { name, listType } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const data = await createEmptyList(apiKey, name, listType);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Network ───────────────────────────────────────────────────────────────────

// POST /api/heyreach/network
router.post('/network', async (req, res) => {
  try {
    const { apiKey } = await requireHeyReachKey(req);
    const { senderId } = req.body;
    if (!senderId) return res.status(400).json({ error: 'senderId required' });
    const data = await getMyNetworkForSender(apiKey, senderId);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
