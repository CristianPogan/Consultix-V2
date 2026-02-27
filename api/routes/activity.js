import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { resource_type, resource_id, limit: lim, offset: off } = req.query;
    let sql = 'SELECT * FROM activity_log WHERE org_id = $1';
    const params = [orgId];
    let p = 2;
    if (resource_type) { sql += ` AND resource_type = $${p++}`; params.push(resource_type); }
    if (resource_id) { sql += ` AND resource_id = $${p++}`; params.push(resource_id); }
    sql += ' ORDER BY created_at DESC';
    const limit = Math.min(parseInt(lim, 10) || 50, 200);
    const offset = parseInt(off, 10) || 0;
    sql += ` LIMIT $${p++} OFFSET $${p++}`;
    params.push(limit, offset);
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('activity GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { action, resource_type, resource_id, metadata_json } = req.body || {};
    if (!action) return res.status(400).json({ error: 'action required' });
    const result = await query(
      `INSERT INTO activity_log (org_id, user_id, action, resource_type, resource_id, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *`,
      [orgId, req.userId || null, action, resource_type || null, resource_id || null, metadata_json ? JSON.stringify(metadata_json) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('activity POST', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
