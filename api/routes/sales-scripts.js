import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM sales_scripts WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('sales-scripts GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { name, type, sections_json, audience, project_id } = req.body || {};
    const result = await query(
      `INSERT INTO sales_scripts (org_id, project_id, name, type, sections_json, audience)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6) RETURNING *`,
      [orgId, project_id || null, name || 'Untitled Script', type || 'cold_call',
       sections_json ? JSON.stringify(sections_json) : '{}', audience || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('sales-scripts POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { type, audience, product } = req.body || {};
    res.json({
      generated: true, type: type || 'cold_call',
      sections: [
        { title: 'Opening', content: `Hi {{name}}, I noticed your work at {{company}}...` },
        { title: 'Discovery', content: `What are the biggest challenges you face with ${product || 'your current process'}?` },
        { title: 'Value Proposition', content: `We help ${audience || 'companies like yours'} achieve...` },
        { title: 'Close', content: `Would it make sense to schedule 15 minutes to explore this further?` },
      ],
    });
  } catch (err) {
    console.error('sales-scripts/generate POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { name, type, sections_json, audience } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name); }
    if (type !== undefined) { sets.push(`type = $${p++}`); vals.push(type); }
    if (sections_json !== undefined) { sets.push(`sections_json = $${p++}::jsonb`); vals.push(JSON.stringify(sections_json)); }
    if (audience !== undefined) { sets.push(`audience = $${p++}`); vals.push(audience); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE sales_scripts SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('sales-scripts PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM sales_scripts WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('sales-scripts DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
