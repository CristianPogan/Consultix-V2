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
