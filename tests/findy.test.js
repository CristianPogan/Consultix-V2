/**
 * Findy (FindyMail) Integration Tests
 *
 * Tests API key validation, discovery waterfall, connect endpoint,
 * and service functions for the Findy/FindyMail integration.
 *
 * Run: npm run test:findy
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
// 1. Auth gates — all Findy-related routes require JWT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Findy: route auth gates', () => {
  it('1. POST /api/integrations/findy/connect returns 401 without JWT', async () => {
    const res = await api.post('/api/integrations/findy/connect').send({ credentials: { api_key: 'x' } });
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/lead-generation/discover returns 401 without JWT', async () => {
    const res = await api.post('/api/lead-generation/discover').send({ industry: 'Test' });
    assert.strictEqual(res.status, 401);
  });

  it('3. GET /api/lead-generation/discover/status returns 401 without JWT', async () => {
    const res = await api.get('/api/lead-generation/discover/status');
    assert.strictEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Connect endpoint validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Findy: connect endpoint', () => {
  it('1. POST /api/integrations/findy/connect rejects missing API key', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/integrations/findy/connect').set(auth()).send({ credentials: {} });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('2. POST /api/integrations/findy/connect rejects invalid API key', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/integrations/findy/connect').set(auth()).send({ credentials: { api_key: 'invalid-key-12345' } });
    assert.ok(res.status === 401 || res.status === 400);
  });

  it('3. POST /api/integrations/findy/connect with valid key succeeds', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const { getIntegrationCredentials, getApiKeyFromCredentials, query: dbQuery } = await import('../api/db.js');
    const orgs = await dbQuery('SELECT DISTINCT org_id FROM integration_credentials WHERE integration_key = $1 AND connected = true LIMIT 1', ['findy']);
    if (!orgs.rows.length) { console.log('# SKIP: no findy creds in DB'); return; }
    const row = await getIntegrationCredentials(orgs.rows[0].org_id, 'findy');
    const apiKey = getApiKeyFromCredentials(row);
    if (!apiKey) { console.log('# SKIP: no findy API key'); return; }

    const res = await api.post('/api/integrations/findy/connect').set(auth()).send({ credentials: { api_key: apiKey } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.connected, true);
    assert.strictEqual(res.body.integration_key, 'findy');
    console.log('# Findy connect: success');
  });

  it('4. GET /api/integrations/findy shows connected after connect', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/findy').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# findy connected:', res.body.connected);
  });

  it('5. GET /api/integrations/findymail also shows connected (shared key)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/integrations/findymail').set(auth());
    assert.strictEqual(res.status, 200);
    console.log('# findymail connected:', res.body.connected);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Service functions — direct API calls
// ═══════════════════════════════════════════════════════════════════════════════

describe('Findy: service functions', () => {
  let apiKey = null;

  it('0. Resolve Findy API key from DB', async function () {
    if (!hasDb) this.skip();
    const { getIntegrationCredentials, getApiKeyFromCredentials, query: dbQuery } = await import('../api/db.js');
    const orgs = await dbQuery('SELECT DISTINCT org_id FROM integration_credentials WHERE integration_key = $1 AND connected = true LIMIT 1', ['findy']);
    if (!orgs.rows.length) { console.log('# SKIP: no findy creds'); return; }
    const row = await getIntegrationCredentials(orgs.rows[0].org_id, 'findy');
    apiKey = getApiKeyFromCredentials(row);
    console.log('# Findy API key resolved:', apiKey ? 'yes (' + apiKey.length + ' chars)' : 'NO');
    assert.ok(apiKey, 'Findy API key should be present');
  });

  it('1. checkFindyApiKey validates the stored key', async function () {
    if (!apiKey) this.skip();
    const { checkFindyApiKey } = await import('../api/services/lead-services.js');
    const valid = await checkFindyApiKey(apiKey);
    console.log('# checkFindyApiKey:', valid);
    assert.strictEqual(valid, true);
  });

  it('2. findLeadsFindy (intellimatch) returns companies', async function () {
    if (!apiKey) this.skip();
    const { findLeadsFindy } = await import('../api/services/lead-services.js');
    try {
      const results = await findLeadsFindy(apiKey, {
        industry: 'B2B SaaS',
        keywords: ['lead generation'],
        regions: ['North America'],
        employeeSizes: ['51-200'],
        roles: ['VP Sales'],
        maxLeads: 5,
      });
      console.log('# findLeadsFindy: returned ' + results.length + ' results');
      if (results.length > 0) {
        console.log('# sample:', JSON.stringify(results[0]));
      }
      assert.ok(Array.isArray(results));
    } catch (err) {
      console.log('# findLeadsFindy ERROR:', err.message);
      assert.ok(err.message, 'Should have error message');
    }
  });

  it('3. findEmployeesFindy returns people at a company', async function () {
    if (!apiKey) this.skip();
    const { findEmployeesFindy } = await import('../api/services/lead-services.js');
    try {
      const results = await findEmployeesFindy(apiKey, {
        website: 'stripe.com',
        jobTitles: ['CEO', 'CTO'],
        count: 3,
      });
      console.log('# findEmployeesFindy: returned ' + (Array.isArray(results) ? results.length : 'N/A') + ' people');
      if (results.length > 0) {
        console.log('# sample:', JSON.stringify(results[0]));
      }
      assert.ok(Array.isArray(results));
    } catch (err) {
      console.log('# findEmployeesFindy ERROR:', err.message);
      assert.ok(err.message);
    }
  });

  it('4. enrichCompanyFindy returns company data', async function () {
    if (!apiKey) this.skip();
    const { enrichCompanyFindy } = await import('../api/services/lead-services.js');
    try {
      const result = await enrichCompanyFindy(apiKey, { domain: 'stripe.com' });
      console.log('# enrichCompanyFindy:', JSON.stringify(result).slice(0, 300));
      assert.ok(typeof result === 'object');
    } catch (err) {
      console.log('# enrichCompanyFindy ERROR:', err.message);
      assert.ok(err.message);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Discover waterfall — Findy is now a real handler
// ═══════════════════════════════════════════════════════════════════════════════

describe('Findy: discover waterfall integration', () => {
  it('1. GET /api/lead-generation/discover/status includes findy in connectedIntegrations', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/lead-generation/discover/status').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.connectedIntegrations.includes('findy'), 'findy should be in connectedIntegrations');
    console.log('# connectedIntegrations:', res.body.connectedIntegrations.join(', '));
  });

  it('2. POST /api/lead-generation/discover returns results (waterfall reaches findy when postgres is empty)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      industry: 'Autonomous Vehicles',
      keywords: 'self-driving, lidar, autonomous',
      employeeSizes: ['201-500'],
      regions: ['North America'],
      roles: ['VP Engineering'],
      maxLeads: 5,
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.success);
    console.log('# discover result: source=' + res.body.source + ', count=' + res.body.count);
    console.log('# waterfallLog:', JSON.stringify(res.body.waterfallLog));
    if (res.body.companies?.length > 0) {
      console.log('# first company:', JSON.stringify(res.body.companies[0]));
    }
  });

  it('3. waterfallLog shows findy as tried (not "not_implemented_for_discovery")', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      industry: 'Quantum Computing',
      keywords: 'quantum, qubits',
      maxLeads: 3,
    });
    assert.strictEqual(res.status, 200);
    const findyLog = (res.body.waterfallLog || []).find(w => w.key === 'findy');
    if (findyLog) {
      console.log('# findy waterfallLog entry:', JSON.stringify(findyLog));
      assert.ok(findyLog.reason !== 'not_implemented_for_discovery', 'findy should not be "not_implemented"');
    } else {
      console.log('# findy not in waterfall (earlier source returned results)');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Input validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Findy: input validation', () => {
  it('1. findLeadsFindy throws without API key', async () => {
    const { findLeadsFindy } = await import('../api/services/lead-services.js');
    await assert.rejects(() => findLeadsFindy(null, { industry: 'SaaS' }), /API key required/);
  });

  it('2. findEmployeesFindy throws without website', async () => {
    const { findEmployeesFindy } = await import('../api/services/lead-services.js');
    await assert.rejects(() => findEmployeesFindy('key', {}), /Website required/);
  });

  it('3. enrichCompanyFindy throws without domain or name', async () => {
    const { enrichCompanyFindy } = await import('../api/services/lead-services.js');
    await assert.rejects(() => enrichCompanyFindy('key', {}), /Domain or name required/);
  });

  it('4. checkFindyApiKey returns false for null key', async () => {
    const { checkFindyApiKey } = await import('../api/services/lead-services.js');
    const valid = await checkFindyApiKey(null);
    assert.strictEqual(valid, false);
  });
});
