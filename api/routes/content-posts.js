import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { status, platform } = req.query;
    let sql = 'SELECT * FROM content_posts WHERE org_id = $1';
    const params = [orgId];
    let p = 2;
    if (status) { sql += ` AND status = $${p++}`; params.push(status); }
    if (platform) { sql += ` AND platform = $${p++}`; params.push(platform); }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('content-posts GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { platform, title, body_text, format, slides, status, scheduled_at, project_id } = req.body || {};
    const result = await query(
      `INSERT INTO content_posts (org_id, project_id, platform, title, body_text, format, slides, status, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10) RETURNING *`,
      [orgId, project_id || null, platform || 'linkedin', title || null, body_text || '',
       format || 'text', slides ? JSON.stringify(slides) : null, status || 'draft', scheduled_at || null, req.userId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('content-posts POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { title, body_text, format, slides, status, scheduled_at, platform, stats: postStats } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (title !== undefined) { sets.push(`title = $${p++}`); vals.push(title); }
    if (body_text !== undefined) { sets.push(`body_text = $${p++}`); vals.push(body_text); }
    if (format !== undefined) { sets.push(`format = $${p++}`); vals.push(format); }
    if (slides !== undefined) { sets.push(`slides = $${p++}::jsonb`); vals.push(JSON.stringify(slides)); }
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (scheduled_at !== undefined) { sets.push(`scheduled_at = $${p++}`); vals.push(scheduled_at); }
    if (platform !== undefined) { sets.push(`platform = $${p++}`); vals.push(platform); }
    if (postStats !== undefined) { sets.push(`stats = $${p++}::jsonb`); vals.push(JSON.stringify(postStats)); }
    if (status === 'published') sets.push('published_at = now()');
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE content_posts SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('content-posts PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM content_posts WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('content-posts DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
