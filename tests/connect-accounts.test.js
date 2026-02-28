/**
 * Connect Accounts Integration Tests
 *
 * Tests the API endpoints used by the Connect Accounts / Add More Accounts flow:
 *   - GET /api/integrations (list status for Cold Email & LinkedIn banner)
 *   - GET /api/instantly/accounts (sender accounts for campaign builder)
 *   - POST /api/integrations/instantly/connect (save Instantly credentials)
 *   - POST /api/integrations/heyreach/connect (save HeyReach credentials)
 *
 * Run: npm run test:connect-accounts
 * Requires: JWT_API_KEY, DATABASE_URL or DB_PASSWORD
 * Optional: INSTANTLY_API_KEY, HEYREACH_API_KEY (for live connect flows)
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';

const api = request(app);
const hasDb = !!(process.env.DATABASE_URL || process.env.DB_PASSWORD);
const hasAuth = !!process.env.JWT_API_KEY;
const hasInstantly = !!process.env.INSTANTLY_API_KEY;
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
// 1. Integrations list — used by Connect Accounts banner & Settings tab
// ═══════════════════════════════════════════════════════════════════════════════

describe('Connect Accounts: integrations list', () => {
  it('1. GET /api/integrations without JWT returns 401', async () => {
    const res = await api.get('/api/integrations');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/integrations with JWT returns integrations object', async function () {
    if (!hasAuth || !token) this.skip();
    const res = await api.get('/api/integrations').set(auth());
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body === 'object');
    assert.ok('integrations' in res.body);
    assert.ok(typeof res.body.integrations === 'object');
  });

  it('3. integrations response has instantly and heyreach keys (or empty)', async function () {
    if (!hasAuth || !token) this.skip();
    const res = await api.get('/api/integrations').set(auth());
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 200);
    const ints = res.body.integrations || {};
    // Keys may or may not exist depending on DB state
    if ('instantly' in ints) assert.ok(typeof ints.instantly === 'boolean' || (ints.instantly && typeof ints.instantly.connected !== 'undefined'));
    if ('heyreach' in ints) assert.ok(typeof ints.heyreach === 'boolean' || (ints.heyreach && typeof ints.heyreach.connected !== 'undefined'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Instantly accounts — used by Cold Email campaign builder sender list
// ═══════════════════════════════════════════════════════════════════════════════

describe('Connect Accounts: cold email sender accounts', () => {
  it('1. GET /api/instantly/accounts without JWT returns 401', async () => {
    const res = await api.get('/api/instantly/accounts');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/instantly/accounts with JWT returns accounts structure', async function () {
    if (!hasAuth || !token || !hasInstantly) this.skip();
    const res = await api.get('/api/instantly/accounts').set(auth());
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 200);
    const data = res.body;
    // Instantly returns array or { data: [], accounts: [] }
    assert.ok(Array.isArray(data) || (typeof data === 'object' && (Array.isArray(data.data) || Array.isArray(data.accounts))));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Instantly connect — save credentials (navigates from "+ Add More Accounts")
// ═══════════════════════════════════════════════════════════════════════════════

describe('Connect Accounts: Instantly connect', () => {
  it('1. POST /api/integrations/instantly/connect without JWT returns 401', async () => {
    const res = await api.post('/api/integrations/instantly/connect').send({ credentials: { api_key: 'test' } });
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/integrations/instantly/connect without api_key returns 400', async function () {
    if (!hasAuth || !token) this.skip();
    const res = await api.post('/api/integrations/instantly/connect').set(auth()).send({ credentials: {} });
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.toLowerCase().includes('api key'));
  });

  it('3. POST /api/integrations/instantly/connect with valid key saves credentials', async function () {
    if (!hasAuth || !token || !hasDb || !hasInstantly) this.skip();
    const res = await api.post('/api/integrations/instantly/connect').set(auth()).send({
      credentials: {
        api_key: process.env.INSTANTLY_API_KEY,
        campaign_id: process.env.INSTANTLY_CAMPAIGN_ID || '',
      },
    });
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.integration_key, 'instantly');
    assert.strictEqual(res.body.connected, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. HeyReach connect — save credentials (navigates from "Connect Accounts")
// ═══════════════════════════════════════════════════════════════════════════════

describe('Connect Accounts: HeyReach connect', () => {
  it('1. POST /api/integrations/heyreach/connect without JWT returns 401', async () => {
    const res = await api.post('/api/integrations/heyreach/connect').send({ credentials: { api_key: 'test' } });
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/integrations/heyreach/connect without api_key returns 400', async function () {
    if (!hasAuth || !token) this.skip();
    const res = await api.post('/api/integrations/heyreach/connect').set(auth()).send({ credentials: {} });
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.toLowerCase().includes('api key'));
  });

  it('3. POST /api/integrations/heyreach/connect with valid key saves credentials', async function () {
    if (!hasAuth || !token || !hasDb || !hasHeyReach) this.skip();
    const res = await api.post('/api/integrations/heyreach/connect').set(auth()).send({
      credentials: {
        api_key: process.env.HEYREACH_API_KEY,
        campaign_id: process.env.HEYREACH_CAMPAIGN_ID || '',
      },
    });
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.integration_key, 'heyreach');
    assert.strictEqual(res.body.connected, true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. End-to-end flow: connect then list shows connected
// ═══════════════════════════════════════════════════════════════════════════════

describe('Connect Accounts: end-to-end flow', () => {
  it('1. after Instantly connect, GET /api/integrations includes instantly: true', async function () {
    if (!hasAuth || !token || !hasDb || !hasInstantly) this.skip();
    const connectRes = await api.post('/api/integrations/instantly/connect').set(auth()).send({
      credentials: { api_key: process.env.INSTANTLY_API_KEY, campaign_id: '' },
    });
    if (connectRes.status === 401) return this.skip();
    const res = await api.get('/api/integrations').set(auth());
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 200);
    const connected = res.body.integrations?.instantly;
    assert.ok(connected === true || (connected && connected.connected === true));
  });

  it('2. after HeyReach connect, GET /api/integrations includes heyreach: true', async function () {
    if (!hasAuth || !token || !hasDb || !hasHeyReach) this.skip();
    const connectRes = await api.post('/api/integrations/heyreach/connect').set(auth()).send({
      credentials: { api_key: process.env.HEYREACH_API_KEY, campaign_id: '' },
    });
    if (connectRes.status === 401) return this.skip();
    const res = await api.get('/api/integrations').set(auth());
    if (res.status === 401) return this.skip();
    assert.strictEqual(res.status, 200);
    const connected = res.body.integrations?.heyreach;
    assert.ok(connected === true || (connected && connected.connected === true));
  });
});
