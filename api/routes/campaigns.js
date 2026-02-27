import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT * FROM outreach_campaigns WHERE org_id = $1 ORDER BY created_at DESC`, [orgId]
    );
    res.json(result.rows.map(r => ({
      id: r.id, name: r.campaign_name, campaign_name: r.campaign_name,
      status: r.status, platform: r.platform,
      sent: r.emails_sent || 0, opened: r.emails_opened || 0, replied: r.replies || 0,
      created_at: r.created_at,
    })));
  } catch (err) {
    console.error('campaigns GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM outreach_campaigns WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const r = result.rows[0];
    res.json({ id: r.id, name: r.campaign_name, campaign_name: r.campaign_name, status: r.status, platform: r.platform,
      sent: r.emails_sent || 0, opened: r.emails_opened || 0, replied: r.replies || 0, created_at: r.created_at });
  } catch (err) {
    console.error('campaigns GET/:id', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { campaign_name, platform, list_id, status } = req.body || {};
    const result = await query(
      `INSERT INTO outreach_campaigns (org_id, campaign_name, platform, list_id, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [orgId, campaign_name || 'Untitled Campaign', platform || 'email', list_id || null, status || 'draft']
    );
    const r = result.rows[0];
    res.status(201).json({ id: r.id, name: r.campaign_name, campaign_name: r.campaign_name, status: r.status,
      platform: r.platform, sent: 0, opened: 0, replied: 0, created_at: r.created_at });
  } catch (err) {
    console.error('campaigns POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { campaign_name, status, platform } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (campaign_name !== undefined) { sets.push(`campaign_name = $${p++}`); vals.push(campaign_name); }
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (platform !== undefined) { sets.push(`platform = $${p++}`); vals.push(platform); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE outreach_campaigns SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('campaigns PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM outreach_campaigns WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('campaigns DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
