import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

let _tableReady = false;
async function ensurePrototypeOutputsTable() {
  if (_tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS prototype_outputs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      project_id TEXT,
      opportunity_id TEXT NOT NULL,
      output_type TEXT NOT NULL,
      content TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_prototype_outputs_org ON prototype_outputs(org_id)').catch(() => {});
  _tableReady = true;
}

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensurePrototypeOutputsTable();
    let sql = 'SELECT * FROM prototype_outputs WHERE org_id = $1';
    const params = [orgId];
    let p = 2;
    const { project_id } = req.query;
    if (project_id) { sql += ` AND project_id = $${p++}`; params.push(project_id); }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('prototypes GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    await ensurePrototypeOutputsTable();
    const { project_id, opportunity_id, output_type, content } = req.body || {};
    if (!opportunity_id) return res.status(400).json({ error: 'opportunity_id required' });
    if (!output_type) return res.status(400).json({ error: 'output_type required' });
    const result = await query(
      `INSERT INTO prototype_outputs (org_id, project_id, opportunity_id, output_type, content)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [orgId, project_id || null, opportunity_id, output_type, content || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('prototypes generate POST', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
