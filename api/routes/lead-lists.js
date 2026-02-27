import { Router } from 'express';
import { query, getOrgId, ensureOrgExists } from '../db.js';

const router = Router();

// GET /api/lead-lists — list lead lists
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT ll.id, ll.name, ll.source, ll.status, ll.total_contacts, ll.enriched_count, ll.created_at,
        COALESCE(json_agg(json_build_object('id', l.id, 'first_name', l.first_name, 'last_name', l.last_name, 'email', l.email, 'title', l.title, 'company', l.company, 'company_domain', l.company_domain, 'linkedin_url', l.linkedin_url, 'personalisation_json', l.personalisation_json, 'email_bounce_risk', l.email_bounce_risk)) FILTER (WHERE l.id IS NOT NULL), '[]')::json as leads
       FROM lead_lists ll
       LEFT JOIN leads l ON l.list_id = ll.id AND l.org_id = ll.org_id
       WHERE ll.org_id = $1
       GROUP BY ll.id, ll.name, ll.source, ll.status, ll.total_contacts, ll.enriched_count, ll.created_at
       ORDER BY ll.created_at DESC`,
      [orgId]
    );
    const rows = result.rows.map(r => {
      const leads = (r.leads && Array.isArray(r.leads) ? r.leads : []).filter(Boolean).map(l => ({
        id: l.id,
        name: [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email,
        first_name: l.first_name,
        last_name: l.last_name,
        email: l.email,
        title: l.title,
        company: l.company,
        company_domain: l.company_domain,
        linkedin_url: l.linkedin_url,
        personalisation_json: l.personalisation_json,
        bounceRisk: l.email_bounce_risk === 'low' ? 'low' : l.email_bounce_risk === 'high' ? 'high' : 'medium',
      }));
      return {
        id: r.id,
        name: r.name,
        source: r.source,
        status: r.status,
        total_contacts: r.total_contacts,
        enriched_count: r.enriched_count,
        createdAt: r.created_at,
        contacts: leads,
      };
    });
    res.json(rows);
  } catch (err) {
    console.error('lead-lists GET', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-lists — create lead list
router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    
    // Ensure organisation exists
    await ensureOrgExists(orgId);
    
    const { name, source } = req.body || {};
    const result = await query(
      `INSERT INTO lead_lists (org_id, name, source, status, total_contacts, enriched_count)
       VALUES ($1, $2, $3, 'draft', 0, 0)
       RETURNING id, name, source, status, total_contacts, enriched_count, created_at`,
      [orgId, name || 'Untitled List', source || 'discovery']
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      name: r.name,
      source: r.source,
      status: r.status,
      total_contacts: r.total_contacts,
      enriched_count: r.enriched_count,
      createdAt: r.created_at,
      contacts: [],
    });
  } catch (err) {
    console.error('lead-lists POST', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-lists/import — import CSV rows into a new list
router.post('/import', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { name, rows } = req.body || {};
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows array required and must not be empty' });
    }
    const listResult = await query(
      `INSERT INTO lead_lists (org_id, name, source, status, total_contacts, enriched_count)
       VALUES ($1, $2, 'import', 'draft', $3, 0)
       RETURNING id, name, source, status, total_contacts, enriched_count, created_at`,
      [orgId, name || `Import ${new Date().toISOString().slice(0, 10)}`, rows.length]
    );
    const list = listResult.rows[0];
    const imported = [];
    for (const row of rows) {
      const r = await query(
        `INSERT INTO leads (org_id, list_id, first_name, last_name, email, title, company, company_domain, linkedin_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, first_name, last_name, email`,
        [orgId, list.id, row.first_name || null, row.last_name || null, row.email || null,
         row.title || null, row.company || null, row.company_domain || null, row.linkedin_url || null]
      );
      if (r.rows[0]) imported.push(r.rows[0]);
    }
    res.status(201).json({
      id: list.id, listId: list.id, name: list.name, source: list.source,
      total_contacts: imported.length, contacts: imported,
    });
  } catch (err) {
    console.error('lead-lists/import POST', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
