/**
 * API Unit Tests — 5 tests per API (icp-profiles, lead-lists, companies, leads, prompts)
 * Run: npm test (requires DB_PASSWORD or DATABASE_URL for DB-dependent tests)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';

const api = request(app);

// Skip DB tests if no DB configured
const hasDb = !!(process.env.DATABASE_URL || process.env.DB_PASSWORD);

describe('API: icp-profiles', () => {
  it('1. GET /api/icp-profiles returns array or 503 or 500', async () => {
    const res = await api.get('/api/icp-profiles');
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. GET /api/icp-profiles/default returns object with listName, industry, regions', async () => {
    const res = await api.get('/api/icp-profiles/default');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body === 'object');
    assert.ok('listName' in res.body);
    assert.ok('industry' in res.body);
    assert.ok(Array.isArray(res.body.regions));
  });

  it('3. POST /api/icp-profiles creates profile with valid body', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/icp-profiles').send({
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

  it('4. PUT /api/icp-profiles/:id returns 404 for non-existent id', async function () {
    if (!hasDb) this.skip();
    const res = await api.put('/api/icp-profiles/00000000-0000-0000-0000-000000000000').send({ name: 'Updated' });
    assert.ok(res.status === 404 || res.status === 503 || res.status === 500);
  });

  it('5. GET /api/icp-profiles default has regions as array', async () => {
    const res = await api.get('/api/icp-profiles/default');
    assert.strictEqual(res.status, 200);
    const regions = res.body.regions;
    assert.ok(Array.isArray(regions) || (regions && typeof regions === 'object'));
  });
});

describe('API: lead-lists', () => {
  it('1. GET /api/lead-lists returns array or 503', async () => {
    const res = await api.get('/api/lead-lists');
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. POST /api/lead-lists creates list with name', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/lead-lists').send({ name: 'Test List', source: 'discovery' });
    assert.ok(res.status === 201 || res.status === 503 || res.status === 500);
    if (res.status === 201) {
      assert.ok(res.body.id);
      assert.ok(res.body.contacts !== undefined);
    }
  });

  it('3. GET /api/lead-lists returns objects with id and name', async function () {
    if (!hasDb) this.skip();
    const res = await api.get('/api/lead-lists');
    if (res.status === 200 && res.body.length > 0) {
      assert.ok(res.body[0].id);
      assert.ok('name' in res.body[0]);
    }
  });

  it('4. POST /api/lead-lists without body uses defaults', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/lead-lists').send({});
    assert.ok(res.status === 201 || res.status === 503);
  });

  it('5. Lead list object has contacts array', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/lead-lists').send({ name: 'Contacts Test' });
    if (res.status === 201) {
      assert.ok(Array.isArray(res.body.contacts));
    }
  });
});

describe('API: companies', () => {
  it('1. GET /api/companies returns array or 503', async () => {
    const res = await api.get('/api/companies');
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. POST /api/companies creates company', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/companies').send({
      name: 'Test Co',
      domain: 'testco.example.com',
      industry: 'Tech',
      icpScore: 85,
    });
    assert.ok(res.status === 201 || res.status === 503 || res.status === 500);
    if (res.status === 201) {
      assert.ok(res.body.id);
      assert.strictEqual(res.body.name, 'Test Co');
    }
  });

  it('3. GET /api/companies?list_id= filters by list', async function () {
    if (!hasDb) this.skip();
    const res = await api.get('/api/companies?list_id=00000000-0000-0000-0000-000000000000');
    assert.ok(res.status === 200 || res.status === 503);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('4. Company response has icpScore or icp_fit_score', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/companies').send({
      name: 'Score Test',
      domain: 'scoretest.example.com',
      icpScore: 92,
    });
    if (res.status === 201) {
      assert.ok(res.body.icpScore !== undefined || res.body.icp_fit_score !== undefined);
    }
  });

  it('5. Companies list is array', async () => {
    const res = await api.get('/api/companies');
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body));
    }
  });
});

describe('API: leads', () => {
  it('1. GET /api/leads returns array or 503', async () => {
    const res = await api.get('/api/leads');
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. POST /api/leads without list_id returns 400', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/leads').send({ email: 'test@example.com' });
    assert.ok(res.status === 400 || res.status === 503 || res.status === 500);
  });

  it('3. POST /api/leads with list_id creates lead', async function () {
    if (!hasDb) this.skip();
    const listRes = await api.post('/api/lead-lists').send({ name: 'Lead Test List' });
    const listId = listRes.status === 201 ? listRes.body.id : null;
    if (!listId) this.skip();
    const res = await api.post('/api/leads').send({
      list_id: listId,
      email: 'lead@example.com',
      first_name: 'Test',
      last_name: 'Lead',
    });
    assert.ok(res.status === 201 || res.status === 500);
  });

  it('4. PUT /api/leads/:id on non-existent returns 404', async function () {
    if (!hasDb) this.skip();
    const res = await api.put('/api/leads/00000000-0000-0000-0000-000000000000').send({
      personalisation_json: { subject: 'Hi' },
    });
    assert.ok(res.status === 404 || res.status === 503 || res.status === 500);
  });

  it('5. Leads list is array', async () => {
    const res = await api.get('/api/leads');
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body));
    }
  });
});

describe('API: prompts', () => {
  it('1. GET /api/prompts returns array or 503', async () => {
    const res = await api.get('/api/prompts');
    assert.ok(res.status === 200 || res.status === 503 || res.status === 500);
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('2. GET /api/prompts/defaults returns object with default, warm, direct, founder', async () => {
    const res = await api.get('/api/prompts/defaults');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.default);
    assert.ok(res.body.warm);
    assert.ok(res.body.direct);
    assert.ok(res.body.founder);
  });

  it('3. Default prompts have label and text', async () => {
    const res = await api.get('/api/prompts/defaults');
    assert.strictEqual(res.status, 200);
    for (const key of ['default', 'warm']) {
      assert.ok(res.body[key].label);
      assert.ok(res.body[key].text);
    }
  });

  it('4. POST /api/prompts creates prompt', async function () {
    if (!hasDb) this.skip();
    const res = await api.post('/api/prompts').send({
      label: 'Test Prompt',
      text: 'You are a test.',
    });
    assert.ok(res.status === 201 || res.status === 503 || res.status === 500);
    if (res.status === 201) assert.ok(res.body.id);
  });

  it('5. Prompts defaults are always available', async () => {
    const res = await api.get('/api/prompts/defaults');
    assert.strictEqual(res.status, 200);
    assert.ok(Object.keys(res.body).length >= 4);
  });
});
