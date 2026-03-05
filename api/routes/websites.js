import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

let _tableReady = false;
async function ensureWebsitesTable() {
  if (_tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS websites (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      status TEXT DEFAULT 'draft',
      template TEXT,
      prompt TEXT,
      generated_html TEXT,
      refinements JSONB DEFAULT '[]',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_websites_org ON websites(org_id)').catch(() => {});
  _tableReady = true;
}

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureWebsitesTable();
    const result = await query('SELECT * FROM websites WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('websites GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    await ensureWebsitesTable();
    const { name, template, prompt } = req.body || {};
    const result = await query(
      `INSERT INTO websites (org_id, name, template, prompt)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [orgId, name || 'Untitled', template || null, prompt || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('websites POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureWebsitesTable();
    const { name, url, status, template, prompt, generated_html, refinements } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name); }
    if (url !== undefined) { sets.push(`url = $${p++}`); vals.push(url); }
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (template !== undefined) { sets.push(`template = $${p++}`); vals.push(template); }
    if (prompt !== undefined) { sets.push(`prompt = $${p++}`); vals.push(prompt); }
    if (generated_html !== undefined) { sets.push(`generated_html = $${p++}`); vals.push(generated_html); }
    if (refinements !== undefined) { sets.push(`refinements = $${p++}::jsonb`); vals.push(JSON.stringify(refinements)); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(
      `UPDATE websites SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('websites PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureWebsitesTable();
    const result = await query('DELETE FROM websites WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('websites DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureWebsitesTable();
    const result = await query(
      `UPDATE websites SET status = 'live', published_at = now(), updated_at = now()
       WHERE id = $1 AND org_id = $2 RETURNING *`,
      [req.params.id, orgId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('websites publish POST', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
