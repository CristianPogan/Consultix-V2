import { Router } from 'express';
import { listOrganisations, createProject } from '../db.js';

const router = Router();

function toProject(r) {
  return {
    id: String(r.id),
    name: r.full_name || r.name,
    client: r.name,
    created: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : null,
  };
}

// GET /api/organisations — list projects for org (shared + own)
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    const rows = await listOrganisations(orgId);
    res.json(rows.map(toProject));
  } catch (err) {
    console.error('organisations GET', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/organisations — create new project (unique name per org)
router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { name } = req.body;
    if (!orgId) return res.status(401).json({ error: 'Organisation required' });
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Project name required' });
    const project = await createProject(orgId, String(name).trim());
    res.status(201).json(toProject(project));
  } catch (err) {
    if (err.message?.includes('already exists')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('organisations POST', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
