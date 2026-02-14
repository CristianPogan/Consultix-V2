import { Router } from 'express';
import { query, getOrgId, ensureOrgExists } from '../db.js';

const router = Router();

// GET /api/companies — list companies (optionally by list_id)
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { list_id } = req.query;
    let sql = `SELECT c.id, c.name, c.domain, c.industry, c.employee_count, c.employee_range, c.revenue_range, c.headquarters_city, c.headquarters_state, c.headquarters_country, c.technologies, c.icp_fit_score, c.description, c.enrichment_data_json, c.enriched_at
               FROM companies c WHERE c.org_id = $1`;
    const params = [orgId];
    if (list_id) {
      sql += ` AND EXISTS (SELECT 1 FROM leads l WHERE l.company_id = c.id AND l.list_id = $2 AND l.org_id = c.org_id)`;
      params.push(list_id);
    }
    sql += ' ORDER BY c.icp_fit_score DESC NULLS LAST, c.name';
    const result = await query(sql, params);
    const rows = result.rows.map(r => {
      const loc = [r.headquarters_city, r.headquarters_state, r.headquarters_country].filter(Boolean).join(', ');
      const tech = r.technologies || [];
      const enrich = r.enrichment_data_json || {};
      return {
        id: r.id,
        name: r.name,
        domain: r.domain,
        industry: r.industry,
        employees: r.employee_count,
        employee_range: r.employee_range,
        location: loc,
        revenue: r.revenue_range,
        techStack: tech,
        icpScore: r.icp_fit_score,
        recentNews: enrich.recentNews || enrich.recent_news || '',
      };
    });
    res.json(rows);
  } catch (err) {
    console.error('companies GET', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/companies — create company (from discovery)
router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    
    // Ensure organisation exists
    await ensureOrgExists(orgId);
    
    const { name, domain, industry, employees, location, revenue, techStack, icpScore, recentNews } = req.body || {};
    const [city, state, country] = (location || '').split(',').map(s => s?.trim()).filter(Boolean);
    const result = await query(
      `INSERT INTO companies (org_id, name, domain, industry, employee_count, headquarters_city, headquarters_state, headquarters_country, revenue_range, technologies, icp_fit_score, enrichment_data_json, enriched_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[], $11, $12::jsonb, now())
       RETURNING id, name, domain, industry, employee_count, revenue_range, technologies, icp_fit_score`,
      [orgId, name, domain || null, industry, employees || null, city || null, state || null, country || null, revenue || null, techStack || [], icpScore || null, JSON.stringify({ recentNews: recentNews || '' })]
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      name: r.name,
      domain: r.domain,
      industry: r.industry,
      employees: r.employee_count,
      revenue: r.revenue_range,
      techStack: r.technologies,
      icpScore: r.icp_fit_score,
    });
  } catch (err) {
    console.error('companies POST', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
