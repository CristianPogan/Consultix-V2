import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM niches WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('niches GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { name, audience, market_size, competition, demand, avg_deal, positioning, score } = req.body || {};
    const result = await query(
      `INSERT INTO niches (org_id, name, audience, market_size, competition, demand, avg_deal, positioning, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [orgId, name || 'Untitled Niche', audience || null, market_size || null, competition || null,
       demand || null, avg_deal || null, positioning || null, score || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('niches POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/research', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { niche, geo, keywords } = req.body || {};
    if (!niche) return res.status(400).json({ error: 'niche required' });
    res.json({
      niche, geo: geo || 'Global',
      keywords: keywords || [],
      results: { market_size: 'Researching...', competition: 'Medium', demand: 'High' },
      status: 'completed',
    });
  } catch (err) {
    console.error('niches/research POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const fields = ['name', 'audience', 'market_size', 'competition', 'demand', 'avg_deal', 'positioning', 'score'];
    const sets = []; const vals = []; let p = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${p++}`); vals.push(req.body[f]); }
    }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE niches SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('niches PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM niches WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('niches DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
