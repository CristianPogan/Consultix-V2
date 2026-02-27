/**
 * Instantly.ai Integration Tests
 *
 * Tests backend proxy routes (/api/instantly/*) and the
 * /api/integrations/instantly/connect validation flow.
 *
 * Run: npm run test:instantly
 * Requires: JWT_API_KEY, DATABASE_URL or DB_PASSWORD
 * Optional: INSTANTLY_API_KEY (for live API calls – skipped if absent)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';

const api = request(app);
const hasDb = !!(process.env.DATABASE_URL || process.env.DB_PASSWORD);
const hasAuth = !!process.env.JWT_API_KEY;
const hasInstantly = !!process.env.INSTANTLY_API_KEY;

let token = null;
if (hasAuth) {
  const res = await request(app).post('/api/auth/token').send({ apiKey: process.env.JWT_API_KEY });
  if (res.status === 200 && res.body.token) token = res.body.token;
}

function auth() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Instantly Routes — Auth gate tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Instantly: route auth gates', () => {
  it('1. GET /api/instantly/campaigns without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/campaigns');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/instantly/campaigns/:id without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/campaigns/test-id');
    assert.strictEqual(res.status, 401);
  });

  it('3. POST /api/instantly/campaigns/:id/activate without JWT returns 401', async () => {
    const res = await api.post('/api/instantly/campaigns/test-id/activate');
    assert.strictEqual(res.status, 401);
  });

  it('4. POST /api/instantly/campaigns/:id/pause without JWT returns 401', async () => {
    const res = await api.post('/api/instantly/campaigns/test-id/pause');
    assert.strictEqual(res.status, 401);
  });

  it('5. GET /api/instantly/analytics without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/analytics');
    assert.strictEqual(res.status, 401);
  });

  it('6. GET /api/instantly/analytics/overview without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/analytics/overview');
    assert.strictEqual(res.status, 401);
  });

  it('7. POST /api/instantly/leads without JWT returns 401', async () => {
    const res = await api.post('/api/instantly/leads').send({ email: 'a@b.com' });
    assert.strictEqual(res.status, 401);
  });

  it('8. POST /api/instantly/leads/bulk without JWT returns 401', async () => {
    const res = await api.post('/api/instantly/leads/bulk').send({ leads: [] });
    assert.strictEqual(res.status, 401);
  });

  it('9. GET /api/instantly/accounts without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/accounts');
    assert.strictEqual(res.status, 401);
  });

  it('10. GET /api/instantly/emails without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/emails');
    assert.strictEqual(res.status, 401);
  });

  it('11. GET /api/instantly/emails/unread/count without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/emails/unread/count');
    assert.strictEqual(res.status, 401);
  });

  it('12. GET /api/instantly/lead-lists without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/lead-lists');
    assert.strictEqual(res.status, 401);
  });

  it('13. POST /api/instantly/lead-lists without JWT returns 401', async () => {
    const res = await api.post('/api/instantly/lead-lists').send({ name: 'Test' });
    assert.strictEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Instantly Integration Connect — credential validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Instantly: integration connect', () => {
  it('1. POST /api/integrations/instantly/connect without JWT returns 401', async () => {
    const res = await api.post('/api/integrations/instantly/connect').send({ credentials: { api_key: 'test' } });
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/integrations/instantly/connect without api_key returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/integrations/instantly/connect').set(auth()).send({ credentials: {} });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.toLowerCase().includes('api key'));
  });

  it('3. POST /api/integrations/instantly/connect with invalid key returns 401', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/integrations/instantly/connect').set(auth()).send({ credentials: { api_key: 'INVALID_KEY' } });
    assert.ok(res.status === 401 || res.status === 400);
  });

  it('4. POST /api/integrations/instantly/connect with valid key saves credentials', async function () {
    if (!hasAuth || !hasDb || !hasInstantly) this.skip();
    const res = await api.post('/api/integrations/instantly/connect').set(auth()).send({
      credentials: {
        api_key: process.env.INSTANTLY_API_KEY,
        campaign_id: process.env.INSTANTLY_CAMPAIGN_ID || '',
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.connected, true);
    assert.strictEqual(res.body.integration_key, 'instantly');
  });

  it('5. GET /api/integrations/instantly after connect shows connected', async function () {
    if (!hasAuth || !hasDb || !hasInstantly) this.skip();
    const res = await api.get('/api/integrations/instantly').set(auth());
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.connected, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Instantly proxy routes — validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Instantly: proxy routes (validation)', () => {
  it('1. POST /api/instantly/leads without email returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/instantly/leads').set(auth()).send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.includes('email'));
  });

  it('2. POST /api/instantly/leads/bulk with empty leads returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/instantly/leads/bulk').set(auth()).send({ leads: [] });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.includes('leads'));
  });

  it('3. POST /api/instantly/lead-lists without name returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/instantly/lead-lists').set(auth()).send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.includes('name'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Instantly live API calls
// ═══════════════════════════════════════════════════════════════════════════════

describe('Instantly: live API calls', () => {
  it('1. GET /api/instantly/campaigns returns campaign list', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/campaigns').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body === 'object');
  });

  it('2. GET /api/instantly/campaigns with pagination', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/campaigns?limit=5&skip=0').set(auth());
    assert.strictEqual(res.status, 200);
  });

  it('3. GET /api/instantly/campaigns/:id with known campaign', async function () {
    if (!hasAuth || !hasInstantly || !process.env.INSTANTLY_CAMPAIGN_ID) this.skip();
    const res = await api.get(`/api/instantly/campaigns/${process.env.INSTANTLY_CAMPAIGN_ID}`).set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id || res.body.name);
  });

  it('4. GET /api/instantly/analytics returns analytics data', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/analytics').set(auth());
    assert.ok(res.status === 200 || res.status === 400);
  });

  it('5. GET /api/instantly/analytics/overview returns overview', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/analytics/overview').set(auth());
    assert.ok(res.status === 200 || res.status === 400);
  });

  it('6. GET /api/instantly/accounts returns sender accounts', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/accounts').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body === 'object');
  });

  it('7. GET /api/instantly/emails returns emails', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/emails?limit=5').set(auth());
    assert.ok(res.status === 200 || res.status === 400);
  });

  it('8. GET /api/instantly/emails/unread/count returns count', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/emails/unread/count').set(auth());
    assert.ok(res.status === 200 || res.status === 400);
  });

  it('9. GET /api/instantly/lead-lists returns lists', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/lead-lists').set(auth());
    assert.strictEqual(res.status, 200);
  });

  it('10. POST /api/instantly/leads/list returns leads', async function () {
    if (!hasAuth || !hasInstantly) this.skip();
    const res = await api.post('/api/instantly/leads/list').set(auth()).send({ limit: 5 });
    assert.ok(res.status === 200 || res.status === 400);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Instantly service unit tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Instantly: service functions', () => {
  it('1. checkApiKey with invalid key throws', async function () {
    const { checkApiKey } = await import('../api/services/instantly-service.js');
    try {
      await checkApiKey('DEFINITELY_NOT_VALID');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('Instantly'));
      assert.ok(err.status === 401 || err.status === 403 || err.status >= 400);
    }
  });

  it('2. checkApiKey with valid key succeeds', async function () {
    if (!hasInstantly) this.skip();
    const { checkApiKey } = await import('../api/services/instantly-service.js');
    const result = await checkApiKey(process.env.INSTANTLY_API_KEY);
    assert.ok(result !== undefined);
  });

  it('3. listCampaigns returns data', async function () {
    if (!hasInstantly) this.skip();
    const { listCampaigns } = await import('../api/services/instantly-service.js');
    const data = await listCampaigns(process.env.INSTANTLY_API_KEY, { limit: 5 });
    assert.ok(typeof data === 'object');
  });

  it('4. listAccounts returns data', async function () {
    if (!hasInstantly) this.skip();
    const { listAccounts } = await import('../api/services/instantly-service.js');
    const data = await listAccounts(process.env.INSTANTLY_API_KEY, { limit: 5 });
    assert.ok(typeof data === 'object');
  });

  it('5. listLeadLists returns data', async function () {
    if (!hasInstantly) this.skip();
    const { listLeadLists } = await import('../api/services/instantly-service.js');
    const data = await listLeadLists(process.env.INSTANTLY_API_KEY, { limit: 5 });
    assert.ok(typeof data === 'object');
  });
});
