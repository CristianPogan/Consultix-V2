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

const ICYPEAS_BASE = 'https://app.icypeas.com/api';

// Complete IcyPeas industry taxonomy — exact case-sensitive values required by the API.
// Source: https://api-doc.icypeas.com/assets/files/industries-054af2e58c8a6e7bb3cbe357085f09c8.txt
const ICYPEAS_INDUSTRIES = [
  'Abrasives and Nonmetallic Minerals Manufacturing','Accessible Architecture and Design','Accessible Hardware Manufacturing',
  'Accommodation and Food Services','Accounting','Administration of Justice','Administrative and Support Services',
  'Advertising Services','Agricultural Chemical Manufacturing','Agriculture',
  'Agriculture, Construction, Mining Machinery Manufacturing','Air, Water, and Waste Program Management',
  'Airlines and Aviation','Alternative Dispute Resolution','Alternative Fuel Vehicle Manufacturing',
  'Alternative Medicine','Ambulance Services','Amusement Parks and Arcades','Animal Feed Manufacturing',
  'Animation','Animation and Post-production','Apparel & Fashion','Apparel Manufacturing',
  'Appliances, Electrical, and Electronics Manufacturing','Architectural and Structural Metal Manufacturing',
  'Architecture and Planning','Armed Forces','Artificial Rubber and Synthetic Fiber Manufacturing',
  'Artists and Writers','Arts & Crafts','Audio and Video Equipment Manufacturing',
  'Automation Machinery Manufacturing','Automotive','Aviation & Aerospace',
  'Aviation and Aerospace Component Manufacturing','Baked Goods Manufacturing','Banking',
  'Bars, Taverns, and Nightclubs','Bed-and-Breakfasts, Hostels, Homestays','Beverage Manufacturing',
  'Biomass Electric Power Generation','Biotechnology','Biotechnology Research','Blockchain Services','Blogs',
  'Boilers, Tanks, and Shipping Container Manufacturing','Book and Periodical Publishing','Book Publishing',
  'Breweries','Broadcast Media Production and Distribution','Building Construction',
  'Building Equipment Contractors','Building Finishing Contractors','Building Materials',
  'Building Structure and Exterior Contractors','Business Consulting and Services','Business Content',
  'Business Intelligence Platforms','Business Supplies & Equipment','Cable and Satellite Programming',
  'Capital Markets','Caterers','Chemical Manufacturing','Chemical Raw Materials Manufacturing',
  'Child Day Care Services','Chiropractors','Circuses and Magic Shows','Civic and Social Organizations',
  'Civil Engineering','Claims Adjusting, Actuarial Services','Clay and Refractory Products Manufacturing',
  'Climate Data and Analytics','Climate Technology Product Manufacturing','Coal Mining',
  'Collection Agencies','Commercial and Industrial Equipment Rental',
  'Commercial and Industrial Machinery Maintenance','Commercial and Service Industry Machinery Manufacturing',
  'Commercial Real Estate','Communications Equipment Manufacturing',
  'Community Development and Urban Planning','Community Services','Computer and Network Security',
  'Computer Games','Computer Hardware','Computer Hardware Manufacturing','Computer Networking',
  'Computer Networking Products','Computers and Electronics Manufacturing','Conservation Programs',
  'Construction','Construction Hardware Manufacturing','Consumer Electronics','Consumer Goods',
  'Consumer Goods Rental','Consumer Services','Correctional Institutions','Cosmetics',
  'Cosmetology and Barber Schools','Courts of Law','Credit Intermediation',
  'Cutlery and Handtool Manufacturing','Dairy','Dairy Product Manufacturing','Dance Companies',
  'Data Infrastructure and Analytics','Data Security Software Products','Defense & Space',
  'Defense and Space Manufacturing','Dentists','Design','Design Services',
  'Desktop Computing Software Products','Digital Accessibility Services','Distilleries','E-learning',
  'E-Learning Providers','Economic Programs','Education','Education Administration Programs',
  'Education Management','Electric Lighting Equipment Manufacturing','Electric Power Generation',
  'Electric Power Transmission, Control, and Distribution','Electrical Equipment Manufacturing',
  'Electronic and Precision Equipment Maintenance','Embedded Software Products',
  'Emergency and Relief Services','Engineering Services',
  'Engines and Power Transmission Equipment Manufacturing','Entertainment','Entertainment Providers',
  'Environmental Quality Programs','Environmental Services','Equipment Rental Services',
  'Events Services','Executive Offices','Executive Search Services','Fabricated Metal Products',
  'Facilities Services','Family Planning Centers','Farming','Farming, Ranching, Forestry',
  'Fashion Accessories Manufacturing','Financial Services','Fine Art','Fine Arts Schools',
  'Fire Protection','Fisheries','Flight Training','Food & Beverages',
  'Food and Beverage Manufacturing','Food and Beverage Retail','Food and Beverage Services',
  'Food Production','Footwear and Leather Goods Repair','Footwear Manufacturing',
  'Forestry and Logging','Fossil Fuel Electric Power Generation','Freight and Package Transportation',
  'Fruit and Vegetable Preserves Manufacturing','Fuel Cell Manufacturing','Fundraising',
  'Funds and Trusts','Furniture','Furniture and Home Furnishings Manufacturing',
  'Gambling Facilities and Casinos','Geothermal Electric Power Generation',
  'Glass Product Manufacturing','Glass, Ceramics and Concrete Manufacturing',
  'Golf Courses and Country Clubs','Government Administration','Government Relations',
  'Government Relations Services','Graphic Design','Ground Passenger Transportation',
  'Health and Human Services','Health, Wellness & Fitness','Higher Education',
  'Highway, Street, and Bridge Construction','Historical Sites','Holding Companies',
  'Home Health Care Services','Horticulture','Hospitality','Hospitals','Hospitals and Health Care',
  'Hotels and Motels','Household and Institutional Furniture Manufacturing',
  'Household Appliance Manufacturing','Household Services','Housing and Community Development',
  'Housing Programs','Human Resources','Human Resources Services',
  'HVAC and Refrigeration Equipment Manufacturing','Hydroelectric Power Generation','Import & Export',
  'Individual and Family Services','Industrial Automation','Industrial Machinery Manufacturing',
  'Industry Associations','Information Services','Information Technology & Services','Insurance',
  'Insurance Agencies and Brokerages','Insurance and Employee Benefit Funds','Insurance Carriers',
  'Interior Design','International Affairs','International Trade and Development',
  'Internet Marketplace Platforms','Internet News','Internet Publishing',
  'Interurban and Rural Bus Services','Investment Advice','Investment Banking',
  'Investment Management','IT Services and IT Consulting','IT System Custom Software Development',
  'IT System Data Services','IT System Design Services','IT System Installation and Disposal',
  'IT System Operations and Maintenance','IT System Testing and Evaluation',
  'IT System Training and Support','Janitorial Services','Landscaping Services','Language Schools',
  'Laundry and Drycleaning Services','Law Enforcement','Law Practice',
  'Leasing Non-residential Real Estate','Leasing Residential Real Estate',
  'Leather Product Manufacturing','Legal Services','Legislative Offices','Leisure, Travel & Tourism',
  'Libraries','Lime and Gypsum Products Manufacturing','Loan Brokers','Luxury Goods & Jewelry',
  'Machinery Manufacturing','Magnetic and Optical Media Manufacturing','Manufacturing','Maritime',
  'Maritime Transportation','Market Research','Marketing Services','Mattress and Blinds Manufacturing',
  'Measuring and Control Instrument Manufacturing','Meat Products Manufacturing',
  'Mechanical Or Industrial Engineering','Media and Telecommunications','Media Production',
  'Medical and Diagnostic Laboratories','Medical Device','Medical Equipment Manufacturing',
  'Medical Practices','Mental Health Care','Metal Ore Mining','Metal Treatments',
  'Metal Valve, Ball, and Roller Manufacturing','Metalworking Machinery Manufacturing',
  'Military and International Affairs','Mining','Mobile Computing Software Products',
  'Mobile Food Services','Mobile Gaming Apps','Motor Vehicle Manufacturing',
  'Motor Vehicle Parts Manufacturing','Movies and Sound Recording','Movies, Videos, and Sound',
  'Museums','Museums, Historical Sites, and Zoos','Music','Musicians','Nanotechnology Research',
  'Natural Gas Distribution','Natural Gas Extraction','Newspaper Publishing',
  'Non-profit Organization Management','Non-profit Organizations','Nonmetallic Mineral Mining',
  'Nonresidential Building Construction','Nuclear Electric Power Generation',
  'Nursing Homes and Residential Care Facilities','Office Administration',
  'Office Furniture and Fixtures Manufacturing','Oil and Coal Product Manufacturing','Oil and Gas',
  'Oil Extraction','Oil, Gas, and Mining','Online and Mail Order Retail',
  'Online Audio and Video Media','Online Media','Operations Consulting','Optometrists',
  'Outpatient Care Centers','Outsourcing and Offshoring Consulting','Outsourcing/Offshoring',
  'Packaging & Containers','Packaging and Containers Manufacturing',
  'Paint, Coating, and Adhesive Manufacturing','Paper & Forest Products',
  'Paper and Forest Product Manufacturing','Pension Funds','Performing Arts',
  'Performing Arts and Spectator Sports','Periodical Publishing','Personal and Laundry Services',
  'Personal Care Product Manufacturing','Personal Care Services','Pet Services',
  'Pharmaceutical Manufacturing','Philanthropic Fundraising Services','Philanthropy','Photography',
  'Physical, Occupational and Speech Therapists','Physicians','Pipeline Transportation',
  'Plastics and Rubber Product Manufacturing','Plastics Manufacturing','Political Organizations',
  'Postal Services','Primary and Secondary Education','Primary Metal Manufacturing',
  'Printing Services','Professional Organizations','Professional Services',
  'Professional Training and Coaching','Program Development','Public Assistance Programs',
  'Public Health','Public Policy','Public Policy Offices',
  'Public Relations and Communications Services','Public Safety','Racetracks',
  'Radio and Television Broadcasting','Rail Transportation','Railroad Equipment Manufacturing',
  'Ranching','Ranching and Fisheries','Real Estate','Real Estate Agents and Brokers',
  'Real Estate and Equipment Rental Services','Recreational Facilities','Regenerative Design',
  'Religious Institutions','Renewable Energy Equipment Manufacturing',
  'Renewable Energy Power Generation','Renewable Energy Semiconductor Manufacturing',
  'Renewables & Environment','Repair and Maintenance','Research','Research Services',
  'Residential Building Construction','Restaurants','Retail','Retail Apparel and Fashion',
  'Retail Appliances, Electrical, and Electronic Equipment','Retail Art Dealers',
  'Retail Art Supplies','Retail Books and Printed News',
  'Retail Building Materials and Garden Equipment','Retail Florists',
  'Retail Furniture and Home Furnishings','Retail Gasoline','Retail Groceries',
  'Retail Health and Personal Care Products','Retail Luxury Goods and Jewelry',
  'Retail Motor Vehicles','Retail Musical Instruments','Retail Office Equipment',
  'Retail Office Supplies and Gifts','Retail Pharmacies',
  'Retail Recyclable Materials & Used Merchandise','Reupholstery and Furniture Repair',
  'Robot Manufacturing','Robotics Engineering','Rubber Products Manufacturing',
  'Satellite Telecommunications','Savings Institutions','School and Employee Bus Services',
  'Seafood Product Manufacturing','Secretarial Schools','Securities and Commodity Exchanges',
  'Security and Investigations','Security Guards and Patrol Services','Security Systems Services',
  'Semiconductor Manufacturing','Semiconductors','Services for Renewable Energy',
  'Services for the Elderly and Disabled','Sheet Music Publishing','Shipbuilding',
  'Shuttles and Special Needs Transportation Services','Sightseeing Transportation',
  'Skiing Facilities','Smart Meter Manufacturing','Soap and Cleaning Product Manufacturing',
  'Social Networking Platforms','Software Development','Solar Electric Power Generation',
  'Sound Recording','Space Research and Technology','Specialty Trade Contractors',
  'Spectator Sports','Sporting Goods','Sporting Goods Manufacturing',
  'Sports and Recreation Instruction','Sports Teams and Clubs',
  'Spring and Wire Product Manufacturing','Staffing and Recruiting',
  'Steam and Air-Conditioning Supply','Strategic Management Services','Subdivision of Land',
  'Sugar and Confectionery Product Manufacturing','Surveying and Mapping Services',
  'Taxi and Limousine Services','Technical and Vocational Training',
  'Technology, Information and Internet','Technology, Information and Media','Telecommunications',
  'Telecommunications Carriers','Telephone Call Centers','Temporary Help Services',
  'Textile Manufacturing','Theater Companies','Think Tanks','Tobacco','Tobacco Manufacturing',
  'Translation and Localization','Transportation Equipment Manufacturing',
  'Transportation Programs','Transportation, Logistics, Supply Chain and Storage',
  'Transportation/Trucking/Railroad','Travel Arrangements','Truck Transportation',
  'Trusts and Estates','Turned Products and Fastener Manufacturing','Urban Transit Services',
  'Utilities','Utilities Administration','Utility System Construction',
  'Vehicle Repair and Maintenance','Venture Capital and Private Equity Principals','Veterinary',
  'Veterinary Services','Vocational Rehabilitation Services','Warehousing',
  'Warehousing and Storage','Waste Collection','Waste Treatment and Disposal',
  'Water Supply and Irrigation Systems','Water, Waste, Steam, and Air Conditioning Services',
  'Wellness and Fitness Services','Wholesale','Wholesale Alcoholic Beverages',
  'Wholesale Apparel and Sewing Supplies','Wholesale Appliances, Electrical, and Electronics',
  'Wholesale Building Materials','Wholesale Chemical and Allied Products',
  'Wholesale Computer Equipment','Wholesale Drugs and Sundries','Wholesale Food and Beverage',
  'Wholesale Footwear','Wholesale Furniture and Home Furnishings',
  'Wholesale Hardware, Plumbing, Heating Equipment','Wholesale Import and Export',
  'Wholesale Luxury Goods and Jewelry','Wholesale Machinery','Wholesale Metals and Minerals',
  'Wholesale Motor Vehicles and Parts','Wholesale Paper Products',
  'Wholesale Petroleum and Petroleum Products','Wholesale Photography Equipment and Supplies',
  'Wholesale Raw Farm Products','Wholesale Recyclable Materials','Wind Electric Power Generation',
  'Wine & Spirits','Wineries','Wireless Services','Women\'s Handbag Manufacturing',
  'Wood Product Manufacturing','Writing and Editing','Zoos and Botanical Gardens',
];

// Lowercase → canonical map for automatic case-correction
const _ICYPEAS_INDUSTRY_LOWER_MAP = new Map(ICYPEAS_INDUSTRIES.map(v => [v.toLowerCase(), v]));

// Common informal / alternative names → canonical IcyPeas taxonomy value
// null means "not a valid industry" — caller should omit the industry filter
const ICYPEAS_INDUSTRY_ALIASES = {
  'software': 'Software Development',
  'saas': 'Software Development',
  'b2b software': 'Software Development',
  'tech': 'Technology, Information and Internet',
  'technology': 'Technology, Information and Internet',
  'it': 'IT Services and IT Consulting',
  'information technology': 'IT Services and IT Consulting',
  'fintech': 'Financial Services',
  'financial technology': 'Financial Services',
  'ai': 'Technology, Information and Internet',
  'artificial intelligence': 'Technology, Information and Internet',
  'machine learning': 'Technology, Information and Internet',
  'cybersecurity': 'Computer and Network Security',
  'cyber security': 'Computer and Network Security',
  'cloud': 'IT Services and IT Consulting',
  'cloud computing': 'IT Services and IT Consulting',
  'ecommerce': 'Internet Marketplace Platforms',
  'e commerce': 'Internet Marketplace Platforms',
  'digital marketing': 'Advertising Services',
  'healthcare': 'Hospitals and Health Care',
  'health care': 'Hospitals and Health Care',
  'biotech': 'Biotechnology',
  'digital health': 'Hospitals and Health Care',
  'consulting': 'Business Consulting and Services',
  'marketing': 'Marketing Services',
  'telecom': 'Telecommunications',
  'logistics': 'Transportation, Logistics, Supply Chain and Storage',
  'supply chain': 'Transportation, Logistics, Supply Chain and Storage',
  'legal': 'Legal Services',
  'law': 'Legal Services',
  'hr': 'Human Resources Services',
  'human resources': 'Human Resources Services',
  'analytics': 'Data Infrastructure and Analytics',
  'data analytics': 'Data Infrastructure and Analytics',
  'data science': 'Data Infrastructure and Analytics',
  'blockchain': 'Blockchain Services',
  'crypto': 'Blockchain Services',
  'cryptocurrency': 'Blockchain Services',
  'robotics': 'Robotics Engineering',
  'design': 'Design Services',
  'nonprofit': 'Non-profit Organizations',
  'non profit': 'Non-profit Organizations',
  'ngo': 'Non-profit Organizations',
  'gaming': 'Computer Games',
  'video games': 'Computer Games',
  'travel': 'Travel Arrangements',
  'pharma': 'Pharmaceutical Manufacturing',
  'pharmaceutical': 'Pharmaceutical Manufacturing',
  'medical': 'Hospitals and Health Care',
  'staffing': 'Staffing and Recruiting',
  'recruitment': 'Staffing and Recruiting',
  'recruiting': 'Staffing and Recruiting',
  'real estate': 'Real Estate',
  'realestate': 'Real Estate',
  'proptech': 'Real Estate',
  'construction': 'Construction',
  'energy': 'Renewable Energy Power Generation',
  'renewable energy': 'Renewable Energy Power Generation',
  'cleantech': 'Climate Technology Product Manufacturing',
  'clean tech': 'Climate Technology Product Manufacturing',
  'oil and gas': 'Oil, Gas, and Mining',
  'oil & gas': 'Oil, Gas, and Mining',
  'food': 'Food and Beverage Manufacturing',
  'food and beverage': 'Food and Beverage Manufacturing',
  'retail': 'Retail',
  'entertainment': 'Entertainment',
  'media': 'Technology, Information and Media',
  'advertising': 'Advertising Services',
  'pr': 'Public Relations and Communications Services',
  'public relations': 'Public Relations and Communications Services',
  'insurance': 'Insurance',
  'banking': 'Banking',
  'finance': 'Financial Services',
  'investment': 'Investment Management',
  'venture capital': 'Venture Capital and Private Equity Principals',
  'vc': 'Venture Capital and Private Equity Principals',
  'private equity': 'Venture Capital and Private Equity Principals',
  'pe': 'Venture Capital and Private Equity Principals',
  'education': 'Education',
  'edtech': 'E-Learning Providers',
  'e-learning': 'E-Learning Providers',
  'hospitality': 'Hospitality',
  'hotels': 'Hotels and Motels',
  'automotive': 'Automotive',
  'aerospace': 'Aviation & Aerospace',
  'defense': 'Defense & Space',
  'semiconductor': 'Semiconductor Manufacturing',
  'semiconductors': 'Semiconductors',
  'networking': 'Computer Networking',
  'security': 'Security and Investigations',
  'agriculture': 'Agriculture',
  'farming': 'Farming',
  'b2b': null,  // not a valid industry — use keyword instead
};

/**
 * Normalize an industry string to its exact IcyPeas taxonomy value.
 * 1. Exact match (returns as-is if already canonical)
 * 2. Case-insensitive match against full taxonomy
 * 3. Alias map for common informal names
 * Returns null if no match found (caller should omit the industry filter).
 */
export function normalizeIndustryForIcyPeas(input) {
  if (!input || typeof input !== 'string') return null;
  const trimmed = input.trim();
  // Case-insensitive exact taxonomy lookup
  const canonical = _ICYPEAS_INDUSTRY_LOWER_MAP.get(trimmed.toLowerCase());
  if (canonical) return canonical;
  // Alias map
  const lower = trimmed.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ICYPEAS_INDUSTRY_ALIASES, lower)) {
    return ICYPEAS_INDUSTRY_ALIASES[lower]; // may be null
  }
  return null;
}

/**
 * IcyPeas Find Companies — 3-step flow for discovery cascade
 * Step 1: POST /api/find-companies to initiate search
 * Step 2: If async (job ID returned), wait for completion
 * Step 3: If async, read results via /api/bulk-single-searchs/read; else use leads from Step 1
 */
export async function findCompaniesIcyPeas(criteria) {
  const apiKey = criteria?.apiKey || process.env.ICYPEAS_API_KEY;
  if (!apiKey) throw new Error('ICYPEAS_API_KEY not configured');

  const { industry, keywords, locations, headcountMin, headcountMax, limit = 100, paginationToken } = criteria;

  const query = {};
  const rawIndustries = Array.isArray(industry) ? industry : (industry ? [industry] : []);
  const normalizedIndustries = rawIndustries.map(normalizeIndustryForIcyPeas).filter(Boolean);
  if (normalizedIndustries.length) query.industry = { include: normalizedIndustries };
  if (locations?.length) query.location = { include: locations };
  if (keywords?.length) query.keyword = { include: Array.isArray(keywords) ? keywords : [keywords] };
  const hc = {};
  if (headcountMin != null) hc['>='] = headcountMin;
  if (headcountMax != null) hc['<='] = headcountMax;
  if (Object.keys(hc).length) query.headcount = hc;
  if (Object.keys(query).length === 0) query.keyword = { include: ['B2B'] };

  const pagination = { size: Math.min(limit || 100, 200) };
  if (paginationToken) pagination.token = paginationToken;

  const body = { query, pagination };

  const response = await fetch(`${ICYPEAS_BASE}/find-companies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify(body),
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

  // Sync path: leads returned directly
  const syncLeads = Array.isArray(data.leads) ? data.leads : [];
  if (syncLeads.length > 0) return data;

  // Async path: job ID returned (_id for single, file for bulk)
  const jobId = data._id || data.file;
  if (jobId) {
    const waitMs = criteria?.asyncWaitMs ?? 10000;
    await new Promise(r => setTimeout(r, waitMs));
    const readResult = await readIcyPeasResultsById(apiKey, jobId);
    return readResult;
  }

  // Possible eventual consistency: total > 0 but leads empty — wait and retry once
  if (data.total > 0 && syncLeads.length === 0) {
    const retryWaitMs = criteria?.retryWaitMs ?? 5000;
    await new Promise(r => setTimeout(r, retryWaitMs));
    const retryResponse = await fetch(`${ICYPEAS_BASE}/find-companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': apiKey },
      body: JSON.stringify(body),
    });
    if (retryResponse.ok) {
      const retryData = await retryResponse.json();
      if (retryData.success !== false && Array.isArray(retryData.leads) && retryData.leads.length > 0) {
        return retryData;
      }
    }
  }

  return data;
}

/**
 * Read IcyPeas results by job ID (for async find-companies / single search)
 * POST /api/bulk-single-searchs/read with id or file
 */
async function readIcyPeasResultsById(apiKey, id) {
  const response = await fetch(`${ICYPEAS_BASE}/bulk-single-searchs/read`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiKey,
    },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`IcyPeas read results failed: ${response.status} ${errText}`);
  }
  const data = await response.json();
  let items = Array.isArray(data.items) ? data.items : Array.isArray(data.data) ? data.data : [];
  if (items.length === 0 && data.item) items = [data.item];
  if (items.length === 0 && data.leads) items = data.leads;
  const leads = items.map((it) => ({
    _id: it._id,
    name: it.companyName || it.name || it.currentCompanyName,
    website: it.website || it.domain || it.currentCompanyWebsite,
    industry: it.industry,
    numberOfEmployees: it.numberOfEmployees || it.headcount,
    address: it.address || it.location,
  })).filter(l => l.name || l.website);
  return { success: true, total: leads.length, leads };
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
  // API response: { success: true, item: { _id: "...", status: "NONE" } }
  const searchId = searchData.item?._id || searchData._id;
  if (!searchId) throw new Error('IcyPeas email search: no job ID in response');

  // Poll for result — first poll at 2s, then every 3s, up to 60 polls (~3 min max)
  const ICYPEAS_MAX_POLLS = 60;

  for (let i = 0; i < ICYPEAS_MAX_POLLS; i++) {
    await new Promise(resolve => setTimeout(resolve, i === 0 ? 2000 : 3000));

    const resultResponse = await fetch('https://app.icypeas.com/api/bulk-single-searchs/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': key,
      },
      body: JSON.stringify({ id: searchId }),
    });

    const resultData = await resultResponse.json();
    // Poll response: { success, items: [{ _id, status: "DEBITED"|"IN_PROGRESS"|"NONE", results: { emails: [...] } }], total }
    const item = resultData.items?.[0];
    const status = item?.status || resultData.status;

    if (status === 'DEBITED') {
      // Job completed and credit was charged — results are available
      const emails = item?.results?.emails || [];
      const best = emails.find(e => e.email) || emails[0];
      const email = best?.email || null;
      if (!email) return { email: null, confidence: 0, found: false };
      const certaintyMap = { ultra_sure: 95, probable: 75, risky: 45 };
      const confidence = certaintyMap[best?.certainty] ?? 60;
      return {
        email,
        confidence,
        found: true,
        certainty: best?.certainty,
      };
    }

    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error('IcyPeas email search job failed');
    }
    // status === 'NONE' or 'IN_PROGRESS' → keep polling
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

const BETTERCONTACT_BASE = 'https://app.bettercontact.rocks/api/v2';
const BC_MAX_POLLS = 80;   // 80 × 5 s = 400 s max (~6.7 min, matches observed processing time)
const BC_POLL_MS   = 5000;

/**
 * BetterContact Email Find (by name + company domain)
 * Uses the async /v2/async endpoint with X-API-Key auth.
 * Submits a job, polls until terminated, returns the found email + status.
 * @param {string} apiKey - BetterContact API key
 * @param {Object} params - { firstName, lastName, company, domain }
 * @returns {Promise<Object>} - { email, confidence, status, creditsLeft }
 */
export async function findEmailBetterContact(apiKey, { firstName, lastName, company, domain }) {
  if (!apiKey) throw new Error('BetterContact API key required');

  // Step 1 — submit enrichment job
  const submitRes = await fetch(`${BETTERCONTACT_BASE}/async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: JSON.stringify({
      data: [{
        first_name: firstName,
        last_name: lastName,
        company: company || '',
        company_domain: domain || '',
      }],
      enrich_email_address: true,
      enrich_phone_number: false,
    }),
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text().catch(() => '');
    throw new Error(`BetterContact submit failed: ${submitRes.status} ${errText}`);
  }

  const submitData = await submitRes.json();
  const jobId = submitData.id;
  if (!jobId) throw new Error('BetterContact: no job ID in response');

  // Step 2 — poll GET /async/{id} until terminated
  for (let i = 0; i < BC_MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, BC_POLL_MS));

    const pollRes = await fetch(`${BETTERCONTACT_BASE}/async/${jobId}`, {
      headers: { 'X-API-Key': apiKey },
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text().catch(() => '');
      throw new Error(`BetterContact poll failed: ${pollRes.status} ${errText}`);
    }

    const result = await pollRes.json();

    if (result.status === 'terminated') {
      const contact = result.data?.[0];
      const email  = contact?.contact_email_address || null;
      const emailStatus = contact?.contact_email_address_status || null;
      if (!email) return { email: null, confidence: 0, found: false };
      const deliverable = ['deliverable', 'catch_all_safe'].includes(emailStatus);
      return {
        email,
        confidence:     deliverable ? 90 : 50,
        found:          contact?.enriched === true,
        status:         emailStatus,
        creditsConsumed: result.credits_consumed,
        creditsLeft:    result.credits_left,
      };
    }
    // status === 'in progress' → keep polling
  }

  throw new Error('BetterContact enrichment timed out');
}

/**
 * BetterContact Email Verification
 * BetterContact does not expose a standalone verify endpoint — verification
 * is embedded in find-email results via contact_email_address_status.
 * This function intentionally throws so the waterfall skips to the next verifier.
 */
export async function verifyEmailBetterContact(apiKey, email) {
  throw new Error('BetterContact does not support standalone email verification — skipping to next verifier');
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
