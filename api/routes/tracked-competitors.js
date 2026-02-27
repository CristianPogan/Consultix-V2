import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM tracked_competitors WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('tracked-competitors GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { platform, name, handle, profile_url, followers, avg_engagement } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await query(
      `INSERT INTO tracked_competitors (org_id, platform, name, handle, profile_url, followers, avg_engagement)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [orgId, platform || 'linkedin', name, handle || null, profile_url || null, followers || null, avg_engagement || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('tracked-competitors POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM tracked_competitors WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('tracked-competitors DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
