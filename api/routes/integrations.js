import { Router } from 'express';
import {
  listIntegrationCredentials,
  getIntegrationCredentials,
  saveIntegrationCredentials,
} from '../db.js';

const router = Router();

// GET /api/integrations - List all integration status for org
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      return res.status(401).json({ error: 'Organization required' });
    }

    const rows = await listIntegrationCredentials(orgId);
    const statusMap = Object.fromEntries(rows.map((r) => [r.integration_key, r.connected]));
    res.json({ integrations: statusMap });
  } catch (err) {
    console.error('List integrations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/:key - Get credential status for a single integration (returns connected, no secret values)
router.get('/:key', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { key } = req.params;
    if (!orgId || !key) {
      return res.status(400).json({ error: 'Organization and integration key required' });
    }

    const row = await getIntegrationCredentials(orgId, key);
    if (!row) {
      return res.json({ integration_key: key, connected: false, credentials_json: {} });
    }
    res.json({
      integration_key: row.integration_key,
      connected: row.connected,
      credentials_json: row.credentials_json,
    });
  } catch (err) {
    console.error('Get integration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/:key - Save credentials for an integration
router.post('/:key', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { key } = req.params;
    const { credentials } = req.body;

    if (!orgId || !key) {
      return res.status(400).json({ error: 'Organization and integration key required' });
    }

    const creds = credentials && typeof credentials === 'object' ? credentials : {};
    await saveIntegrationCredentials(orgId, key, creds);
    res.json({ integration_key: key, connected: true });
  } catch (err) {
    console.error('Save integration error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
