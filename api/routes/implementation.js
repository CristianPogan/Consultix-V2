import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

let _implTableReady = false;
async function ensureImplementationPhasesTable() {
  if (_implTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS implementation_phases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      sort_order INT DEFAULT 0,
      title TEXT NOT NULL DEFAULT 'Untitled Phase',
      description TEXT,
      status TEXT DEFAULT 'not_started',
      timeline TEXT,
      cost TEXT,
      color TEXT,
      due_date TEXT,
      tasks JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_impl_phases_org ON implementation_phases(org_id)').catch(() => {});
  await query('CREATE INDEX IF NOT EXISTS idx_impl_phases_project ON implementation_phases(org_id, project_id)').catch(() => {});
  const cols = [
    { name: 'timeline', type: 'TEXT' },
    { name: 'cost', type: 'TEXT' },
    { name: 'color', type: 'TEXT' },
  ];
  for (const c of cols) {
    await query(`ALTER TABLE implementation_phases ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`).catch(() => {});
  }
  _implTableReady = true;
}

router.get('/phases', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureImplementationPhasesTable();
    const { project_id } = req.query;
    let sql, params;
    if (project_id) {
      sql = 'SELECT * FROM implementation_phases WHERE project_id = $1';
      params = [String(project_id)];
    } else {
      sql = 'SELECT * FROM implementation_phases WHERE org_id = $1';
      params = [orgId];
    }
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
    await ensureImplementationPhasesTable();
    const { project_id, title, description, sort_order, status, due_date, timeline, cost, color, tasks } = req.body || {};
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const result = await query(
      `INSERT INTO implementation_phases (org_id, project_id, sort_order, title, description, status, due_date, timeline, cost, color, tasks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) RETURNING *`,
      [orgId, project_id, sort_order || 0, title || 'Untitled Phase', description || null,
       status || 'not_started', due_date || null, timeline || null, cost || null, color || null,
       tasks ? JSON.stringify(tasks) : '[]']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('implementation/phases POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/phases/bulk', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    await ensureImplementationPhasesTable();
    const { project_id, phases } = req.body || {};
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    if (!Array.isArray(phases) || phases.length === 0) return res.status(400).json({ error: 'phases array required' });

    const projectIdStr = String(project_id);
    const projRow = await query(
      'SELECT id, org_id FROM organisations WHERE id::text = $1 OR id = $1::uuid LIMIT 1',
      [projectIdStr]
    ).catch(() => ({ rows: [] }));
    if (!projRow?.rows?.length) {
      return res.status(400).json({ error: 'Invalid project_id: project not found. Select a valid project from the sidebar.' });
    }
    const projectOrgId = projRow.rows[0].org_id;
    // FK implementation_phases_project_id_fkey: use project's org when available; for top-level (org_id null), project is its own org
    let effectiveOrgId = (projectOrgId && String(projectOrgId).trim()) ? String(projectOrgId) : projectIdStr;

    const created = [];
    let currentOrgId = effectiveOrgId;
    for (const phase of phases) {
      try {
        const result = await query(
          `INSERT INTO implementation_phases (org_id, project_id, sort_order, title, description, status, due_date, timeline, cost, color, tasks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) RETURNING *`,
          [currentOrgId, projectIdStr, phase.sort_order || 0, phase.title || 'Untitled Phase',
           phase.description || null, phase.status || 'not_started', phase.due_date || null,
           phase.timeline || null, phase.cost || null, phase.color || null,
           phase.tasks ? JSON.stringify(phase.tasks) : '[]']
        );
        created.push(result.rows[0]);
      } catch (insertErr) {
        if (insertErr.code !== '23503') throw insertErr;
        // Retry with different (org_id, project_id) pairs; FK may require project_id in organisations or (org_id, project_id) consistency
        const pairsToTry = [
          [orgId, projectIdStr],
          [projectIdStr, projectIdStr],
          [effectiveOrgId, effectiveOrgId],
        ].filter(([o, p]) => o && (o !== currentOrgId || p !== projectIdStr));
        let inserted = false;
        for (const [tryOrgId, tryProjectId] of pairsToTry) {
          try {
            const retry = await query(
              `INSERT INTO implementation_phases (org_id, project_id, sort_order, title, description, status, due_date, timeline, cost, color, tasks)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb) RETURNING *`,
              [tryOrgId, tryProjectId, phase.sort_order || 0, phase.title || 'Untitled Phase',
               phase.description || null, phase.status || 'not_started', phase.due_date || null,
               phase.timeline || null, phase.cost || null, phase.color || null,
               phase.tasks ? JSON.stringify(phase.tasks) : '[]']
            );
            created.push(retry.rows[0]);
            currentOrgId = tryOrgId;
            inserted = true;
            break;
          } catch (_) {}
        }
        if (!inserted) {
          return res.status(400).json({ error: 'Could not create phases for this project. Select a valid project from the sidebar and try again.' });
        }
      }
    }
    res.status(201).json(created);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(400).json({ error: 'Invalid project. Select a valid project from the sidebar and try again.' });
    }
    console.error('implementation/phases/bulk POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/phases/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureImplementationPhasesTable();
    const fields = ['title', 'description', 'sort_order', 'status', 'due_date', 'timeline', 'cost', 'color'];
    const sets = []; const vals = []; let p = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = $${p++}`); vals.push(req.body[f]); }
    }
    if (req.body.tasks !== undefined) {
      sets.push(`tasks = $${p++}::jsonb`);
      vals.push(JSON.stringify(req.body.tasks));
    }
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
    await ensureImplementationPhasesTable();
    const result = await query('DELETE FROM implementation_phases WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('implementation/phases DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
