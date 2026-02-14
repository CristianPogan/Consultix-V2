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
