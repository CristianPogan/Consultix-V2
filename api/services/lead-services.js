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
  if (criteria.headcountMin != null) query.headcount = { '>=': criteria.headcountMin };
  if (Object.keys(query).length === 0) query.keyword = { include: ['B2B'] }; // IcyPeas needs at least one filter

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

  return await response.json();
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

/**
 * AI Ark Semantic Company Search
 * @param {string} apiKey - AI Ark API key (Bearer)
 * @param {Object} criteria - industry, keywords, company_size (array), regions, maxLeads
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

  const body = {
    filters: {
      industries: industries.length ? industries : ['B2B SaaS', 'Software as a Service', 'Internet Software'],
      keywords: kw.length ? kw : ['lead generation'],
      company_size: sizes,
    },
    pagination: { limit: Math.min(maxLeads || 100, 100), page: 1 },
  };
  if (regions?.length) body.filters.location = regions;

  const res = await fetch('https://api.ai-ark.com/v1/search/companies', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
  const companies = data.companies || data.data || data.results || (Array.isArray(data) ? data : []);
  return Array.isArray(companies) ? companies : [];
}

/**
 * AI Ark Lookalike / Similarity Search
 * @param {string} apiKey - AI Ark API key
 * @param {string} seedDomain - e.g. pogan-cristian.com
 * @param {Object} criteria - industries, regions, limit
 * @returns {Promise<Array>} - Similar companies
 */
export async function findCompaniesAiArkLookalike(apiKey, seedDomain, criteria = {}) {
  if (!apiKey) throw new Error('AI Ark API key required');
  if (!seedDomain?.trim()) throw new Error('Seed domain required for lookalike search');

  const domain = seedDomain.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
  const { industry, industries, regions, maxLeads = 50 } = criteria;
  const ind = industries || (industry ? [industry] : ['B2B SaaS', 'Software as a Service', 'Internet Software']);
  const loc = regions?.length ? regions : ['Global'];

  const body = {
    seed_domain: domain,
    similarity_threshold: 0.75,
    filters: { location: loc, industries: ind },
    limit: Math.min(maxLeads || 50, 100),
  };

  const res = await fetch('https://api.ai-ark.com/v1/search/similarity', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
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
  const companies = data.companies || data.data || data.results || (Array.isArray(data) ? data : []);
  return Array.isArray(companies) ? companies : [];
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
 * HeyReach - Add leads to LinkedIn campaign
 * @param {Array} leads - Array of lead objects
 * @returns {Promise<Object>} - Result
 */
export async function addLeadsToHeyReach(leads) {
  const apiKey = process.env.HEYREACH_API_KEY;
  const campaignId = process.env.HEYREACH_CAMPAIGN_ID;
  
  if (!apiKey) throw new Error('HEYREACH_API_KEY not configured');
  if (!campaignId) throw new Error('HEYREACH_CAMPAIGN_ID not configured');

  const accountLeadPairs = leads.map(lead => ({
    lead: {
      profileUrl: lead.linkedinUrl,
      firstName: lead.firstName,
      lastName: lead.lastName,
      emailAddress: lead.email,
      companyName: lead.company,
      position: lead.title,
    },
  }));

  const response = await fetch('https://api.heyreach.io/api/public/campaign/AddLeadsToCampaignV2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
    body: JSON.stringify({
      campaignId,
      accountLeadPairs,
    }),
  });

  if (!response.ok) {
    throw new Error(`HeyReach failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Instantly.ai - Add leads to email campaign
 * @param {Array} leads - Array of lead objects
 * @returns {Promise<Object>} - Result
 */
export async function addLeadsToInstantly(leads) {
  const apiKey = process.env.INSTANTLY_API_KEY;
  const campaignId = process.env.INSTANTLY_CAMPAIGN_ID;
  
  if (!apiKey) throw new Error('INSTANTLY_API_KEY not configured');
  if (!campaignId) throw new Error('INSTANTLY_CAMPAIGN_ID not configured');

  const results = [];

  for (const lead of leads) {
    const response = await fetch('https://api.instantly.ai/api/v2/leads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign: campaignId,
        email: lead.email,
        first_name: lead.firstName,
        last_name: lead.lastName,
        company_name: lead.company,
        personalization: lead.personalizedMessage || '',
      }),
    });

    results.push({
      email: lead.email,
      success: response.ok,
      status: response.status,
    });
  }

  return results;
}
