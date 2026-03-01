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
  findLeadsFindy,
  findEmployeesFindy,
  scrapeWebsite,
  getLinkedInCompanyProfile,
  generatePersonalization,
  addLeadsToHeyReach,
  addLeadsToInstantly,
  findCompaniesAiArkSemantic,
  findCompaniesAiArkLookalike,
} from '../services/lead-services.js';
import { updateLeadsOutreachSentByEmails, getIntegrationCredentials, getApiKeyFromCredentials, getIntegrationServiceOrder, searchCompaniesForDiscovery, countStrictMatchingCompanies, getCompanyEnrichmentStatus, isEnrichmentFresh, getLeadsByCompanyId, upsertCompanyForEnrichment, query, ensureOrgExists, persistDiscoveryResults, upsertDiscoveredLead, upsertDiscoveredCompany, createDiscoveryList, updateListCounts } from '../db.js';

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
    let source = 'none';
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
      if (added > 0 && source === 'none' && providerSource !== 'postgres') {
        source = providerSource;
      } else if (added > 0 && source === 'postgres' && providerSource !== 'postgres') {
        source = `postgres+${providerSource}`;
      } else if (added > 0 && !source.includes(providerSource)) {
        source = source ? `${source}+${providerSource}` : providerSource;
      }
      return added;
    };

    // 2. Pre-check: strict count of DB companies matching criteria (no fallbacks)
    let dbStrictCount = 0;
    if (companies.length === 0) {
      dbStrictCount = await countStrictMatchingCompanies(orgId, criteria);
      console.log('[Discover] Strict DB pre-check:', { dbStrictCount, criteria: { industry: criteria.industry, keywords: criteria.keywords, regions: criteria.regions } });
      waterfallLog.push({ key: 'postgres_precheck', count: dbStrictCount });
    }

    // 3. If DB has matches, serve from Postgres (fast path)
    if (companies.length === 0 && dbStrictCount > 0) {
      console.log('[Discover] Postgres search (has strict matches):', { orgId, criteria });
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
      const order = orderRow?.lead_search_order || ['ai_ark', 'icypeas', 'findy', 'wiza', 'leadsmagix'];
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
        } else if (key === 'findy') {
          const creds = await getIntegrationCredentials(orgId, 'findy');
          let apiKey = getApiKeyFromCredentials(creds);
          if (!apiKey) {
            const fmCreds = await getIntegrationCredentials(orgId, 'findymail');
            apiKey = getApiKeyFromCredentials(fmCreds);
          }
          if (!apiKey) {
            waterfallLog.push({ key: 'findy', tried: false, reason: 'no_api_key' });
            continue;
          }
          try {
            console.log('[Discover] Findy intellimatch request (need %d more):', remaining(), { industry: criteria.industry, keywords: kwList, regions: criteria.regions });
            const results = await findLeadsFindy(apiKey, {
              industry: criteria.industry,
              keywords: kwList,
              regions: criteria.regions,
              employeeSizes: criteria.employeeSizes,
              roles: criteria.roles,
              maxLeads: remaining(),
            });
            const normalized = (results || []).map((c, i) => normalizeCompany(c, companies.length + i + 1));
            const count = addCompanies(normalized, 'findy');
            console.log('[Discover] Findy result:', { returned: results?.length || 0, added: count });
            waterfallLog.push({ key: 'findy', tried: true, count });
          } catch (err) {
            console.warn('[Discover] Findy failed:', err.message);
            waterfallLog.push({ key: 'findy', tried: true, error: err.message });
          }
        } else if (key === 'wiza' || key === 'leadsmagix') {
          waterfallLog.push({ key, tried: false, reason: 'not_implemented_for_discovery' });
        }
      }
    }

    // 4. Last resort: if APIs also returned nothing, fall back to loose Postgres search
    if (companies.length === 0 && dbStrictCount === 0) {
      console.log('[Discover] APIs returned nothing — falling back to loose Postgres search');
      const pgResult = await searchCompaniesForDiscovery(orgId, criteria);
      const pgResults = pgResult.companies || [];
      sqlQueries = pgResult.sqlQueries || [];
      if (pgResults.length > 0) {
        companies = pgResults.map((c, i) => ({ ...c, id: c.id || `pg-${i + 1}` }));
        source = 'postgres_fallback';
      }
    }

    // Strip internal _source field before response
    const cleanCompanies = companies.map(({ _source, ...rest }) => rest);

    let persistResult = null;
    if (cleanCompanies.length > 0) {
      try {
        await ensureOrgExists(orgId);
        persistResult = await persistDiscoveryResults(orgId, cleanCompanies, {
          source,
          queryJson: criteria,
          projectId: criteria.projectId || null,
        });
        console.log('[Discover] Persisted:', persistResult);
      } catch (e) {
        console.warn('[Discover] Persist error (non-fatal):', e.message);
      }
    }

    res.json({
      success: true,
      count: cleanCompanies.length,
      companies: cleanCompanies,
      source,
      sqlQueries: sqlQueries || [],
      waterfallLog: waterfallLog || [],
      persisted: persistResult || null,
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
    else if (s === 'dach' || s.includes('dach')) out.push('DE', 'AT', 'CH');
    else if (s === 'nordics' || s === 'nordic' || s.includes('nordic')) out.push('SE', 'NO', 'DK', 'FI', 'IS');
    else if (s.includes('australia') && s.includes('nz')) out.push('AU', 'NZ');
    else if (s.includes('latin america') || s === 'latam') out.push('BR', 'MX', 'AR', 'CO', 'CL', 'PE');
    else if (s === 'africa' || s.includes('africa')) out.push('ZA', 'NG', 'KE', 'EG', 'GH');
    else if (s.includes('europe') || s === 'eu') out.push('GB', 'DE', 'FR', 'NL', 'ES', 'IT', 'SE', 'CH', 'BE', 'IE', 'PL');
    else if ((s.includes('asia') && s.includes('pacific')) || s === 'apac') out.push('JP', 'AU', 'SG', 'IN', 'KR', 'HK', 'NZ');
    else if (s.includes('mena')) out.push('AE', 'SA', 'IL', 'EG');
    else if (s.includes('uk') || s.includes('ireland')) out.push('GB', 'IE');
    else if (s === 'global') out.push('US', 'CA', 'GB', 'DE', 'FR', 'AU', 'JP', 'IN', 'BR');
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
const VERIFY_EMAIL_KEYS = ['findymail', 'neverbounce', 'zerobounce', 'cleanlist'];

async function findEmailWaterfall(orgId, { firstName, lastName, company, domain }, opts = {}) {
  const usageTracker = opts.usageTracker || {};
  const orderRow = await getIntegrationServiceOrder(orgId);
  const order = orderRow?.lead_enrichment_order || ['findymail', 'icypeas', 'bettercontact', 'neverbounce'];
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  const dom = (domain || (company && company.includes('.') ? company : '')).replace(/^https?:\/\//, '').split('/')[0];

  for (const key of order) {
    if (!FIND_EMAIL_KEYS.includes(key)) continue;
    const creds = await getIntegrationCredentials(orgId, key);
    const apiKey = getApiKeyFromCredentials(creds);
    if (!apiKey) continue;

    usageTracker.findEmail = usageTracker.findEmail || {};
    usageTracker.findEmail[key] = (usageTracker.findEmail[key] || 0) + 1;

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

async function verifyEmailWaterfall(orgId, email, opts = {}) {
  const usageTracker = opts.usageTracker || {};
  const orderRow = await getIntegrationServiceOrder(orgId);
  const order = orderRow?.lead_enrichment_order || ['findymail', 'neverbounce', 'bettercontact', 'zerobounce'];
  let lastErr = null;

  for (const key of order) {
    if (!VERIFY_EMAIL_KEYS.includes(key)) continue;
    const creds = await getIntegrationCredentials(orgId, key);
    const apiKey = getApiKeyFromCredentials(creds);
    if (!apiKey) continue;

    usageTracker.verifyEmail = usageTracker.verifyEmail || {};
    usageTracker.verifyEmail[key] = (usageTracker.verifyEmail[key] || 0) + 1;

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

// ============================================================================
// AUTO-CASCADE: discover → find people → find email → verify → persist
// Reusable function called from /discover after API results return.
// ============================================================================

async function runEnrichmentCascade(orgId, companies, opts = {}) {
  const {
    roles = ['CEO', 'Founder', 'CTO', 'VP of Sales', 'Head of Growth'],
    listName,
    source = 'cascade',
    projectId,
    maxPeoplePerCompany = 5,
  } = opts;
  const cascadeLog = [];
  const log = (msg, type = 'info') => {
    cascadeLog.push({ msg, type, ts: Date.now() });
    console.log(`[Cascade] ${msg}`);
  };

  if (!companies?.length) return { contacts: [], listId: null, cascadeLog, usageTracker: {} };

  await ensureOrgExists(orgId);
  const listId = listName ? await createDiscoveryList(orgId, listName, { projectId }) : null;
  const allContacts = [];
  const usageTracker = { findPeople: {}, findEmail: {}, verifyEmail: {} };

  const icypeasCreds = await getIntegrationCredentials(orgId, 'icypeas');
  const icypeasKey = getApiKeyFromCredentials(icypeasCreds);

  const findyCreds = await getIntegrationCredentials(orgId, 'findy');
  let findyKey = getApiKeyFromCredentials(findyCreds);
  if (!findyKey) {
    const fmCreds = await getIntegrationCredentials(orgId, 'findymail');
    findyKey = getApiKeyFromCredentials(fmCreds);
  }

  if (!icypeasKey && !findyKey) {
    log('No people-search integration available (IcyPeas or Findy). Skipping enrichment cascade.', 'warn');
    return { contacts: [], listId, cascadeLog };
  }

  log(`Starting cascade for ${companies.length} companies — roles: ${roles.join(', ')}`, 'info');

  for (const comp of companies) {
    const companyName = comp.name || comp.company || '';
    const domain = (comp.domain || comp.website || '').replace(/^https?:\/\//, '').split('/')[0].trim();
    if (!companyName && !domain) continue;

    // Guard: reject LinkedIn headlines before hitting external APIs or writing to DB.
    // Pipe (|) is the definitive LinkedIn separator; >100 chars is always a tagline.
    // If we don't catch these here, IcyPeas wastes a credit and the garbage name
    // gets upserted into companies with a 30-day enriched_at lock.
    if (companyName && (companyName.includes('|') || companyName.trim().length > 100)) {
      log(`${companyName.slice(0, 60)}... — skipping, not a valid company name`, 'warn');
      continue;
    }

    const companyId = await upsertDiscoveredCompany(orgId, comp, { source, projectId });
    if (!companyId) {
      log(`${companyName || domain} — failed to upsert company`, 'warn');
      continue;
    }

    let people = [];

    if (icypeasKey) {
      try {
        const cleanDomain = domain && /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(domain)
          ? domain : null;
        const icypeasCriteria = {
          companies: [companyName],
          jobTitles: roles,
          limit: maxPeoplePerCompany,
          apiKey: icypeasKey,
        };
        if (cleanDomain) icypeasCriteria.companyDomains = [cleanDomain];
        const result = await findPeopleIcyPeas(icypeasCriteria);
        people = result.leads || result.people?.leads || result.people || result.data || (Array.isArray(result) ? result : []);
        if (!Array.isArray(people)) people = [];
        if (people.length > 0) {
          log(`${companyName} — IcyPeas found ${people.length} people`, 'info');
          usageTracker.findPeople.icypeas = (usageTracker.findPeople.icypeas || 0) + 1;
        }
      } catch (e) {
        log(`${companyName} — IcyPeas people search failed: ${e.message}`, 'warn');
      }
    }

    if (people.length === 0 && findyKey && domain) {
      try {
        const result = await findEmployeesFindy(findyKey, {
          website: domain,
          jobTitles: roles,
          count: maxPeoplePerCompany,
        });
        people = Array.isArray(result) ? result : (result?.employees || result?.contacts || []);
        if (people.length > 0) {
          log(`${companyName} — Findy found ${people.length} people`, 'info');
          usageTracker.findPeople.findy = (usageTracker.findPeople.findy || 0) + 1;
        }
      } catch (e) {
        log(`${companyName} — Findy people search failed: ${e.message}`, 'warn');
      }
    }

    if (people.length === 0) {
      log(`${companyName} — no people found`, 'warn');
      continue;
    }

    for (const person of people) {
      const firstName = person.firstname || person.firstName || person.first_name || '';
      const lastName = person.lastname || person.lastName || person.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      if (!fullName) continue;

      let email = person.email || person.emailAddress || person.email_address || null;

      if (!email) {
        try {
          const dom = domain || (companyName.includes('.') ? companyName : '');
          const emailData = await findEmailWaterfall(orgId, {
            firstName, lastName,
            company: companyName,
            domain: dom,
          }, { usageTracker });
          email = emailData?.email || null;
          if (email) log(`${fullName} — email found via ${emailData.source}`, 'info');
        } catch (_) {}
      }

      let bounceRisk = 'unknown';
      let validationStatus = 'pending';
      if (email) {
        try {
          const v = await verifyEmailWaterfall(orgId, email, { usageTracker });
          bounceRisk = v.verified ? 'low' : 'high';
          validationStatus = v.verified ? 'valid' : 'invalid';
        } catch (_) {}
      }

      const contact = {
        name: fullName,
        firstName, lastName,
        title: person.lastJobTitle || person.headline || person.title || person.job_title || 'Unknown',
        email: email || 'Not found',
        linkedin: person.profileUrl || person.linkedinUrl || person.linkedin_url || '',
        company: companyName,
        companyId,
        bounceRisk,
        validationStatus,
        fromCache: false,
      };
      allContacts.push(contact);

      if (companyId && email && email !== 'Not found') {
        try {
          await upsertDiscoveredLead(orgId, {
            first_name: firstName,
            last_name: lastName,
            email,
            title: contact.title,
            company: companyName,
            company_domain: domain || null,
            companyId,
            linkedin_url: contact.linkedin || null,
            email_bounce_risk: bounceRisk,
            email_validation_status: validationStatus,
            rawData: { headline: person.headline, about: person.description },
          }, { listId, source: source + '_cascade' });
        } catch (e) {
          log(`${fullName} — lead upsert error: ${e.message}`, 'warn');
        }
      }
    }
  }

  if (listId) {
    try { await updateListCounts(listId); } catch (_) {}
  }

  log(`Cascade done: ${allContacts.length} contacts from ${companies.length} companies`, allContacts.length > 0 ? 'success' : 'warn');
  return { contacts: allContacts, listId, cascadeLog, usageTracker };
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

// POST /api/lead-generation/enrich/bulk — Triggered by "ENRICH N COMPANIES →" button.
// Takes only user-selected companies, checks cache, then runs the full cascade
// (find people → find email → verify → persist) using the enrichment service order.
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

    // Separate cached vs fresh companies
    const toEnrich = [];
    for (const comp of companiesInput) {
      const companyName = comp.name || comp.company;
      const domain = comp.domain || comp.website?.replace?.(/^https?:\/\//, '') || '';
      if (!companyName) {
        log(`Skipping company with no name (domain: ${domain || 'none'})`, 'warn');
        continue;
      }

      // Guard: reject LinkedIn headlines stored as company names.
      // Pipe (|) is the definitive LinkedIn separator; >100 chars is always a tagline.
      // These cannot be enriched and would pollute the cache with garbage records.
      if (companyName.includes('|') || companyName.trim().length > 100) {
        log(`${companyName.slice(0, 60)}... — skipping, not a valid company name`, 'warn');
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
            validationStatus: l.email_bounce_risk === 'low' ? 'valid' : l.email_bounce_risk === 'high' ? 'invalid' : 'pending',
            linkedinData: l.company_data_json?.linkedinData || null,
            fromCache: true,
          });
        }
      } else {
        toEnrich.push(comp);
      }
    }

    const fromCache = allContacts.length;
    if (fromCache > 0) log(`Loaded ${fromCache} contacts from cache (enriched < 30 days)`, 'info');

    // Run the enrichment cascade for companies that need fresh data
    let cascade = { contacts: [], listId: null, cascadeLog: [], usageTracker: {} };
    if (toEnrich.length > 0) {
      log(`Running enrichment cascade for ${toEnrich.length} companies — roles: ${rolesList.join(', ')}`, 'info');
      cascade = await runEnrichmentCascade(orgId, toEnrich, {
        roles: rolesList,
        listName: listName || `Enrichment ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        source: 'enrichment',
        maxPeoplePerCompany: 5,
      });

      for (const entry of cascade.cascadeLog) {
        enrichmentLog.push(entry);
      }

      for (const c of cascade.contacts) {
        allContacts.push({
          id: `gen-${allContacts.length + 1}`,
          name: c.name,
          title: c.title,
          email: c.email,
          linkedin: c.linkedin,
          company: c.company,
          companyId: c.companyId,
          bounceRisk: c.bounceRisk,
          validationStatus: c.validationStatus,
          linkedinData: null,
          fromCache: false,
        });
      }
    }

    const enriched = allContacts.length - fromCache;
    log(`Done: ${allContacts.length} contacts (${fromCache} cached, ${enriched} enriched) from ${companiesInput.length} companies`, allContacts.length > 0 ? 'success' : 'warn');
    if (allContacts.length === 0) {
      log('Tip: Ensure company names are real (e.g. "Acme Corp") not generic (e.g. "B2B SaaS"). Providers find people by company name.', 'info');
    }

    res.json({ success: true, contacts: allContacts, listId: cascade.listId, enrichmentLog, usageTracker: cascade.usageTracker });
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

    const orgId = req.orgId;
    const result = await addLeadsToHeyReach(leads, orgId);
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

    const orgId = req.orgId;
    const results = await addLeadsToInstantly(leads, orgId);
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
