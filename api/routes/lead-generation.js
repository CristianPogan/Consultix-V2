import { Router } from 'express';
import {
  findLeadsApifyApollo,
  findLeadsGoogleMaps,
  findPeopleIcyPeas,
  findCompaniesIcyPeas,
  findEmailIcyPeas,
  verifyEmailNeverBounce,
  verifyEmailFindyMail,
  findEmailFindyMail,
  verifyEmailBetterContact,
  findEmailBetterContact,
  verifyEmailZeroBounce,
  scrapeWebsite,
  getLinkedInCompanyProfile,
  generatePersonalization,
  addLeadsToHeyReach,
  addLeadsToInstantly,
  findCompaniesAiArkSemantic,
  findCompaniesAiArkLookalike,
} from '../services/lead-services.js';
import { updateLeadsOutreachSentByEmails, getIntegrationCredentials, getApiKeyFromCredentials, getIntegrationServiceOrder, searchCompaniesForDiscovery, getCompanyEnrichmentStatus, isEnrichmentFresh, getLeadsByCompanyId, upsertCompanyForEnrichment, query, ensureOrgExists } from '../db.js';

const router = Router();

// ============================================================================
// LEAD DISCOVERY
// ============================================================================

// GET /api/lead-generation/discover/status — Check if discovery can run (Postgres always available + external integrations)
router.get('/discover/status', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured', canRun: false });

    const orderRow = await getIntegrationServiceOrder(orgId);
    const order = orderRow?.lead_search_order || ['icypeas', 'ai_ark', 'findy', 'wiza', 'leadsmagix'];
    const connected = [];

    for (const key of order) {
      const creds = await getIntegrationCredentials(orgId, key);
      const hasKey = getApiKeyFromCredentials(creds);
      if (hasKey) connected.push(key);
    }

    // Discovery can always run: Postgres DB is queried first (10K+ imported leads),
    // external integrations are cascade fallbacks for the remaining gap
    res.json({
      canRun: true,
      connectedIntegrations: connected,
      leadSearchOrder: order,
      hasExternalProviders: connected.length > 0,
    });
  } catch (err) {
    console.error('Discover status error:', err);
    res.status(500).json({ error: err.message, canRun: false });
  }
});

// POST /api/lead-generation/discover — Postgres first, then waterfall (AI Ark, IcyPeas, etc.)
router.post('/discover', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    const {
      listName,
      industry,
      keywords,
      employeeSizes,
      regions,
      roles,
      maxLeads,
      lookalikeOnly,
      lookalike,
    } = req.body || {};

    const criteria = {
      industry: industry?.trim(),
      keywords: typeof keywords === 'string' ? keywords : (keywords || []).join(', '),
      employeeSizes: Array.isArray(employeeSizes) ? employeeSizes : (employeeSizes ? [employeeSizes] : []),
      regions: Array.isArray(regions) ? regions : (regions ? [regions] : []),
      roles: Array.isArray(roles) ? roles : (roles ? (typeof roles === 'string' ? roles.split(',') : [roles]) : []),
      maxLeads: parseInt(maxLeads, 10) || null,
    };

    const kwList = criteria.keywords ? criteria.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    const industriesForApi = criteria.industry ? [criteria.industry] : ['B2B SaaS', 'Software as a Service', 'Internet Software'];
    const keywordsForApi = kwList.length ? [...industriesForApi, ...kwList] : industriesForApi;
    // IcyPeas keyword filter is AND-based — send only industry to avoid over-filtering
    const icypeasKeywords = criteria.industry ? [criteria.industry] : industriesForApi;

    let companies = [];
    let source = 'postgres';
    let sqlQueries = [];
    const waterfallLog = [];

    // 1. Lookalike-only mode: use AI Ark similarity with seed domains
    if (lookalikeOnly && lookalike?.trim()) {
      const domains = lookalike.split(/[\n,;]/).map(d => d.trim()).filter(d => d && !d.startsWith('#'));
      const seedDomain = domains[0];
      if (seedDomain) {
        const creds = await getIntegrationCredentials(orgId, 'ai_ark');
        const apiKey = getApiKeyFromCredentials(creds);
        if (apiKey) {
          try {
            const results = await findCompaniesAiArkLookalike(apiKey, seedDomain, {
              industry: criteria.industry,
              industries: industriesForApi,
              regions: criteria.regions.length ? criteria.regions : ['Global'],
              maxLeads: criteria.maxLeads || 50,
            });
            companies = (results || []).map((c, i) => normalizeCompany(c, i + 1));
            source = 'ai_ark_lookalike';
          } catch (err) {
            console.warn('AI Ark lookalike failed:', err.message);
          }
        }
      }
    }

    const targetCount = criteria.maxLeads || 100;
    const seenDomains = new Set();

    const addCompanies = (newCompanies, providerSource) => {
      let added = 0;
      for (const c of newCompanies) {
        if (companies.length >= targetCount) break;
        const dedupeKey = (c.domain || c.name || '').toLowerCase().trim();
        if (dedupeKey && seenDomains.has(dedupeKey)) continue;
        if (dedupeKey) seenDomains.add(dedupeKey);
        companies.push(c);
        added++;
      }
      if (added > 0 && source === 'postgres' && providerSource !== 'postgres') {
        source = companies.some(c => c._source === 'postgres') ? `postgres+${providerSource}` : providerSource;
      }
      return added;
    };

    // 2. Semantic mode: Postgres first, then cascade for remaining
    if (companies.length === 0) {
      console.log('[Discover] Postgres search:', { orgId, criteria });
      const pgResult = await searchCompaniesForDiscovery(orgId, criteria);
      const pgResults = pgResult.companies || [];
      sqlQueries = pgResult.sqlQueries || [];
      console.log('[Discover] Postgres result:', { count: pgResults.length, sample: pgResults[0], queriesRun: sqlQueries.length });
      if (pgResults.length > 0) {
        const pgNormalized = pgResults.map((c, i) => ({ ...c, id: c.id || `pg-${i + 1}`, _source: 'postgres' }));
        addCompanies(pgNormalized, 'postgres');
        source = 'postgres';
      }
    }

    // 3. Cascade: iterate through Lead Search Order, filling remaining gap
    if (companies.length < targetCount) {
      const orderRow = await getIntegrationServiceOrder(orgId);
      const order = orderRow?.lead_search_order || ['icypeas', 'ai_ark', 'findy', 'wiza', 'leadsmagix'];
      const remaining = () => targetCount - companies.length;

      for (const key of order) {
        if (companies.length >= targetCount) break;

        if (key === 'ai_ark') {
          const creds = await getIntegrationCredentials(orgId, 'ai_ark');
          const apiKey = getApiKeyFromCredentials(creds);
          if (!apiKey) {
            waterfallLog.push({ key: 'ai_ark', tried: false, reason: 'no_api_key' });
            continue;
          }
          try {
            console.log('[Discover] AI Ark semantic request (need %d more):', remaining(), { industry: criteria.industry, keywords: kwList, companySize: criteria.employeeSizes, regions: criteria.regions });
            const results = await findCompaniesAiArkSemantic(apiKey, {
              industry: criteria.industry,
              keywords: kwList,
              companySize: criteria.employeeSizes.length ? criteria.employeeSizes : ['1-10', '11-50', '51-200', '201-500', '501-1,000', '1,001-5,000', '5,000+'],
              regions: criteria.regions,
              maxLeads: remaining(),
            });
            const normalized = (results || []).map((c, i) => normalizeCompany(c, companies.length + i + 1));
            const count = addCompanies(normalized, 'ai_ark');
            console.log('[Discover] AI Ark semantic result:', { returned: results?.length || 0, added: count });
            waterfallLog.push({ key: 'ai_ark', tried: true, count });
            if (count > 0 && source === 'postgres') source = 'postgres+ai_ark';
            else if (count > 0 && !source.includes('ai_ark')) source = source ? `${source}+ai_ark` : 'ai_ark';
          } catch (err) {
            console.warn('[Discover] AI Ark semantic failed:', err.message);
            waterfallLog.push({ key: 'ai_ark', tried: true, error: err.message });
          }
        } else if (key === 'icypeas') {
          const creds = await getIntegrationCredentials(orgId, 'icypeas');
          const apiKey = getApiKeyFromCredentials(creds);
          if (!apiKey) {
            waterfallLog.push({ key: 'icypeas', tried: false, reason: 'no_api_key' });
            continue;
          }
          try {
            const icypeasLocations = expandRegionsForIcyPeas(criteria.regions);
            let headcountMin = null, headcountMax = null;
            if (criteria.employeeSizes?.length) {
              const ranges = criteria.employeeSizes.map(s => EMPLOYEE_RANGE_TO_HEADCOUNT[s]).filter(Boolean);
              if (ranges.length) {
                headcountMin = Math.min(...ranges.map(r => r[0]));
                const maxMap = { '1-10': 10, '11-50': 50, '51-200': 200, '201-500': 500, '501-1,000': 1000, '1,001-5,000': 5000, '5,000+': null };
                const maxVals = criteria.employeeSizes.map(s => maxMap[s]).filter(v => v != null);
                headcountMax = maxVals.length ? Math.max(...maxVals) : null;
              }
            }
            const icypeasCriteria = {
              apiKey,
              industry: criteria.industry || null,
              keywords: kwList.length ? kwList : (criteria.industry ? [criteria.industry] : ['B2B']),
              locations: icypeasLocations,
              headcountMin,
              headcountMax,
              limit: Math.min(remaining(), 200),
            };
            console.log('[Discover] IcyPeas Find Companies request (need %d more):', remaining(), {
              industry: icypeasCriteria.industry, keywords: icypeasCriteria.keywords,
              locations: icypeasCriteria.locations, headcount: { min: headcountMin, max: headcountMax },
              limit: icypeasCriteria.limit,
            });
            const result = await findCompaniesIcyPeas(icypeasCriteria);
            const companyList = Array.isArray(result.leads) ? result.leads
              : Array.isArray(result.companies) ? result.companies
              : Array.isArray(result.data) ? result.data
              : Array.isArray(result) ? result : [];
            const normalized = companyList.map((c, i) => normalizeCompany({
              id: c._id || c.id || `icypeas-${i}`,
              name: c.name || c.companyName || 'Unknown',
              domain: (c.website || c.domain || '').replace(/^https?:\/\//, '').split('/')[0] || null,
              industry: c.industry || criteria.industry,
              employees: c.numberOfEmployees || c.headcount || c.employees || 'N/A',
              location: c.address || c.location || c.headquarters || 'Unknown',
              icpScore: 92,
            }, companies.length + i + 1));
            const count = addCompanies(normalized, 'icypeas');
            console.log('[Discover] IcyPeas result:', { total: result.total, returned: companyList.length, added: count });
            waterfallLog.push({ key: 'icypeas', tried: true, count });
            if (count > 0 && !source.includes('icypeas')) source = source ? `${source}+icypeas` : 'icypeas';
          } catch (err) {
            console.warn('[Discover] IcyPeas failed:', err.message);
            waterfallLog.push({ key: 'icypeas', tried: true, error: err.message });
          }
        } else if (key === 'findy' || key === 'wiza' || key === 'leadsmagix') {
          const creds = await getIntegrationCredentials(orgId, key);
          const apiKey = getApiKeyFromCredentials(creds);
          if (!apiKey) {
            waterfallLog.push({ key, tried: false, reason: 'no_api_key' });
          } else {
            waterfallLog.push({ key, tried: false, reason: 'api_stub_pending' });
          }
        }
      }
    }

    // Strip internal _source field before response
    const cleanCompanies = companies.map(({ _source, ...rest }) => rest);

    res.json({
      success: true,
      count: cleanCompanies.length,
      companies: cleanCompanies,
      source,
      sqlQueries: sqlQueries || [],
      waterfallLog: waterfallLog || [],
    });
  } catch (err) {
    console.error('Discover error:', err);
    res.status(500).json({ error: err.message });
  }
});

const EMPLOYEE_RANGE_TO_HEADCOUNT = {
  '1-10': [1],
  '11-50': [11],
  '51-200': [51],
  '201-500': [201],
  '501-1,000': [501],
  '1,001-5,000': [1001],
  '5,000+': [5000],
};

// Expand region names to IcyPeas alpha-2 country codes (best results per API docs)
function expandRegionsForIcyPeas(regions) {
  if (!regions?.length) return ['US'];
  const out = [];
  for (const r of regions) {
    const s = String(r || '').trim().toLowerCase();
    if (s.includes('north america') || s === 'na') out.push('US', 'CA', 'MX');
    else if (s.includes('latin america')) out.push('BR', 'MX', 'AR', 'CO', 'CL', 'PE');
    else if (s.includes('europe') || s === 'eu') out.push('GB', 'DE', 'FR', 'NL', 'ES', 'IT', 'SE', 'CH', 'BE', 'IE', 'PL');
    else if (s.includes('dach')) out.push('DE', 'AT', 'CH');
    else if (s.includes('nordic')) out.push('SE', 'NO', 'DK', 'FI', 'IS');
    else if ((s.includes('asia') && s.includes('pacific')) || s === 'apac') out.push('JP', 'AU', 'SG', 'IN', 'KR', 'HK', 'NZ');
    else if (s.includes('australia') && s.includes('nz')) out.push('AU', 'NZ');
    else if (s.includes('mena')) out.push('AE', 'SA', 'IL', 'EG');
    else if (s.includes('africa')) out.push('ZA', 'NG', 'KE', 'EG');
    else if (s.includes('uk') && s.includes('ireland')) out.push('GB', 'IE');
    else if (s.length === 2) out.push(s.toUpperCase());
    else out.push(r.trim());
  }
  return [...new Set(out)];
}

function normalizeCompany(c, fallbackId) {
  const id = c.id ?? c.domain ?? fallbackId;
  const name = c.name ?? c.company_name ?? c.companyName ?? 'Unknown';
  const domain = c.domain ?? c.website?.replace(/^https?:\/\//, '').split('/')[0] ?? null;
  const emp = c.employees ?? c.employee_count ?? c.employeeCount ?? c.company_size ?? 'N/A';
  const loc = c.location ?? c.headquarters ?? [c.headquarters_city, c.headquarters_state, c.headquarters_country].filter(Boolean).join(', ') ?? 'Unknown';
  return {
    id: String(id),
    name,
    domain,
    industry: c.industry ?? c.industry_type ?? '',
    employees: emp,
    location: loc,
    website: domain ? `https://${domain.replace(/^https?:\/\//, '')}` : null,
    icpScore: c.icp_score ?? c.icpScore ?? c.relevance_score ?? 90,
  };
}

function peopleToCompanies(people, defaultIndustry, defaultRegions) {
  const seen = new Set();
  const out = [];
  for (const p of people) {
    const companyName = p.lastCompanyName ?? p.currentCompanyName ?? p.companyName ?? p.company ?? 'Unknown';
    if (!companyName || companyName === 'Unknown') continue;
    if (seen.has(companyName)) continue;
    seen.add(companyName);
    out.push(normalizeCompany({
      id: out.length + 1,
      name: companyName,
      domain: p.lastCompanyWebsite ?? p.currentCompanyWebsite ?? p.companyWebsite ?? p.company_domain ?? null,
      industry: p.lastCompanyIndustry ?? p.currentCompanyIndustry ?? p.industry ?? defaultIndustry,
      employees: p.lastCompanySize ?? p.currentCompanySize ?? p.companySize ?? 'N/A',
      location: p.lastCompanyAddress ?? p.currentCompanyLocation ?? p.location ?? (defaultRegions && defaultRegions[0]) ?? 'Unknown',
      icpScore: 95,
    }, out.length + 1));
  }
  return out;
}

// POST /api/lead-generation/discover/apollo
router.post('/discover/apollo', async (req, res) => {
  try {
    const { searchUrl, maxResults, cookies } = req.body;
    
    if (!searchUrl) {
      return res.status(400).json({ error: 'searchUrl is required' });
    }

    const leads = await findLeadsApifyApollo({ searchUrl, maxResults, cookies });
    
    res.json({ 
      success: true, 
      count: leads.length,
      leads 
    });
  } catch (err) {
    console.error('Apollo discovery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/discover/google-maps
router.post('/discover/google-maps', async (req, res) => {
  try {
    const { searchQuery, maxResults } = req.body;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'searchQuery is required' });
    }

    const businesses = await findLeadsGoogleMaps({ searchQuery, maxResults });
    
    res.json({ 
      success: true, 
      count: businesses.length,
      businesses 
    });
  } catch (err) {
    console.error('Google Maps discovery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/discover/icypeas
router.post('/discover/icypeas', async (req, res) => {
  try {
    const { jobTitles, locations, companies, keywords, limit } = req.body;
    
    console.log('IcyPeas discovery request:', { jobTitles, locations, companies, keywords, limit });
    
    const result = await findPeopleIcyPeas({
      jobTitles,
      locations,
      companies,
      keywords,
      limit,
    });
    
    console.log('IcyPeas raw response:', JSON.stringify(result).substring(0, 500));
    console.log('IcyPeas result keys:', Object.keys(result));
    
    // IcyPeas returns { success: true, leads: [...], total: X }
    let peopleArray = [];
    if (Array.isArray(result.leads)) {
      peopleArray = result.leads;
    } else if (result.people && Array.isArray(result.people.leads)) {
      peopleArray = result.people.leads;
    } else if (Array.isArray(result.people)) {
      peopleArray = result.people;
    } else if (Array.isArray(result.data)) {
      peopleArray = result.data;
    } else if (Array.isArray(result)) {
      peopleArray = result;
    }
    
    console.log('People array length:', peopleArray.length);
    if (peopleArray.length > 0) {
      console.log('First person sample:', JSON.stringify(peopleArray[0]).substring(0, 300));
    }
    
    res.json({ 
      success: true, 
      count: peopleArray.length,
      people: peopleArray,
      total: result.total || peopleArray.length,
      pagination: result.pagination || null
    });
  } catch (err) {
    console.error('IcyPeas discovery error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// LEAD ENRICHMENT
// ============================================================================

// Helpers for enrichment waterfall (uses lead_enrichment_order from Settings)
const FIND_EMAIL_KEYS = ['findymail', 'icypeas', 'bettercontact', 'ai_ark'];
const VERIFY_EMAIL_KEYS = ['findymail', 'neverbounce', 'bettercontact', 'zerobounce', 'cleanlist'];

async function findEmailWaterfall(orgId, { firstName, lastName, company, domain }) {
  const orderRow = await getIntegrationServiceOrder(orgId);
  const order = orderRow?.lead_enrichment_order || ['findymail', 'icypeas', 'bettercontact', 'neverbounce'];
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const dom = (domain || (company && company.includes('.') ? company : '')).replace(/^https?:\/\//, '').split('/')[0];

  for (const key of order) {
    if (!FIND_EMAIL_KEYS.includes(key)) continue;
    const creds = await getIntegrationCredentials(orgId, key);
    const apiKey = getApiKeyFromCredentials(creds);
    if (!apiKey) continue;

    try {
      if (key === 'findymail' && fullName && dom) {
        const data = await findEmailFindyMail(apiKey, { name: fullName, domain: dom });
        if (data?.email) return { email: data.email, confidence: data.confidence, source: key };
      } else if (key === 'icypeas') {
        const data = await findEmailIcyPeas({ firstName, lastName, company }, apiKey);
        const email = data?.email || data?.emails?.[0];
        if (email) return { email, confidence: data.confidence, source: key };
      } else if (key === 'bettercontact' && (firstName || lastName) && (dom || company)) {
        const data = await findEmailBetterContact(apiKey, { firstName, lastName, company, domain: dom });
        if (data?.email) return { email: data.email, confidence: data.confidence, source: key };
      }
    } catch (e) {
      console.log(`[Enrich] ${key} find-email failed:`, e.message);
    }
  }
  throw new Error('No enrichment integration could find email');
}

async function verifyEmailWaterfall(orgId, email) {
  const orderRow = await getIntegrationServiceOrder(orgId);
  const order = orderRow?.lead_enrichment_order || ['findymail', 'neverbounce', 'bettercontact', 'zerobounce'];
  let lastErr = null;

  for (const key of order) {
    if (!VERIFY_EMAIL_KEYS.includes(key)) continue;
    const creds = await getIntegrationCredentials(orgId, key);
    const apiKey = getApiKeyFromCredentials(creds);
    if (!apiKey) continue;

    try {
      if (key === 'findymail') {
        const data = await verifyEmailFindyMail(apiKey, email);
        return { result: data.verified ? 'valid' : 'invalid', verified: data.verified, source: key };
      } else if (key === 'neverbounce') {
        const data = await verifyEmailNeverBounce(email, apiKey);
        return { result: data.result === 'valid' ? 'valid' : 'invalid', verified: data.result === 'valid', source: key };
      } else if (key === 'bettercontact') {
        const data = await verifyEmailBetterContact(apiKey, email);
        return { result: data.verified ? 'valid' : 'invalid', verified: data.verified, source: key };
      } else if (key === 'zerobounce') {
        const data = await verifyEmailZeroBounce(apiKey, email);
        return { result: data.verified ? 'valid' : 'invalid', verified: data.verified, source: key };
      }
    } catch (e) {
      lastErr = e;
      console.log(`[Enrich] ${key} verify failed:`, e.message);
    }
  }
  throw lastErr || new Error('No verification integration available');
}

// POST /api/lead-generation/enrich/email
router.post('/enrich/email', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    const { firstName, lastName, company, domain } = req.body;
    
    if (!firstName || !lastName || !company) {
      return res.status(400).json({ error: 'firstName, lastName, and company are required' });
    }

    const emailData = await findEmailWaterfall(orgId, { firstName, lastName, company, domain });
    
    res.json({ 
      success: true, 
      email: emailData.email || null,
      confidence: emailData.confidence,
      data: emailData
    });
  } catch (err) {
    console.error('Email enrichment error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/verify/email
router.post('/verify/email', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const verification = await verifyEmailWaterfall(orgId, email);
    
    res.json({ 
      success: true, 
      result: verification.result,
      verified: verification.verified === true
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Helper: find people for a company using Lead Search cascade (not just IcyPeas)
async function findPeopleCascade(orgId, { companyName, domain, roles, limit = 5 }) {
  const orderRow = await getIntegrationServiceOrder(orgId);
  const searchOrder = orderRow?.lead_search_order || ['icypeas', 'ai_ark'];
  const cleanDomain = domain && /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain.replace(/^https?:\/\//, '').split('/')[0])
    ? domain.replace(/^https?:\/\//, '').split('/')[0]
    : null;
  const errors = [];

  for (const key of searchOrder) {
    const creds = await getIntegrationCredentials(orgId, key);
    const apiKey = getApiKeyFromCredentials(creds);
    if (!apiKey) continue;

    try {
      if (key === 'icypeas') {
        const icypeasCriteria = {
          companies: [companyName],
          jobTitles: roles,
          limit,
          apiKey,
        };
        if (cleanDomain) icypeasCriteria.companyDomains = [cleanDomain];
        const result = await findPeopleIcyPeas(icypeasCriteria);
        let people = result.leads || result.people?.leads || result.people || result.data || (Array.isArray(result) ? result : []);
        if (!Array.isArray(people)) people = [];
        if (people.length > 0) return { people, source: key };
      } else if (key === 'ai_ark') {
        const results = await findCompaniesAiArkSemantic(apiKey, {
          industry: null,
          keywords: [companyName],
          companySize: [],
          regions: [],
          maxLeads: limit,
        });
        if (results?.length > 0) {
          const people = results.map(c => ({
            companyName: c.name,
            currentCompanyName: c.name,
            companyWebsite: c.domain,
            industry: c.industry,
          }));
          return { people, source: key, isCompanyLevel: true };
        }
      }
    } catch (e) {
      errors.push({ key, error: e.message });
    }
  }
  return { people: [], source: null, errors };
}

// POST /api/lead-generation/enrich/bulk — Check Postgres status (Enriched < 30 days), skip or run cascade
router.post('/enrich/bulk', async (req, res) => {
  const enrichmentLog = [];
  const log = (msg, type = 'info') => {
    enrichmentLog.push({ msg, type, ts: Date.now() });
    console.log(`[Enrich] ${msg}`);
  };

  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);

    const { companies: companiesInput, roles, listName } = req.body || {};
    if (!companiesInput || !Array.isArray(companiesInput) || companiesInput.length === 0) {
      return res.status(400).json({ error: 'companies array is required' });
    }

    const rolesList = Array.isArray(roles) ? roles : (roles ? [roles] : ['CEO', 'CTO', 'VP Sales']);
    const allContacts = [];
    let listId = null;

    // Pre-check: need at least one lead search provider for person discovery
    const orderRow = await getIntegrationServiceOrder(orgId);
    const searchOrder = orderRow?.lead_search_order || ['icypeas', 'ai_ark'];
    let hasAnySearchProvider = false;
    for (const key of searchOrder) {
      const creds = await getIntegrationCredentials(orgId, key);
      if (getApiKeyFromCredentials(creds)) { hasAnySearchProvider = true; break; }
    }
    if (!hasAnySearchProvider) {
      log('No lead search integrations connected — configure at least one (IcyPeas, AI Ark, etc.) in Settings > Integrations', 'error');
      return res.status(400).json({
        error: 'At least one lead search integration required for contact enrichment. Connect providers in Settings > Integrations.',
        contacts: [],
        enrichmentLog,
      });
    }

    log(`Processing ${companiesInput.length} companies with roles: ${rolesList.join(', ')}`, 'info');
    log(`Lead search cascade: ${searchOrder.join(' > ')}`, 'info');

    if (listName) {
      const listRes = await query(
        `INSERT INTO lead_lists (org_id, name, source, status, total_contacts, enriched_count)
         VALUES ($1, $2, 'discovery', 'draft', 0, 0)
         RETURNING id`,
        [orgId, listName]
      );
      listId = listRes.rows[0]?.id;
    }

    for (const comp of companiesInput) {
      const companyName = comp.name || comp.company;
      const domain = comp.domain || comp.website?.replace?.(/^https?:\/\//, '') || '';
      if (!companyName) {
        log(`Skipping company with no name (domain: ${domain || 'none'})`, 'warn');
        continue;
      }

      const status = await getCompanyEnrichmentStatus(orgId, { id: comp.id, name: companyName, domain });
      const skipEnrich = status && isEnrichmentFresh(status.enriched_at);

      if (skipEnrich && status.id) {
        log(`${companyName} — using cache (enriched < 30 days)`, 'info');
        const leads = await getLeadsByCompanyId(orgId, status.id);
        for (const l of leads) {
          const name = [l.first_name, l.last_name].filter(Boolean).join(' ') || l.email || 'Unknown';
          allContacts.push({
            id: l.id,
            name,
            title: l.title || 'Unknown',
            email: l.email || 'Not found',
            linkedin: l.linkedin_url || '',
            company: l.company || companyName,
            companyId: status.id,
            bounceRisk: l.email_bounce_risk === 'low' ? 'low' : l.email_bounce_risk === 'high' ? 'high' : 'unknown',
            linkedinData: l.company_data_json?.linkedinData || null,
            fromCache: true,
          });
        }
        continue;
      }

      // Cascade through Lead Search providers for person discovery
      const { people, source: peopleSource, errors: peopleErrors } = await findPeopleCascade(orgId, {
        companyName,
        domain,
        roles: rolesList,
        limit: 5,
      });

      if (peopleErrors?.length) {
        for (const e of peopleErrors) log(`${companyName} — ${e.key} failed: ${e.error}`, 'warn');
      }
      if (people.length === 0) {
        log(`${companyName} — no people found from any provider`, 'warn');
        continue;
      }
      log(`${companyName} — found ${people.length} people via ${peopleSource}`, 'info');

      const companyId = await upsertCompanyForEnrichment(orgId, {
        name: companyName,
        domain: domain || undefined,
        industry: comp.industry,
      });

      for (const person of people) {
        const firstName = person.firstname || person.firstName || '';
        const lastName = person.lastname || person.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (!fullName) continue;

        let email = person.email || person.emailAddress;
        if (!email) {
          try {
            const dom = (domain || companyName).replace(/^https?:\/\//, '').split('/')[0];
            const emailData = await findEmailWaterfall(orgId, {
              firstName,
              lastName,
              company: companyName,
              domain: dom,
            });
            email = emailData?.email;
          } catch (_) {}
        }

        let bounceRisk = 'unknown';
        if (email) {
          try {
            const v = await verifyEmailWaterfall(orgId, email);
            bounceRisk = v.verified ? 'low' : 'high';
          } catch (_) {}
        }

        const contact = {
          id: `gen-${allContacts.length + 1}`,
          name: fullName,
          title: person.lastJobTitle || person.headline || 'Unknown',
          email: email || 'Not found',
          linkedin: person.profileUrl || person.linkedinUrl || '',
          company: companyName,
          companyId,
          bounceRisk,
          linkedinData: person.profileUrl ? { about: (person.description || '').substring(0, 200), recentActivity: person.headline || '' } : null,
          fromCache: false,
        };
        allContacts.push(contact);

        if (listId && companyId && email && email !== 'Not found') {
          try {
            await query(
              `INSERT INTO leads (org_id, list_id, company_id, first_name, last_name, email, title, company, company_domain, linkedin_url, email_verified, email_bounce_risk, company_data_json, enriched_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, now())`,
              [
                orgId,
                listId,
                companyId,
                firstName,
                lastName,
                email,
                contact.title,
                companyName,
                domain || null,
                contact.linkedin || null,
                bounceRisk === 'low',
                bounceRisk,
                JSON.stringify(contact.linkedinData || {}),
              ]
            );
          } catch (e) {
            console.log('[Enrich] Lead insert error:', e.message);
          }
        }
      }
    }

    log(`Done: ${allContacts.length} contacts from ${companiesInput.length} companies`, allContacts.length > 0 ? 'success' : 'warn');
    if (allContacts.length === 0) {
      log('Tip: Ensure company names are real (e.g. "Acme Corp") not generic (e.g. "B2B SaaS"). Providers find people by company name.', 'info');
    }

    res.json({ success: true, contacts: allContacts, enrichmentLog });
  } catch (err) {
    log(`Bulk enrichment error: ${err.message}`, 'error');
    console.error('Bulk enrichment error:', err);
    res.status(500).json({ error: err.message, enrichmentLog });
  }
});

// POST /api/lead-generation/scrape/website
router.post('/scrape/website', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const html = await scrapeWebsite(url);
    
    // Extract text content (basic - could be enhanced)
    const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    res.json({ 
      success: true, 
      html,
      text: textContent.substring(0, 5000), // First 5000 chars
      length: html.length
    });
  } catch (err) {
    console.error('Website scraping error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/lead-generation/linkedin/company/:slug
router.get('/linkedin/company/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ error: 'company slug is required' });
    }

    const profile = await getLinkedInCompanyProfile(slug);
    
    res.json({ 
      success: true, 
      profile 
    });
  } catch (err) {
    console.error('LinkedIn company fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// AI PERSONALIZATION
// ============================================================================

// POST /api/lead-generation/personalize
router.post('/personalize', async (req, res) => {
  try {
    const { prompt, leadData } = req.body;
    
    if (!prompt || !leadData) {
      return res.status(400).json({ error: 'prompt and leadData are required' });
    }

    const personalizedMessage = await generatePersonalization({ prompt, leadData });
    
    res.json({ 
      success: true, 
      message: personalizedMessage
    });
  } catch (err) {
    console.error('Personalization error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// OUTREACH
// ============================================================================

// POST /api/lead-generation/outreach/heyreach
router.post('/outreach/heyreach', async (req, res) => {
  try {
    const { leads, project_id } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const result = await addLeadsToHeyReach(leads);
    
    const orgId = req.orgId;
    if (orgId) {
      const emails = leads.map(l => l.email).filter(Boolean);
      if (emails.length) await updateLeadsOutreachSentByEmails(orgId, emails, project_id || null);
    }
    
    res.json({ 
      success: true, 
      result 
    });
  } catch (err) {
    console.error('HeyReach outreach error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/lead-generation/outreach/instantly
router.post('/outreach/instantly', async (req, res) => {
  try {
    const { leads, project_id } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'leads array is required' });
    }

    const results = await addLeadsToInstantly(leads);
    
    const orgId = req.orgId;
    if (orgId) {
      const emails = leads.map(l => l.email).filter(Boolean);
      if (emails.length) await updateLeadsOutreachSentByEmails(orgId, emails, project_id || null);
    }
    
    res.json({ 
      success: true, 
      results 
    });
  } catch (err) {
    console.error('Instantly outreach error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
