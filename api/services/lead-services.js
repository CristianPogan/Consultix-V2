/**
 * External Lead Generation & Enrichment Services
 * Integrated from n8n workflows
 */

// ============================================================================
// 1. COMPANY LEAD GENERATION
// ============================================================================

/**
 * Apify B2B Leads Finder (Apollo-based person/company search)
 * @param {Object} searchParams - Search criteria
 * @returns {Promise<Array>} - Array of leads
 */
export async function findLeadsApifyApollo(searchParams) {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) throw new Error('APIFY_API_KEY not configured');

  const { searchUrl, maxResults = 1000, cookies } = searchParams;
  
  // Start actor run
  const runResponse = await fetch('https://api.apify.com/v2/acts/olympus~b2b-leads-finder/runs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      cookies: cookies || process.env.APOLLO_COOKIES,
      maxResults,
      searchUrl,
    }),
  });

  if (!runResponse.ok) {
    throw new Error(`Apify Apollo run failed: ${runResponse.statusText}`);
  }

  const runData = await runResponse.json();
  const runId = runData.data.id;

  // Poll for completion
  let status = 'RUNNING';
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (status === 'RUNNING' && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    
    const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    const statusData = await statusResponse.json();
    status = statusData.data.status;
    attempts++;
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  // Fetch results
  const resultsResponse = await fetch(runData.data.defaultDatasetId 
    ? `https://api.apify.com/v2/datasets/${runData.data.defaultDatasetId}/items?token=${apiKey}`
    : `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apiKey}`
  );

  return await resultsResponse.json();
}

/**
 * Apify Google Maps Scraper (local business discovery)
 * @param {Object} params - Search parameters
 * @returns {Promise<Array>} - Array of businesses
 */
export async function findLeadsGoogleMaps(params) {
  const apiKey = process.env.APIFY_API_KEY;
  if (!apiKey) throw new Error('APIFY_API_KEY not configured');

  const { searchQuery, maxResults = 100 } = params;

  // Start scraper run
  const runResponse = await fetch(`https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      searchStringsArray: Array.isArray(searchQuery) ? searchQuery : [searchQuery],
      maxCrawledPlacesPerSearch: maxResults,
    }),
  });

  const runData = await runResponse.json();
  const runId = runData.data.id;

  // Poll for completion
  let status = 'RUNNING';
  let attempts = 0;

  while (status === 'RUNNING' && attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apiKey}`);
    const statusData = await statusResponse.json();
    status = statusData.data.status;
    attempts++;
  }

  if (status !== 'SUCCEEDED') {
    throw new Error(`Google Maps scraper failed: ${status}`);
  }

  // Fetch results
  const datasetId = runData.data.defaultDatasetId;
  const resultsResponse = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apiKey}`);
  
  return await resultsResponse.json();
}

/**
 * IcyPeas Find People (person search by criteria)
 * @param {Object} criteria - Search criteria. apiKey overrides env if provided.
 * @returns {Promise<Array>} - Array of people
 */
export async function findPeopleIcyPeas(criteria) {
  const apiKey = criteria?.apiKey || process.env.ICYPEAS_API_KEY;
  if (!apiKey) throw new Error('ICYPEAS_API_KEY not configured');

  const { jobTitles, locations, companies, companyDomains, keywords, limit = 100, paginationToken } = criteria;

  const query = {};
  if (jobTitles?.length) query.currentJobTitle = { include: jobTitles };
  if (locations?.length) query.location = { include: locations };
  if (companies?.length) query.currentCompanyName = { include: companies };
  if (companyDomains?.length) query.currentCompanyWebsite = { include: companyDomains };
  if (keywords?.length) query.keyword = { include: keywords };
  if (Object.keys(query).length === 0) query.keyword = { include: ['B2B'] };

  const pagination = { size: Math.min(limit || 200, 200) };
  if (paginationToken) pagination.token = paginationToken;

  const response = await fetch('https://app.icypeas.com/api/find-people', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ query, pagination }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`IcyPeas find people failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (data.success === false) {
    const errMsg = data.error || JSON.stringify(data.validationErrors || {});
    throw new Error(`IcyPeas find people validation: ${errMsg}`);
  }
  return data;
}

/**
 * IcyPeas Find Companies — for discovery cascade
 * Uses POST /api/find-companies with industry, keyword, location, headcount filters
 */
export async function findCompaniesIcyPeas(criteria) {
  const apiKey = criteria?.apiKey || process.env.ICYPEAS_API_KEY;
  if (!apiKey) throw new Error('ICYPEAS_API_KEY not configured');

  const { industry, keywords, locations, headcountMin, headcountMax, limit = 100, paginationToken } = criteria;

  const query = {};
  if (industry) query.industry = { include: Array.isArray(industry) ? industry : [industry] };
  if (locations?.length) query.location = { include: locations };
  if (keywords?.length) query.keyword = { include: Array.isArray(keywords) ? keywords : [keywords] };
  const hc = {};
  if (headcountMin != null) hc['>='] = headcountMin;
  if (headcountMax != null) hc['<='] = headcountMax;
  if (Object.keys(hc).length) query.headcount = hc;
  if (Object.keys(query).length === 0) query.keyword = { include: ['B2B'] };

  const pagination = { size: Math.min(limit || 100, 200) };
  if (paginationToken) pagination.token = paginationToken;

  const response = await fetch('https://app.icypeas.com/api/find-companies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ query, pagination }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`IcyPeas find companies failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  if (data.success === false) {
    const errMsg = data.error || JSON.stringify(data.validationErrors || {});
    throw new Error(`IcyPeas find companies validation: ${errMsg}`);
  }
  return data;
}

/**
 * IcyPeas Count (pre-flight dry run, no credits deducted)
 * @param {Object} criteria - Same as findPeopleIcyPeas. apiKey overrides env if provided.
 * @returns {Promise<Object>} - { count: number }
 */
export async function countIcyPeas(criteria) {
  const apiKey = criteria?.apiKey || process.env.ICYPEAS_API_KEY;
  if (!apiKey) throw new Error('ICYPEAS_API_KEY not configured');

  const { jobTitles, locations, companies, companyDomains, keywords } = criteria || {};

  const query = {};
  if (jobTitles?.length) query.currentJobTitle = { include: jobTitles };
  if (locations?.length) query.location = { include: locations };
  if (companies?.length) query.currentCompanyName = { include: companies };
  if (companyDomains?.length) query.currentCompanyWebsite = { include: companyDomains };
  if (keywords?.length) query.keyword = { include: keywords };
  if (criteria?.headcountMin != null) query.headcount = { '>=': criteria.headcountMin };
  if (Object.keys(query).length === 0) query.keyword = { include: ['B2B'] };

  const response = await fetch('https://app.icypeas.com/api/count', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`IcyPeas count failed: ${response.status} ${errText}`);
  }

  return await response.json();
}

const AI_ARK_BASE = 'https://api.ai-ark.com/api/developer-portal';

// Map our employee sizes to AI Ark range format { start, end }
const EMPLOYEE_SIZE_TO_RANGE = {
  '1-10': { start: 1, end: 10 },
  '11-50': { start: 11, end: 50 },
  '51-200': { start: 51, end: 200 },
  '201-500': { start: 201, end: 500 },
  '501-1,000': { start: 501, end: 1000 },
  '501-1000': { start: 501, end: 1000 },
  '1,001-5,000': { start: 1001, end: 5000 },
  '1001-5000': { start: 1001, end: 5000 },
  '5,000+': { start: 5001, end: 999999 },
  '5000+': { start: 5001, end: 999999 },
};

// Expand region names to AI Ark location values (country names/codes)
function expandRegionsForAiArk(regions) {
  if (!regions?.length) return ['United States', 'Canada'];
  const out = [];
  for (const r of regions) {
    const s = String(r || '').trim().toLowerCase();
    if (s.includes('north america') || s === 'na') {
      out.push('United States', 'Canada', 'Mexico');
    } else if (s === 'dach') {
      out.push('Germany', 'Austria', 'Switzerland');
    } else if (s === 'nordics' || s === 'nordic') {
      out.push('Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland');
    } else if (s.includes('australia') && s.includes('nz')) {
      out.push('Australia', 'New Zealand');
    } else if (s.includes('latin america') || s === 'latam') {
      out.push('Brazil', 'Mexico', 'Argentina', 'Colombia', 'Chile');
    } else if (s === 'africa') {
      out.push('South Africa', 'Nigeria', 'Kenya', 'Egypt', 'Ghana');
    } else if (s.includes('europe') || s === 'eu') {
      out.push('United Kingdom', 'Germany', 'France', 'Netherlands', 'Spain', 'Italy');
    } else if ((s.includes('asia') && s.includes('pacific')) || s === 'apac') {
      out.push('Japan', 'Australia', 'Singapore', 'India');
    } else if (s.includes('mena')) {
      out.push('United Arab Emirates', 'Saudi Arabia');
    } else if (s.includes('uk') || s.includes('ireland')) {
      out.push('United Kingdom', 'Ireland');
    } else if (s === 'global') {
      out.push('United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Australia', 'Japan', 'India', 'Brazil');
    } else {
      out.push(r.trim());
    }
  }
  return [...new Set(out)];
}

/**
 * AI Ark Semantic Company Search (docs.ai-ark.com)
 * Uses POST /v1/companies with X-TOKEN auth
 * @param {string} apiKey - AI Ark API key (X-TOKEN header)
 * @param {Object} criteria - industry, keywords, companySize (array), regions, maxLeads
 * @returns {Promise<Array>} - Companies
 */
export async function findCompaniesAiArkSemantic(apiKey, criteria) {
  if (!apiKey) throw new Error('AI Ark API key required');

  const { industry, keywords, companySize, regions, maxLeads = 100 } = criteria;
  const industries = industry ? [industry].flat().filter(Boolean) : [];
  const kw = keywords
    ? (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()).filter(Boolean) : keywords)
    : [];
  const sizes = companySize?.length ? companySize : ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];
  const loc = expandRegionsForAiArk(regions);

  const account = {};
  if (industries.length) account.industry = { any: { include: industries } };
  if (kw.length) account.keyword = { any: { include: { mode: 'SMART', content: kw } } };
  else if (industries.length) account.keyword = { any: { include: { mode: 'SMART', content: industries } } };
  if (loc.length) account.location = { any: { include: loc } };
  const rangeParts = sizes.map(s => EMPLOYEE_SIZE_TO_RANGE[s]).filter(Boolean);
  if (rangeParts.length) account.employeeSize = { type: 'RANGE', range: rangeParts };
  if (Object.keys(account).length === 0) account.industry = { any: { include: ['B2B SaaS'] } };

  const body = {
    page: 0,
    size: Math.min(maxLeads || 100, 100),
    account,
  };

  const res = await fetch(`${AI_ARK_BASE}/v1/companies`, {
    method: 'POST',
    headers: {
      'X-TOKEN': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI Ark semantic search failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const raw = data.content || data.companies || data.data || data.results || (Array.isArray(data) ? data : []);
  // AI Ark returns { summary, link, location, ... } per company
  return (Array.isArray(raw) ? raw : []).map(c => ({
    id: c.id,
    name: c.summary?.name ?? c.name ?? 'Unknown',
    domain: (c.link?.domain || c.link?.website || c.domain || '').replace(/^https?:\/\//, '').split('/')[0] || null,
    industry: c.summary?.industry ?? c.industry ?? (c.industries?.[0]),
    employees: c.summary?.staff?.total ?? c.summary?.staff?.range ?? c.employees,
    location: (c.location?.headquarter?.raw_address ?? c.location?.default ?? [
      c.location?.headquarter?.city,
      c.location?.headquarter?.state,
      c.location?.headquarter?.country,
    ].filter(Boolean).join(', ')) || 'Unknown',
  }));
}

/**
 * AI Ark Lookalike / Similarity Search (uses Company Search with lookalikeDomains)
 * @param {string} apiKey - AI Ark API key
 * @param {string} seedDomain - e.g. stripe.com or linkedin.com/company/stripe
 * @param {Object} criteria - industries, regions, maxLeads
 * @returns {Promise<Array>} - Similar companies
 */
export async function findCompaniesAiArkLookalike(apiKey, seedDomain, criteria = {}) {
  if (!apiKey) throw new Error('AI Ark API key required');
  if (!seedDomain?.trim()) throw new Error('Seed domain required for lookalike search');

  const domain = seedDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
  const lookalikeUrl = domain.includes('linkedin.com') ? seedDomain.trim() : `https://${domain}`;
  const { industry, industries, regions, maxLeads = 50 } = criteria;
  const ind = industries || (industry ? [industry] : []);
  const loc = expandRegionsForAiArk(regions?.length ? regions : []);

  const account = {};
  if (ind.length) account.industry = { any: { include: ind } };
  if (loc.length) account.location = { any: { include: loc } };

  const body = {
    lookalikeDomains: [lookalikeUrl],
    page: 0,
    size: Math.min(maxLeads || 50, 100),
    ...(Object.keys(account).length ? { account } : {}),
  };

  const res = await fetch(`${AI_ARK_BASE}/v1/companies`, {
    method: 'POST',
    headers: {
      'X-TOKEN': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI Ark lookalike search failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const raw = data.content || data.companies || data.data || data.results || (Array.isArray(data) ? data : []);
  return (Array.isArray(raw) ? raw : []).map(c => ({
    id: c.id,
    name: c.summary?.name ?? c.name ?? 'Unknown',
    domain: (c.link?.domain || c.link?.website || c.domain || '').replace(/^https?:\/\//, '').split('/')[0] || null,
    industry: c.summary?.industry ?? c.industry ?? (c.industries?.[0]),
    employees: c.summary?.staff?.total ?? c.summary?.staff?.range ?? c.employees,
    location: (c.location?.headquarter?.raw_address ?? c.location?.default ?? [
      c.location?.headquarter?.city,
      c.location?.headquarter?.state,
      c.location?.headquarter?.country,
    ].filter(Boolean).join(', ')) || 'Unknown',
  }));
}

// ============================================================================
// 2. PERSON LEAD ENRICHMENT
// ============================================================================

/**
 * IcyPeas Email Search (find email for a person)
 * @param {Object} person - Person data
 * @param {string} [apiKey] - Optional API key (from org credentials)
 * @returns {Promise<Object>} - Email data
 */
export async function findEmailIcyPeas(person, apiKey) {
  const key = apiKey || process.env.ICYPEAS_API_KEY;
  if (!key) throw new Error('IcyPeas API key not configured');

  const { firstName, lastName, company } = person;

  // Submit email search
  const searchResponse = await fetch('https://app.icypeas.com/api/email-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': key,
    },
    body: JSON.stringify({
      firstname: firstName,
      lastname: lastName,
      domainOrCompany: company,
    }),
  });

  if (!searchResponse.ok) {
    throw new Error(`IcyPeas email search failed: ${searchResponse.statusText}`);
  }

  const searchData = await searchResponse.json();
  const searchId = searchData._id;

  // Poll for result
  let status = 'IN_PROGRESS';
  let attempts = 0;

  while (status === 'IN_PROGRESS' && attempts < 30) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s

    const resultResponse = await fetch('https://app.icypeas.com/api/bulk-single-searchs/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': key,
      },
      body: JSON.stringify({ id: searchId }),
    });

    const resultData = await resultResponse.json();
    status = resultData.status;

    if (status === 'COMPLETED') {
      return resultData;
    }

    attempts++;
  }

  throw new Error('IcyPeas email search timeout');
}

/**
 * NeverBounce Email Verification
 * @param {string} email - Email to verify
 * @param {string} [apiKey] - Optional API key (from org credentials)
 * @returns {Promise<Object>} - Verification result
 */
export async function verifyEmailNeverBounce(email, apiKey) {
  const key = apiKey || process.env.NEVERBOUNCE_API_KEY;
  if (!key) throw new Error('NeverBounce API key not configured');

  const response = await fetch(
    `https://api.neverbounce.com/v4.2/single/check?key=${key}&email=${encodeURIComponent(email)}`
  );

  if (!response.ok) {
    throw new Error(`NeverBounce verification failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * FindyMail - Verify a known email address
 * @param {string} apiKey - FindyMail API key (Bearer)
 * @param {string} email - Email to verify
 * @returns {Promise<Object>} - { valid, deliverable, etc }
 */
export async function verifyEmailFindyMail(apiKey, email) {
  if (!apiKey) throw new Error('FindyMail API key required');
  const res = await fetch('https://app.findymail.com/api/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`FindyMail verify failed: ${res.statusText}`);
  const data = await res.json();
  return { result: data.valid ? 'valid' : (data.deliverable === false ? 'invalid' : 'unknown'), verified: data.valid === true, ...data };
}

/**
 * FindyMail - Find email by name + domain
 * @param {string} apiKey - FindyMail API key (Bearer)
 * @param {Object} params - { name, domain }
 * @returns {Promise<Object>} - { email, ... }
 */
export async function findEmailFindyMail(apiKey, { name, domain }) {
  if (!apiKey) throw new Error('FindyMail API key required');
  if (!name || !domain) throw new Error('FindyMail search requires name and domain');
  const res = await fetch('https://app.findymail.com/api/search/name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ name, domain }),
  });
  if (!res.ok) throw new Error(`FindyMail search failed: ${res.statusText}`);
  const data = await res.json();
  return { email: data.email || data.address, confidence: data.confidence, ...data };
}

// ============================================================================
// FINDYMAIL / FINDY — Lead Discovery, People Search, Company Enrichment
// Uses FindyMail API (app.findymail.com) — "Findy" and "FindyMail" share the same key.
// ============================================================================

const FINDYMAIL_BASE = 'https://app.findymail.com/api';

function findyHeaders(apiKey) {
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
}

/**
 * Findy — Lead discovery via natural language (IntelliMatch).
 * POST /api/intellimatch/search
 * @param {string} apiKey
 * @param {Object} criteria - { industry, keywords, regions, employeeSizes, roles, maxLeads }
 * @returns {Promise<Array>} - normalised company objects
 */
export async function findLeadsFindy(apiKey, criteria) {
  if (!apiKey) throw new Error('Findy API key required');

  const { industry, keywords, regions, employeeSizes, roles, maxLeads = 50 } = criteria;

  const parts = [];
  if (industry) parts.push(industry);
  if (keywords?.length) parts.push(...(Array.isArray(keywords) ? keywords : String(keywords).split(',').map(k => k.trim()).filter(Boolean)));
  parts.push('companies');
  if (employeeSizes?.length) {
    const sizeDesc = employeeSizes.map(s => s.replace(/,/g, '')).join(' or ');
    parts.push(`with ${sizeDesc} employees`);
  }
  if (regions?.length) parts.push(`in ${regions.join(', ')}`);
  if (!parts.some(p => p !== 'companies')) parts.unshift('B2B SaaS');
  const query = parts.join(' ');

  const findContact = !!(roles?.length);

  const res = await fetch(`${FINDYMAIL_BASE}/intellimatch/search`, {
    method: 'POST',
    headers: findyHeaders(apiKey),
    body: JSON.stringify({
      query,
      limit: Math.min(maxLeads || 50, 200),
      config: { find_contact: findContact, find_email: findContact },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Findy intellimatch failed: ${res.status} ${errText}`);
  }

  const body = await res.json();
  const items = body.data || body.results || body.companies || (Array.isArray(body) ? body : []);

  return items.map(c => ({
    name: c.name || c.company_name || 'Unknown',
    domain: (c.domain || c.website || '').replace(/^https?:\/\//, '').split('/')[0] || null,
    industry: c.industry || industry || '',
    employees: c.company_size || c.employee_count || c.employees || 'N/A',
    location: c.location || c.headquarters || c.country || 'Unknown',
    contactEmail: c.contact_email || c.email || null,
    contactName: c.contact_name || c.contact?.name || null,
  }));
}

/**
 * Findy — Find employees at a company by website + job titles.
 * POST /api/search/employees
 * @param {string} apiKey
 * @param {Object} params - { website, jobTitles, count }
 * @returns {Promise<Array>} - [{ name, linkedinUrl, jobTitle }]
 */
export async function findEmployeesFindy(apiKey, { website, jobTitles, count = 5 }) {
  if (!apiKey) throw new Error('Findy API key required');
  if (!website) throw new Error('Website required for employee search');

  const domain = website.replace(/^https?:\/\//, '').split('/')[0];

  const res = await fetch(`${FINDYMAIL_BASE}/search/employees`, {
    method: 'POST',
    headers: findyHeaders(apiKey),
    body: JSON.stringify({
      website: domain,
      job_titles: jobTitles?.length ? jobTitles : ['CEO', 'Founder', 'CTO'],
      count: Math.min(count, 50),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Findy employees search failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : (data.data || data.results || []);
}

/**
 * Findy — Company enrichment by domain.
 * POST /api/search/company
 * @param {string} apiKey
 * @param {Object} params - { domain } or { name }
 * @returns {Promise<Object>} - { name, domain, company_size, industry, ... }
 */
export async function enrichCompanyFindy(apiKey, { domain, name }) {
  if (!apiKey) throw new Error('Findy API key required');
  if (!domain && !name) throw new Error('Domain or name required for company enrichment');

  const body = {};
  if (domain) body.domain = domain.replace(/^https?:\/\//, '').split('/')[0];
  else body.name = name;

  const res = await fetch(`${FINDYMAIL_BASE}/search/company`, {
    method: 'POST',
    headers: findyHeaders(apiKey),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Findy company enrichment failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Findy — Validate API key by making a lightweight company search.
 * 200 = valid key with credits, 402 = valid key but no credits, 401/403 = invalid key.
 * @param {string} apiKey
 * @returns {Promise<boolean>}
 */
export async function checkFindyApiKey(apiKey) {
  if (!apiKey) return false;
  const res = await fetch(`${FINDYMAIL_BASE}/search/company`, {
    method: 'POST',
    headers: findyHeaders(apiKey),
    body: JSON.stringify({ domain: 'google.com' }),
  });
  return res.ok || res.status === 402;
}

/**
 * BetterContact Email Verification
 * @param {string} apiKey - BetterContact API key
 * @param {string} email - Email to verify
 * @returns {Promise<Object>} - { verified, result }
 */
export async function verifyEmailBetterContact(apiKey, email) {
  if (!apiKey) throw new Error('BetterContact API key required');
  const response = await fetch('https://app.bettercontact.rocks/api/v2/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error(`BetterContact verify failed: ${response.statusText}`);
  const data = await response.json();
  const valid = data.status === 'valid' || data.result === 'valid' || data.deliverable === true;
  return { result: valid ? 'valid' : 'invalid', verified: valid, ...data };
}

/**
 * BetterContact Email Find (by name + company domain)
 * @param {string} apiKey - BetterContact API key
 * @param {Object} params - { firstName, lastName, company, domain }
 * @returns {Promise<Object>} - { email, confidence }
 */
export async function findEmailBetterContact(apiKey, { firstName, lastName, company, domain }) {
  if (!apiKey) throw new Error('BetterContact API key required');
  const response = await fetch('https://app.bettercontact.rocks/api/v2/enrich', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      company_name: company,
      company_domain: domain,
    }),
  });
  if (!response.ok) throw new Error(`BetterContact enrich failed: ${response.statusText}`);
  const data = await response.json();
  return { email: data.email || data.professional_email, confidence: data.confidence || (data.email ? 90 : 0), ...data };
}

/**
 * ZeroBounce Email Verification
 * @param {string} apiKey - ZeroBounce API key
 * @param {string} email - Email to verify
 * @returns {Promise<Object>} - { verified, result }
 */
export async function verifyEmailZeroBounce(apiKey, email) {
  if (!apiKey) throw new Error('ZeroBounce API key required');
  const response = await fetch(
    `https://api.zerobounce.net/v2/validate?api_key=${encodeURIComponent(apiKey)}&email=${encodeURIComponent(email)}`
  );
  if (!response.ok) throw new Error(`ZeroBounce verify failed: ${response.statusText}`);
  const data = await response.json();
  const valid = data.status === 'valid';
  return { result: valid ? 'valid' : 'invalid', verified: valid, ...data };
}

/**
 * ScrapingBee Website Scraping
 * @param {string} url - Website URL to scrape
 * @returns {Promise<string>} - HTML content
 */
export async function scrapeWebsite(url) {
  const apiKey = process.env.SCRAPINGBEE_API_KEY;
  if (!apiKey) throw new Error('SCRAPINGBEE_API_KEY not configured');

  const response = await fetch(
    `https://app.scrapingbee.com/api/v1?api_key=${apiKey}&url=${encodeURIComponent(url)}`
  );

  if (!response.ok) {
    throw new Error(`ScrapingBee failed: ${response.statusText}`);
  }

  return await response.text();
}

/**
 * Unipile LinkedIn Company Profile
 * @param {string} companySlug - LinkedIn company slug
 * @returns {Promise<Object>} - Company profile data
 */
export async function getLinkedInCompanyProfile(companySlug) {
  const apiKey = process.env.UNIPILE_ACCESS_TOKEN;
  const dsn = process.env.UNIPILE_DSN || 'api12.unipile.com:14291';
  
  if (!apiKey) throw new Error('UNIPILE_ACCESS_TOKEN not configured');

  // Extract account_id from DSN or use a default
  const accountId = process.env.UNIPILE_ACCOUNT_ID || 'default';

  const response = await fetch(
    `https://${dsn}/api/v1/linkedin/company/${companySlug}?account_id=${accountId}`,
    {
      headers: {
        'accept': 'application/json',
        'X-API-KEY': apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Unipile LinkedIn fetch failed: ${response.statusText}`);
  }

  return await response.json();
}

// ============================================================================
// 3. AI PERSONALIZATION
// ============================================================================

/**
 * OpenAI Personalization
 * @param {Object} params - Personalization parameters
 * @returns {Promise<string>} - Generated personalized message
 */
export async function generatePersonalization(params) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const { prompt, leadData } = params;

  // Replace placeholders in prompt
  let personalizedPrompt = prompt;
  Object.keys(leadData).forEach(key => {
    const placeholder = `{{${key}}}`;
    personalizedPrompt = personalizedPrompt.replace(new RegExp(placeholder, 'g'), leadData[key] || '');
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: personalizedPrompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// ============================================================================
// 4. OUTREACH
// ============================================================================

/**
 * HeyReach - Add leads to LinkedIn campaign.
 * Resolves credentials from DB (orgId) with env-var fallback.
 *
 * @param {Array} leads - Array of lead objects
 * @param {string|null} orgId - Organisation ID (used to look up DB credentials)
 * @returns {Promise<Object>} - Result
 */
export async function addLeadsToHeyReach(leads, orgId = null) {
  const { addLeadsToCampaign } = await import('./heyreach-service.js');
  const { getIntegrationCredentials, getApiKeyFromCredentials } = await import('../db.js');

  let apiKey = null;
  let campaignId = null;

  if (orgId) {
    const row = await getIntegrationCredentials(orgId, 'heyreach');
    apiKey = getApiKeyFromCredentials(row);
    campaignId = row?.credentials_json?.campaign_id || row?.credentials_json?.campaignId || null;
  }
  if (!apiKey) apiKey = process.env.HEYREACH_API_KEY;
  if (!campaignId) campaignId = process.env.HEYREACH_CAMPAIGN_ID;

  if (!apiKey) throw new Error('HEYREACH_API_KEY not configured');
  if (!campaignId) throw new Error('HEYREACH_CAMPAIGN_ID not configured');

  return addLeadsToCampaign(apiKey, campaignId, leads);
}

/**
 * Instantly.ai - Add leads to email campaign.
 * Resolves credentials from DB (orgId) with env-var fallback.
 *
 * @param {Array} leads - Array of lead objects
 * @param {string|null} orgId - Organisation ID (used to look up DB credentials)
 * @returns {Promise<Array>} - Per-lead results
 */
export async function addLeadsToInstantly(leads, orgId = null) {
  const { createLead } = await import('./instantly-service.js');
  const { getIntegrationCredentials, getApiKeyFromCredentials } = await import('../db.js');

  let apiKey = null;
  let campaignId = null;

  if (orgId) {
    const row = await getIntegrationCredentials(orgId, 'instantly');
    apiKey = getApiKeyFromCredentials(row);
    campaignId = row?.credentials_json?.campaign_id || row?.credentials_json?.campaignId || null;
  }
  if (!apiKey) apiKey = process.env.INSTANTLY_API_KEY;
  if (!campaignId) campaignId = process.env.INSTANTLY_CAMPAIGN_ID;

  if (!apiKey) throw new Error('INSTANTLY_API_KEY not configured');
  if (!campaignId) throw new Error('INSTANTLY_CAMPAIGN_ID not configured');

  const results = [];
  for (const lead of leads) {
    try {
      await createLead(apiKey, {
        email: lead.email,
        campaign: campaignId,
        first_name: lead.firstName,
        last_name: lead.lastName,
        company_name: lead.company,
        personalization: lead.personalizedMessage || '',
      });
      results.push({ email: lead.email, success: true, status: 200 });
    } catch (e) {
      results.push({ email: lead.email, success: false, status: e.status || 500 });
    }
  }
  return results;
}
