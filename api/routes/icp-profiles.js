import { Router } from 'express';
import { query, getOrgId } from '../db.js';

const router = Router();

// GET /api/icp-profiles — list ICP profiles for org
router.get('/', async (req, res) => {
  try {
    const orgId = await getOrgId();
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT id, name, industry, keywords, employee_ranges, regions, roles, lookalike_domains, max_leads, created_at
       FROM icp_profiles WHERE org_id = $1 ORDER BY created_at DESC`,
      [orgId]
    );
    const rows = result.rows.map(r => ({
      id: r.id,
      name: r.name || 'Untitled',
      industry: r.industry || '',
      keywords: r.keywords || [],
      employeeRanges: r.employee_ranges || [],
      regions: r.regions || [],
      roles: r.roles || [],
      lookalikeDomains: r.lookalike_domains || [],
      maxLeads: r.max_leads,
      createdAt: r.created_at,
    }));
    res.json(rows);
  } catch (err) {
    console.error('icp-profiles GET', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/icp-profiles — create ICP profile
router.post('/', async (req, res) => {
  try {
    const orgId = await getOrgId();
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { name, industry, keywords, employeeRanges, regions, roles, lookalikeDomains, maxLeads } = req.body || {};
    const kw = Array.isArray(keywords) ? keywords : (keywords ? [String(keywords)] : []);
    const er = Array.isArray(employeeRanges) ? employeeRanges : [];
    const reg = Array.isArray(regions) ? regions : [];
    const rol = Array.isArray(roles) ? roles : [];
    const look = Array.isArray(lookalikeDomains) ? lookalikeDomains : (lookalikeDomains ? [String(lookalikeDomains)] : []);
    const result = await query(
      `INSERT INTO icp_profiles (org_id, name, industry, keywords, employee_ranges, regions, roles, lookalike_domains, max_leads)
       VALUES ($1, $2, $3, $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9)
       RETURNING id, name, industry, keywords, employee_ranges, regions, roles, lookalike_domains, max_leads, created_at`,
      [orgId, name || 'Untitled', industry || '', kw, er, reg, rol, look, maxLeads || null]
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      name: r.name,
      industry: r.industry,
      keywords: r.keywords,
      employeeRanges: r.employee_ranges,
      regions: r.regions,
      roles: r.roles,
      lookalikeDomains: r.lookalike_domains,
      maxLeads: r.max_leads,
      createdAt: r.created_at,
    });
  } catch (err) {
    console.error('icp-profiles POST', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/icp-profiles/:id — update ICP profile
router.put('/:id', async (req, res) => {
  try {
    const orgId = await getOrgId();
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { id } = req.params;
    const { name, industry, keywords, employeeRanges, regions, roles, lookalikeDomains, maxLeads } = req.body || {};
    const kw = keywords != null ? (Array.isArray(keywords) ? keywords : [String(keywords)]) : null;
    const er = employeeRanges != null ? (Array.isArray(employeeRanges) ? employeeRanges : []) : null;
    const reg = regions != null ? (Array.isArray(regions) ? regions : []) : null;
    const rol = roles != null ? (Array.isArray(roles) ? roles : []) : null;
    const look = lookalikeDomains != null ? (Array.isArray(lookalikeDomains) ? lookalikeDomains : [String(lookalikeDomains)]) : null;
    const result = await query(
      `UPDATE icp_profiles SET name=COALESCE($2,name), industry=COALESCE($3,industry), keywords=COALESCE($4::text[],keywords),
       employee_ranges=COALESCE($5::text[],employee_ranges), regions=COALESCE($6::text[],regions), roles=COALESCE($7::text[],roles),
       lookalike_domains=COALESCE($8::text[],lookalike_domains), max_leads=COALESCE($9,max_leads)
       WHERE id=$1 AND org_id=$10 RETURNING id, name, industry, keywords, employee_ranges, regions, roles, lookalike_domains, max_leads`,
      [id, name, industry, kw, er, reg, rol, look, maxLeads, orgId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const r = result.rows[0];
    res.json({
      id: r.id,
      name: r.name,
      industry: r.industry,
      keywords: r.keywords,
      employeeRanges: r.employee_ranges,
      regions: r.regions,
      roles: r.roles,
      lookalikeDomains: r.lookalike_domains,
      maxLeads: r.max_leads,
    });
  } catch (err) {
    console.error('icp-profiles PUT', err);
    res.status(500).json({ error: err.message });
  }
});

const DEFAULT_ICP = {
  listName: '', industry: 'B2B SaaS', keywords: '', employeeRange: '51-200',
  regions: ['North America', 'Europe'], roles: ['VP Growth', 'CTO', 'Head of Product'], lookalike: '',
};

// GET /api/icp-profiles/default — default ICP form values (first profile or defaults)
router.get('/default', async (req, res) => {
  try {
    const orgId = await getOrgId();
    if (!orgId) return res.json(DEFAULT_ICP);
    const result = await query(
      'SELECT * FROM icp_profiles WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1',
      [orgId]
    );
    const r = result.rows[0];
    if (!r) return res.json(DEFAULT_ICP);
    res.json({
      listName: r.name || '',
      industry: r.industry || 'B2B SaaS',
      keywords: Array.isArray(r.keywords) ? r.keywords.join(', ') : (r.keywords || ''),
      employeeRange: (r.employee_ranges || ['51-200'])[0] || '51-200',
      regions: r.regions || ['North America', 'Europe'],
      roles: r.roles || ['VP Growth', 'CTO', 'Head of Product'],
      lookalike: Array.isArray(r.lookalike_domains) ? r.lookalike_domains.join(', ') : (r.lookalike_domains || ''),
    });
  } catch (err) {
    console.error('icp-profiles default GET', err);
    res.json(DEFAULT_ICP);
  }
});

export default router;
