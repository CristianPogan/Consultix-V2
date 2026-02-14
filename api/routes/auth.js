import { Router } from 'express';
import { signToken } from '../auth.js';
import { getOrgId } from '../db.js';

const router = Router();

// POST /api/auth/token — exchange API key for JWT
router.post('/token', async (req, res) => {
  try {
    const { apiKey } = req.body || {};
    const expectedKey = process.env.JWT_API_KEY || process.env.API_SECRET;
    if (!expectedKey) {
      return res.status(503).json({ error: 'Auth not configured. Set JWT_API_KEY or API_SECRET.' });
    }
    if (apiKey !== expectedKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    const orgId = await getOrgId();
    if (!orgId) {
      return res.status(503).json({ error: 'No organisation configured. Set DEMO_ORG_ID or ensure organisations table has data.' });
    }
    const token = signToken({ orgId });
    res.json({ token, expiresIn: process.env.JWT_EXPIRES || '24h' });
  } catch (err) {
    console.error('auth token', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
