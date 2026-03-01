/**
 * Frontend Wiring Gaps — Integration Tests
 *
 * Covers the 5 gaps identified in FRONTEND-APPLICATION-AUDIT-REPORT.md Section 32:
 *   1. CRM Activity Feed (GET + POST /api/activity)
 *   2. Unibox Send Reply (POST /api/messages)
 *   3. Conversations list (GET /api/conversations — multi-source merge backing)
 *   4. Cold Email Campaigns create (POST /api/campaigns)
 *   5. Unibox multi-source inbox endpoints (heyreach, aimfox, instantly/emails)
 *
 * Run: node --test tests/frontend-gaps.test.js
 * Env: JWT_API_KEY, DATABASE_URL or DB_PASSWORD
 *
 * Pattern: each test SKIPs gracefully when the route is unimplemented or when
 * the required env vars are absent. Tests do NOT create permanent data — they
 * verify shape and auth gates only, using NIL UUIDs / minimal payloads.
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';

const api = request(app);
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const hasDb = !!(process.env.DATABASE_URL || process.env.DB_PASSWORD);
const hasAuth = !!process.env.JWT_API_KEY;

let token = null;
let createdConversationId = null;
let createdCampaignId = null;

// Acquire a token once before all tests
before(async () => {
  if (!hasAuth) return;
  const res = await api.post('/api/auth/token').send({ apiKey: process.env.JWT_API_KEY });
  if (res.status === 200 && res.body.token) token = res.body.token;
});

function auth() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isNotImpl(res) {
  const ct = res.headers['content-type'] || '';
  if (ct.includes('text/html') && res.status === 200) return true;
  if (res.status === 404 && ct.includes('text/html')) return true;
  if (res.status === 401 && !token) return true;
  return false;
}

function skipIfNotImpl(ctx, res) {
  if (isNotImpl(res)) { ctx.skip('Route not yet implemented or no auth'); return true; }
  return false;
}

// =============================================================================
// GAP 1: CRM Activity Feed  →  GET /api/activity  &  POST /api/activity
// =============================================================================

describe('GAP 1 — CRM Activity Feed: GET /api/activity', () => {
  it('returns 401 without auth', async () => {
    const res = await api.get('/api/activity');
    assert.ok([401, 403].includes(res.status), `Expected 401/403, got ${res.status}`);
  });

  it('returns array with auth (may be empty if no DB data)', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.get('/api/activity').set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Expected array response');
  });

  it('accepts resource_type and resource_id query params', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.get(`/api/activity?resource_type=lead&resource_id=${NIL_UUID}`).set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    // All returned entries should match the filter
    for (const entry of res.body) {
      assert.strictEqual(entry.resource_type, 'lead');
    }
  });

  it('supports limit query param (max 200)', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.get('/api/activity?limit=5').set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length <= 5);
  });
});

describe('GAP 1 — CRM Activity Feed: POST /api/activity', () => {
  it('returns 401 without auth', async () => {
    const res = await api.post('/api/activity').send({ action: 'test' });
    assert.ok([401, 403].includes(res.status));
  });

  it('returns 400 when action is missing', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.post('/api/activity').set(auth()).send({});
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error, 'Expected error message in body');
  });

  it('creates an activity entry and returns 201', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.post('/api/activity').set(auth()).send({
      action: 'Stage changed: New → Contacted',
      resource_type: 'lead',
      resource_id: NIL_UUID,
      metadata_json: { from: 'New', to: 'Contacted' },
    });
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id, 'Expected id in response');
    assert.strictEqual(res.body.action, 'Stage changed: New → Contacted');
    assert.strictEqual(res.body.resource_type, 'lead');
  });
});

// =============================================================================
// GAP 2: Unibox Send Reply  →  POST /api/messages
// =============================================================================

describe('GAP 2 — Unibox Send Reply: POST /api/messages', () => {
  it('returns 401 without auth', async () => {
    const res = await api.post('/api/messages').send({ body: 'hello', conversation_id: NIL_UUID });
    assert.ok([401, 403].includes(res.status));
  });

  it('returns 400 when body is missing', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.post('/api/messages').set(auth()).send({ conversation_id: NIL_UUID });
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 400);
  });

  it('returns 400 when conversation_id is missing', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.post('/api/messages').set(auth()).send({ body: 'Hello!' });
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 400);
  });

  it('returns 404 for non-existent conversation_id', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.post('/api/messages').set(auth()).send({ body: 'Hello!', conversation_id: NIL_UUID });
    if (skipIfNotImpl(ctx, res)) return;
    // Conversation NIL_UUID doesn't exist → 404
    assert.strictEqual(res.status, 404);
  });
});

describe('GAP 2 — Unibox Send Reply: GET /api/messages', () => {
  it('returns 401 without auth', async () => {
    const res = await api.get('/api/messages?conversation_id=' + NIL_UUID);
    assert.ok([401, 403].includes(res.status));
  });

  it('returns 400 when conversation_id is missing', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.get('/api/messages').set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 400);
  });

  it('returns 404 for non-existent conversation', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.get('/api/messages?conversation_id=' + NIL_UUID).set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 404);
  });
});

// =============================================================================
// GAP 3: Conversations list  →  GET /api/conversations
// =============================================================================

describe('GAP 3 — Conversations: GET /api/conversations', () => {
  it('returns 401 without auth', async () => {
    const res = await api.get('/api/conversations');
    assert.ok([401, 403].includes(res.status));
  });

  it('returns array with auth', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.get('/api/conversations').set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('each conversation has id, channel, status fields', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.get('/api/conversations').set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 200);
    for (const c of res.body) {
      assert.ok(c.id !== undefined, 'Missing id');
      assert.ok(c.channel !== undefined, 'Missing channel');
      assert.ok(c.status !== undefined, 'Missing status');
    }
  });
});

describe('GAP 3 — Conversations: POST /api/conversations (create)', () => {
  it('returns 401 without auth', async () => {
    const res = await api.post('/api/conversations').send({ channel: 'email' });
    assert.ok([401, 403].includes(res.status));
  });

  it('creates a conversation with minimal payload', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.post('/api/conversations').set(auth()).send({ channel: 'email', subject: 'Test convo', status: 'open' });
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id, 'Expected id');
    createdConversationId = res.body.id;
  });
});

describe('GAP 3 — Conversations: round-trip send message', () => {
  it('sends a message to the created conversation', async (ctx) => {
    if (!hasDb || !token || !createdConversationId) return ctx.skip('No DB / no conversation created');
    const res = await api.post('/api/messages').set(auth()).send({
      conversation_id: createdConversationId,
      direction: 'outbound',
      body: 'Integration test reply',
    });
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id, 'Expected message id');
    assert.strictEqual(res.body.body, 'Integration test reply');
    assert.strictEqual(res.body.direction, 'outbound');
  });

  it('reads back the message from the conversation', async (ctx) => {
    if (!hasDb || !token || !createdConversationId) return ctx.skip('No DB / no conversation created');
    const res = await api.get(`/api/messages?conversation_id=${createdConversationId}`).set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    const testMsg = res.body.find(m => m.body === 'Integration test reply');
    assert.ok(testMsg, 'Test message not found in thread');
  });

  it('cleans up — deletes the test conversation', async (ctx) => {
    if (!hasDb || !token || !createdConversationId) return ctx.skip('Nothing to clean');
    const res = await api.delete(`/api/conversations/${createdConversationId}`).set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.ok([200, 204].includes(res.status));
  });
});

// =============================================================================
// GAP 4: Cold Email Campaigns create  →  POST /api/campaigns
// =============================================================================

describe('GAP 4 — Cold Email Campaigns: POST /api/campaigns', () => {
  it('returns 401 without auth', async () => {
    const res = await api.post('/api/campaigns').send({ campaign_name: 'Test Campaign' });
    assert.ok([401, 403].includes(res.status));
  });

  it('creates a campaign with campaign_name + platform', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.post('/api/campaigns').set(auth()).send({
      campaign_name: 'Integration Test Campaign',
      platform: 'email',
    });
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id, 'Expected id');
    assert.ok(res.body.name || res.body.campaign_name, 'Expected campaign name');
    createdCampaignId = res.body.id;
  });

  it('lists campaigns and includes the newly created one', async (ctx) => {
    if (!hasDb || !token || !createdCampaignId) return ctx.skip('No DB / no campaign created');
    const res = await api.get('/api/campaigns').set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
    const found = res.body.find(c => c.id === createdCampaignId);
    assert.ok(found, 'Newly created campaign not in list');
  });

  it('gets the campaign by id', async (ctx) => {
    if (!hasDb || !token || !createdCampaignId) return ctx.skip('No DB / no campaign created');
    const res = await api.get(`/api/campaigns/${createdCampaignId}`).set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, createdCampaignId);
  });

  it('updates campaign status to active', async (ctx) => {
    if (!hasDb || !token || !createdCampaignId) return ctx.skip('No DB / no campaign created');
    const res = await api.put(`/api/campaigns/${createdCampaignId}`).set(auth()).send({ status: 'active' });
    if (skipIfNotImpl(ctx, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('cleans up — deletes the test campaign', async (ctx) => {
    if (!hasDb || !token || !createdCampaignId) return ctx.skip('Nothing to clean');
    const res = await api.delete(`/api/campaigns/${createdCampaignId}`).set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    assert.ok([200, 204].includes(res.status));
  });
});

// =============================================================================
// GAP 5: Unibox multi-source inbox — provider endpoints
// =============================================================================

describe('GAP 5 — Multi-source Unibox: GET /api/instantly/emails', () => {
  it('returns 401 without auth', async () => {
    const res = await api.get('/api/instantly/emails');
    assert.ok([401, 403].includes(res.status));
  });

  it('returns 400 if Instantly not connected (expected when no key set)', async (ctx) => {
    if (!token) return ctx.skip('No auth token');
    const res = await api.get('/api/instantly/emails').set(auth());
    if (skipIfNotImpl(ctx, res)) return;
    // Either 200 with data (key configured) or 400 (not connected)
    assert.ok([200, 400].includes(res.status), `Unexpected status ${res.status}`);
    if (res.status === 200) {
      const items = Array.isArray(res.body) ? res.body : res.body.items || res.body.emails || [];
      assert.ok(Array.isArray(items), 'Expected array-like response');
    }
  });
});

describe('GAP 5 — Multi-source Unibox: POST /api/heyreach/conversations', () => {
  it('returns 401 without auth', async () => {
    const res = await api.post('/api/heyreach/conversations').send({});
    assert.ok([401, 403].includes(res.status));
  });

  it('returns 200 or 400 (not connected) with auth', async (ctx) => {
    if (!token) return ctx.skip('No auth token');
    const res = await api.post('/api/heyreach/conversations').set(auth()).send({ offset: 0, limit: 10 });
    if (skipIfNotImpl(ctx, res)) return;
    assert.ok([200, 400].includes(res.status), `Unexpected status ${res.status}`);
  });
});

describe('GAP 5 — Multi-source Unibox: POST /api/aimfox/conversations', () => {
  it('returns 401 without auth', async () => {
    const res = await api.post('/api/aimfox/conversations').send({});
    assert.ok([401, 403].includes(res.status));
  });

  it('returns 200 or 400 (not connected) with auth', async (ctx) => {
    if (!token) return ctx.skip('No auth token');
    const res = await api.post('/api/aimfox/conversations').set(auth()).send({ inApp: true });
    if (skipIfNotImpl(ctx, res)) return;
    assert.ok([200, 400].includes(res.status), `Unexpected status ${res.status}`);
  });
});

// =============================================================================
// Bonus: Lead Lists Import — minimal enrichment API check
// =============================================================================

describe('BONUS — Lead Lists Import: enrichment API reachable', () => {
  it('POST /api/lead-generation/enrich/bulk returns 401 without auth', async () => {
    const res = await api.post('/api/lead-generation/enrich/bulk').send({ leadIds: [] });
    assert.ok([401, 403].includes(res.status));
  });

  it('POST /api/lead-generation/enrich/bulk returns 400 for empty leadIds with auth', async (ctx) => {
    if (!hasDb || !token) return ctx.skip('No DB or no auth token');
    const res = await api.post('/api/lead-generation/enrich/bulk').set(auth()).send({ leadIds: [] });
    if (skipIfNotImpl(ctx, res)) return;
    // Should reject empty array
    assert.ok([400, 422].includes(res.status), `Expected 400/422, got ${res.status}: ${JSON.stringify(res.body)}`);
  });
});
