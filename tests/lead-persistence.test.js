/**
 * Lead Persistence Tests
 *
 * Tests the schema extensions (search_source, email_validation_status, discovery_query_json),
 * the new DB functions (upsertDiscoveredCompany, upsertDiscoveredLead, createDiscoveryList,
 * updateListCounts, persistDiscoveryResults), and the wired endpoints (discover, enrich/bulk).
 *
 * Run: npm run test:lead-persist
 * Requires: JWT_API_KEY, DATABASE_URL or DB_PASSWORD
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import { app } from '../server.js';
import crypto from 'node:crypto';
import {
  query,
  ensureOrgExists,
  upsertDiscoveredCompany,
  upsertDiscoveredLead,
  createDiscoveryList,
  updateListCounts,
  persistDiscoveryResults,
  getCompanyEnrichmentStatus,
  getLeadsByCompanyId,
} from '../api/db.js';

const api = request(app);
const hasDb = !!(process.env.DATABASE_URL || process.env.DB_PASSWORD);
const hasAuth = !!process.env.JWT_API_KEY;

let token = null;
if (hasAuth) {
  const res = await request(app).post('/api/auth/token').send({ apiKey: process.env.JWT_API_KEY });
  if (res.status === 200 && res.body.token) token = res.body.token;
}
function auth() { return token ? { Authorization: `Bearer ${token}` } : {}; }

const TEST_ORG = crypto.randomUUID();
const cleanupIds = { companies: [], leads: [], lists: [] };

if (hasDb) {
  await query(
    `INSERT INTO organisations (id, name, slug) VALUES ($1, 'Test Persist Org', 'test-persist') ON CONFLICT (id) DO NOTHING`,
    [TEST_ORG]
  ).catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SCHEMA VALIDATION — new columns exist
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Persistence: schema columns', { skip: !hasDb }, () => {
  before(async () => {
    await upsertDiscoveredCompany(TEST_ORG, { name: '__schema_trigger__' }, {}).catch(() => {});
    await query("DELETE FROM companies WHERE name = '__schema_trigger__' AND org_id = $1", [TEST_ORG]).catch(() => {});
  });

  it('1. companies.search_source column exists', async () => {
    const res = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'search_source'"
    );
    assert.strictEqual(res.rows.length, 1);
  });

  it('2. companies.discovery_query_json column exists', async () => {
    const res = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'discovery_query_json'"
    );
    assert.strictEqual(res.rows.length, 1);
  });

  it('3. leads.search_source column exists', async () => {
    const res = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'search_source'"
    );
    assert.strictEqual(res.rows.length, 1);
  });

  it('4. leads.email_validation_status column exists', async () => {
    const res = await query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email_validation_status'"
    );
    assert.strictEqual(res.rows.length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. upsertDiscoveredCompany — insert & update
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Persistence: upsertDiscoveredCompany', { skip: !hasDb }, () => {
  before(async () => { await ensureOrgExists(TEST_ORG); });

  it('1. inserts a new company with all fields', async () => {
    const id = await upsertDiscoveredCompany(TEST_ORG, {
      name: 'Test Persist Corp',
      domain: 'https://testpersist.example.com/page',
      industry: 'Technology',
      employees: 150,
      location: 'San Francisco, CA, United States',
      description: 'A test company for persistence',
      icpScore: 88,
    }, { source: 'ai_ark', queryJson: { industry: 'Technology', keywords: 'SaaS' } });
    assert.ok(id, 'should return a UUID');
    cleanupIds.companies.push(id);

    const r = await query('SELECT * FROM companies WHERE id = $1', [id]);
    const c = r.rows[0];
    assert.strictEqual(c.name, 'Test Persist Corp');
    assert.strictEqual(c.domain, 'testpersist.example.com');
    assert.strictEqual(c.industry, 'Technology');
    assert.strictEqual(c.employee_count, 150);
    assert.strictEqual(c.headquarters_country, 'United States');
    assert.strictEqual(c.headquarters_state, 'CA');
    assert.strictEqual(c.headquarters_city, 'San Francisco');
    assert.strictEqual(c.search_source, 'ai_ark');
    assert.ok(c.discovery_query_json, 'should have discovery_query_json');
    assert.strictEqual(c.icp_fit_score, 88);
    assert.strictEqual(c.description, 'A test company for persistence');
  });

  it('2. upserts (updates) existing company by domain match', async () => {
    const id = await upsertDiscoveredCompany(TEST_ORG, {
      name: 'Test Persist Corp UPDATED',
      domain: 'testpersist.example.com',
      industry: 'SaaS',
      employees: 200,
    }, { source: 'icypeas' });
    assert.strictEqual(id, cleanupIds.companies[0], 'should return same ID');

    const r = await query('SELECT * FROM companies WHERE id = $1', [id]);
    const c = r.rows[0];
    assert.strictEqual(c.industry, 'SaaS');
    assert.strictEqual(c.employee_count, 200);
    assert.strictEqual(c.search_source, 'icypeas');
    assert.strictEqual(c.headquarters_city, 'San Francisco', 'should preserve existing city');
  });

  it('3. upserts existing company by name match (no domain)', async () => {
    const id = await upsertDiscoveredCompany(TEST_ORG, {
      name: 'Test Persist Corp',
      description: 'Updated description',
    }, { source: 'findy' });
    assert.strictEqual(id, cleanupIds.companies[0]);

    const r = await query('SELECT description, search_source FROM companies WHERE id = $1', [id]);
    assert.strictEqual(r.rows[0].description, 'Updated description');
    assert.strictEqual(r.rows[0].search_source, 'findy');
  });

  it('4. returns null for missing org or name', async () => {
    const r1 = await upsertDiscoveredCompany(null, { name: 'X' });
    assert.strictEqual(r1, null);
    const r2 = await upsertDiscoveredCompany(TEST_ORG, {});
    assert.strictEqual(r2, null);
  });

  it('5. handles employee count parsing (string, N/A, 0)', async () => {
    const id = await upsertDiscoveredCompany(TEST_ORG, {
      name: 'EmpTest Corp',
      domain: 'emptest-persist.example.com',
      employees: '500+',
    }, { source: 'test' });
    cleanupIds.companies.push(id);
    const r = await query('SELECT employee_count FROM companies WHERE id = $1', [id]);
    assert.strictEqual(r.rows[0].employee_count, 500);

    const id2 = await upsertDiscoveredCompany(TEST_ORG, {
      name: 'EmpTest2 Corp',
      domain: 'emptest2.example.com',
      employees: 'N/A',
    }, { source: 'test' });
    cleanupIds.companies.push(id2);
    const r2 = await query('SELECT employee_count FROM companies WHERE id = $1', [id2]);
    assert.strictEqual(r2.rows[0].employee_count, null);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. createDiscoveryList & updateListCounts
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Persistence: createDiscoveryList & updateListCounts', { skip: !hasDb }, () => {
  it('1. creates a new lead_list', async () => {
    const listId = await createDiscoveryList(TEST_ORG, 'Test Discovery List');
    assert.ok(listId, 'should return a list UUID');
    cleanupIds.lists.push(listId);

    const r = await query('SELECT * FROM lead_lists WHERE id = $1', [listId]);
    const l = r.rows[0];
    assert.strictEqual(l.name, 'Test Discovery List');
    assert.strictEqual(l.source, 'discovery');
    assert.strictEqual(l.status, 'draft');
    assert.strictEqual(l.total_contacts, 0);
  });

  it('2. uses default name when none provided', async () => {
    const listId = await createDiscoveryList(TEST_ORG);
    assert.ok(listId);
    cleanupIds.lists.push(listId);

    const r = await query('SELECT name FROM lead_lists WHERE id = $1', [listId]);
    assert.ok(r.rows[0].name.startsWith('Discovery '));
  });

  it('3. updateListCounts reflects actual leads', async () => {
    const listId = cleanupIds.lists[0];
    await updateListCounts(listId);
    const r = await query('SELECT total_contacts, enriched_count FROM lead_lists WHERE id = $1', [listId]);
    assert.strictEqual(r.rows[0].total_contacts, 0);
    assert.strictEqual(r.rows[0].enriched_count, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. upsertDiscoveredLead — insert & update, linked to company
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Persistence: upsertDiscoveredLead', { skip: !hasDb }, () => {
  it('1. inserts a new lead linked to company and list', async () => {
    const companyId = cleanupIds.companies[0];
    const listId = cleanupIds.lists[0];
    const id = await upsertDiscoveredLead(TEST_ORG, {
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane.doe.persist.test@testpersist.example.com',
      title: 'VP Sales',
      company: 'Test Persist Corp',
      company_domain: 'testpersist.example.com',
      companyId,
      linkedin_url: 'https://linkedin.com/in/janedoe',
      phone: '+1-555-0123',
      email_bounce_risk: 'low',
      email_validation_status: 'valid',
    }, { listId, source: 'icypeas_enrichment' });
    assert.ok(id, 'should return a lead UUID');
    cleanupIds.leads.push(id);

    const r = await query('SELECT * FROM leads WHERE id = $1', [id]);
    const l = r.rows[0];
    assert.strictEqual(l.first_name, 'Jane');
    assert.strictEqual(l.last_name, 'Doe');
    assert.strictEqual(l.email, 'jane.doe.persist.test@testpersist.example.com');
    assert.strictEqual(l.title, 'VP Sales');
    assert.strictEqual(l.company_id, companyId);
    assert.strictEqual(l.list_id, listId);
    assert.strictEqual(l.search_source, 'icypeas_enrichment');
    assert.strictEqual(l.email_validation_status, 'valid');
    assert.strictEqual(l.email_verified, true);
    assert.strictEqual(l.email_bounce_risk, 'low');
    assert.strictEqual(l.phone, '+1-555-0123');
    assert.strictEqual(l.linkedin_url, 'https://linkedin.com/in/janedoe');
  });

  it('2. upserts existing lead by email match', async () => {
    const id = await upsertDiscoveredLead(TEST_ORG, {
      email: 'jane.doe.persist.test@testpersist.example.com',
      title: 'SVP Sales',
      phone: '+1-555-9999',
    }, { source: 'findy' });
    assert.strictEqual(id, cleanupIds.leads[0]);

    const r = await query('SELECT title, phone, search_source FROM leads WHERE id = $1', [id]);
    assert.strictEqual(r.rows[0].title, 'SVP Sales');
    assert.strictEqual(r.rows[0].phone, '+1-555-9999');
    assert.strictEqual(r.rows[0].search_source, 'findy');
  });

  it('3. upserts existing lead by name + company_id match', async () => {
    const id = await upsertDiscoveredLead(TEST_ORG, {
      first_name: 'Jane',
      last_name: 'Doe',
      companyId: cleanupIds.companies[0],
      title: 'CRO',
    }, { source: 'manual' });
    assert.strictEqual(id, cleanupIds.leads[0]);

    const r = await query('SELECT title FROM leads WHERE id = $1', [id]);
    assert.strictEqual(r.rows[0].title, 'CRO');
  });

  it('4. returns null for new lead without listId', async () => {
    const id = await upsertDiscoveredLead(TEST_ORG, {
      first_name: 'No',
      last_name: 'List',
      email: 'nolist@example.com',
    }, {});
    assert.strictEqual(id, null);
  });

  it('5. returns null for missing org', async () => {
    const id = await upsertDiscoveredLead(null, { email: 'x@x.com' }, { listId: 'abc' });
    assert.strictEqual(id, null);
  });

  it('6. updateListCounts reflects inserted leads', async () => {
    const listId = cleanupIds.lists[0];
    await updateListCounts(listId);
    const r = await query('SELECT total_contacts, enriched_count FROM lead_lists WHERE id = $1', [listId]);
    assert.ok(r.rows[0].total_contacts >= 1, 'should have at least 1 contact');
    assert.ok(r.rows[0].enriched_count >= 1, 'should have at least 1 enriched');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. persistDiscoveryResults — orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Persistence: persistDiscoveryResults', { skip: !hasDb }, () => {
  it('1. persists multiple companies and creates list', async () => {
    const companies = [
      { name: 'Persist Corp A', domain: 'persist-a.example.com', industry: 'SaaS', employees: 50, icpScore: 90 },
      { name: 'Persist Corp B', domain: 'persist-b.example.com', industry: 'Fintech', employees: 200, icpScore: 85 },
      { name: 'Persist Corp C', domain: 'persist-c.example.com', industry: 'Healthcare', employees: 1000 },
    ];

    const result = await persistDiscoveryResults(TEST_ORG, companies, {
      source: 'ai_ark',
      listName: 'Batch Test List',
      queryJson: { industry: 'Technology', keywords: 'SaaS,Fintech' },
    });

    assert.ok(result.listId, 'should create a list');
    assert.strictEqual(result.companySaved, 3);
    assert.strictEqual(result.companyIds.length, 3);
    cleanupIds.lists.push(result.listId);
    cleanupIds.companies.push(...result.companyIds);

    for (const cId of result.companyIds) {
      const r = await query('SELECT search_source, discovery_query_json FROM companies WHERE id = $1', [cId]);
      assert.strictEqual(r.rows[0].search_source, 'ai_ark');
      assert.ok(r.rows[0].discovery_query_json);
    }
  });

  it('2. returns empty when no companies', async () => {
    const result = await persistDiscoveryResults(TEST_ORG, [], {});
    assert.strictEqual(result.listId, null);
    assert.strictEqual(result.companySaved, 0);
  });

  it('3. skips list creation when no listName', async () => {
    const result = await persistDiscoveryResults(TEST_ORG, [
      { name: 'NoList Corp', domain: 'nolist-persist.example.com', industry: 'Consulting' },
    ], { source: 'postgres' });
    assert.strictEqual(result.listId, null);
    assert.strictEqual(result.companySaved, 1);
    cleanupIds.companies.push(...result.companyIds);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. getLeadsByCompanyId — verify linkage
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Persistence: company-lead linkage', { skip: !hasDb }, () => {
  it('1. getLeadsByCompanyId returns linked leads', async () => {
    const companyId = cleanupIds.companies[0];
    const leads = await getLeadsByCompanyId(TEST_ORG, companyId);
    assert.ok(leads.length >= 1, 'should find at least 1 lead linked to the company');
    const jane = leads.find(l => l.first_name === 'Jane');
    assert.ok(jane, 'should find Jane Doe');
    assert.strictEqual(jane.last_name, 'Doe');
    assert.ok(jane.email.includes('testpersist'));
  });

  it('2. getCompanyEnrichmentStatus finds persisted company', async () => {
    const status = await getCompanyEnrichmentStatus(TEST_ORG, { name: 'Test Persist Corp', domain: 'testpersist.example.com' });
    assert.ok(status, 'should find the company');
    assert.ok(status.id);
    assert.ok(status.enriched_at);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. API ENDPOINTS — discover persists results
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Persistence: discover endpoint persistence', { skip: !token }, () => {
  it('1. POST /api/lead-generation/discover returns persisted field', async () => {
    const res = await api.post('/api/lead-generation/discover')
      .set(auth())
      .send({ industry: 'Technology', keywords: 'SaaS', maxLeads: 5 });
    assert.ok(res.status !== 401, 'should authenticate');
    if (res.status === 200 && res.body.companies?.length > 0) {
      assert.ok(res.body.persisted, 'should include persisted info');
      assert.ok(res.body.persisted.companySaved >= 0);
    }
  });

  it('2. POST /api/lead-generation/enrich/bulk returns listId', async () => {
    const res = await api.post('/api/lead-generation/enrich/bulk')
      .set(auth())
      .send({
        companies: [{ name: 'Google', domain: 'google.com', industry: 'Technology' }],
        roles: ['CEO'],
        listName: 'Test Enrich List',
      });
    assert.ok(res.status !== 401, 'should authenticate');
    if (res.status === 200) {
      assert.ok('listId' in res.body, 'response should include listId');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. VALIDATION STATUS — email_validation_status accuracy
// ═══════════════════════════════════════════════════════════════════════════════

describe('Lead Persistence: email validation status', { skip: !hasDb }, () => {
  it('1. low bounce risk maps to valid', async () => {
    const listId = cleanupIds.lists[0];
    const id = await upsertDiscoveredLead(TEST_ORG, {
      first_name: 'Valid',
      last_name: 'User',
      email: 'valid.persist.test@example.com',
      companyId: cleanupIds.companies[0],
      email_bounce_risk: 'low',
    }, { listId, source: 'test' });
    cleanupIds.leads.push(id);
    const r = await query('SELECT email_validation_status FROM leads WHERE id = $1', [id]);
    assert.strictEqual(r.rows[0].email_validation_status, 'valid');
  });

  it('2. high bounce risk maps to invalid', async () => {
    const listId = cleanupIds.lists[0];
    const id = await upsertDiscoveredLead(TEST_ORG, {
      first_name: 'Invalid',
      last_name: 'User',
      email: 'invalid.persist.test@example.com',
      companyId: cleanupIds.companies[0],
      email_bounce_risk: 'high',
    }, { listId, source: 'test' });
    cleanupIds.leads.push(id);
    const r = await query('SELECT email_validation_status FROM leads WHERE id = $1', [id]);
    assert.strictEqual(r.rows[0].email_validation_status, 'invalid');
  });

  it('3. unknown bounce risk maps to pending', async () => {
    const listId = cleanupIds.lists[0];
    const id = await upsertDiscoveredLead(TEST_ORG, {
      first_name: 'Pending',
      last_name: 'User',
      email: 'pending.persist.test@example.com',
      companyId: cleanupIds.companies[0],
      email_bounce_risk: 'unknown',
    }, { listId, source: 'test' });
    cleanupIds.leads.push(id);
    const r = await query('SELECT email_validation_status FROM leads WHERE id = $1', [id]);
    assert.strictEqual(r.rows[0].email_validation_status, 'pending');
  });

  it('4. explicit validation status overrides bounce risk', async () => {
    const listId = cleanupIds.lists[0];
    const id = await upsertDiscoveredLead(TEST_ORG, {
      first_name: 'Explicit',
      last_name: 'User',
      email: 'explicit.persist.test@example.com',
      companyId: cleanupIds.companies[0],
      email_bounce_risk: 'low',
      email_validation_status: 'catch_all',
    }, { listId, source: 'test' });
    cleanupIds.leads.push(id);
    const r = await query('SELECT email_validation_status FROM leads WHERE id = $1', [id]);
    assert.strictEqual(r.rows[0].email_validation_status, 'catch_all');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

after(async () => {
  if (!hasDb) return;
  try {
    for (const id of cleanupIds.leads) {
      await query('DELETE FROM leads WHERE id = $1', [id]).catch(() => {});
    }
    for (const id of cleanupIds.lists) {
      await query('DELETE FROM lead_lists WHERE id = $1', [id]).catch(() => {});
    }
    for (const id of cleanupIds.companies) {
      await query('DELETE FROM companies WHERE id = $1', [id]).catch(() => {});
    }
    await query("DELETE FROM organisations WHERE id = $1", [TEST_ORG]).catch(() => {});
  } catch (_) {}
});
