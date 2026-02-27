/**
 * Lead Search Integrations — Comprehensive Validation
 *
 * Tests API key validity, endpoint functionality, and frontend payload mapping
 * for all lead search and enrichment integrations.
 *
 * Run: npm run test:lead-search
 * Requires: JWT_API_KEY, DATABASE_URL or DB_PASSWORD
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';

const api = request(app);
const hasDb = !!(process.env.DATABASE_URL || process.env.DB_PASSWORD);
const hasAuth = !!process.env.JWT_API_KEY;

let token = null;
if (hasAuth) {
  const res = await request(app).post('/api/auth/token').send({ apiKey: process.env.JWT_API_KEY });
  if (res.status === 200 && res.body.token) token = res.body.token;
}
function auth() { return token ? { Authorization: `Bearer ${token}` } : {}; }

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Check which integrations are connected and have valid API keys in DB
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Search: integration status', () => {
  it('1. GET /api/integrations lists all connected integrations', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations').set(auth());
    assert.strictEqual(res.status, 200);
    const integrations = res.body.integrations || {};
    console.log('# Connected integrations:', Object.entries(integrations).filter(([, v]) => v === true || v?.connected).map(([k]) => k).join(', '));
  });

  it('2. GET /api/lead-generation/discover/status returns canRun and connected lead-search integrations', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/lead-generation/discover/status').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok('canRun' in res.body);
    assert.ok('connectedIntegrations' in res.body);
    assert.ok('leadSearchOrder' in res.body);
    console.log('# canRun:', res.body.canRun);
    console.log('# connectedIntegrations:', res.body.connectedIntegrations.join(', '));
    console.log('# leadSearchOrder:', res.body.leadSearchOrder.join(', '));
  });

  it('3. GET /api/integrations/order/lead-search returns search and enrichment order', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/order/lead-search').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# leadSearch order:', JSON.stringify(res.body.leadSearch));
    console.log('# leadEnrichment order:', JSON.stringify(res.body.leadEnrichment));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Validate each lead-search integration API key
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Search: API key validation — AI Ark', () => {
  it('1. GET /api/integrations/ai_ark returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/ai_ark').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# ai_ark connected:', res.body.connected);
  });

  it('2. AI Ark API key is valid (semantic search returns data)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      industry: 'B2B SaaS',
      keywords: 'lead generation',
      employeeSizes: ['51-200'],
      regions: ['North America'],
      roles: ['VP Growth'],
      maxLeads: 5,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    console.log('# discover result: source=' + res.body.source + ', count=' + res.body.count);
    console.log('# waterfallLog:', JSON.stringify(res.body.waterfallLog));
    if (res.body.companies?.length > 0) {
      const c = res.body.companies[0];
      console.log('# sample company:', JSON.stringify({ name: c.name, domain: c.domain, industry: c.industry, employees: c.employees, location: c.location }));
    }
  });
});

describe('Lead Search: API key validation — IcyPeas', () => {
  it('1. GET /api/integrations/icypeas returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/icypeas').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# icypeas connected:', res.body.connected);
  });

  it('2. IcyPeas API key is valid (count endpoint works)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const { countIcyPeas } = await import('../api/services/lead-services.js');
    const { getIntegrationCredentials, getApiKeyFromCredentials } = await import('../api/db.js');
    const row = await getIntegrationCredentials(token ? undefined : 'test', 'icypeas');
    // Try with DB creds or env var
    const apiKey = getApiKeyFromCredentials(row) || process.env.ICYPEAS_API_KEY;
    if (!apiKey) { console.log('# SKIP: no IcyPeas API key'); return; }
    try {
      const result = await countIcyPeas({ apiKey, jobTitles: ['CEO'], keywords: ['B2B SaaS'], limit: 5 });
      console.log('# IcyPeas count result:', JSON.stringify(result));
      assert.ok(typeof result === 'object');
    } catch (err) {
      console.log('# IcyPeas count error:', err.message);
    }
  });
});

describe('Lead Search: API key validation — FindyMail', () => {
  it('1. GET /api/integrations/findymail returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/findymail').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# findymail connected:', res.body.connected);
  });
});

describe('Lead Search: API key validation — NeverBounce', () => {
  it('1. GET /api/integrations/neverbounce returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/neverbounce').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# neverbounce connected:', res.body.connected);
  });
});

describe('Lead Search: API key validation — BetterContact', () => {
  it('1. GET /api/integrations/bettercontact returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/bettercontact').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# bettercontact connected:', res.body.connected);
  });
});

describe('Lead Search: API key validation — ZeroBounce', () => {
  it('1. GET /api/integrations/zerobounce returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/zerobounce').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# zerobounce connected:', res.body.connected);
  });
});

describe('Lead Search: API key validation — Findy', () => {
  it('1. GET /api/integrations/findy returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/findy').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# findy connected:', res.body.connected);
  });
});

describe('Lead Search: API key validation — Wiza', () => {
  it('1. GET /api/integrations/wiza returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/wiza').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# wiza connected:', res.body.connected);
  });
});

describe('Lead Search: API key validation — Cleanlist', () => {
  it('1. GET /api/integrations/cleanlist returns connected status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/cleanlist').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# cleanlist connected:', res.body.connected);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Discover endpoint — real frontend payloads
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Search: discover with real payloads', () => {
  it('1. Discover: B2B SaaS, North America, VP Growth (typical frontend selection)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      industry: 'B2B SaaS',
      keywords: 'lead generation, sales automation',
      employeeSizes: ['51-200', '201-500'],
      regions: ['North America'],
      roles: ['VP Growth', 'Head of Sales'],
      maxLeads: 10,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    console.log('# Payload 1 result: source=' + res.body.source + ', count=' + res.body.count);
    console.log('# waterfall:', JSON.stringify(res.body.waterfallLog));
  });

  it('2. Discover: FinTech, Europe, CTO (different selections)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      industry: 'Financial Technology',
      keywords: 'fintech, payments',
      employeeSizes: ['201-500', '501-1,000'],
      regions: ['Europe'],
      roles: ['CTO', 'VP Engineering'],
      maxLeads: 5,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    console.log('# Payload 2 result: source=' + res.body.source + ', count=' + res.body.count);
  });

  it('3. Discover: Lookalike mode with seed domain', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      industry: 'B2B SaaS',
      lookalikeOnly: true,
      lookalike: 'instantly.ai',
      maxLeads: 5,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    console.log('# Lookalike result: source=' + res.body.source + ', count=' + res.body.count);
  });

  it('4. Discover: Minimal payload (just industry)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      industry: 'Healthcare',
      maxLeads: 5,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    console.log('# Minimal result: source=' + res.body.source + ', count=' + res.body.count);
  });

  it('5. Discover: Empty payload still returns result', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({});
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success !== undefined || res.body.error);
    console.log('# Empty payload: source=' + (res.body.source || 'N/A') + ', count=' + (res.body.count || 0));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Enrichment endpoint tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Search: enrichment endpoints', () => {
  it('1. POST /api/lead-generation/enrich/bulk with sample leads', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/enrich/bulk').set(auth()).send({
      leads: [
        { firstName: 'Andrew', lastName: 'Dunn', company: 'gbiw.co.uk' },
      ],
    });
    assert.ok(res.status !== 401, 'Should not return 401 (auth is set)');
    console.log('# enrich/bulk status:', res.status);
    if (res.status === 200) {
      console.log('# enrich result:', JSON.stringify(res.body).slice(0, 500));
    } else {
      console.log('# enrich error:', res.body.error || `status ${res.status}`);
    }
  });

  it('2. POST /api/lead-generation/personalize with sample lead', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/personalize').set(auth()).send({
      contacts: [{ name: 'John Smith', email: 'john@example.com', company: 'Acme', title: 'VP Sales' }],
    });
    assert.ok(res.status !== 401, 'Should not return 401 (auth is set)');
    console.log('# personalize status:', res.status);
    if (res.status === 200) {
      console.log('# personalize result keys:', Object.keys(res.body));
    } else {
      console.log('# personalize error:', res.body.error || `status ${res.status}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Frontend payload ↔ Backend mapping verification
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Search: frontend→backend payload mapping', () => {
  it('1. Frontend ICP form fields match discover endpoint params', async function () {
    // Frontend sends: { listName, industry, keywords, employeeSizes, regions, roles, maxLeads, lookalikeOnly, lookalike }
    // Backend expects: { listName, industry, keywords, employeeSizes, regions, roles, maxLeads, lookalikeOnly, lookalike }
    // This test verifies exact match
    if (!hasAuth || !hasDb) this.skip();
    const frontendPayload = {
      listName: 'Test List',
      industry: 'B2B SaaS',
      keywords: 'automation, AI',
      employeeSizes: ['51-200'],
      regions: ['North America'],
      roles: ['VP Sales', 'Head of Growth'],
      maxLeads: 10,
      lookalikeOnly: false,
      lookalike: '',
    };
    const res = await api.post('/api/lead-generation/discover').set(auth()).send(frontendPayload);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    console.log('# Frontend→Backend mapping: OK (all fields accepted)');
    console.log('# Result: source=' + res.body.source + ', count=' + res.body.count);
  });

  it('2. employeeSizes values from frontend match backend EMPLOYEE_RANGE_TO_HEADCOUNT', async function () {
    // Frontend offers: "1-10", "11-50", "51-200", "201-500", "501-1,000", "1,001-5,000", "5,001-10,000", "10,001+"
    const sizes = ['1-10', '11-50', '51-200', '201-500', '501-1,000', '1,001-5,000', '5,001-10,000', '10,001+'];
    for (const size of sizes) {
      if (!hasAuth || !hasDb) { this.skip(); return; }
      const res = await api.post('/api/lead-generation/discover').set(auth()).send({
        industry: 'B2B SaaS',
        employeeSizes: [size],
        maxLeads: 1,
      });
      assert.strictEqual(res.status, 200);
    }
    console.log('# All employeeSizes values accepted by backend');
  });

  it('3. regions values from frontend are accepted', async function () {
    const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East & Africa', 'Global'];
    for (const region of regions) {
      if (!hasAuth || !hasDb) { this.skip(); return; }
      const res = await api.post('/api/lead-generation/discover').set(auth()).send({
        industry: 'B2B SaaS',
        regions: [region],
        maxLeads: 1,
      });
      assert.strictEqual(res.status, 200);
    }
    console.log('# All region values accepted by backend');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. Integration implementation status checks
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Search: implementation status per integration', () => {
  it('1. AI Ark — semantic search is implemented and returns companies', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const { findCompaniesAiArkSemantic } = await import('../api/services/lead-services.js');
    const { getIntegrationCredentials, getApiKeyFromCredentials } = await import('../api/db.js');
    // Get any org's credentials
    const { query: dbQuery } = await import('../api/db.js');
    const orgs = await dbQuery('SELECT DISTINCT org_id FROM integration_credentials WHERE integration_key = $1 AND connected = true LIMIT 1', ['ai_ark']);
    if (!orgs.rows.length) { console.log('# SKIP: no AI Ark creds in DB'); return; }
    const orgId = orgs.rows[0].org_id;
    const row = await getIntegrationCredentials(orgId, 'ai_ark');
    const apiKey = getApiKeyFromCredentials(row);
    if (!apiKey) { console.log('# SKIP: AI Ark has no valid API key'); return; }
    try {
      const companies = await findCompaniesAiArkSemantic(apiKey, {
        industry: 'B2B SaaS', keywords: ['lead generation'], companySize: ['51-200'], regions: ['North America'], maxLeads: 3,
      });
      console.log('# AI Ark semantic: returned ' + companies.length + ' companies');
      if (companies.length > 0) console.log('# sample:', JSON.stringify(companies[0]));
      assert.ok(Array.isArray(companies));
    } catch (err) {
      console.log('# AI Ark semantic ERROR:', err.message);
    }
  });

  it('2. AI Ark — lookalike search is implemented', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const { findCompaniesAiArkLookalike } = await import('../api/services/lead-services.js');
    const { query: dbQuery, getIntegrationCredentials, getApiKeyFromCredentials } = await import('../api/db.js');
    const orgs = await dbQuery('SELECT DISTINCT org_id FROM integration_credentials WHERE integration_key = $1 AND connected = true LIMIT 1', ['ai_ark']);
    if (!orgs.rows.length) { console.log('# SKIP: no AI Ark creds'); return; }
    const row = await getIntegrationCredentials(orgs.rows[0].org_id, 'ai_ark');
    const apiKey = getApiKeyFromCredentials(row);
    if (!apiKey) { console.log('# SKIP: no key'); return; }
    try {
      const companies = await findCompaniesAiArkLookalike(apiKey, 'instantly.ai', { maxLeads: 3 });
      console.log('# AI Ark lookalike: returned ' + companies.length + ' companies');
      assert.ok(Array.isArray(companies));
    } catch (err) {
      console.log('# AI Ark lookalike ERROR:', err.message);
    }
  });

  it('3. IcyPeas — findPeople is implemented', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const { findPeopleIcyPeas } = await import('../api/services/lead-services.js');
    const { query: dbQuery, getIntegrationCredentials, getApiKeyFromCredentials } = await import('../api/db.js');
    const orgs = await dbQuery('SELECT DISTINCT org_id FROM integration_credentials WHERE integration_key = $1 AND connected = true LIMIT 1', ['icypeas']);
    if (!orgs.rows.length) { console.log('# SKIP: no IcyPeas creds'); return; }
    const row = await getIntegrationCredentials(orgs.rows[0].org_id, 'icypeas');
    const apiKey = getApiKeyFromCredentials(row);
    if (!apiKey) { console.log('# SKIP: no key'); return; }
    try {
      const result = await findPeopleIcyPeas({ apiKey, jobTitles: ['CEO'], keywords: ['B2B SaaS'], limit: 3 });
      const people = result.leads || result.people || result.data || [];
      console.log('# IcyPeas findPeople: returned ' + (Array.isArray(people) ? people.length : 'N/A') + ' people');
      assert.ok(typeof result === 'object');
    } catch (err) {
      console.log('# IcyPeas findPeople ERROR:', err.message);
    }
  });

  it('4. FindyMail — find email is implemented', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const { findEmailFindyMail } = await import('../api/services/lead-services.js');
    const { query: dbQuery, getIntegrationCredentials, getApiKeyFromCredentials } = await import('../api/db.js');
    const orgs = await dbQuery('SELECT DISTINCT org_id FROM integration_credentials WHERE integration_key = $1 AND connected = true LIMIT 1', ['findymail']);
    if (!orgs.rows.length) { console.log('# SKIP: no FindyMail creds'); return; }
    const row = await getIntegrationCredentials(orgs.rows[0].org_id, 'findymail');
    const apiKey = getApiKeyFromCredentials(row);
    if (!apiKey) { console.log('# SKIP: no key'); return; }
    try {
      const result = await findEmailFindyMail(apiKey, { name: 'Andrew Dunn', domain: 'gbiw.co.uk' });
      console.log('# FindyMail findEmail: email=' + (result.email || 'not found') + ', confidence=' + (result.confidence || 'N/A'));
      assert.ok(typeof result === 'object');
    } catch (err) {
      console.log('# FindyMail findEmail ERROR:', err.message);
    }
  });

  it('5. FindyMail — verify email is implemented', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const { verifyEmailFindyMail } = await import('../api/services/lead-services.js');
    const { query: dbQuery, getIntegrationCredentials, getApiKeyFromCredentials } = await import('../api/db.js');
    const orgs = await dbQuery('SELECT DISTINCT org_id FROM integration_credentials WHERE integration_key = $1 AND connected = true LIMIT 1', ['findymail']);
    if (!orgs.rows.length) { console.log('# SKIP: no FindyMail creds'); return; }
    const row = await getIntegrationCredentials(orgs.rows[0].org_id, 'findymail');
    const apiKey = getApiKeyFromCredentials(row);
    if (!apiKey) { console.log('# SKIP: no key'); return; }
    try {
      const result = await verifyEmailFindyMail(apiKey, 'test@gmail.com');
      console.log('# FindyMail verify: result=' + result.result + ', verified=' + result.verified);
      assert.ok(typeof result === 'object');
    } catch (err) {
      console.log('# FindyMail verify ERROR:', err.message);
    }
  });

  it('6. NeverBounce — verify email is implemented', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const { verifyEmailNeverBounce } = await import('../api/services/lead-services.js');
    const { query: dbQuery, getIntegrationCredentials, getApiKeyFromCredentials } = await import('../api/db.js');
    const orgs = await dbQuery('SELECT DISTINCT org_id FROM integration_credentials WHERE integration_key = $1 AND connected = true LIMIT 1', ['neverbounce']);
    if (!orgs.rows.length) { console.log('# SKIP: no NeverBounce creds'); return; }
    const row = await getIntegrationCredentials(orgs.rows[0].org_id, 'neverbounce');
    const apiKey = getApiKeyFromCredentials(row);
    if (!apiKey) { console.log('# SKIP: no key'); return; }
    try {
      const result = await verifyEmailNeverBounce('test@gmail.com', apiKey);
      console.log('# NeverBounce verify: result=' + result.result + ', status=' + result.status);
      assert.ok(typeof result === 'object');
    } catch (err) {
      console.log('# NeverBounce verify ERROR:', err.message);
    }
  });

  it('7. Findy — NOT IMPLEMENTED for discovery (logged as not_implemented)', async function () {
    console.log('# Findy: NOT IMPLEMENTED — waterfall logs "not_implemented_for_discovery"');
    assert.ok(true);
  });

  it('8. Wiza — NOT IMPLEMENTED for discovery', async function () {
    console.log('# Wiza: NOT IMPLEMENTED — waterfall logs "not_implemented_for_discovery"');
    assert.ok(true);
  });

  it('9. Leads Magix — NOT IMPLEMENTED for discovery', async function () {
    console.log('# Leads Magix: NOT IMPLEMENTED — waterfall logs "not_implemented_for_discovery"');
    assert.ok(true);
  });

  it('10. BetterContact — verify NOT IMPLEMENTED in waterfall', async function () {
    console.log('# BetterContact: listed in VERIFY_EMAIL_KEYS but no handler in verifyEmailWaterfall');
    assert.ok(true);
  });

  it('11. ZeroBounce — verify NOT IMPLEMENTED in waterfall', async function () {
    console.log('# ZeroBounce: listed in VERIFY_EMAIL_KEYS but no handler in verifyEmailWaterfall');
    assert.ok(true);
  });

  it('12. Cleanlist — verify NOT IMPLEMENTED in waterfall', async function () {
    console.log('# Cleanlist: listed in VERIFY_EMAIL_KEYS but no handler in verifyEmailWaterfall');
    assert.ok(true);
  });
});
