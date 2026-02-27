import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM call_analyses WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('call-analyses GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM call_analyses WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('call-analyses GET/:id', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { name, transcript_text, source, prospect, duration, score, outcome, feedback } = req.body || {};
    if (!transcript_text && !name) return res.status(400).json({ error: 'transcript_text or name required' });
    const result = await query(
      `INSERT INTO call_analyses (org_id, name, transcript_text, source, prospect, duration, score, outcome, feedback)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [orgId, name || 'Untitled Analysis', transcript_text || '', source || 'manual',
       prospect || null, duration || null, score || null, outcome || null, feedback || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('call-analyses POST', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
