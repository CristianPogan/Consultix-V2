import { Router } from 'express';
import { listOrganisations } from '../db.js';

const router = Router();

// GET /api/organisations — list all projects (organisations)
router.get('/', async (req, res) => {
  try {
    const rows = await listOrganisations();
    const projects = rows.map(r => ({
      id: String(r.id),
      name: r.full_name || r.name,
      client: r.name,
      created: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : null,
    }));
    res.json(projects);
  } catch (err) {
    console.error('organisations GET', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
