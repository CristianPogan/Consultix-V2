/**
 * HeyReach Integration Tests
 *
 * Tests both the backend proxy routes (/api/heyreach/*) and the
 * /api/integrations/heyreach/connect validation flow.
 *
 * Run: npm run test:heyreach
 * Requires: JWT_API_KEY, DATABASE_URL or DB_PASSWORD
 * Optional: HEYREACH_API_KEY (for live API calls – skipped if absent)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';

const api = request(app);
const hasDb = !!(process.env.DATABASE_URL || process.env.DB_PASSWORD);
const hasAuth = !!process.env.JWT_API_KEY;
const hasHeyReach = !!process.env.HEYREACH_API_KEY;

let token = null;
if (hasAuth) {
  const res = await request(app).post('/api/auth/token').send({ apiKey: process.env.JWT_API_KEY });
  if (res.status === 200 && res.body.token) token = res.body.token;
}

function auth() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. HeyReach Routes — Auth gate tests (no external API needed)
// ═══════════════════════════════════════════════════════════════════════════════

describe('HeyReach: route auth gates', () => {
  it('1. GET /api/heyreach/campaigns without JWT returns 401', async () => {
    const res = await api.get('/api/heyreach/campaigns');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/heyreach/campaigns/:id without JWT returns 401', async () => {
    const res = await api.get('/api/heyreach/campaigns/12345');
    assert.strictEqual(res.status, 401);
  });

  it('3. POST /api/heyreach/campaigns/:id/pause without JWT returns 401', async () => {
    const res = await api.post('/api/heyreach/campaigns/12345/pause');
    assert.strictEqual(res.status, 401);
  });

  it('4. POST /api/heyreach/campaigns/:id/resume without JWT returns 401', async () => {
    const res = await api.post('/api/heyreach/campaigns/12345/resume');
    assert.strictEqual(res.status, 401);
  });

  it('5. POST /api/heyreach/campaigns/:id/leads without JWT returns 401', async () => {
    const res = await api.post('/api/heyreach/campaigns/12345/leads').send({ leads: [] });
    assert.strictEqual(res.status, 401);
  });

  it('6. POST /api/heyreach/leads/lookup without JWT returns 401', async () => {
    const res = await api.post('/api/heyreach/leads/lookup').send({ profileUrl: 'https://linkedin.com/in/test' });
    assert.strictEqual(res.status, 401);
  });

  it('7. POST /api/heyreach/conversations without JWT returns 401', async () => {
    const res = await api.post('/api/heyreach/conversations').send({});
    assert.strictEqual(res.status, 401);
  });

  it('8. POST /api/heyreach/stats without JWT returns 401', async () => {
    const res = await api.post('/api/heyreach/stats').send({});
    assert.strictEqual(res.status, 401);
  });

  it('9. GET /api/heyreach/lists without JWT returns 401', async () => {
    const res = await api.get('/api/heyreach/lists');
    assert.strictEqual(res.status, 401);
  });

  it('10. POST /api/heyreach/lists without JWT returns 401', async () => {
    const res = await api.post('/api/heyreach/lists').send({ name: 'Test' });
    assert.strictEqual(res.status, 401);
  });

  it('11. POST /api/heyreach/network without JWT returns 401', async () => {
    const res = await api.post('/api/heyreach/network').send({ senderId: 1 });
    assert.strictEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. HeyReach Integration Connect — credential validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('HeyReach: integration connect', () => {
  it('1. POST /api/integrations/heyreach/connect without JWT returns 401', async () => {
    const res = await api.post('/api/integrations/heyreach/connect').send({ credentials: { api_key: 'test' } });
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/integrations/heyreach/connect without api_key returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/integrations/heyreach/connect').set(auth()).send({ credentials: {} });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.toLowerCase().includes('api key'));
  });

  it('3. POST /api/integrations/heyreach/connect with invalid key returns 401', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/integrations/heyreach/connect').set(auth()).send({ credentials: { api_key: 'INVALID_KEY_12345' } });
    assert.ok(res.status === 401 || res.status === 400);
  });

  it('4. POST /api/integrations/heyreach/connect with valid key saves credentials', async function () {
    if (!hasAuth || !hasDb || !hasHeyReach) this.skip();
    const res = await api.post('/api/integrations/heyreach/connect').set(auth()).send({
      credentials: {
        api_key: process.env.HEYREACH_API_KEY,
        campaign_id: process.env.HEYREACH_CAMPAIGN_ID || '',
      },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.connected, true);
    assert.strictEqual(res.body.integration_key, 'heyreach');
  });

  it('5. GET /api/integrations/heyreach after connect shows connected', async function () {
    if (!hasAuth || !hasDb || !hasHeyReach) this.skip();
    const res = await api.get('/api/integrations/heyreach').set(auth());
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.connected, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. HeyReach proxy routes — validation & live calls
// ═══════════════════════════════════════════════════════════════════════════════

describe('HeyReach: proxy routes (validation)', () => {
  it('1. POST /api/heyreach/campaigns/add-leads requires leads array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/heyreach/campaigns/add-leads').set(auth()).send({});
    assert.ok(res.status === 400 || res.status === 500);
  });

  it('2. POST /api/heyreach/campaigns/:id/leads rejects empty leads', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/heyreach/campaigns/12345/leads').set(auth()).send({ leads: [] });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.includes('leads'));
  });

  it('3. POST /api/heyreach/leads/lookup requires profileUrl', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/heyreach/leads/lookup').set(auth()).send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.includes('profileUrl'));
  });

  it('4. POST /api/heyreach/lists requires name', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/heyreach/lists').set(auth()).send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.includes('name'));
  });

  it('5. POST /api/heyreach/network requires senderId', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/heyreach/network').set(auth()).send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.includes('senderId'));
  });
});

describe('HeyReach: live API calls', () => {
  it('1. GET /api/heyreach/campaigns returns campaign list', async function () {
    if (!hasAuth || !hasHeyReach) this.skip();
    const res = await api.get('/api/heyreach/campaigns').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body === 'object');
  });

  it('2. GET /api/heyreach/campaigns with pagination', async function () {
    if (!hasAuth || !hasHeyReach) this.skip();
    const res = await api.get('/api/heyreach/campaigns?offset=0&limit=5').set(auth());
    assert.strictEqual(res.status, 200);
  });

  it('3. GET /api/heyreach/campaigns/:id with known campaign', async function () {
    if (!hasAuth || !hasHeyReach || !process.env.HEYREACH_CAMPAIGN_ID) this.skip();
    const res = await api.get(`/api/heyreach/campaigns/${process.env.HEYREACH_CAMPAIGN_ID}`).set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.id || res.body.campaignId || res.body.name);
  });

  it('4. POST /api/heyreach/stats returns analytics data', async function () {
    if (!hasAuth || !hasHeyReach) this.skip();
    const res = await api.post('/api/heyreach/stats').set(auth()).send({});
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body === 'object');
  });

  it('5. POST /api/heyreach/conversations returns inbox data', async function () {
    if (!hasAuth || !hasHeyReach) this.skip();
    const res = await api.post('/api/heyreach/conversations').set(auth()).send({ offset: 0, limit: 5 });
    assert.strictEqual(res.status, 200);
  });

  it('6. GET /api/heyreach/lists returns list of lists', async function () {
    if (!hasAuth || !hasHeyReach) this.skip();
    const res = await api.get('/api/heyreach/lists').set(auth());
    assert.strictEqual(res.status, 200);
  });

  it('7. POST /api/heyreach/stats with campaign filter', async function () {
    if (!hasAuth || !hasHeyReach || !process.env.HEYREACH_CAMPAIGN_ID) this.skip();
    const res = await api.post('/api/heyreach/stats').set(auth()).send({
      campaignIds: [Number(process.env.HEYREACH_CAMPAIGN_ID)],
      accountIds: [],
    });
    assert.strictEqual(res.status, 200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. HeyReach service unit tests (direct function calls)
// ═══════════════════════════════════════════════════════════════════════════════

describe('HeyReach: service functions', () => {
  it('1. checkApiKey with invalid key throws', async function () {
    const { checkApiKey } = await import('../api/services/heyreach-service.js');
    try {
      await checkApiKey('DEFINITELY_NOT_VALID');
      assert.fail('Should have thrown');
    } catch (err) {
      assert.ok(err.message.includes('HeyReach'));
      assert.ok(err.status === 401 || err.status === 403 || err.status >= 400);
    }
  });

  it('2. checkApiKey with valid key succeeds', async function () {
    if (!hasHeyReach) this.skip();
    const { checkApiKey } = await import('../api/services/heyreach-service.js');
    const result = await checkApiKey(process.env.HEYREACH_API_KEY);
    assert.ok(result !== undefined);
  });

  it('3. getAllCampaigns returns data', async function () {
    if (!hasHeyReach) this.skip();
    const { getAllCampaigns } = await import('../api/services/heyreach-service.js');
    const data = await getAllCampaigns(process.env.HEYREACH_API_KEY, { offset: 0, limit: 5 });
    assert.ok(typeof data === 'object');
  });

  it('4. getOverallStats returns data', async function () {
    if (!hasHeyReach) this.skip();
    const { getOverallStats } = await import('../api/services/heyreach-service.js');
    const data = await getOverallStats(process.env.HEYREACH_API_KEY);
    assert.ok(typeof data === 'object');
  });

  it('5. getAllLists returns data', async function () {
    if (!hasHeyReach) this.skip();
    const { getAllLists } = await import('../api/services/heyreach-service.js');
    const data = await getAllLists(process.env.HEYREACH_API_KEY, { offset: 0, limit: 5 });
    assert.ok(typeof data === 'object');
  });
});
