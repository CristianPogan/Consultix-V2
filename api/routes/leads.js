import { Router } from 'express';
import { query, getOrgId } from '../db.js';

const router = Router();

// GET /api/leads — list leads (by list_id or company_id)
router.get('/', async (req, res) => {
  try {
    const orgId = await getOrgId();
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { list_id, company_id } = req.query;
    let sql = `SELECT l.id, l.list_id, l.company_id, l.first_name, l.last_name, l.email, l.title, l.linkedin_url, l.company, l.company_domain, l.email_verified, l.email_bounce_risk, l.icp_score, l.personalisation_json, l.company_data_json
               FROM leads l WHERE l.org_id = $1`;
    const params = [orgId];
    if (list_id) {
      sql += ' AND l.list_id = $2';
      params.push(list_id);
    }
    if (company_id) {
      sql += ' AND l.company_id = $' + (params.length + 1);
      params.push(company_id);
    }
    sql += ' ORDER BY l.created_at';
    const result = await query(sql, params);
    const rows = result.rows.map(r => {
      const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Unknown';
      const ld = r.company_data_json?.linkedinData || r.company_data_json?.linkedin_data || {};
      return {
        id: r.id,
        name,
        first_name: r.first_name,
        last_name: r.last_name,
        title: r.title,
        email: r.email,
        linkedin: r.linkedin_url,
        company: r.company,
        companyId: r.company_id,
        bounceRisk: r.email_bounce_risk || 'low',
        verified: r.email_verified,
        icp_score: r.icp_score,
        linkedinData: ld.connections ? { ...ld, connections: ld.connections, posts: ld.posts || 0, about: ld.about, recentActivity: ld.recent_activity || ld.recentActivity } : null,
        personalisation_json: r.personalisation_json,
      };
    });
    res.json(rows);
  } catch (err) {
    console.error('leads GET', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads — create lead
router.post('/', async (req, res) => {
  try {
    const orgId = await getOrgId();
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { list_id, company_id, first_name, last_name, email, title, company, company_domain, linkedin_url, email_bounce_risk, linkedinData, personalisation_json } = req.body || {};
    if (!list_id) return res.status(400).json({ error: 'list_id required' });
    const company_data = linkedinData ? { linkedinData, linkedin_data: linkedinData } : {};
    const result = await query(
      `INSERT INTO leads (org_id, list_id, company_id, first_name, last_name, email, title, company, company_domain, linkedin_url, email_verified, email_bounce_risk, company_data_json, personalisation_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
       RETURNING id, list_id, company_id, first_name, last_name, email, title, company, email_bounce_risk, personalisation_json`,
      [orgId, list_id, company_id || null, first_name || null, last_name || null, email || null, title || null, company || null, company_domain || null, linkedin_url || null, (email_bounce_risk === 'low'), email_bounce_risk || 'low', JSON.stringify(company_data), personalisation_json ? JSON.stringify(personalisation_json) : null]
    );
    const r = result.rows[0];
    const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email;
    res.status(201).json({
      id: r.id,
      list_id: r.list_id,
      company_id: r.company_id,
      name,
      first_name: r.first_name,
      last_name: r.last_name,
      email: r.email,
      title: r.title,
      company: r.company,
      bounceRisk: r.email_bounce_risk,
      personalisation_json: r.personalisation_json,
    });
  } catch (err) {
    console.error('leads POST', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id — update lead (e.g. personalisation_json)
router.put('/:id', async (req, res) => {
  try {
    const orgId = await getOrgId();
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { id } = req.params;
    const { personalisation_json } = req.body || {};
    const result = await query(
      `UPDATE leads SET personalisation_json = COALESCE($2::jsonb, personalisation_json), updated_at = now()
       WHERE id = $1 AND org_id = $3 RETURNING id, personalisation_json`,
      [id, personalisation_json ? JSON.stringify(personalisation_json) : null, orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ id: result.rows[0].id, personalisation_json: result.rows[0].personalisation_json });
  } catch (err) {
    console.error('leads PUT', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
