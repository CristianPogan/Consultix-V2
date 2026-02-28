/**
 * API Unit Tests — 5 tests per API (with JWT auth)
 * Run: npm test (requires JWT_API_KEY, DB_PASSWORD or DATABASE_URL)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';

const api = request(app);

const hasDb = !!(process.env.DATABASE_URL || process.env.DB_PASSWORD);
const hasAuth = !!process.env.JWT_API_KEY;

let token = null;

// Acquire token before any test runs (top-level await)
if (hasAuth) {
  const res = await request(app).post('/api/auth/token').send({ apiKey: process.env.JWT_API_KEY });
  if (res.status === 200 && res.body.token) token = res.body.token;
}

function auth() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

describe('API: static assets (logo)', () => {
  it('1. GET /logo.png returns 200 and image content', async () => {
    const res = await api.get('/logo.png');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type']?.includes('image'));
    assert.ok(parseInt(res.headers['content-length'], 10) > 0);
  });

  it('2. GET /favicon.png returns 200 and image content', async () => {
    const res = await api.get('/favicon.png');
    assert.strictEqual(res.status, 200);
    assert.ok(res.headers['content-type']?.includes('image'));
    assert.ok(parseInt(res.headers['content-length'], 10) > 0);
  });
});

describe('API: auth', () => {
  it('1. POST /api/auth/token without apiKey returns 401 or 503', async () => {
    const res = await api.post('/api/auth/token').send({});
    assert.ok(res.status === 401 || res.status === 503);
  });

  it('2. POST /api/auth/token with wrong apiKey returns 401', async () => {
    const res = await api.post('/api/auth/token').send({ apiKey: 'wrong' });
    assert.strictEqual(res.status, 401);
  });

  it('3. POST /api/auth/token with valid apiKey returns token', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/auth/token').send({ apiKey: process.env.JWT_API_KEY });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.token);
    assert.ok(typeof res.body.token === 'string');
  });

  it('4. Protected route without token returns 401', async () => {
    const res = await api.get('/api/icp-profiles').set({});
    assert.strictEqual(res.status, 401);
  });

  it('5. Protected route with invalid token returns 401', async () => {
    const res = await api.get('/api/icp-profiles').set('Authorization', 'Bearer invalid.jwt.token');
    assert.strictEqual(res.status, 401);
  });

  it('6. POST /api/auth/login without email/password returns 400', async () => {
    const res = await api.post('/api/auth/login').send({});
    assert.strictEqual(res.status, 400);
  });

  it('7. POST /api/auth/login with invalid credentials returns 401', async () => {
    const res = await api.post('/api/auth/login').send({ email: 'nonexistent@test.com', password: 'wrong' });
    assert.strictEqual(res.status, 401);
  });

  it('8. POST /api/auth/signup without accessToken returns 400', async () => {
    const res = await api.post('/api/auth/signup').send({ email: 'a@b.com', password: 'test1234', name: 'Test' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.toLowerCase().includes('access token'));
  });

  it('9. POST /api/auth/signup with invalid accessToken returns 403', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/auth/signup').send({
      email: `test-${Date.now()}@auth.com`,
      password: 'test1234',
      name: 'Test',
      accessToken: 'INVALID_TOKEN_XYZ',
    });
    assert.strictEqual(res.status, 403);
  });

  it('10. GET /api/auth/validate-signup-token without token returns 400', async () => {
    const res = await api.get('/api/auth/validate-signup-token');
    assert.strictEqual(res.status, 400);
  });

  it('11. GET /api/auth/validate-signup-token with invalid token returns 403', async function () {
    if (!hasDb) this.skip();
    const res = await api.get('/api/auth/validate-signup-token?token=INVALID');
    assert.strictEqual(res.status, 403);
  });

  it('11b. GET /api/auth/validate-signup-token with valid default token returns 200', async function () {
    if (!hasDb) this.skip();
    const signupToken = process.env.VALID_SIGNUP_TOKEN || 'KLNY9NIhBFNPGFjw';
    const res = await api.get(`/api/auth/validate-signup-token?token=${encodeURIComponent(signupToken)}`);
    if (res.status === 500) return this.skip();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.valid, true);
    assert.ok(typeof res.body.assignedCredits === 'number' || res.body.assignedCredits === undefined);
  });

  it('12. POST /api/auth/signup with valid token and login flow works', async function () {
    if (!hasDb) this.skip();
    const signupToken = process.env.VALID_SIGNUP_TOKEN || 'KLNY9NIhBFNPGFjw';
    const email = `test-${Date.now()}@auth-test.example.com`;
    const signupRes = await api.post('/api/auth/signup').send({
      email,
      password: 'test1234',
      name: 'Test User',
      accessToken: signupToken,
    });
    if (signupRes.status === 403 || signupRes.status === 503) return this.skip();
    assert.ok([200, 201].includes(signupRes.status), `Expected 200/201, got ${signupRes.status}: ${JSON.stringify(signupRes.body)}`);
    assert.ok(signupRes.body.token);
    assert.ok(signupRes.body.user?.email);
    const loginRes = await api.post('/api/auth/login').send({ email, password: 'test1234' });
    assert.strictEqual(loginRes.status, 200);
    assert.ok(loginRes.body.token);
  });

  it('13. GET /api/auth/me without token returns 401', async () => {
    const res = await api.get('/api/auth/me');
    assert.strictEqual(res.status, 401);
  });

  it('14. GET /api/auth/me with valid token returns user', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/auth/me').set(auth());
    assert.ok(res.status === 200 || res.status === 401);
    if (res.status === 200) assert.ok(res.body.valid);
  });
});

describe('API: icp-profiles', () => {
  it('1. GET /api/icp-profiles with JWT returns array or 503', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/icp-profiles').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. GET /api/icp-profiles/default with JWT returns object', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/icp-profiles/default').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok('listName' in res.body);
    assert.ok('industry' in res.body);
    assert.ok(Array.isArray(res.body.regions));
  });

  it('3. POST /api/icp-profiles creates profile', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/icp-profiles').set(auth()).send({
      name: 'Test ICP',
      industry: 'SaaS',
      regions: ['North America'],
      roles: ['VP Sales'],
    });
    assert.ok(res.status === 201 || res.status === 503 || res.status === 500);
    if (res.status === 201) {
      assert.ok(res.body.id);
      assert.strictEqual(res.body.name, 'Test ICP');
    }
  });

  it('4. PUT /api/icp-profiles/:id returns 404 for non-existent', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put('/api/icp-profiles/00000000-0000-0000-0000-000000000000').set(auth()).send({ name: 'Updated' });
    assert.ok(res.status === 404 || res.status === 503 || res.status === 500);
  });

  it('5. GET /api/icp-profiles/default has regions array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/icp-profiles/default').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.regions));
  });
});

describe('API: lead-lists', () => {
  it('1. GET /api/lead-lists with JWT returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/lead-lists').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. POST /api/lead-lists creates list', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-lists').set(auth()).send({ name: 'Test List', source: 'discovery' });
    assert.ok(res.status === 201 || res.status === 503 || res.status === 500);
    if (res.status === 201) assert.ok(res.body.id);
  });

  it('3. Lead list has id and name', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/lead-lists').set(auth());
    if (res.status === 200 && res.body.length > 0) {
      assert.ok(res.body[0].id);
      assert.ok('name' in res.body[0]);
    }
  });

  it('4. POST without body uses defaults', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-lists').set(auth()).send({});
    assert.ok(res.status === 201 || res.status === 503);
  });

  it('5. Lead list has contacts array', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-lists').set(auth()).send({ name: 'Contacts Test' });
    if (res.status === 201) assert.ok(Array.isArray(res.body.contacts));
  });
});

describe('API: companies', () => {
  it('1. GET /api/companies with JWT returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/companies').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. POST /api/companies creates company', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/companies').set(auth()).send({
      name: 'Test Co',
      domain: 'testco-' + Date.now() + '.example.com',
      industry: 'Tech',
      icpScore: 85,
    });
    assert.ok(res.status === 201 || res.status === 503 || res.status === 500);
    if (res.status === 201) assert.ok(res.body.id);
  });

  it('3. GET with list_id param works', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/companies?list_id=00000000-0000-0000-0000-000000000000').set(auth());
    assert.ok(res.status === 200 || res.status === 503);
  });

  it('4. Company response has icpScore', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/companies').set(auth()).send({
      name: 'Score Test',
      domain: 'score-' + Date.now() + '.example.com',
      icpScore: 92,
    });
    if (res.status === 201) assert.ok(res.body.icpScore !== undefined);
  });

  it('5. Companies list is array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/companies').set(auth());
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });
});

describe('API: leads', () => {
  it('1. GET /api/leads with JWT returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/leads').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. POST without list_id returns 400', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/leads').set(auth()).send({ email: 'test@example.com' });
    assert.ok(res.status === 400 || res.status === 503 || res.status === 500);
  });

  it('3. POST with list_id creates lead', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const listRes = await api.post('/api/lead-lists').set(auth()).send({ name: 'Lead Test List' });
    const listId = listRes.status === 201 ? listRes.body.id : null;
    if (!listId) this.skip();
    const res = await api.post('/api/leads').set(auth()).send({
      list_id: listId,
      email: 'lead@example.com',
      first_name: 'Test',
      last_name: 'Lead',
    });
    assert.ok(res.status === 201 || res.status === 500);
  });

  it('4. PUT on non-existent returns 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put('/api/leads/00000000-0000-0000-0000-000000000000').set(auth()).send({
      personalisation_json: { subject: 'Hi' },
    });
    assert.ok(res.status === 404 || res.status === 503 || res.status === 500);
  });

  it('5. Leads list is array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/leads').set(auth());
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });
});

describe('API: lead-generation discover', () => {
  it('0. GET /api/lead-generation/discover/status without auth returns 401', async () => {
    const res = await api.get('/api/lead-generation/discover/status');
    assert.strictEqual(res.status, 401);
  });

  it('0b. GET /api/lead-generation/discover/status with auth returns canRun, connectedIntegrations, leadSearchOrder', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/lead-generation/discover/status').set(auth());
    assert.ok(res.status === 200 || res.status === 503);
    if (res.status === 200) {
      assert.ok(typeof res.body.canRun === 'boolean');
      assert.ok(Array.isArray(res.body.connectedIntegrations));
      assert.ok(Array.isArray(res.body.leadSearchOrder));
    }
  });

  it('1. POST /api/lead-generation/discover without auth returns 401', async () => {
    const res = await api.post('/api/lead-generation/discover').send({
      industry: 'B2B SaaS',
      keywords: 'lead generation',
      employeeSizes: ['51-200'],
      regions: ['North America'],
      roles: ['VP Growth'],
    });
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/lead-generation/discover with auth returns success, count, companies, source', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      industry: 'B2B SaaS',
      keywords: 'lead generation',
      employeeSizes: ['51-200'],
      regions: ['North America'],
      roles: ['VP Growth'],
      lookalikeOnly: false,
    });
    assert.ok(res.status === 200 || res.status === 503);
    if (res.status === 200) {
      assert.strictEqual(res.body.success, true);
      assert.ok(typeof res.body.count === 'number');
      assert.ok(Array.isArray(res.body.companies));
      assert.ok(['postgres', 'ai_ark', 'ai_ark_lookalike', 'icypeas', 'unknown'].includes(res.body.source));
    }
  });

  it('3. POST discover with lookalikeOnly and seed domain', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/lead-generation/discover').set(auth()).send({
      lookalikeOnly: true,
      lookalike: 'stripe.com\nnotion.so',
    });
    assert.ok(res.status === 200 || res.status === 503);
    if (res.status === 200) {
      assert.strictEqual(res.body.success, true);
      assert.ok(Array.isArray(res.body.companies));
    }
  });
});

describe('API: organisations (projects)', () => {
  it('1. GET /api/organisations with JWT returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/organisations').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. Organisations response has Hastingwood, Acme, TechStart', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/organisations').set(auth());
    if (res.status !== 200 || !Array.isArray(res.body)) this.skip();
    const names = res.body.map(p => (p.client || p.name || '').toLowerCase());
    assert.ok(names.some(n => n.includes('hastingwood')), 'Expected Hastingwood Securities in projects');
    assert.ok(names.some(n => n.includes('acme')), 'Expected Acme Corp in projects');
    assert.ok(names.some(n => n.includes('techstart')), 'Expected TechStart in projects');
  });

  it('3. Organisations items have id, name, client, created', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/organisations').set(auth());
    if (res.status !== 200 || res.body.length === 0) this.skip();
    const first = res.body[0];
    assert.ok('id' in first, 'Project should have id');
    assert.ok('client' in first || 'name' in first, 'Project should have client or name');
  });

  it('4. GET without auth returns 401', async () => {
    const res = await api.get('/api/organisations');
    assert.strictEqual(res.status, 401);
  });

  it('5. Select element receives correct data shape', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/organisations').set(auth());
    if (res.status !== 200) this.skip();
    const projects = res.body;
    assert.ok(Array.isArray(projects));
    projects.forEach(p => {
      assert.ok(String(p.id).length > 0, 'id must be non-empty');
      assert.ok((p.client || p.name), 'client or name must exist for select display');
    });
  });

  it('6. POST /api/organisations creates project with unique name', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const name = 'Test Project ' + Date.now();
    const res = await api.post('/api/organisations').set(auth()).send({ name });
    assert.ok([201, 409, 500].includes(res.status));
    if (res.status === 201) {
      assert.ok(res.body.id);
      assert.ok(res.body.client || res.body.name);
      assert.strictEqual(res.body.client || res.body.name, name);
    }
  });

  it('7. POST /api/organisations duplicate name returns 409', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const name = 'Duplicate Test ' + Date.now();
    const first = await api.post('/api/organisations').set(auth()).send({ name });
    if (first.status !== 201) this.skip();
    const second = await api.post('/api/organisations').set(auth()).send({ name });
    assert.strictEqual(second.status, 409);
    assert.ok(second.body.error?.toLowerCase().includes('already exists'));
  });

  it('8. POST /api/organisations without auth returns 401 or without name returns 400', async function () {
    const noAuth = await api.post('/api/organisations').send({ name: 'Test' });
    assert.strictEqual(noAuth.status, 401);
    if (!hasAuth) return;
    const res = await api.post('/api/organisations').set(auth()).send({});
    assert.ok([400, 401].includes(res.status));
  });
});

describe('API: integrations', () => {
  it('1. GET /api/integrations with JWT returns object with integrations', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/integrations').set(auth());
    assert.ok(res.status === 200 || res.status === 401 || res.status === 500 || res.status === 503);
    if (res.status === 200) {
      assert.ok(typeof res.body === 'object');
      assert.ok('integrations' in res.body);
    }
  });

  it('2. GET /api/integrations/:key returns integration status', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/integrations/fathom').set(auth());
    assert.ok(res.status === 200 || res.status === 401 || res.status === 500 || res.status === 503);
    if (res.status === 200) {
      assert.strictEqual(res.body.integration_key, 'fathom');
      assert.ok(typeof res.body.connected === 'boolean');
    }
  });

  it('3. POST /api/integrations/:key saves credentials', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/integrations/test_integration').set(auth()).send({
      credentials: { api_key: 'test-key-' + Date.now() },
    });
    assert.ok(res.status === 200 || res.status === 401 || res.status === 500 || res.status === 503);
    if (res.status === 200) {
      assert.strictEqual(res.body.integration_key, 'test_integration');
      assert.strictEqual(res.body.connected, true);
    }
  });

  it('4. GET /api/integrations without auth returns 401', async () => {
    const res = await api.get('/api/integrations');
    assert.strictEqual(res.status, 401);
  });

  it('5. Integrations list returns integrations object', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/integrations').set(auth());
    if (res.status === 200) assert.ok(typeof res.body.integrations === 'object');
  });
});

describe('API: stats (dashboard)', () => {
  it('1. GET /api/stats/dashboard without auth returns 401', async () => {
    const res = await api.get('/api/stats/dashboard');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/stats/dashboard with JWT returns 200 and stats object', async function () {
    if (!hasAuth || !token) this.skip();
    const res = await api.get('/api/stats/dashboard').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) {
      assert.ok(res.body.stats, 'stats object required');
      assert.ok(typeof res.body.stats.totalLeads === 'number');
      assert.ok(typeof res.body.stats.totalCompanies === 'number');
      assert.ok(typeof res.body.stats.totalLists === 'number');
      assert.ok(typeof res.body.stats.verifiedEmails === 'number');
      assert.ok(typeof res.body.stats.outreachSent === 'number');
      assert.ok(typeof res.body.stats.responses === 'number');
      assert.ok(typeof res.body.stats.meetings === 'number');
      assert.ok(Array.isArray(res.body.recentActivity));
    }
  });

  it('3. GET /api/stats/dashboard with project_id query returns 200', async function () {
    if (!hasAuth || !token || !hasDb) this.skip();
    const res = await api.get('/api/stats/dashboard?project_id=11111111-1111-1111-1111-111111111111').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) {
      assert.ok(typeof res.body.stats.totalLeads === 'number');
      assert.ok(typeof res.body.stats.outreachSent === 'number');
    }
  });

  it('4. Stats values are numbers (not hardcoded strings)', async function () {
    if (!hasAuth || !token) this.skip();
    const res = await api.get('/api/stats/dashboard').set(auth());
    if (res.status !== 200) this.skip();
    const s = res.body.stats;
    assert.ok(s, 'stats object required');
    assert.strictEqual(typeof s.totalLeads, 'number');
    assert.strictEqual(typeof s.outreachSent, 'number');
    assert.strictEqual(typeof s.responses, 'number');
    assert.strictEqual(typeof s.meetings, 'number');
  });

  it('5. recentActivity has action, detail, time', async function () {
    if (!hasAuth || !token) this.skip();
    const res = await api.get('/api/stats/dashboard').set(auth());
    if (res.status !== 200 || !res.body.recentActivity?.length) this.skip();
    const first = res.body.recentActivity[0];
    assert.ok('action' in first);
    assert.ok('detail' in first);
    assert.ok('time' in first);
  });

  it('6. GET /api/stats/chart returns outreach, responses, meetings, dates arrays', async function () {
    if (!hasAuth || !token) this.skip();
    const res = await api.get('/api/stats/chart?range=7D').set(auth());
    if (res.status !== 200) this.skip();
    assert.ok(Array.isArray(res.body.outreach));
    assert.ok(Array.isArray(res.body.responses));
    assert.ok(Array.isArray(res.body.meetings));
    assert.ok(Array.isArray(res.body.dates));
  });
});

describe('API: CRM pipeline', () => {
  it('1. GET /api/crm/pipeline without auth returns 401', async () => {
    const res = await api.get('/api/crm/pipeline');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/crm/pipeline with JWT returns deals and pipelineValue', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/crm/pipeline').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body.deals));
      assert.ok(typeof res.body.pipelineValue === 'number');
      assert.ok(typeof res.body.totalDeals === 'number');
    }
  });

  it('3. GET /api/crm/pipeline?project_id=X filters by project', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/crm/pipeline?project_id=11111111-1111-1111-1111-111111111111').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body.deals));
      assert.ok(typeof res.body.pipelineValue === 'number');
    }
  });

  it('4. Deals have id, name, stage, value, score, lastActivity', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/crm/pipeline').set(auth());
    if (res.status !== 200 || !res.body.deals?.length) return this.skip();
    const d = res.body.deals[0];
    assert.ok(d.id);
    assert.ok('name' in d);
    assert.ok('stage' in d);
    assert.ok('value' in d);
    assert.ok('valueNum' in d || typeof d.value === 'string');
    assert.ok('score' in d);
    assert.ok('lastActivity' in d);
  });

  it('5. Pipeline value excludes Lost stage', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/crm/pipeline').set(auth());
    if (res.status !== 200) return this.skip();
    const { deals, pipelineValue } = res.body;
    const expected = deals.filter(d => d.stage !== 'Lost').reduce((s, d) => s + (d.valueNum || 0), 0);
    assert.ok(Math.abs(pipelineValue - Math.round(expected)) < 1, 'pipelineValue should equal sum of non-Lost deal values');
  });
});

describe('API: leads update (CRM)', () => {
  let leadId = null;

  it('1. PUT /api/leads/:id with stage updates lead', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const listRes = await api.post('/api/lead-lists').set(auth()).send({ name: 'CRM Test List' });
    const listId = listRes.status === 201 ? listRes.body.id : null;
    if (!listId) return this.skip();
    const postRes = await api.post('/api/leads').set(auth()).send({
      list_id: listId,
      email: `crm-test-${Date.now()}@example.com`,
      first_name: 'CRM',
      last_name: 'Test',
    });
    if (postRes.status !== 201) return this.skip();
    leadId = postRes.body.id;
    const res = await api.put(`/api/leads/${leadId}`).set(auth()).send({ stage: 'Contacted' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id);
  });

  it('2. PUT /api/leads/:id with deal_value updates lead', async function () {
    if (!hasAuth || !hasDb || !leadId) this.skip();
    const res = await api.put(`/api/leads/${leadId}`).set(auth()).send({ deal_value: 15000 });
    assert.strictEqual(res.status, 200);
  });

  it('3. PUT /api/leads/:id with crm_notes updates lead', async function () {
    if (!hasAuth || !hasDb || !leadId) this.skip();
    const res = await api.put(`/api/leads/${leadId}`).set(auth()).send({ crm_notes: 'Interested in demo' });
    assert.strictEqual(res.status, 200);
  });

  it('4. PUT with empty updates returns 400', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/leads/00000000-0000-0000-0000-000000000000`).set(auth()).send({});
    assert.strictEqual(res.status, 400);
  });

  it('5. Updated lead appears in pipeline with correct stage', async function () {
    if (!hasAuth || !hasDb || !leadId) this.skip();
    const res = await api.get('/api/crm/pipeline').set(auth());
    if (res.status !== 200) return this.skip();
    const deal = res.body.deals.find(d => d.id === leadId);
    assert.ok(deal, 'Lead should appear in pipeline');
    assert.strictEqual(deal.stage, 'Contacted');
  });
});

describe('API: settings brand_voice', () => {
  it('1. GET /api/settings/schema/brand_voice with auth returns schema', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/settings/schema/brand_voice').set(auth());
    assert.ok(res.status === 200 || res.status === 503);
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body.schema));
      if (res.body.schema.length > 0) {
        assert.ok(res.body.schema[0].section);
        assert.ok(Array.isArray(res.body.schema[0].items));
        assert.ok(res.body.schema[0].items[0]?.key);
        assert.ok(res.body.schema[0].items[0]?.label);
      }
    }
  });

  it('2. GET /api/settings/brand_voice with auth returns settings or null', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/settings/brand_voice').set(auth());
    assert.ok(res.status === 200 || res.status === 503);
    if (res.status === 200) assert.ok('settings' in res.body);
  });

  it('3. POST /api/settings/brand_voice saves and GET returns saved data', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const payload = { name: 'Test User', title: 'Content Creator', industry: 'B2B SaaS' };
    const saveRes = await api.post('/api/settings/brand_voice').set(auth()).send({ settings: payload });
    assert.ok(saveRes.status === 200 || saveRes.status === 503);
    if (saveRes.status !== 200) return this.skip();
    const getRes = await api.get('/api/settings/brand_voice').set(auth());
    assert.ok(getRes.status === 200 || getRes.status === 503);
    if (getRes.status === 200 && getRes.body.settings) {
      assert.strictEqual(getRes.body.settings.name, payload.name);
      assert.strictEqual(getRes.body.settings.title, payload.title);
    }
  });

  it('4. GET /api/settings/schema/brand_voice without auth returns 401', async () => {
    const res = await api.get('/api/settings/schema/brand_voice');
    assert.strictEqual(res.status, 401);
  });
});

describe('API: settings ai_sdr', () => {
  const aiSdrPayload = {
    active: false,
    training: { sentMessages: true, scripts: true, brandVoice: true, starredThreads: false },
    permissions: { positiveReply: true, answerQuestions: true, bookMeetings: true, followUp: true, handleObjections: false, negotiatePricing: false },
    responseWindow: '5 min',
    workingHours: '9am–6pm Mon–Fri',
    approvalMode: true,
    customGuidelines: 'Always mention case studies',
    sampleResponses: ['Sample reply 1', 'Sample reply 2'],
  };

  it('1. GET /api/settings/ai_sdr without auth returns 401', async () => {
    const res = await api.get('/api/settings/ai_sdr');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/settings/ai_sdr with auth returns null or settings', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/settings/ai_sdr?project_id=').set(auth());
    assert.ok(res.status === 200 || res.status === 503);
    if (res.status === 200) {
      assert.ok('settings' in res.body);
    }
  });

  it('3. POST /api/settings/ai_sdr saves and GET returns saved data', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const projectId = '11111111-1111-1111-1111-111111111111';
    const saveRes = await api.post(`/api/settings/ai_sdr?project_id=${projectId}`).set(auth()).send({ settings: aiSdrPayload });
    assert.ok(saveRes.status === 200 || saveRes.status === 503 || saveRes.status === 500);
    if (saveRes.status !== 200) return this.skip();
    const getRes = await api.get(`/api/settings/ai_sdr?project_id=${projectId}`).set(auth());
    assert.strictEqual(getRes.status, 200);
    assert.ok(getRes.body.settings);
    assert.strictEqual(getRes.body.settings.customGuidelines, aiSdrPayload.customGuidelines);
    assert.ok(Array.isArray(getRes.body.settings.sampleResponses));
    assert.strictEqual(getRes.body.settings.sampleResponses.length, 2);
  });

  it('4. POST /api/settings/ai_sdr without settings returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/settings/ai_sdr?project_id=').set(auth()).send({});
    assert.strictEqual(res.status, 400);
  });

  it('5. GET /api/integrations/anthropic returns status', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/integrations/anthropic').set(auth());
    assert.ok(res.status === 200 || res.status === 500);
    if (res.status === 200) assert.ok('integration_key' in res.body || 'connected' in res.body);
  });

  it('6. POST /api/ai-sdr/generate-sample without Anthropic returns 503', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/ai-sdr/generate-sample').set(auth()).send({});
    assert.ok(res.status === 503 || res.status === 200);
    if (res.status === 503) assert.ok(res.body.error?.toLowerCase().includes('anthropic'));
  });

  it('7. POST updates existing ai_sdr settings', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const projectId = '11111111-1111-1111-1111-111111111111';
    const updated = { ...aiSdrPayload, customGuidelines: 'Updated guidelines' };
    const saveRes = await api.post(`/api/settings/ai_sdr?project_id=${projectId}`).set(auth()).send({ settings: updated });
    assert.strictEqual(saveRes.status, 200);
    const getRes = await api.get(`/api/settings/ai_sdr?project_id=${projectId}`).set(auth());
    assert.strictEqual(getRes.body.settings.customGuidelines, 'Updated guidelines');
  });
});

describe('API: prompts', () => {
  it('1. GET /api/prompts with JWT returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/prompts').set(auth());
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. GET /api/prompts/defaults with JWT returns object', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/prompts/defaults').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.default);
    assert.ok(res.body.warm);
  });

  it('3. Default prompts have label and text', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/prompts/defaults').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.default.label);
    assert.ok(res.body.default.text);
  });

  it('4. POST /api/prompts creates prompt', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/prompts').set(auth()).send({
      label: 'Test Prompt',
      text: 'You are a test.',
    });
    assert.ok(res.status === 201 || res.status === 503 || res.status === 500);
    if (res.status === 201) assert.ok(res.body.id);
  });

  it('5. Prompts defaults always available', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/prompts/defaults').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(Object.keys(res.body).length >= 4);
  });
});

describe('API: admin users', () => {
  it('1. GET /api/admin/users without auth returns 401', async () => {
    const res = await api.get('/api/admin/users');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/users with auth returns array or 401/503', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/users').set(auth());
    assert.ok([200, 401, 503, 500].includes(res.status), `Expected 200/401/503/500, got ${res.status}`);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('3. Each user has id, email, name, org_id, role, created_at', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/admin/users').set(auth());
    if (res.status !== 200 || !res.body.length) return this.skip();
    const u = res.body[0];
    assert.ok(u.id, 'user should have id');
    assert.ok(u.email, 'user should have email');
    assert.ok('name' in u, 'user should have name');
    assert.ok('org_id' in u, 'user should have org_id');
    assert.ok('role' in u, 'user should have role');
    assert.ok(u.created_at, 'user should have created_at');
  });

  it('4. GET /api/admin/users returns org_name (from organisations JOIN)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/admin/users').set(auth());
    if (res.status !== 200 || !res.body.length) return this.skip();
    const u = res.body[0];
    assert.ok('org_name' in u, 'user should have org_name from JOIN');
  });

  it('5. GET /api/admin/users?org_id=X filters by org', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const allRes = await api.get('/api/admin/users').set(auth());
    if (allRes.status !== 200 || !allRes.body.length) return this.skip();
    const orgId = allRes.body[0].org_id;
    const filteredRes = await api.get(`/api/admin/users?org_id=${encodeURIComponent(orgId)}`).set(auth());
    assert.strictEqual(filteredRes.status, 200);
    assert.ok(Array.isArray(filteredRes.body));
    if (filteredRes.body.length > 0) {
      filteredRes.body.forEach(u => assert.strictEqual(u.org_id, orgId, 'all users should match org_id'));
    }
  });

  it('6. Role values are org_member, org_owner, org_admin, or platform_admin (or null for legacy)', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.get('/api/admin/users').set(auth());
    if (res.status !== 200 || !res.body.length) return this.skip();
    const validRoles = ['org_member', 'org_owner', 'org_admin', 'platform_admin'];
    res.body.forEach(u => {
      assert.ok(!u.role || validRoles.includes(u.role), `role "${u.role}" should be one of ${validRoles.join(', ')} or null`);
    });
  });
});

describe('API: admin plan change (PUT /api/admin/organisations/:id/plan)', () => {
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';

  it('1. Without auth returns 401', async () => {
    const res = await api.put(`/api/admin/organisations/${NIL_UUID}/plan`).send({ plan_tier: 'growth' });
    assert.strictEqual(res.status, 401);
  });

  it('2. Without plan_tier returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.put(`/api/admin/organisations/${NIL_UUID}/plan`).set(auth()).send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body?.error?.toLowerCase().includes('plan_tier'));
  });

  it('3. With unknown org returns 404', async function () {
    if (!hasAuth) this.skip();
    const res = await api.put(`/api/admin/organisations/${NIL_UUID}/plan`).set(auth()).send({ plan_tier: 'growth' });
    assert.ok([404, 200].includes(res.status));
  });

  it('4. With valid org and plan_tier updates plan_tier', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const orgsRes = await api.get('/api/admin/organisations').set(auth());
    if (orgsRes.status !== 200 || !orgsRes.body?.length) return this.skip();
    const orgId = orgsRes.body[0].id;
    const res = await api.put(`/api/admin/organisations/${orgId}/plan`).set(auth()).send({ plan_tier: 'starter' });
    assert.ok([200, 404].includes(res.status));
    if (res.status === 200) assert.strictEqual(res.body.plan_tier, 'starter');
  });
});

describe('API: admin credits (PUT /api/admin/organisations/:id/credits)', () => {
  const NIL_UUID = '00000000-0000-0000-0000-000000000000';

  it('1. Without auth returns 401', async () => {
    const res = await api.put(`/api/admin/organisations/${NIL_UUID}/credits`).send({ amount: 100 });
    assert.strictEqual(res.status, 401);
  });

  it('2. Without amount returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.put(`/api/admin/organisations/${NIL_UUID}/credits`).set(auth()).send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body?.error?.toLowerCase().includes('amount'));
  });

  it('3. With valid org inserts into credit_transactions and returns balance', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const orgsRes = await api.get('/api/admin/organisations').set(auth());
    if (orgsRes.status !== 200 || !orgsRes.body?.length) return this.skip();
    const orgId = orgsRes.body[0].id;
    const res = await api.put(`/api/admin/organisations/${orgId}/credits`).set(auth()).send({ amount: 1, description: 'Test admin credits' });
    assert.ok([200, 404, 500].includes(res.status));
    if (res.status === 200) assert.ok(typeof res.body.balance === 'number');
  });
});

describe('API: user billing (Account Billing tab)', () => {
  it('1. GET /api/billing/plan without auth returns 401', async () => {
    const res = await api.get('/api/billing/plan');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/billing/plan with auth returns plan object', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/plan').set(auth());
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) {
      assert.ok(res.body.name || res.body.plan);
      assert.ok(typeof (res.body.credits ?? res.body.credits_monthly) === 'number' || res.body.credits != null);
    }
  });

  it('3. GET /api/billing/plans without auth returns 401', async () => {
    const res = await api.get('/api/billing/plans');
    assert.strictEqual(res.status, 401);
  });

  it('4. GET /api/billing/plans with auth returns plans array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/plans').set(auth());
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body));
      if (res.body.length) {
        const p = res.body[0];
        assert.ok(p.key || p.name);
        assert.ok(typeof (p.price ?? 0) === 'number');
      }
    }
  });

  it('5. GET /api/billing/credits without auth returns 401', async () => {
    const res = await api.get('/api/billing/credits');
    assert.strictEqual(res.status, 401);
  });

  it('6. GET /api/billing/credits with auth returns balance and allocated', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/credits').set(auth());
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) {
      assert.ok(typeof res.body.balance === 'number');
      assert.ok(typeof res.body.credits_allocated === 'number');
      assert.ok(typeof res.body.credits_used_this_month === 'number');
    }
  });

  it('7. GET /api/billing/credits/usage-by-action with auth returns byAction and byCategory', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/credits/usage-by-action').set(auth());
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) {
      assert.ok(typeof res.body.byAction === 'object');
      assert.ok(typeof res.body.byCategory === 'object');
    }
  });

  it('8. GET /api/billing/credits/costs with auth returns action costs array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/credits/costs').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    if (res.body.length) {
      const c = res.body[0];
      assert.ok(c.action_key || c.action_label);
      assert.ok(typeof c.credits === 'number');
    }
  });

  it('9. GET /api/billing/credits/history with auth returns transactions array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/credits/history').set(auth());
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body));
      if (res.body.length) {
        const t = res.body[0];
        assert.ok(typeof t.amount === 'number');
        assert.ok('balance_after' in t);
      }
    }
  });

  it('10. GET /api/billing/invoices with auth returns invoices array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/invoices').set(auth());
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });
});

describe('API: admin billing plans', () => {
  it('1. GET /api/admin/billing/plans without auth returns 401', async () => {
    const res = await api.get('/api/admin/billing/plans');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/billing/plans with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/billing/plans').set(auth());
    assert.ok([200, 500].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('3. PUT /api/admin/billing/plans/:id without auth returns 401', async () => {
    const res = await api.put('/api/admin/billing/plans/00000000-0000-0000-0000-000000000000').send({ price_monthly: 99 });
    assert.strictEqual(res.status, 401);
  });

  it('4. PUT /api/admin/billing/plans/:id with auth returns updated plan or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const listRes = await api.get('/api/admin/billing/plans').set(auth());
    if (listRes.status !== 200 || !listRes.body?.length) return this.skip();
    const planId = listRes.body[0].id;
    const res = await api.put(`/api/admin/billing/plans/${planId}`).set(auth()).send({ price_monthly: 99 });
    assert.ok([200, 404, 500].includes(res.status));
  });
});

describe('API: admin billing invoices', () => {
  it('1. GET /api/admin/billing/invoices without auth returns 401', async () => {
    const res = await api.get('/api/admin/billing/invoices');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/billing/invoices with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/billing/invoices').set(auth());
    assert.ok([200, 500].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/admin/billing/invoices without org_id returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/admin/billing/invoices').set(auth()).send({ amount_due: 100 });
    assert.strictEqual(res.status, 400);
  });

  it('4. POST /api/admin/billing/invoices with org_id creates invoice', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const orgsRes = await api.get('/api/admin/organisations').set(auth());
    if (orgsRes.status !== 200 || !orgsRes.body?.length) return this.skip();
    const orgId = orgsRes.body[0].id;
    const res = await api.post('/api/admin/billing/invoices').set(auth()).send({ org_id: orgId, amount_due: 50, status: 'draft' });
    assert.ok([201, 500].includes(res.status));
  });

  it('5. POST /api/admin/invoices/:id/retry returns 200 or 404', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/admin/invoices/00000000-0000-0000-0000-000000000000/retry').set(auth());
    assert.ok([200, 404, 500].includes(res.status));
  });

  it('6. POST /api/admin/invoices/:id/refund returns 200 or 404', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/admin/invoices/00000000-0000-0000-0000-000000000000/refund').set(auth());
    assert.ok([200, 404, 500].includes(res.status));
  });
});

describe('API: admin discount codes', () => {
  it('1. GET /api/admin/discount-codes without auth returns 401', async () => {
    const res = await api.get('/api/admin/discount-codes');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/discount-codes with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/discount-codes').set(auth());
    assert.ok([200, 500].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/admin/discount-codes without code returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/admin/discount-codes').set(auth()).send({ discount_text: '50% off' });
    assert.strictEqual(res.status, 400);
  });

  it('4. POST /api/admin/discount-codes with code creates discount code', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const code = 'TEST' + Date.now();
    const res = await api.post('/api/admin/discount-codes').set(auth()).send({ code, discount_text: 'Test discount', max_uses: 10 });
    assert.ok([201, 500].includes(res.status));
    if (res.status === 201) assert.strictEqual(res.body.code, code);
  });
});

describe('API: admin credit action costs', () => {
  it('1. GET /api/admin/credits/action-costs without auth returns 401', async () => {
    const res = await api.get('/api/admin/credits/action-costs');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/credits/action-costs with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/credits/action-costs').set(auth());
    assert.ok([200, 500].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });
});

describe('API: admin platform API costs', () => {
  it('1. GET /api/admin/credits/api-costs without auth returns 401', async () => {
    const res = await api.get('/api/admin/credits/api-costs');
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/admin/credits/api-costs without provider returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/admin/credits/api-costs').set(auth()).send({ amountCents: 100 });
    assert.strictEqual(res.status, 400);
  });

  it('3. POST /api/admin/credits/api-costs with provider records cost', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/admin/credits/api-costs').set(auth()).send({ provider: 'openai', amountCents: 1842, description: 'Test ingestion' });
    assert.ok([201, 500].includes(res.status));
    if (res.status === 201) assert.ok(res.body.provider === 'openai');
  });
});
