/**
 * API Endpoint Gaps — Unit & Integration Tests
 * Tests for all endpoints identified in the Frontend Audit Report (Section 28).
 * These tests cover routes that need to be created. Each test:
 *   - SKIPs if the route is not yet implemented (SPA fallback detected)
 *   - PASSES with correct assertions once the route exists
 * Run: npm run test:gaps
 * Requires: JWT_API_KEY, DB_PASSWORD or DATABASE_URL
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

function auth() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const NIL_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Detect if a response indicates the route is not yet implemented:
 * - GET: SPA fallback returns 200 with HTML content-type
 * - POST/PUT/DELETE: Returns 404 (no route matched) or 401 when we have no valid token
 *   (route mount exists with authMiddleware but sub-route doesn't)
 */
function isNotImplemented(res) {
  const ct = res.headers['content-type'] || '';
  if (ct.includes('text/html') && res.status === 200) return true;
  if (res.status === 404 && ct.includes('text/html')) return true;
  if (res.status === 401 && !token) return true;
  return false;
}

function skip(ctx, res) {
  if (isNotImplemented(res)) { ctx.skip('Route not yet implemented'); return true; }
  return false;
}

// =============================================================================
// 1. Lead Lists Import — POST /api/lead-lists/import
// =============================================================================

describe('API GAP: lead-lists/import', () => {
  it('1. POST /api/lead-lists/import without auth returns 401', async function () {
    const res = await api.post('/api/lead-lists/import').send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/lead-lists/import with empty body returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/lead-lists/import').set(auth()).send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });

  it('3. POST /api/lead-lists/import with CSV rows creates list', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-lists/import').set(auth()).send({
      name: 'Import Test',
      rows: [
        { email: 'import1@test.com', first_name: 'Test', last_name: 'User', company: 'Acme' },
        { email: 'import2@test.com', first_name: 'Jane', last_name: 'Doe', company: 'Corp' },
      ],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
    assert.ok(res.body.id || res.body.listId);
  });

  it('4. POST /api/lead-lists/import without name uses default', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/lead-lists/import').set(auth()).send({
      rows: [{ email: 'default@test.com', first_name: 'A', last_name: 'B' }],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201, 400].includes(res.status));
  });

  it('5. POST /api/lead-lists/import with empty rows returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/lead-lists/import').set(auth()).send({ name: 'Empty', rows: [] });
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });
});

// =============================================================================
// 2. Conversations (Unibox) — CRUD /api/conversations
// =============================================================================

describe('API GAP: conversations', () => {
  it('1. GET /api/conversations without auth returns 401', async function () {
    const res = await api.get('/api/conversations');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/conversations with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/conversations').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/conversations creates conversation', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/conversations').set(auth()).send({
      channel: 'email',
      subject: 'Test Thread',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
    assert.ok(res.body.id);
  });

  it('4. GET /api/conversations/:id returns single conversation or 404', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/conversations/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. PUT /api/conversations/:id updates status', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/conversations/${NIL_UUID}`).set(auth()).send({ status: 'closed' });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('6. DELETE /api/conversations/:id returns 200 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/conversations/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 3. Messages (Unibox) — CRUD /api/messages
// =============================================================================

describe('API GAP: messages', () => {
  it('1. GET /api/messages without auth returns 401', async function () {
    const res = await api.get('/api/messages');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/messages?conversation_id=:id returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/messages?conversation_id=${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/messages creates message', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/messages').set(auth()).send({
      conversation_id: NIL_UUID,
      direction: 'outbound',
      body: 'Hello, this is a test message',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201, 400].includes(res.status));
  });

  it('4. POST /api/messages without body returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/messages').set(auth()).send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });

  it('5. POST /api/messages with ai_drafted flag', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/messages').set(auth()).send({
      conversation_id: NIL_UUID,
      direction: 'outbound',
      body: 'AI drafted reply',
      ai_drafted: true,
    });
    if (skip(this, res)) return;
    assert.ok([200, 201, 400].includes(res.status));
  });
});

// =============================================================================
// 4. CRM Activity Feed — GET /api/activity
// =============================================================================

describe('API GAP: activity', () => {
  it('1. GET /api/activity without auth returns 401', async function () {
    const res = await api.get('/api/activity');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/activity with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/activity').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. GET /api/activity?resource_type=lead&resource_id=:id filters correctly', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/activity?resource_type=lead&resource_id=${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('4. POST /api/activity creates activity entry', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/activity').set(auth()).send({
      action: 'note_added',
      resource_type: 'lead',
      resource_id: NIL_UUID,
      metadata_json: { note: 'Test note' },
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('5. GET /api/activity supports pagination via limit/offset', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/activity?limit=5&offset=0').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.length <= 5);
  });
});

// =============================================================================
// 5. Audit: Company Research — POST /api/audit/research
// =============================================================================

describe('API GAP: audit/research', () => {
  it('1. POST /api/audit/research without auth returns 401', async function () {
    const res = await api.post('/api/audit/research').send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/audit/research with project_id and URL triggers research', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/audit/research').set(auth()).send({
      project_id: NIL_UUID,
      company_url: 'https://example.com',
    });
    if (skip(this, res)) return;
    assert.ok([200, 202].includes(res.status));
  });

  it('3. POST /api/audit/research without URL returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/audit/research').set(auth()).send({ project_id: NIL_UUID });
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });

  it('4. POST /api/audit/research without project_id returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/audit/research').set(auth()).send({ company_url: 'https://example.com' });
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });
});

// =============================================================================
// 6. Audit: Surveys — CRUD /api/audit/surveys
// =============================================================================

describe('API GAP: audit/surveys', () => {
  it('1. GET /api/audit/surveys without auth returns 401', async function () {
    const res = await api.get('/api/audit/surveys');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/audit/surveys with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/audit/surveys').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/audit/surveys creates survey', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/audit/surveys').set(auth()).send({
      project_id: NIL_UUID,
      title: 'Test Survey',
      description: 'A test survey',
      questions_json: [
        { type: 'multiple_choice', text: 'How satisfied are you?', options: ['Very', 'Somewhat', 'Not at all'] },
      ],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. GET /api/audit/surveys/:id returns single survey or 404', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/audit/surveys/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. PUT /api/audit/surveys/:id updates survey', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/audit/surveys/${NIL_UUID}`).set(auth()).send({ title: 'Updated', status: 'active' });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('6. DELETE /api/audit/surveys/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/audit/surveys/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });

  it('7. POST /api/audit/surveys/:id/responses submits response', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post(`/api/audit/surveys/${NIL_UUID}/responses`).set(auth()).send({
      respondent_name: 'Test Respondent',
      respondent_email: 'resp@test.com',
      answers_json: { q1: 'Very' },
    });
    if (skip(this, res)) return;
    assert.ok([200, 201, 400, 404].includes(res.status));
  });

  it('8. GET /api/audit/surveys/:id/responses returns responses', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/audit/surveys/${NIL_UUID}/responses`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });
});

// =============================================================================
// 7. Audit: Interviews — CRUD /api/audit/interviews
// =============================================================================

describe('API GAP: audit/interviews', () => {
  it('1. GET /api/audit/interviews without auth returns 401', async function () {
    const res = await api.get('/api/audit/interviews');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/audit/interviews with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/audit/interviews').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/audit/interviews creates interview', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/audit/interviews').set(auth()).send({
      project_id: NIL_UUID,
      interviewee_name: 'John Smith',
      interviewee_role: 'CTO',
      department: 'Engineering',
      questions_json: [{ text: 'What are your main challenges?' }],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. PUT /api/audit/interviews/:id updates interview', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/audit/interviews/${NIL_UUID}`).set(auth()).send({
      status: 'completed',
      notes: 'Great insights gathered',
    });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. DELETE /api/audit/interviews/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/audit/interviews/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 8. Audit: Transcripts — CRUD /api/audit/transcripts
// =============================================================================

describe('API GAP: audit/transcripts', () => {
  it('1. GET /api/audit/transcripts without auth returns 401', async function () {
    const res = await api.get('/api/audit/transcripts');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/audit/transcripts with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/audit/transcripts').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/audit/transcripts creates transcript', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/audit/transcripts').set(auth()).send({
      project_id: NIL_UUID,
      name: 'CTO Interview',
      speaker_name: 'John Smith',
      speaker_role: 'CTO',
      content_text: 'This is the full transcript text...',
      source: 'manual',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. PUT /api/audit/transcripts/:id updates with AI insights', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/audit/transcripts/${NIL_UUID}`).set(auth()).send({
      ai_summary: 'Key discussion about scaling challenges',
      ai_insights: ['Need for automation', 'Process bottlenecks'],
    });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. DELETE /api/audit/transcripts/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/audit/transcripts/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 9. Audit: Process Maps — CRUD /api/audit/process-maps
// =============================================================================

describe('API GAP: audit/process-maps', () => {
  it('1. GET /api/audit/process-maps without auth returns 401', async function () {
    const res = await api.get('/api/audit/process-maps');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/audit/process-maps with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/audit/process-maps').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/audit/process-maps creates process map', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/audit/process-maps').set(auth()).send({
      project_id: NIL_UUID,
      title: 'Sales Process',
      nodes: [{ id: 'n1', label: 'Lead In', type: 'start' }, { id: 'n2', label: 'Qualify', type: 'step' }],
      edges: [{ source: 'n1', target: 'n2', label: 'qualifies' }],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. PUT /api/audit/process-maps/:id updates map', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/audit/process-maps/${NIL_UUID}`).set(auth()).send({ title: 'Updated' });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. DELETE /api/audit/process-maps/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/audit/process-maps/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 10. Audit: Analysis — POST /api/audit/analyse
// =============================================================================

describe('API GAP: audit/analyse', () => {
  it('1. POST /api/audit/analyse without auth returns 401', async function () {
    const res = await api.post('/api/audit/analyse').send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/audit/analyse with project_id triggers analysis', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/audit/analyse').set(auth()).send({ project_id: NIL_UUID });
    if (skip(this, res)) return;
    assert.ok([200, 202].includes(res.status));
  });

  it('3. GET /api/audit/analyses?project_id=:id returns analyses', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/audit/analyses?project_id=${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('4. POST /api/audit/analyse without project_id returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/audit/analyse').set(auth()).send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });
});

// =============================================================================
// 11. Implementation Phases — CRUD /api/implementation/phases
// =============================================================================

describe('API GAP: implementation/phases', () => {
  it('1. GET /api/implementation/phases without auth returns 401', async function () {
    const res = await api.get('/api/implementation/phases');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/implementation/phases with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/implementation/phases').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/implementation/phases creates phase', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/implementation/phases').set(auth()).send({
      project_id: NIL_UUID,
      title: 'Phase 1: Discovery',
      sort_order: 0,
      tasks: [{ title: 'Stakeholder interviews', done: false }],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. PUT /api/implementation/phases/:id updates phase', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/implementation/phases/${NIL_UUID}`).set(auth()).send({ status: 'in_progress' });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. DELETE /api/implementation/phases/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/implementation/phases/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });

  it('6. GET /api/implementation/phases?project_id=:id filters by project', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/implementation/phases?project_id=${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });

  it('7. POST /api/implementation/phases/bulk creates multiple phases', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/implementation/phases/bulk').set(auth()).send({
      project_id: NIL_UUID,
      phases: [
        { title: 'Bulk Phase A', sort_order: 0, tasks: [{ id: 'bt1', name: 'Task A1', status: 'not_started' }] },
        { title: 'Bulk Phase B', sort_order: 1, tasks: [] },
      ],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 2);
  });

  it('8. POST /api/implementation/phases/bulk without project_id returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/implementation/phases/bulk').set(auth()).send({ phases: [] });
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });
});

// =============================================================================
// 12. Workflows — CRUD /api/workflows
// =============================================================================

describe('API GAP: workflows', () => {
  it('1. GET /api/workflows without auth returns 401', async function () {
    const res = await api.get('/api/workflows');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/workflows with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/workflows').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/workflows creates workflow', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/workflows').set(auth()).send({
      title: 'New Lead Nurture',
      category: 'outreach',
      trigger_type: 'event',
      steps: [
        { action: 'send_email', config: { template: 'welcome' } },
        { action: 'wait', config: { hours: 24 } },
      ],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. PUT /api/workflows/:id updates workflow', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/workflows/${NIL_UUID}`).set(auth()).send({ enabled: true });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. DELETE /api/workflows/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/workflows/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 13. Messaging Copies — CRUD /api/messaging-copies + generate
// =============================================================================

describe('API GAP: messaging-copies', () => {
  it('1. GET /api/messaging-copies without auth returns 401', async function () {
    const res = await api.get('/api/messaging-copies');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/messaging-copies with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/messaging-copies').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/messaging-copies creates copy', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/messaging-copies').set(auth()).send({
      name: 'Pain Point Hook',
      category: 'pain_point',
      content: 'Struggling to scale outbound?',
      audience: 'B2B SaaS founders',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. POST /api/messaging-copies/generate generates AI copy', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/messaging-copies/generate').set(auth()).send({
      category: 'linkedin_opener',
      audience: 'VP Sales',
      tone: 'casual',
    });
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });

  it('5. DELETE /api/messaging-copies/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/messaging-copies/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 14. Campaigns — CRUD /api/campaigns
// =============================================================================

describe('API GAP: campaigns', () => {
  it('1. GET /api/campaigns without auth returns 401', async function () {
    const res = await api.get('/api/campaigns');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/campaigns with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/campaigns').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/campaigns creates campaign', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/campaigns').set(auth()).send({
      campaign_name: 'Q1 Outbound',
      platform: 'instantly',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. PUT /api/campaigns/:id updates campaign', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/campaigns/${NIL_UUID}`).set(auth()).send({ status: 'paused' });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. DELETE /api/campaigns/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/campaigns/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });

  it('6. GET /api/campaigns/:id returns single campaign or 404', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/campaigns/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });
});

// =============================================================================
// 15. Niches — CRUD /api/niches + research
// =============================================================================

describe('API GAP: niches', () => {
  it('1. GET /api/niches without auth returns 401', async function () {
    const res = await api.get('/api/niches');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/niches with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/niches').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/niches creates niche', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/niches').set(auth()).send({ name: 'AI Consulting', audience: 'SMBs' });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. POST /api/niches/chat without message returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/niches/chat').set(auth()).send({});
    if (skip(this, res)) return;
    assert.ok([400, 503].includes(res.status));
  });

  it('4b. POST /api/niches/chat with message returns agentText', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/niches/chat').set(auth()).send({
      message: 'My skills are sales and AI automation',
      messages: [],
    });
    if (skip(this, res)) return;
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) {
      assert.ok(typeof res.body.agentText === 'string');
    }
  });

  it('5. DELETE /api/niches/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/niches/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 16. Sales Scripts — CRUD /api/sales-scripts + generate
// =============================================================================

describe('API GAP: sales-scripts', () => {
  it('1. GET /api/sales-scripts without auth returns 401', async function () {
    const res = await api.get('/api/sales-scripts');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/sales-scripts with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/sales-scripts').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/sales-scripts creates script', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/sales-scripts').set(auth()).send({
      name: 'Cold Call v1',
      type: 'cold_call',
      sections_json: { opener: 'Hi {{name}}...', close: 'Would it make sense...' },
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. POST /api/sales-scripts/generate generates AI script', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/sales-scripts/generate').set(auth()).send({
      type: 'discovery',
      audience: 'CTOs',
    });
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });

  it('5. PUT /api/sales-scripts/:id updates script', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/sales-scripts/${NIL_UUID}`).set(auth()).send({ name: 'Updated' });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('6. DELETE /api/sales-scripts/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/sales-scripts/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 17. Call Analyses — CRUD /api/call-analyses
// =============================================================================

describe('API GAP: call-analyses', () => {
  it('1. POST /api/call-analyses without auth returns 401', async function () {
    const res = await api.post('/api/call-analyses').send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/call-analyses with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/call-analyses').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/call-analyses with transcript creates analysis', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/call-analyses').set(auth()).send({
      name: 'Discovery Call - Acme',
      transcript_text: 'Sales: Hi John...\nJohn: Sure...',
      source: 'manual',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201, 202].includes(res.status));
  });

  it('4. POST /api/call-analyses without transcript returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/call-analyses').set(auth()).send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });

  it('5. GET /api/call-analyses/:id returns single analysis or 404', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get(`/api/call-analyses/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });
});

// =============================================================================
// 18. Content Posts — CRUD /api/content-posts
// =============================================================================

describe('API GAP: content-posts', () => {
  it('1. GET /api/content-posts without auth returns 401', async function () {
    const res = await api.get('/api/content-posts');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/content-posts with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/content-posts').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/content-posts creates draft post', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/content-posts').set(auth()).send({
      platform: 'linkedin',
      title: 'AI in B2B Sales',
      body_text: "Here's the thing...",
      format: 'text',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. POST /api/content-posts creates carousel', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/content-posts').set(auth()).send({
      platform: 'linkedin',
      format: 'carousel',
      slides: [{ headline: 'Slide 1', body: 'Content' }],
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('5. PUT /api/content-posts/:id schedules post', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/content-posts/${NIL_UUID}`).set(auth()).send({
      status: 'scheduled',
      scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('6. DELETE /api/content-posts/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/content-posts/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });

  it('7. GET /api/content-posts?status=draft filters by status', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/content-posts?status=draft').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });

  it('8. POST /api/content-posts/extract-insights returns insights or empty', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/content-posts/extract-insights').set(auth()).send({});
    if (skip(this, res)) return;
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body.insights));
    }
  });

  it('9. POST /api/content-posts/generate without topic returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/content-posts/generate').set(auth()).send({});
    if (skip(this, res)) return;
    assert.ok([400, 503].includes(res.status));
  });

  it('10. POST /api/content-posts/generate with topic returns posts', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/content-posts/generate').set(auth()).send({
      topic: 'Why AI is the future of B2B sales',
      format: 'text',
    });
    if (skip(this, res)) return;
    assert.ok([200, 503].includes(res.status));
    if (res.status === 200) {
      assert.ok(Array.isArray(res.body.posts));
    }
  });
});

// =============================================================================
// 19. Tracked Competitors — CRUD /api/tracked-competitors
// =============================================================================

describe('API GAP: tracked-competitors', () => {
  it('1. GET /api/tracked-competitors without auth returns 401', async function () {
    const res = await api.get('/api/tracked-competitors');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/tracked-competitors with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/tracked-competitors').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/tracked-competitors creates competitor', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/tracked-competitors').set(auth()).send({
      platform: 'linkedin',
      name: 'Competitor Inc',
      handle: 'competitor-inc',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. DELETE /api/tracked-competitors/:id returns 200/204 or 404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/tracked-competitors/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });

  it('5. POST /api/tracked-competitors without name returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/tracked-competitors').set(auth()).send({ platform: 'linkedin' });
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });
});

// =============================================================================
// 20. Community Accounts — CRUD /api/community/accounts
// =============================================================================

describe('API GAP: community/accounts', () => {
  it('1. GET /api/community/accounts without auth returns 401', async function () {
    const res = await api.get('/api/community/accounts');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/community/accounts with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/community/accounts').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/community/accounts connects account', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/community/accounts').set(auth()).send({ platform: 'skool', name: 'AI Builders' });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. DELETE /api/community/accounts/:id disconnects account', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/community/accounts/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 21. Community Keywords — CRUD /api/community/keywords
// =============================================================================

describe('API GAP: community/keywords', () => {
  it('1. GET /api/community/keywords without auth returns 401', async function () {
    const res = await api.get('/api/community/keywords');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/community/keywords with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/community/keywords').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/community/keywords adds keyword', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/community/keywords').set(auth()).send({ keyword: 'lead generation' });
    if (skip(this, res)) return;
    assert.ok([200, 201, 409].includes(res.status));
  });

  it('4. DELETE /api/community/keywords/:id removes keyword', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/community/keywords/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });

  it('5. POST /api/community/keywords duplicate returns 409 or 200', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const kw = `kw-${Date.now()}`;
    const r1 = await api.post('/api/community/keywords').set(auth()).send({ keyword: kw });
    if (skip(this, r1)) return;
    const r2 = await api.post('/api/community/keywords').set(auth()).send({ keyword: kw });
    assert.ok([200, 201, 409].includes(r2.status));
  });
});

// =============================================================================
// 22. Community Voice Samples — CRUD /api/community/voice-samples
// =============================================================================

describe('API GAP: community/voice-samples', () => {
  it('1. GET /api/community/voice-samples without auth returns 401', async function () {
    const res = await api.get('/api/community/voice-samples');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/community/voice-samples with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/community/voice-samples').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/community/voice-samples adds sample', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/community/voice-samples').set(auth()).send({
      content_type: 'linkedin_post',
      title: 'Sample Post',
      content: 'A writing sample...',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201].includes(res.status));
  });

  it('4. DELETE /api/community/voice-samples/:id removes sample', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/community/voice-samples/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 404].includes(res.status));
  });
});

// =============================================================================
// 23. Community Feed — GET/PUT /api/community/feed
// =============================================================================

describe('API GAP: community/feed', () => {
  it('1. GET /api/community/feed without auth returns 401', async function () {
    const res = await api.get('/api/community/feed');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/community/feed with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/community/feed').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. PUT /api/community/feed/:id/reply updates AI draft', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/community/feed/${NIL_UUID}/reply`).set(auth()).send({
      ai_draft_reply: 'Great point!',
      reply_status: 'approved',
    });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('4. PUT /api/community/feed/:id/status marks item as posted', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/community/feed/${NIL_UUID}/status`).set(auth()).send({ reply_status: 'posted' });
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('5. GET /api/community/feed?platform=skool filters by platform', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/community/feed?platform=skool').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });
});

// =============================================================================
// 24. AI Assistant — POST /api/assistant/chat
// =============================================================================

describe('API GAP: assistant/chat', () => {
  it('1. POST /api/assistant/chat without auth returns 401', async function () {
    const res = await api.post('/api/assistant/chat').send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. POST /api/assistant/chat with message returns response', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/assistant/chat').set(auth()).send({ message: 'Top campaigns?' });
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.reply || res.body.message || res.body.content);
  });

  it('3. POST /api/assistant/chat without message returns 400', async function () {
    if (!hasAuth) this.skip();
    const res = await api.post('/api/assistant/chat').set(auth()).send({});
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 400);
  });

  it('4. GET /api/assistant/history returns chat history', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/assistant/history').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('5. DELETE /api/assistant/history clears history', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete('/api/assistant/history').set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204].includes(res.status));
  });
});

// =============================================================================
// 25. Billing — GET /api/billing/*
// =============================================================================

describe('API GAP: billing', () => {
  it('1. GET /api/billing/plan without auth returns 401', async function () {
    const res = await api.get('/api/billing/plan');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/billing/plan returns current plan', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/plan').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });

  it('3. GET /api/billing/invoices returns invoices array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/invoices').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('4. GET /api/billing/credits returns credit balance', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/credits').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });

  it('5. GET /api/billing/credits/history returns transactions', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/billing/credits/history').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });
});

// =============================================================================
// 26. Notifications — CRUD /api/notifications
// =============================================================================

describe('API GAP: notifications', () => {
  it('1. GET /api/notifications without auth returns 401', async function () {
    const res = await api.get('/api/notifications');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/notifications with auth returns array', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/notifications').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  it('3. PUT /api/notifications/:id/read marks as read', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/notifications/${NIL_UUID}/read`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 404].includes(res.status));
  });

  it('4. PUT /api/notifications/read-all marks all as read', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put('/api/notifications/read-all').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });

  it('5. GET /api/notifications?status=unread filters unread', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/notifications?status=unread').set(auth());
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 200);
  });
});

// =============================================================================
// 27-32. Admin APIs — /api/admin/*
// =============================================================================

describe('API GAP: admin/agencies', () => {
  it('1. GET /api/admin/agencies without auth returns 401', async function () {
    const res = await api.get('/api/admin/agencies');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/agencies with auth returns array or 403', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/agencies').set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 403].includes(res.status));
    if (res.status === 200) assert.ok(Array.isArray(res.body));
  });

  it('3. POST /api/admin/agencies creates agency', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/admin/agencies').set(auth()).send({ name: 'Test Agency', email: 'a@test.com' });
    if (skip(this, res)) return;
    assert.ok([200, 201, 403].includes(res.status));
  });

  it('4. PUT /api/admin/agencies/:id updates agency', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/admin/agencies/${NIL_UUID}`).set(auth()).send({ client_slots: 10 });
    if (skip(this, res)) return;
    assert.ok([200, 403, 404].includes(res.status));
  });

  it('5. DELETE /api/admin/agencies/:id returns 200/403/404', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.delete(`/api/admin/agencies/${NIL_UUID}`).set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 204, 403, 404].includes(res.status));
  });
});

describe('API GAP: admin/organisations', () => {
  it('1. GET /api/admin/organisations without auth returns 401', async function () {
    const res = await api.get('/api/admin/organisations');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/organisations with auth returns array or 403', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/organisations').set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 403].includes(res.status));
  });

  it('3. PUT /api/admin/organisations/:id/credits adjusts credits', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/admin/organisations/${NIL_UUID}/credits`).set(auth()).send({ amount: 100 });
    if (skip(this, res)) return;
    assert.ok([200, 403, 404].includes(res.status));
  });

  it('4. PUT /api/admin/organisations/:id/plan changes plan', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/admin/organisations/${NIL_UUID}/plan`).set(auth()).send({ plan_tier: 'growth' });
    if (skip(this, res)) return;
    assert.ok([200, 403, 404].includes(res.status));
  });
});

describe('API GAP: admin/users', () => {
  it('1. GET /api/admin/users without auth returns 401', async function () {
    const res = await api.get('/api/admin/users');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/users with auth returns array or 403', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/users').set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 403].includes(res.status));
  });
});

describe('API GAP: admin/support-tickets', () => {
  it('1. GET /api/admin/support-tickets without auth returns 401', async function () {
    const res = await api.get('/api/admin/support-tickets');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/support-tickets with auth returns array or 403', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/support-tickets').set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 403].includes(res.status));
  });

  it('3. POST /api/admin/support-tickets creates ticket', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.post('/api/admin/support-tickets').set(auth()).send({
      subject: 'Integration issue',
      priority: 'high',
    });
    if (skip(this, res)) return;
    assert.ok([200, 201, 403].includes(res.status));
  });

  it('4. PUT /api/admin/support-tickets/:id resolves ticket', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/admin/support-tickets/${NIL_UUID}`).set(auth()).send({ status: 'resolved' });
    if (skip(this, res)) return;
    assert.ok([200, 403, 404].includes(res.status));
  });
});

describe('API GAP: admin/feature-flags', () => {
  it('1. GET /api/admin/feature-flags without auth returns 401', async function () {
    const res = await api.get('/api/admin/feature-flags');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/feature-flags with auth returns array or 403', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/feature-flags').set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 403].includes(res.status));
  });

  it('3. PUT /api/admin/feature-flags/:id toggles flag', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/admin/feature-flags/${NIL_UUID}`).set(auth()).send({ status: 'enabled' });
    if (skip(this, res)) return;
    assert.ok([200, 403, 404].includes(res.status));
  });
});

describe('API GAP: admin/system-health', () => {
  it('1. GET /api/admin/system-health without auth returns 401', async function () {
    const res = await api.get('/api/admin/system-health');
    if (skip(this, res)) return;
    assert.strictEqual(res.status, 401);
  });

  it('2. GET /api/admin/system-health with auth returns status or 403', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/system-health').set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 403].includes(res.status));
  });

  it('3. GET /api/admin/errors returns error logs or 403', async function () {
    if (!hasAuth) this.skip();
    const res = await api.get('/api/admin/errors').set(auth());
    if (skip(this, res)) return;
    assert.ok([200, 403].includes(res.status));
  });

  it('4. PUT /api/admin/errors/:id/resolve resolves error', async function () {
    if (!hasAuth || !hasDb) this.skip();
    const res = await api.put(`/api/admin/errors/${NIL_UUID}/resolve`).set(auth()).send({ resolution_notes: 'Fixed' });
    if (skip(this, res)) return;
    assert.ok([200, 403, 404].includes(res.status));
  });
});
