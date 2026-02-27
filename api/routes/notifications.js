import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { status } = req.query;
    let sql = 'SELECT * FROM notifications WHERE org_id = $1';
    const params = [orgId];
    if (req.userId) { sql += ' AND (user_id = $2 OR user_id IS NULL)'; params.push(req.userId); }
    if (status === 'unread') { sql += ' AND read = false'; }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('notifications GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      'UPDATE notifications SET read = true WHERE id = $1 AND org_id = $2 RETURNING *',
      [req.params.id, orgId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('notifications PUT/:id/read', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/read-all', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    let sql = 'UPDATE notifications SET read = true WHERE org_id = $1';
    const params = [orgId];
    if (req.userId) { sql += ' AND (user_id = $2 OR user_id IS NULL)'; params.push(req.userId); }
    await query(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error('notifications PUT/read-all', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
