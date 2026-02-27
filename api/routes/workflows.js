import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM workflows WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('workflows GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { title, description, category, trigger_type, steps, enabled } = req.body || {};
    const result = await query(
      `INSERT INTO workflows (org_id, title, description, category, trigger_type, steps, enabled)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING *`,
      [orgId, title || 'Untitled Workflow', description || null, category || null,
       trigger_type || 'manual', steps ? JSON.stringify(steps) : '[]', enabled || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('workflows POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { title, description, category, trigger_type, steps, enabled } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (title !== undefined) { sets.push(`title = $${p++}`); vals.push(title); }
    if (description !== undefined) { sets.push(`description = $${p++}`); vals.push(description); }
    if (category !== undefined) { sets.push(`category = $${p++}`); vals.push(category); }
    if (trigger_type !== undefined) { sets.push(`trigger_type = $${p++}`); vals.push(trigger_type); }
    if (steps !== undefined) { sets.push(`steps = $${p++}::jsonb`); vals.push(JSON.stringify(steps)); }
    if (enabled !== undefined) { sets.push(`enabled = $${p++}`); vals.push(enabled); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE workflows SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('workflows PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM workflows WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('workflows DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
