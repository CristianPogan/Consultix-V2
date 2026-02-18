import pg from 'pg';

const { Pool } = pg;

// Heroku provides DATABASE_URL; otherwise use individual env vars
// SSL: Heroku Postgres and many RDS/cloud Postgres use certs that trigger "unable to get local issuer certificate"
// when rejectUnauthorized is true. Use false to avoid 500s on DB operations (connection remains encrypted).
const sslOpt = { rejectUnauthorized: false };
const config = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL, 
      ssl: sslOpt,
      // Add connection pool settings to handle timeouts
      max: 10, // maximum number of clients in the pool
      idleTimeoutMillis: 30000, // close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // return an error after 10 seconds if connection cannot be established
    }
  : {
      host: process.env.DB_HOST || 'cbhnv71uilek74.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'da9fpsg176u1ef',
      user: process.env.DB_USER || 'u2bsp865bnr7av',
      password: process.env.DB_PASSWORD,
      ssl: sslOpt,
      // Add connection pool settings
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(config);

// Handle pool errors to prevent app crash
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function getOrgId() {
  const orgId = process.env.DEMO_ORG_ID;
  if (orgId) return orgId;
  const res = await query('SELECT id FROM organisations LIMIT 1');
  return res.rows[0]?.id || null;
}

export async function ensureOrgExists(orgId) {
  if (!orgId) return false;
  
  try {
    // Check if org exists
    const checkResult = await query('SELECT id FROM organisations WHERE id = $1', [orgId]);
    if (checkResult.rows.length > 0) return true;
    
    // Create org if it doesn't exist - generate slug from orgId
    const slug = `org-${orgId.substring(0, 8)}`;
    
    await query(
      `INSERT INTO organisations (id, name, slug) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO NOTHING`,
      [orgId, 'Default Organisation', slug]
    );
    
    return true;
  } catch (err) {
    console.error('Failed to ensure org exists:', err);
    return false;
  }
}

// Projects stored as organisations — seed default projects (table may have UUID or TEXT id)
const DEFAULT_PROJECTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Hastingwood Securities', full_name: 'Hastingwood Securities AI Audit', slug: 'hastingwood-securities', created: '2026-01-15' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Acme Corp', full_name: 'Acme Corp Digital Transformation', slug: 'acme-corp', created: '2026-01-20' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'TechStart', full_name: 'TechStart AI Assessment', slug: 'techstart', created: '2026-02-01' },
];

async function ensureOrganisationsTable() {
  try {
    await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS full_name TEXT').catch(() => {});
    await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()').catch(() => {});
    await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS is_project BOOLEAN DEFAULT false').catch(() => {});
    await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS org_id TEXT').catch(() => {});
  } catch (_) {}
}

async function seedDefaultProjects() {
  try {
    for (const p of DEFAULT_PROJECTS) {
      await query(
        `INSERT INTO organisations (id, name, slug, full_name, created_at, is_project)
         VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, true)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           full_name = COALESCE(EXCLUDED.full_name, organisations.full_name),
           created_at = COALESCE(EXCLUDED.created_at::timestamptz, organisations.created_at),
           is_project = true,
           updated_at = now()`,
        [p.id, p.name, p.slug, p.full_name || p.name, p.created]
      ).catch(() => {});
    }
  } catch (_) {}
}

let _organisationsReady = false;
export async function ensureOrganisationsReady() {
  if (_organisationsReady) return;
  await ensureOrganisationsTable();
  await seedDefaultProjects();
  _organisationsReady = true;
}

// Ensure project-scoped stats columns exist (leads, lead_lists, companies)
export async function ensureProjectStatsColumns() {
  try {
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS project_id TEXT').catch(() => {});
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS outreach_sent_at TIMESTAMPTZ').catch(() => {});
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ').catch(() => {});
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS meeting_booked_at TIMESTAMPTZ').catch(() => {});
    await query('ALTER TABLE lead_lists ADD COLUMN IF NOT EXISTS project_id TEXT').catch(() => {});
    await query('ALTER TABLE companies ADD COLUMN IF NOT EXISTS project_id TEXT').catch(() => {});
  } catch (_) {}
}

// =============================================================================
// form_schemas — Brand Voice, Buyer Persona question definitions (no hardcoding)
// =============================================================================
const DEFAULT_BRAND_VOICE_SCHEMA = [
  { section: 'About You', sort_order: 0, field_key: 'name', label: "What's your full name?", placeholder: 'Andrew Dunn', field_type: 'input' },
  { section: 'About You', sort_order: 1, field_key: 'title', label: "What's your current role / title?", placeholder: 'AI Consultant & Founder, Vibe Consulting', field_type: 'input' },
  { section: 'About You', sort_order: 2, field_key: 'industry', label: 'What industry do you operate in?', placeholder: 'AI Consulting, B2B SaaS, Automation', field_type: 'input' },
  { section: 'About You', sort_order: 3, field_key: 'experience', label: 'How many years of experience do you have?', placeholder: 'e.g. 8 years in tech, 3 in AI consulting', field_type: 'input' },
  { section: 'About You', sort_order: 4, field_key: 'unique', label: "What makes you different from others in your space?", placeholder: "e.g. I run a one-person agency that competes with teams of 20 using AI leverage...", field_type: 'textarea' },
  { section: 'Your Audience', sort_order: 0, field_key: 'audience_who', label: 'Who is your ideal audience?', placeholder: 'e.g. B2B founders, VPs of Sales, heads of growth at SaaS companies (50-500 employees)', field_type: 'textarea' },
  { section: 'Your Audience', sort_order: 1, field_key: 'audience_problems', label: "What are their biggest pain points?", placeholder: "e.g. Spending too much on lead gen tools, low reply rates, can't personalise at scale...", field_type: 'textarea' },
  { section: 'Your Audience', sort_order: 2, field_key: 'audience_goals', label: "What outcomes do they want?", placeholder: "e.g. More qualified meetings, lower CAC, efficient outbound that doesn't feel spammy", field_type: 'textarea' },
  { section: 'Content Pillars', sort_order: 0, field_key: 'topics', label: 'What are your 3-5 core topics you create content about?', placeholder: 'e.g. AI automation, lead generation, cold outreach, one-person business, vibe coding', field_type: 'textarea' },
  { section: 'Content Pillars', sort_order: 1, field_key: 'strong_opinions', label: 'What are your strongest opinions / hot takes?', placeholder: "e.g. One-person businesses will outperform agencies. AI won't replace consultants but consultants using AI will replace those who don't...", field_type: 'textarea' },
  { section: 'Content Pillars', sort_order: 2, field_key: 'stories', label: 'What personal stories or case studies do you reference often?', placeholder: 'e.g. Building Vibe Consulting from scratch, client results (100 testimonials), specific client wins...', field_type: 'textarea' },
  { section: 'Writing Style', sort_order: 0, field_key: 'tone', label: 'How would you describe your tone?', placeholder: 'e.g. Direct, no-fluff, conversational but authoritative. I use short sentences and paragraphs.', field_type: 'textarea' },
  { section: 'Writing Style', sort_order: 1, field_key: 'vocabulary', label: "Any specific phrases, words or expressions you use often?", placeholder: "e.g. 'Here's the thing', 'Let me break this down', 'The real question is...'", field_type: 'textarea' },
  { section: 'Writing Style', sort_order: 2, field_key: 'avoid', label: 'What words or styles do you avoid?', placeholder: "e.g. Corporate jargon, buzzwords like 'synergy', overly formal language, emoji overuse", field_type: 'textarea' },
  { section: 'Writing Style', sort_order: 3, field_key: 'formatting', label: 'How do you typically format your posts?', placeholder: 'e.g. Short paragraphs, line breaks between thoughts, bold opening hook, end with a question', field_type: 'textarea' },
  { section: 'Content Goals', sort_order: 0, field_key: 'goal', label: "What's the primary goal of your content?", placeholder: 'e.g. Generate inbound leads, build authority, grow audience, drive traffic to offers', field_type: 'input' },
  { section: 'Content Goals', sort_order: 1, field_key: 'cta_style', label: "How do you typically end posts / what's your CTA style?", placeholder: "e.g. Ask a question, invite DMs, point to a link, 'Follow for more...'", field_type: 'textarea' },
  { section: 'Content Goals', sort_order: 2, field_key: 'frequency', label: 'How often do you want to post?', placeholder: 'e.g. Daily on LinkedIn, 3x/week on video, engage in communities daily', field_type: 'input' },
  { section: 'Examples', sort_order: 0, field_key: 'best_post', label: "Paste your best-performing post (the one that felt most 'you'):", placeholder: 'Paste your best LinkedIn post, tweet, or content piece here...', field_type: 'textarea_lg' },
  { section: 'Examples', sort_order: 1, field_key: 'inspiration', label: 'Who do you look up to content-wise? (creators, writers, thought leaders)', placeholder: 'e.g. Alex Hormozi, Chris Walker, Justin Welsh, Sahil Bloom', field_type: 'input' },
];

async function ensureFormSchemasTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS form_schemas (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      form_type TEXT NOT NULL,
      section TEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      field_key TEXT NOT NULL,
      label TEXT NOT NULL,
      placeholder TEXT DEFAULT '',
      field_type TEXT NOT NULL DEFAULT 'input',
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(form_type, field_key)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_form_schemas_type ON form_schemas(form_type)').catch(() => {});
}

export async function getFormSchema(formType) {
  await ensureFormSchemasTable();
  const res = await query(
    'SELECT section, sort_order, field_key, label, placeholder, field_type FROM form_schemas WHERE form_type = $1 ORDER BY section, sort_order, field_key',
    [formType]
  );
  if (!res.rows?.length && formType === 'brand_voice') {
    for (const row of DEFAULT_BRAND_VOICE_SCHEMA) {
      await query(
        `INSERT INTO form_schemas (form_type, section, sort_order, field_key, label, placeholder, field_type)
         VALUES ('brand_voice', $1, $2, $3, $4, $5, $6)
         ON CONFLICT (form_type, field_key) DO NOTHING`,
        [row.section, row.sort_order, row.field_key, row.label, row.placeholder, row.field_type]
      );
    }
    const reselect = await query(
      'SELECT section, sort_order, field_key, label, placeholder, field_type FROM form_schemas WHERE form_type = $1 ORDER BY section, sort_order, field_key',
      [formType]
    );
    return reselect.rows || [];
  }
  return res.rows || [];
}

// Ensure project_settings table for project-scoped settings (e.g. ai_sdr)
export async function ensureProjectSettingsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS project_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id TEXT NOT NULL,
        project_id TEXT NOT NULL DEFAULT '',
        user_id UUID,
        settings_type TEXT NOT NULL,
        settings_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_project_settings_lookup ON project_settings (org_id, project_id, settings_type)').catch(() => {});
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_project_settings_unique
      ON project_settings (org_id, project_id, COALESCE(user_id::text, ''), settings_type)
    `).catch(() => {});
  } catch (_) {}
}

// Ensure CRM pipeline columns exist on leads
export async function ensureCRMPipelineColumns() {
  try {
    await ensureProjectStatsColumns();
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value NUMERIC').catch(() => {});
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS proposal_sent_at TIMESTAMPTZ').catch(() => {});
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_at TIMESTAMPTZ').catch(() => {});
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ').catch(() => {});
    await query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS crm_notes TEXT').catch(() => {});
  } catch (_) {}
}

export async function updateLeadsOutreachSent(orgId, leadIds, platform) {
  await ensureProjectStatsColumns();
  if (!leadIds?.length) return;
  const placeholders = leadIds.map((_, i) => `$${i + 2}`).join(', ');
  await query(
    `UPDATE leads SET outreach_sent_at = now() WHERE id IN (${placeholders}) AND org_id = $1`,
    [orgId, ...leadIds]
  );
}

export async function updateLeadsOutreachSentByEmails(orgId, emails, projectId) {
  await ensureProjectStatsColumns();
  const list = [...new Set((emails || []).filter(Boolean).map(e => String(e).trim().toLowerCase()))];
  if (!list.length) return;
  const params = projectId ? [orgId, projectId, list] : [orgId, list];
  const cond = projectId ? 'org_id = $1 AND project_id = $2' : 'org_id = $1';
  const emailParam = projectId ? 3 : 2;
  await query(
    `UPDATE leads SET outreach_sent_at = now() WHERE ${cond} AND LOWER(TRIM(email)) = ANY($${emailParam}::text[])`,
    params
  );
}

export async function listOrganisations(orgId) {
  await ensureOrganisationsReady();
  let rows = [];
  try {
    const res = await query(
      `SELECT id, name, slug, full_name, created_at, org_id
       FROM organisations
       WHERE is_project = true AND (org_id IS NULL OR org_id = $1)
       ORDER BY org_id NULLS LAST, created_at ASC, id`,
      [orgId || null]
    );
    rows = res?.rows || [];
  } catch (e) {
    const projectIds = DEFAULT_PROJECTS.map(p => p.id);
    try {
      const res = await query(
        `SELECT id, name, slug, full_name, created_at, org_id
         FROM organisations
         WHERE id IN ($1::uuid, $2::uuid, $3::uuid)
         ORDER BY id`,
        projectIds
      );
      rows = res?.rows || [];
    } catch (_) {
      return [];
    }
  }
  return rows.map(r => ({
    ...r,
    full_name: r.full_name ?? r.name,
  }));
}

export async function createProject(orgId, name) {
  await ensureOrganisationsReady();
  if (!orgId || !name || !String(name).trim()) {
    throw new Error('Organisation and project name required');
  }
  const trimName = String(name).trim();
  const slug = trimName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const existing = await query(
    `SELECT id FROM organisations
     WHERE is_project = true AND org_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))`,
    [orgId, trimName]
  );
  if (existing.rows.length > 0) {
    throw new Error('A project with this name already exists');
  }
  const res = await query(
    `INSERT INTO organisations (id, name, slug, full_name, created_at, is_project, org_id)
     VALUES (gen_random_uuid(), $1, $2, $3, now(), true, $4)
     RETURNING id, name, slug, full_name, created_at`,
    [trimName, slug || 'project', trimName, orgId]
  );
  const r = res.rows[0];
  return { ...r, full_name: r.full_name ?? r.name };
}

// =============================================================================
// integration_credentials — API keys & tokens per org (linked via org_id)
// =============================================================================

async function ensureIntegrationCredentialsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS integration_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      integration_key TEXT NOT NULL,
      credentials_json JSONB NOT NULL DEFAULT '{}',
      connected BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(org_id, integration_key)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_integration_credentials_org ON integration_credentials(org_id)').catch(() => {});
}

export async function getIntegrationCredentials(orgId, integrationKey) {
  await ensureIntegrationCredentialsTable();
  const res = await query(
    'SELECT integration_key, credentials_json, connected FROM integration_credentials WHERE org_id = $1 AND integration_key = $2',
    [orgId, integrationKey]
  );
  return res.rows[0] || null;
}

export async function listIntegrationCredentials(orgId) {
  await ensureIntegrationCredentialsTable();
  const res = await query(
    'SELECT integration_key, connected FROM integration_credentials WHERE org_id = $1 ORDER BY integration_key',
    [orgId]
  );
  return res.rows;
}

export async function saveIntegrationCredentials(orgId, integrationKey, credentials = {}) {
  await ensureIntegrationCredentialsTable();
  await query(
    `INSERT INTO integration_credentials (org_id, integration_key, credentials_json, connected, updated_at)
     VALUES ($1, $2, $3::jsonb, true, now())
     ON CONFLICT (org_id, integration_key)
     DO UPDATE SET credentials_json = $3::jsonb, connected = true, updated_at = now()`,
    [orgId, integrationKey, JSON.stringify(credentials)]
  );
  return { integration_key: integrationKey, connected: true };
}

export async function disconnectIntegration(orgId, integrationKey) {
  await ensureIntegrationCredentialsTable();
  await query(
    `UPDATE integration_credentials SET credentials_json = '{}'::jsonb, connected = false, updated_at = now()
     WHERE org_id = $1 AND integration_key = $2`,
    [orgId, integrationKey]
  );
}

// =============================================================================
// integration_service_order — lead search & enrichment order per org
// =============================================================================

async function ensureIntegrationServiceOrderTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS integration_service_order (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL UNIQUE,
      lead_search_order JSONB NOT NULL DEFAULT '[]',
      lead_enrichment_order JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_integration_service_order_org ON integration_service_order(org_id)').catch(() => {});
}

export async function getIntegrationServiceOrder(orgId) {
  await ensureIntegrationServiceOrderTable();
  const res = await query(
    'SELECT lead_search_order, lead_enrichment_order FROM integration_service_order WHERE org_id = $1',
    [orgId]
  );
  return res.rows[0] || null;
}

export async function saveIntegrationServiceOrder(orgId, leadSearchOrder, leadEnrichmentOrder) {
  await ensureIntegrationServiceOrderTable();
  await query(
    `INSERT INTO integration_service_order (org_id, lead_search_order, lead_enrichment_order, updated_at)
     VALUES ($1, $2::jsonb, $3::jsonb, now())
     ON CONFLICT (org_id)
     DO UPDATE SET lead_search_order = $2::jsonb, lead_enrichment_order = $3::jsonb, updated_at = now()`,
    [orgId, JSON.stringify(leadSearchOrder || []), JSON.stringify(leadEnrichmentOrder || [])]
  );
}

// =============================================================================
// integration_costs — cost_label per integration (displayed in Lead Search Order)
// =============================================================================

// Verified pricing (Feb 2025) — IcyPeas, AI Ark, NeverBounce, FindyMail from official docs; others from public pricing
const INTEGRATION_COSTS_SEED = [
  { key: 'icypeas', label: '~$0.02/lead', tier: 1 },        // 1 credit/result, Basic $19/1K
  { key: 'ai_ark', label: '~$0.02/lead', tier: 1 },         // 0.5 credits/email, usage-based
  { key: 'findy', label: '~$0.03/lead', tier: 2 },          // Lead discovery
  { key: 'wiza', label: '~$0.04/lead', tier: 4 },           // Sales intelligence, pay per verified
  { key: 'leadsmagix', label: '~$0.025/lead', tier: 3 },    // B2B lead gen
  { key: 'bettercontact', label: '~$0.01/verify', tier: 1 }, // 1 credit per found+verified
  { key: 'zerobounce', label: '~$0.008/verify', tier: 1 },   // Tiered, typical rate
  { key: 'neverbounce', label: '~$0.008/verify', tier: 1 }, // $8/1K credits
  { key: 'findymail', label: '~$0.02/lead', tier: 1 },      // 1 credit/email
  { key: 'cleanlist', label: '~$0.012/verify', tier: 2 },   // 1 credit/email
  { key: 'unipile', label: '€49/month', tier: 5 },           // LinkedIn campaigns only
];

async function ensureIntegrationCostsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS integration_costs (
      integration_key TEXT PRIMARY KEY,
      cost_label TEXT NOT NULL,
      cost_tier INT DEFAULT 1
    )
  `);
  for (const { key, label, tier } of INTEGRATION_COSTS_SEED) {
    await query(
      `INSERT INTO integration_costs (integration_key, cost_label, cost_tier)
       VALUES ($1, $2, $3)
       ON CONFLICT (integration_key)
       DO UPDATE SET cost_label = EXCLUDED.cost_label, cost_tier = EXCLUDED.cost_tier`,
      [key, label, tier]
    ).catch(() => {});
  }
}

export async function getIntegrationCosts() {
  await ensureIntegrationCostsTable();
  const res = await query('SELECT integration_key, cost_label, cost_tier FROM integration_costs');
  return Object.fromEntries((res.rows || []).map(r => [r.integration_key, { cost_label: r.cost_label, cost_tier: r.cost_tier }]));
}

// Map UI employee ranges to (min, max) for SQL
const EMPLOYEE_RANGE_MAP = {
  '1-10': [1, 10],
  '11-50': [11, 50],
  '51-200': [51, 200],
  '201-500': [201, 500],
  '501-1,000': [501, 1000],
  '1,001-5,000': [1001, 5000],
  '5,000+': [5000, 999999999],
};

// Map UI employee ranges to DB enum values (company_size enum: 1-10, 11-50, 51-200, etc.)
const EMPLOYEE_RANGE_TO_ENUM = {
  '1-10': ['1-10'],
  '11-50': ['11-50'],
  '51-200': ['51-200'],
  '201-500': ['201-500'],
  '501-1,000': ['501-1000'],
  '1,001-5,000': ['1001-5000'],
  '5,000+': ['5001-10000', '10000+'],
};

// Expand region names to match DB values (US, United States, Canada, etc.)
function expandRegionForSql(region) {
  const r = String(region || '').trim().toLowerCase();
  if (r.includes('north america') || r === 'na') {
    return ['%US%', '%United States%', '%USA%', '%Canada%', '%CA%', '%Mexico%', '%MX%'];
  }
  if (r.includes('europe') || r === 'eu') {
    return ['%GB%', '%UK%', '%United Kingdom%', '%Germany%', '%DE%', '%France%', '%FR%', '%Netherlands%', '%NL%', '%Spain%', '%ES%', '%Italy%', '%IT%'];
  }
  return [`%${r}%`];
}

/**
 * Build discovery SQL and run it. Returns { companies, sqlQueries }.
 * sqlQueries: array of { sql, params, label, rowCount } for agent log.
 */
export async function searchCompaniesForDiscovery(orgId, criteria) {
  const { industry, keywords, employeeSizes, regions, roles, maxLeads = 200 } = criteria || {};
  const limit = Math.min(parseInt(maxLeads, 10) || 200, 500);
  const sqlQueries = [];

  const expandRegions = (regList) => {
    if (!regList?.length) return [];
    const all = [];
    for (const r of regList) {
      all.push(...expandRegionForSql(r));
    }
    return [...new Set(all)];
  };

  const regionPatterns = expandRegions(regions);
  const kwList = keywords ? String(keywords).split(',').map(k => k.trim()).filter(Boolean) : [];
  // Topic patterns: industry and keywords — match if ANY field matches ANY pattern (OR logic)
  const topicPatterns = [...new Set([
    industry?.trim() ? `%${industry.trim()}%` : null,
    ...kwList.map(k => `%${k}%`),
  ].filter(Boolean))];

  // Employee filter: allow nulls (unknown size) so we don't exclude most companies
  let employeeWhere = '';
  const empRanges = (employeeSizes || []).map(r => EMPLOYEE_RANGE_MAP[r] || null).filter(Boolean);
  const empEnumArrays = (employeeSizes || []).map(r => EMPLOYEE_RANGE_TO_ENUM[r]).filter(Boolean);
  const empEnums = empEnumArrays.flat();
  if (empRanges.length) {
    const minV = Math.min(...empRanges.map(([a]) => a));
    const maxV = Math.max(...empRanges.map(([, b]) => b));
    const enumList = empEnums.length ? empEnums.map(e => `'${String(e).replace(/'/g, "''")}'`).join(',') : '';
    employeeWhere = enumList
      ? ` AND ( (c.employee_count IS NOT NULL AND c.employee_count > 0 AND c.employee_count BETWEEN ${minV} AND ${maxV}) OR (c.employee_range::text IN (${enumList})) OR (c.employee_count IS NULL AND c.employee_range IS NULL) )`
      : ` AND ( (c.employee_count IS NOT NULL AND c.employee_count > 0 AND c.employee_count BETWEEN ${minV} AND ${maxV}) OR (c.employee_count IS NULL AND c.employee_range IS NULL) )`;
  }

  const baseSelect = `
    SELECT c.id, c.name, c.domain, c.website, c.industry, c.employee_count, c.employee_range,
           c.headquarters_city, c.headquarters_state, c.headquarters_country,
           c.icp_fit_score, c.description, c.technologies, c.keywords as c_keywords
    FROM companies c
    WHERE c.org_id = $1`;

  let params = [orgId];
  let paramIdx = 2;
  let sql = baseSelect;

  // Topic filter: industry OR description OR keywords OR name matches any pattern
  if (topicPatterns.length) {
    const topicParts = [];
    for (const p of topicPatterns) {
      topicParts.push(`(COALESCE(c.industry, '') ILIKE $${paramIdx} OR COALESCE(c.description, '') ILIKE $${paramIdx} OR COALESCE(c.keywords, '') ILIKE $${paramIdx} OR COALESCE(c.name, '') ILIKE $${paramIdx})`);
      params.push(p);
      paramIdx++;
    }
    sql += ` AND (${topicParts.join(' OR ')})`;
  }

  sql += employeeWhere;

  if (regionPatterns.length) {
    const orParts = [];
    for (const p of regionPatterns) {
      orParts.push(`(COALESCE(c.headquarters_country, '') ILIKE $${paramIdx} OR COALESCE(c.headquarters_state, '') ILIKE $${paramIdx})`);
      params.push(p);
      paramIdx++;
    }
    sql += ` AND (${orParts.join(' OR ')})`;
  }

  sql += ` ORDER BY c.icp_fit_score DESC NULLS LAST, c.name LIMIT $${paramIdx}`;
  params.push(limit);

  const runQuery = async (label) => {
    const result = await query(sql, params);
    const rows = result.rows || [];
    sqlQueries.push({ sql, params: [...params], label, rowCount: rows.length });
    return rows;
  };

  let rows = await runQuery('Postgres discovery (primary)');

  // Fallback: if 0 results, try progressively relaxed queries and log each
  if (rows.length === 0) {
    // Fallback 2: without region filter (keep topic + employee)
    if (regionPatterns.length) {
      let rp2 = [orgId], idx2 = 2;
      let sql2 = baseSelect;
      for (const p of topicPatterns) {
        sql2 += ` AND (COALESCE(c.industry, '') ILIKE $${idx2} OR COALESCE(c.description, '') ILIKE $${idx2} OR COALESCE(c.keywords, '') ILIKE $${idx2} OR COALESCE(c.name, '') ILIKE $${idx2})`;
        rp2.push(p);
        idx2++;
      }
      sql2 += employeeWhere + ` ORDER BY c.icp_fit_score DESC NULLS LAST, c.name LIMIT $${idx2}`;
      rp2.push(limit);
      const res2 = await query(sql2, rp2);
      sqlQueries.push({ sql: sql2, params: [...rp2], label: 'Postgres discovery (no region)', rowCount: res2.rows?.length || 0 });
      if (res2.rows?.length > 0) rows = res2.rows;
    }
    // Fallback 3: topic only (no region, no employee)
    if (rows.length === 0 && topicPatterns.length) {
      let rp3 = [orgId], idx3 = 2;
      let sql3 = baseSelect;
      for (const p of topicPatterns) {
        sql3 += ` AND (COALESCE(c.industry, '') ILIKE $${idx3} OR COALESCE(c.description, '') ILIKE $${idx3} OR COALESCE(c.keywords, '') ILIKE $${idx3} OR COALESCE(c.name, '') ILIKE $${idx3})`;
        rp3.push(p);
        idx3++;
      }
      sql3 += ` ORDER BY c.icp_fit_score DESC NULLS LAST, c.name LIMIT $${idx3}`;
      rp3.push(limit);
      const res3 = await query(sql3, rp3);
      sqlQueries.push({ sql: sql3, params: [...rp3], label: 'Postgres discovery (topic only)', rowCount: res3.rows?.length || 0 });
      if (res3.rows?.length > 0) rows = res3.rows;
    }
    // Fallback 4: derive companies from leads (when companies table has no matches)
    if (rows.length === 0 && topicPatterns.length) {
      const firstPattern = topicPatterns[0];
      const sqlLeads = `
        SELECT DISTINCT ON (LOWER(TRIM(COALESCE(l.company_domain, l.company, ''))))
          l.company_id as id, l.company as name, l.company_domain as domain
        FROM leads l
        WHERE l.org_id = $1
          AND (COALESCE(l.company, '') ILIKE $2 OR COALESCE(l.company_domain, '') ILIKE $2)
        ORDER BY LOWER(TRIM(COALESCE(l.company_domain, l.company, ''))), l.created_at DESC
        LIMIT $3`;
      const resLeads = await query(sqlLeads, [orgId, firstPattern, limit]);
      sqlQueries.push({ sql: sqlLeads, params: [orgId, firstPattern, limit], label: 'Postgres discovery (from leads)', rowCount: resLeads.rows?.length || 0 });
      if (resLeads.rows?.length > 0) {
        rows = resLeads.rows.map(r => ({
          id: r.id || `lead-${(r.name || r.domain || '').replace(/\s/g, '-')}`,
          name: r.name,
          domain: r.domain,
          industry: null,
          employee_count: null,
          employee_range: null,
          headquarters_city: null,
          headquarters_state: null,
          headquarters_country: null,
          icp_fit_score: 85,
        }));
      }
    }
    // Fallback 5: org only
    if (rows.length === 0) {
      const sql4 = baseSelect + ` ORDER BY c.icp_fit_score DESC NULLS LAST, c.name LIMIT $2`;
      const res4 = await query(sql4, [orgId, limit]);
      sqlQueries.push({ sql: sql4, params: [orgId, limit], label: 'Postgres discovery (org only)', rowCount: res4.rows?.length || 0 });
      if (res4.rows?.length > 0) rows = res4.rows;
    }
  }

  const normDomain = (d) => (d || '').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
  const toWebsite = (d) => {
    const dom = normDomain(d);
    return dom ? `https://${dom}` : null;
  };

  const companies = (rows || []).map(r => {
    const loc = [r.headquarters_city, r.headquarters_state, r.headquarters_country].filter(Boolean).join(', ');
    const domain = normDomain(r.domain || r.website) || r.domain || r.website;
    return {
      id: r.id,
      name: r.name,
      domain: domain || null,
      industry: r.industry,
      employees: r.employee_count ?? r.employee_range ?? 'N/A',
      location: loc || 'Unknown',
      website: toWebsite(r.domain || r.website),
      icpScore: r.icp_fit_score ?? 90,
    };
  });

  return { companies, sqlQueries };
}

/**
 * Get company by id or name/domain for enrichment status check.
 * @returns {Object|null} { id, name, domain, enriched_at } or null
 */
export async function getCompanyEnrichmentStatus(orgId, { id, name, domain }) {
  if (!orgId) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isUuid = id && typeof id === 'string' && uuidRegex.test(id);

  if (isUuid) {
    const res = await query(
      'SELECT id, name, domain, enriched_at FROM companies WHERE org_id = $1 AND id = $2',
      [orgId, id]
    );
    return res.rows[0] || null;
  }

  const normDomain = (d) => (d || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase().trim();
  const dom = normDomain(domain);
  const nm = (name || '').trim();
  if (!nm && !dom) return null;

  let sql = 'SELECT id, name, domain, enriched_at FROM companies WHERE org_id = $1';
  const params = [orgId];
  let p = 2;
  if (dom) {
    sql += ` AND (LOWER(REPLACE(REPLACE(REPLACE(domain, 'https://', ''), 'http://', ''), '/', '')) = $${p} OR domain ILIKE $${p})`;
    params.push(dom);
    p++;
  }
  if (nm) {
    sql += ` AND name ILIKE $${p}`;
    params.push(`%${nm}%`);
    p++;
  }
  sql += ' LIMIT 1';
  const res = await query(sql, params);
  return res.rows[0] || null;
}

/**
 * Check if enrichment is fresh (within 30 days).
 */
export function isEnrichmentFresh(enrichedAt) {
  if (!enrichedAt) return false;
  const d = new Date(enrichedAt);
  const now = new Date();
  const diffDays = (now - d) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

/**
 * Get leads (contacts) for a company.
 */
export async function getLeadsByCompanyId(orgId, companyId) {
  if (!orgId || !companyId) return [];
  const res = await query(
    `SELECT l.id, l.first_name, l.last_name, l.email, l.title, l.company, l.company_domain, l.linkedin_url, l.email_bounce_risk, l.company_data_json
     FROM leads l WHERE l.org_id = $1 AND l.company_id = $2 ORDER BY l.created_at`,
    [orgId, companyId]
  );
  return res.rows || [];
}

/**
 * Upsert company (create or update enriched_at). Returns company id.
 */
export async function upsertCompanyForEnrichment(orgId, { name, domain, industry }) {
  if (!orgId || !name) return null;
  const dom = (domain || '').replace(/^https?:\/\//, '').split('/')[0].trim() || null;
  const existing = await getCompanyEnrichmentStatus(orgId, { name, domain });
  if (existing) {
    await query(
      'UPDATE companies SET enriched_at = now(), domain = COALESCE($2, domain) WHERE id = $1',
      [existing.id, dom]
    );
    return existing.id;
  }
  const res = await query(
    `INSERT INTO companies (org_id, name, domain, industry, enriched_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING id`,
    [orgId, name, dom, industry || null]
  );
  return res.rows[0]?.id || null;
}

async function ensureAppUsersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      org_id TEXT NOT NULL,
      company TEXT,
      timezone TEXT DEFAULT 'Europe/London',
      profile_photo_url TEXT,
      role TEXT DEFAULT 'org_member',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email)').catch(() => {});
  // Add new columns to existing tables
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS company TEXT').catch(() => {});
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'Europe/London\'').catch(() => {});
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT').catch(() => {});
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'org_member\'').catch(() => {});
}

let _usersTableReady = false;
async function ensureUsersTableReady() {
  if (_usersTableReady) return;
  await ensureAppUsersTable();
  _usersTableReady = true;
}

export async function findUserByEmail(email) {
  await ensureUsersTableReady();
  const res = await query('SELECT id, email, password_hash, name, org_id, company, timezone, profile_photo_url, role FROM app_users WHERE LOWER(email) = LOWER($1)', [email]);
  return res.rows[0] || null;
}

export async function findUserById(userId) {
  await ensureUsersTableReady();
  const res = await query('SELECT id, email, name, org_id, company, timezone, profile_photo_url, role, created_at FROM app_users WHERE id = $1', [userId]);
  return res.rows[0] || null;
}

export async function updateUserProfile(userId, updates) {
  await ensureUsersTableReady();
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.company !== undefined) {
    fields.push(`company = $${paramCount++}`);
    values.push(updates.company);
  }
  if (updates.timezone !== undefined) {
    fields.push(`timezone = $${paramCount++}`);
    values.push(updates.timezone);
  }
  if (updates.profile_photo_url !== undefined) {
    fields.push(`profile_photo_url = $${paramCount++}`);
    values.push(updates.profile_photo_url);
  }
  
  if (fields.length === 0) return null;
  
  fields.push(`updated_at = now()`);
  values.push(userId);
  
  const res = await query(
    `UPDATE app_users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, org_id, company, timezone, profile_photo_url`,
    values
  );
  return res.rows[0] || null;
}

export async function createUser(email, passwordHash, name, orgId) {
  await ensureUsersTableReady();
  const res = await query(
    'INSERT INTO app_users (email, password_hash, name, org_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name, org_id',
    [email.toLowerCase().trim(), passwordHash, name.trim(), orgId]
  );
  return res.rows[0];
}

async function ensurePasswordResetTokensTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)').catch(() => {});
  await query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)').catch(() => {});
}

let _resetTokensTableReady = false;
async function ensureResetTokensReady() {
  if (_resetTokensTableReady) return;
  await ensureUsersTableReady();
  await ensurePasswordResetTokensTable();
  _resetTokensTableReady = true;
}

export async function createPasswordResetToken(userId) {
  await ensureResetTokensReady();
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  return { token, expiresAt };
}

export async function findValidResetToken(token) {
  await ensureResetTokensReady();
  const res = await query(
    `SELECT prt.id, prt.user_id, prt.token, prt.expires_at
     FROM password_reset_tokens prt
     WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > now()`,
    [token]
  );
  return res.rows[0] || null;
}

export async function consumeResetToken(token) {
  await ensureResetTokensReady();
  await query('UPDATE password_reset_tokens SET used_at = now() WHERE token = $1', [token]);
}

export async function updateUserPassword(userId, passwordHash) {
  await ensureUsersTableReady();
  await query('UPDATE app_users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, userId]);
}

// Default signup token — matches scripts/update_credits_and_billing.py and tests
const DEFAULT_SIGNUP_TOKEN = process.env.DEFAULT_SIGNUP_TOKEN || 'KLNY9NIhBFNPGFjw';

async function ensureSignupAccessTokensTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS signup_access_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL,
        assigned_credits INTEGER DEFAULT 300,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_signup_access_tokens_token ON signup_access_tokens(token)').catch(() => {});
  } catch (e) {
    // Table may already exist with different schema
  }
  // Always try to upsert default token (idempotent) — handles empty table or schema differences
  try {
    await query(
      `INSERT INTO signup_access_tokens (token, assigned_credits, status) VALUES ($1, 300, 'active')
       ON CONFLICT (token) DO UPDATE SET status = 'active', assigned_credits = 300, updated_at = now()`,
      [DEFAULT_SIGNUP_TOKEN]
    );
  } catch (e) {
    // Schema may lack assigned_credits/status — try minimal insert
    try {
      await query(`INSERT INTO signup_access_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING`, [DEFAULT_SIGNUP_TOKEN]);
    } catch (_) {}
  }
}

let _signupTokensTableReady = false;
async function ensureSignupTokensReady() {
  if (_signupTokensTableReady) return;
  await ensureSignupAccessTokensTable();
  _signupTokensTableReady = true;
}

export async function validateSignupToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null;
  const token = accessToken.trim();
  if (!token) return null;
  try {
    await ensureSignupTokensReady();
    // Prefer full select; fallback to token-only if schema differs
    let row = null;
    try {
      const res = await query(
        `SELECT id, token, assigned_credits, status FROM signup_access_tokens WHERE token = $1`,
        [token]
      );
      row = res.rows[0];
    } catch (e) {
      try {
        const res = await query(`SELECT id, token FROM signup_access_tokens WHERE token = $1`, [token]);
        row = res.rows[0] ? { ...res.rows[0], assigned_credits: 300, status: 'active' } : null;
      } catch (_) {
        return null;
      }
    }
    if (!row && token === DEFAULT_SIGNUP_TOKEN) {
      for (const stmt of [
        `INSERT INTO signup_access_tokens (token, assigned_credits, status) VALUES ($1, 300, 'active') ON CONFLICT (token) DO NOTHING`,
        `INSERT INTO signup_access_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING`,
        `INSERT INTO signup_access_tokens (token, assigned_credits, status) VALUES ($1, 300, 'active')`,
      ]) {
        try {
          await query(stmt, [token]);
        } catch (_) {}
      }
      const retry = await query(`SELECT id, token FROM signup_access_tokens WHERE token = $1`, [token]).catch(() => ({ rows: [] }));
      row = retry.rows[0] ? { ...retry.rows[0], assigned_credits: 300, status: 'active' } : null;
    }
    if (!row) return null;
    const status = row.status == null ? 'active' : String(row.status).toLowerCase();
    if (status !== 'active') return { valid: false, reason: 'Token is inactive or expired' };
    return { valid: true, id: row.id, assignedCredits: row.assigned_credits ?? 300 };
  } catch (err) {
    if (err.code === '42P01') return null;
    throw err;
  }
}

export default pool;
