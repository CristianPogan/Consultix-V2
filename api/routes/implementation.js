import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/phases', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { project_id } = req.query;
    let sql = 'SELECT * FROM implementation_phases WHERE org_id = $1';
    const params = [orgId];
    if (project_id) { sql += ' AND project_id = $2'; params.push(project_id); }
    sql += ' ORDER BY sort_order ASC, created_at ASC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('implementation/phases GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/phases', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { project_id, title, description, sort_order, status, due_date, tasks } = req.body || {};
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const result = await query(
      `INSERT INTO implementation_phases (org_id, project_id, sort_order, title, description, status, due_date, tasks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING *`,
      [orgId, project_id, sort_order || 0, title || 'Untitled Phase', description || null,
       status || 'pending', due_date || null, tasks ? JSON.stringify(tasks) : '[]']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('implementation/phases POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/phases/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { title, description, sort_order, status, due_date, tasks } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (title !== undefined) { sets.push(`title = $${p++}`); vals.push(title); }
    if (description !== undefined) { sets.push(`description = $${p++}`); vals.push(description); }
    if (sort_order !== undefined) { sets.push(`sort_order = $${p++}`); vals.push(sort_order); }
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (due_date !== undefined) { sets.push(`due_date = $${p++}`); vals.push(due_date); }
    if (tasks !== undefined) { sets.push(`tasks = $${p++}::jsonb`); vals.push(JSON.stringify(tasks)); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE implementation_phases SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('implementation/phases PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/phases/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM implementation_phases WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('implementation/phases DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
