import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM messaging_copies WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('messaging-copies GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { name, category, content, subject, audience, tone, project_id } = req.body || {};
    const result = await query(
      `INSERT INTO messaging_copies (org_id, project_id, name, category, content, subject, audience, tone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orgId, project_id || null, name || 'Untitled', category || null, content || '', subject || null, audience || null, tone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('messaging-copies POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { category, audience, tone, context } = req.body || {};
    res.json({
      generated: true,
      category: category || 'general',
      content: `Generated ${category || 'general'} copy for ${audience || 'target audience'} in ${tone || 'professional'} tone.`,
      audience, tone,
    });
  } catch (err) {
    console.error('messaging-copies/generate POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { name, category, content, subject, audience, tone } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name); }
    if (category !== undefined) { sets.push(`category = $${p++}`); vals.push(category); }
    if (content !== undefined) { sets.push(`content = $${p++}`); vals.push(content); }
    if (subject !== undefined) { sets.push(`subject = $${p++}`); vals.push(subject); }
    if (audience !== undefined) { sets.push(`audience = $${p++}`); vals.push(audience); }
    if (tone !== undefined) { sets.push(`tone = $${p++}`); vals.push(tone); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE messaging_copies SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('messaging-copies PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM messaging_copies WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('messaging-copies DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
