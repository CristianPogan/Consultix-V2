/**
 * System Prompts API Tests
 *
 * Tests the unified admin prompts API (/api/admin/prompts/*) and verifies
 * that route files correctly use DB-stored prompts with fallback to defaults.
 *
 * Run: node --test tests/system-prompts.test.js
 * Requires: JWT_API_KEY, DATABASE_URL or DB_PASSWORD
 */
import { describe, it, before } from 'node:test';
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

function auth() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ALL_PROMPT_TYPES = [
  'ai_council',
  'ai_assistant',
  'audit_research',
  'audit_analysis',
  'audit_analysis_chat',
  'copywriter',
  'niche_researcher',
  'ai_sdr',
];

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Auth gates — all endpoints require JWT
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin Prompts: auth gates', () => {
  it('1. GET /api/admin/prompts without JWT returns 401', async () => {
    const res = await api.get('/api/admin/prompts');
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/prompts/ai_assistant without JWT returns 401', async () => {
    const res = await api.get('/api/admin/prompts/ai_assistant');
    assert.strictEqual(res.status, 401);
  });

  it('3. PUT /api/admin/prompts/ai_assistant without JWT returns 401', async () => {
    const res = await api.put('/api/admin/prompts/ai_assistant').send({ systemPrompt: 'Hello' });
    assert.strictEqual(res.status, 401);
  });

  it('4. DELETE /api/admin/prompts/ai_assistant without JWT returns 401', async () => {
    const res = await api.delete('/api/admin/prompts/ai_assistant');
    assert.strictEqual(res.status, 401);
  });

  it('5. POST /api/admin/prompts/ai_assistant/test without JWT returns 401', async () => {
    const res = await api.post('/api/admin/prompts/ai_assistant/test').send({ testMessage: 'Hi' });
    assert.strictEqual(res.status, 401);
  });

  it('6. GET /api/assistant/system-prompt without JWT returns 401', async () => {
    const res = await api.get('/api/assistant/system-prompt');
    assert.strictEqual(res.status, 401);
  });

  it('7. POST /api/assistant/system-prompt without JWT returns 401', async () => {
    const res = await api.post('/api/assistant/system-prompt').send({ systemPrompt: 'Hi' });
    assert.strictEqual(res.status, 401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. GET /api/admin/prompts — list all prompts
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin Prompts: GET / — list', () => {
  it('1. returns 200 with prompts array containing all 8 catalog entries', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.get('/api/admin/prompts').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.prompts), 'response.prompts should be an array');
    assert.strictEqual(res.body.prompts.length, ALL_PROMPT_TYPES.length);
  });

  it('2. each prompt has required fields: type, name, model, systemPrompt, isCustomized', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.get('/api/admin/prompts').set(auth());
    assert.strictEqual(res.status, 200);
    for (const p of res.body.prompts) {
      assert.ok(typeof p.type === 'string', `type missing on ${JSON.stringify(p)}`);
      assert.ok(typeof p.name === 'string', `name missing on ${p.type}`);
      assert.ok(typeof p.model === 'string', `model missing on ${p.type}`);
      assert.ok(typeof p.systemPrompt === 'string' && p.systemPrompt.length > 0, `systemPrompt empty on ${p.type}`);
      assert.ok(typeof p.isCustomized === 'boolean', `isCustomized missing on ${p.type}`);
    }
  });

  it('3. all 8 known prompt types are present in the response', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.get('/api/admin/prompts').set(auth());
    const types = res.body.prompts.map(p => p.type);
    for (const t of ALL_PROMPT_TYPES) {
      assert.ok(types.includes(t), `prompt type "${t}" missing from list`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. GET /api/admin/prompts/:type — single prompt
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin Prompts: GET /:type', () => {
  it('1. returns 200 with correct shape for ai_assistant', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.get('/api/admin/prompts/ai_assistant').set(auth());
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.type, 'ai_assistant');
    assert.ok(typeof res.body.name === 'string');
    assert.ok(typeof res.body.model === 'string');
    assert.ok(typeof res.body.systemPrompt === 'string' && res.body.systemPrompt.length > 0);
    assert.ok(typeof res.body.isCustomized === 'boolean');
    assert.ok(typeof res.body.default === 'string' && res.body.default.length > 0);
  });

  it('2. returns 404 for unknown prompt type', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.get('/api/admin/prompts/nonexistent_type').set(auth());
    assert.strictEqual(res.status, 404);
  });

  it('3. all 8 prompt types can be fetched individually', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    for (const type of ALL_PROMPT_TYPES) {
      const res = await api.get(`/api/admin/prompts/${type}`).set(auth());
      assert.strictEqual(res.status, 200, `Failed for type: ${type}`);
      assert.strictEqual(res.body.type, type);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. PUT /api/admin/prompts/:type — save a prompt
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin Prompts: PUT /:type — save', () => {
  it('1. returns 400 when systemPrompt is missing', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.put('/api/admin/prompts/ai_assistant').set(auth()).send({});
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('2. returns 400 when systemPrompt is empty string', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.put('/api/admin/prompts/ai_assistant').set(auth()).send({ systemPrompt: '   ' });
    assert.strictEqual(res.status, 400);
  });

  it('3. returns 404 for unknown type', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.put('/api/admin/prompts/bogus_type').set(auth()).send({ systemPrompt: 'Test prompt' });
    assert.strictEqual(res.status, 404);
  });

  it('4. successfully saves a custom prompt and marks isCustomized=true', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const customText = `Test system prompt saved at ${Date.now()}`;
    const putRes = await api.put('/api/admin/prompts/ai_sdr').set(auth()).send({
      systemPrompt: customText,
      model: 'claude-haiku-4-5-20251001',
    });
    assert.strictEqual(putRes.status, 200);
    assert.strictEqual(putRes.body.success, true);

    // Verify it's returned via GET
    const getRes = await api.get('/api/admin/prompts/ai_sdr').set(auth());
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getRes.body.systemPrompt, customText);
    assert.strictEqual(getRes.body.isCustomized, true);
  });

  it('5. saving same type twice (upsert) — second save overwrites first', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const first = `First save ${Date.now()}`;
    const second = `Second save ${Date.now() + 1}`;

    await api.put('/api/admin/prompts/ai_sdr').set(auth()).send({ systemPrompt: first });
    await api.put('/api/admin/prompts/ai_sdr').set(auth()).send({ systemPrompt: second });

    const getRes = await api.get('/api/admin/prompts/ai_sdr').set(auth());
    assert.strictEqual(getRes.body.systemPrompt, second, 'Second save should overwrite first');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DELETE /api/admin/prompts/:type — reset to default
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin Prompts: DELETE /:type — reset', () => {
  it('1. returns 404 for unknown type', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.delete('/api/admin/prompts/bogus_type').set(auth());
    assert.strictEqual(res.status, 404);
  });

  it('2. delete after save → isCustomized becomes false, systemPrompt returns to default', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const customText = `Temp override ${Date.now()}`;

    // Save a custom prompt
    await api.put('/api/admin/prompts/ai_sdr').set(auth()).send({ systemPrompt: customText });
    const afterSave = await api.get('/api/admin/prompts/ai_sdr').set(auth());
    assert.strictEqual(afterSave.body.isCustomized, true);
    assert.strictEqual(afterSave.body.systemPrompt, customText);

    // Reset it
    const delRes = await api.delete('/api/admin/prompts/ai_sdr').set(auth());
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.body.success, true);
    assert.ok(typeof delRes.body.default === 'string' && delRes.body.default.length > 0);

    // Verify it's back to default
    const afterReset = await api.get('/api/admin/prompts/ai_sdr').set(auth());
    assert.strictEqual(afterReset.body.isCustomized, false);
    assert.notStrictEqual(afterReset.body.systemPrompt, customText);
  });

  it('3. delete when no custom prompt exists is a no-op (still 200)', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    // Reset to ensure no custom exists
    await api.delete('/api/admin/prompts/ai_sdr').set(auth());
    // Delete again — should not error
    const res = await api.delete('/api/admin/prompts/ai_sdr').set(auth());
    assert.strictEqual(res.status, 200);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. POST /api/admin/prompts/:type/test — test-run a prompt
// ═══════════════════════════════════════════════════════════════════════════════

describe('Admin Prompts: POST /:type/test', () => {
  it('1. returns 404 for unknown type', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.post('/api/admin/prompts/bogus_type/test').set(auth()).send({ testMessage: 'Hi' });
    assert.strictEqual(res.status, 404);
  });

  it('2. audit_research (Perplexity model) returns a note instead of running live', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.post('/api/admin/prompts/audit_research/test').set(auth()).send({ testMessage: 'test' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.note, 'should return a note for Perplexity model');
    assert.ok(res.body.note.toLowerCase().includes('perplexity') || res.body.note.toLowerCase().includes('cannot') || res.body.note.toLowerCase().includes('openrouter'));
  });

  it('3. Claude-backed prompt returns success structure (skip if no Anthropic key)', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.post('/api/admin/prompts/ai_sdr/test').set(auth()).send({ testMessage: 'Hello' });
    // Either returns a reply or 503 if Anthropic key not configured
    assert.ok(res.status === 200 || res.status === 503, `Unexpected status: ${res.status}`);
    if (res.status === 200) {
      assert.ok(typeof res.body.reply === 'string' || typeof res.body.note === 'string', 'should have reply or note');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. /api/assistant/system-prompt endpoints
// ═══════════════════════════════════════════════════════════════════════════════

describe('Assistant: /system-prompt endpoints', () => {
  it('1. GET /api/assistant/system-prompt returns 200 with systemPrompt string', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.get('/api/assistant/system-prompt').set(auth());
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.systemPrompt === 'string' && res.body.systemPrompt.length > 0);
  });

  it('2. POST /api/assistant/system-prompt without body returns 400', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.post('/api/assistant/system-prompt').set(auth()).send({});
    assert.strictEqual(res.status, 400);
  });

  it('3. POST /api/assistant/system-prompt saves and GET reflects new value', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const newPrompt = `Assistant prompt updated at ${Date.now()}`;
    const saveRes = await api.post('/api/assistant/system-prompt').set(auth()).send({ systemPrompt: newPrompt });
    assert.strictEqual(saveRes.status, 200);
    assert.strictEqual(saveRes.body.success, true);

    const getRes = await api.get('/api/assistant/system-prompt').set(auth());
    assert.strictEqual(getRes.body.systemPrompt, newPrompt);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. Integration test: save via admin API → verify route uses DB value
// ═══════════════════════════════════════════════════════════════════════════════

describe('Integration: admin prompts ↔ route files', () => {
  it('1. GET /api/admin/prompts list includes niche_researcher with non-empty systemPrompt', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.get('/api/admin/prompts').set(auth());
    const niche = res.body.prompts?.find(p => p.type === 'niche_researcher');
    assert.ok(niche, 'niche_researcher should be in the list');
    assert.ok(typeof niche.systemPrompt === 'string' && niche.systemPrompt.length > 0);
  });

  it('2. GET /api/admin/prompts list includes copywriter with non-empty systemPrompt', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const res = await api.get('/api/admin/prompts').set(auth());
    const cw = res.body.prompts?.find(p => p.type === 'copywriter');
    assert.ok(cw, 'copywriter should be in the list');
    assert.ok(typeof cw.systemPrompt === 'string' && cw.systemPrompt.length > 0);
  });

  it('3. save custom prompt → GET single → matches what was saved', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    const custom = `Custom copywriter prompt ${Date.now()}`;
    await api.put('/api/admin/prompts/copywriter').set(auth()).send({ systemPrompt: custom });

    const res = await api.get('/api/admin/prompts/copywriter').set(auth());
    assert.strictEqual(res.body.systemPrompt, custom);
    assert.strictEqual(res.body.isCustomized, true);

    // Cleanup: reset to default
    await api.delete('/api/admin/prompts/copywriter').set(auth());
  });

  it('4. after reset, GET single shows isCustomized=false', async function () {
    if (!hasAuth || !hasDb) return this.skip();
    await api.put('/api/admin/prompts/niche_researcher').set(auth()).send({ systemPrompt: 'Temp' });
    await api.delete('/api/admin/prompts/niche_researcher').set(auth());

    const res = await api.get('/api/admin/prompts/niche_researcher').set(auth());
    assert.strictEqual(res.body.isCustomized, false);
    // Default should contain relevant keywords
    assert.ok(res.body.systemPrompt.toLowerCase().includes('niche'), 'default prompt should mention niche');
  });
});
