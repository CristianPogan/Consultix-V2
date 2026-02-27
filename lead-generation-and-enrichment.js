/**
 * Lead Generation and Enrichment Functions
 *
 * Extracted from: src/pipeline-code.jsx, api/routes/*, pipeline-demo.jsx
 * Dependencies: requires query/getOrgId from api/db.js for API handlers
 */

// --- Mock Data (used by pipeline demo / discovery flow) ---
export const MOCK_COMPANIES = [
  { id: 1, name: "Meridian Health Systems", domain: "meridianhs.com", industry: "Healthcare SaaS", employees: 120, location: "Austin, TX", icpScore: 97, revenue: "$15M", techStack: ["Salesforce", "HubSpot", "Slack"], recentNews: "Just raised Series B ($28M) to expand into telehealth market" },
  { id: 2, name: "NovaCraft Studios", domain: "novacraft.io", industry: "Creative Software", employees: 45, location: "Berlin, DE", icpScore: 94, revenue: "$4.2M", techStack: ["Figma", "Linear", "Notion"], recentNews: "Launched AI-powered design tool, growing 22% MoM" },
  { id: 3, name: "TerraVolt Energy", domain: "terravolt.co", industry: "CleanTech", employees: 230, location: "Denver, CO", icpScore: 96, revenue: "$32M", techStack: ["AWS", "Snowflake", "dbt"], recentNews: "Won $50M government contract for grid modernization" },
  { id: 4, name: "PulseMetrics", domain: "pulsemetrics.ai", industry: "Analytics Platform", employees: 67, location: "Toronto, CA", icpScore: 92, revenue: "$8.1M", techStack: ["GCP", "Looker", "Segment"], recentNews: "CEO spoke at SaaStr about product-led growth strategy" },
  { id: 5, name: "Hatchway Financial", domain: "hatchway.finance", industry: "FinTech", employees: 89, location: "London, UK", icpScore: 95, revenue: "$12M", techStack: ["Stripe", "Plaid", "Datadog"], recentNews: "Expanding into UAE market, hiring 30+ roles" },
  { id: 6, name: "BrightPath Learning", domain: "brightpath.edu", industry: "EdTech", employees: 150, location: "Singapore", icpScore: 91, revenue: "$18M", techStack: ["React", "Firebase", "Amplitude"], recentNews: "Partnered with 200+ universities across APAC" },
  { id: 7, name: "CastleRock Security", domain: "castlerocksec.com", industry: "Cybersecurity", employees: 340, location: "Tel Aviv, IL", icpScore: 98, revenue: "$55M", techStack: ["Azure", "Splunk", "PagerDuty"], recentNews: "Acquired competitor for $12M, doubling customer base" },
  { id: 8, name: "FreshRoute Logistics", domain: "freshroute.co", industry: "Supply Chain", employees: 78, location: "Amsterdam, NL", icpScore: 93, revenue: "$9.5M", techStack: ["SAP", "Tableau", "Jira"], recentNews: "Launched cold-chain tracking product for pharma" },
];

export const MOCK_CONTACTS = {
  1: [
    { id: 101, name: "Sarah Chen", title: "VP of Growth", email: "sarah.chen@meridianhs.com", linkedin: "linkedin.com/in/sarahchen", verified: true, bounceRisk: "low", linkedinData: { posts: 12, connections: 2400, about: "Growth leader obsessed with PLG.", recentActivity: "Posted about hiring a demand gen manager" } },
    { id: 102, name: "James Whitfield", title: "CTO", email: "j.whitfield@meridianhs.com", linkedin: "linkedin.com/in/jwhitfield", verified: true, bounceRisk: "low", linkedinData: { posts: 5, connections: 1800, about: "Engineering leader.", recentActivity: "Shared article about HIPAA-compliant cloud architectures" } },
  ],
  2: [{ id: 201, name: "Lena Bauer", title: "Head of Product", email: "lena@novacraft.io", linkedin: "linkedin.com/in/lenabauer", verified: true, bounceRisk: "low", linkedinData: { posts: 28, connections: 3100, about: "Product thinker.", recentActivity: "Wrote a thread about AI replacing junior designers" } }],
  3: [
    { id: 301, name: "Marcus Rodriguez", title: "CEO", email: "marcus@terravolt.co", linkedin: "linkedin.com/in/marcusrodriguez", verified: true, bounceRisk: "low", linkedinData: { posts: 45, connections: 8200, about: "Building the energy grid of the future.", recentActivity: "Keynote at CleanTech Summit about grid resilience" } },
    { id: 302, name: "Priya Kapoor", title: "VP Operations", email: "priya.k@terravolt.co", linkedin: "linkedin.com/in/priyakapoor", verified: true, bounceRisk: "medium", linkedinData: { posts: 8, connections: 1500, about: "Operations leader.", recentActivity: "Commented on a post about remote-first operations" } },
  ],
  4: [{ id: 401, name: "David Kim", title: "Founder & CEO", email: "david@pulsemetrics.ai", linkedin: "linkedin.com/in/davidkim", verified: true, bounceRisk: "low", linkedinData: { posts: 60, connections: 12000, about: "Data nerd turned founder.", recentActivity: "SaaStr talk: 'Why most dashboards are useless'" } }],
  5: [{ id: 501, name: "Aisha Mohammed", title: "COO", email: "aisha@hatchway.finance", linkedin: "linkedin.com/in/aishamohammed", verified: true, bounceRisk: "low", linkedinData: { posts: 15, connections: 4200, about: "Scaling fintech in emerging markets.", recentActivity: "Posted about regulatory challenges expanding into MENA" } }],
  6: [{ id: 601, name: "Wei Zhang", title: "CRO", email: "wei.zhang@brightpath.edu", linkedin: "linkedin.com/in/weizhang", verified: true, bounceRisk: "low", linkedinData: { posts: 22, connections: 5600, about: "Revenue leader in EdTech.", recentActivity: "Celebrating 200th university partnership" } }],
  7: [
    { id: 701, name: "Yael Stern", title: "VP Sales", email: "yael@castlerocksec.com", linkedin: "linkedin.com/in/yaelstern", verified: true, bounceRisk: "low", linkedinData: { posts: 18, connections: 3800, about: "Enterprise sales leader.", recentActivity: "Hiring 5 AEs for US expansion" } },
    { id: 702, name: "Omer Levy", title: "Head of Partnerships", email: "omer.l@castlerocksec.com", linkedin: "linkedin.com/in/omerlevy", verified: true, bounceRisk: "low", linkedinData: { posts: 9, connections: 2100, about: "Channel & partnerships.", recentActivity: "Announced integration with CrowdStrike" } },
  ],
  8: [{ id: 801, name: "Sophie van Dijk", title: "Head of Growth", email: "sophie@freshroute.co", linkedin: "linkedin.com/in/sophievandijk", verified: true, bounceRisk: "low", linkedinData: { posts: 31, connections: 4500, about: "Growth marketer.", recentActivity: "Published case study on reducing pharma delivery times by 40%" } }],
};

export const PERSONALIZED_EMAILS = {
  101: { subject: "Scaling Meridian's growth engine post-Series B", body: `Hi Sarah,\n\nCongrats on the Series B — $28M...\n\nBest,\n[Your name]` },
  201: { subject: "AI + design systems — from someone who agrees with your take", body: `Hi Lena,\n\nYour thread about AI replacing junior designers...\n\nCheers,\n[Your name]` },
  301: { subject: "Grid modernization at scale — a resource for TerraVolt", body: `Marcus,\n\nYour CleanTech Summit keynote...\n\nBest,\n[Your name]` },
  401: { subject: "Fellow data nerd — re: your SaaStr talk", body: `David,\n\nYour SaaStr talk on "why most dashboards are useless"...\n\n[Your name]` },
  501: { subject: "Expanding into MENA — lessons from the trenches", body: `Hi Aisha,\n\nYour post about regulatory challenges...\n\nBest,\n[Your name]` },
  601: { subject: "From 200 to 2,000 university partners", body: `Wei,\n\nCongrats on the 200th university partnership...\n\nCheers,\n[Your name]` },
  701: { subject: "5 AEs for US expansion — let's make their ramp faster", body: `Yael,\n\nSaw you're hiring 5 AEs for the US push...\n\nBest,\n[Your name]` },
  801: { subject: "That pharma case study — 40% faster delivery is wild", body: `Sophie,\n\nJust read your case study...\n\nCheers,\n[Your name]` },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// =============================================================================
// 1. LEAD DISCOVERY (company discovery based on ICP)
// =============================================================================

/**
 * runDiscovery — discover companies matching ICP criteria
 * Uses AI Ark API (simulated), lookalike matching. Returns discovered companies.
 * @param {Object} icpForm - { industry, employeeSizes/employeeRange, keywords, roles, regions, lookalike }
 * @param {Set} selectedLeads - company IDs to consider (optional; defaults to all from mock)
 * @returns {{ discoveredLeads: Array, logs: Array }}
 */
export async function runDiscovery(icpForm, selectedLeads = new Set()) {
  const logs = [];
  const addLog = (msg, type = "info") => logs.push({ msg, type, ts: Date.now() });

  addLog("→ Connecting to AI Ark API...", "system");
  await sleep(800);
  addLog("✓ Authenticated", "success");
  const empRange = icpForm.employeeSizes ? (Array.isArray(icpForm.employeeSizes) ? icpForm.employeeSizes.join(", ") : icpForm.employeeSizes) : icpForm.employeeRange || "51-200";
  addLog(`→ ICP: ${icpForm.industry}, ${empRange} employees`, "info");
  if (icpForm.keywords) addLog(`→ Keywords: ${icpForm.keywords}`, "info");
  addLog(`→ Target roles: ${(icpForm.roles || []).join(", ")}`, "info");
  addLog(`→ Regions: ${(icpForm.regions || []).join(", ")}`, "info");
  if (icpForm.lookalike) addLog(`→ Lookalike seed: ${icpForm.lookalike}`, "info");
  await sleep(600);
  addLog("→ Running lookalike matching algorithm...", "system");
  await sleep(1200);
  addLog(`✓ Scanned 14,208 companies against ICP`, "success");

  const companies = selectedLeads.size ? MOCK_COMPANIES.filter((c) => selectedLeads.has(c.id)) : MOCK_COMPANIES;
  for (const c of companies) {
    await sleep(200 + Math.random() * 300);
    addLog(`  + ${c.name} — ${c.industry} — ICP: ${c.icpScore}%`, "data");
  }
  addLog(`\n✓ Discovery complete: ${companies.length} companies matched (95%+ ICP score)`, "success");
  return { discoveredLeads: companies, logs };
}

// =============================================================================
// 2. LEAD ENRICHMENT (contact enrichment: email verification, LinkedIn data)
// =============================================================================

/**
 * runEnrichment — enrich selected companies with contacts (email, LinkedIn)
 * Simulates BetterContact waterfall, Icypeas, Wiza LinkedIn enrichment.
 * @param {Array} companies - companies to enrich
 * @param {Object} contactsMap - MOCK_CONTACTS or similar { companyId: [contacts] }
 * @returns {{ enrichedContacts: Array, logs: Array }}
 */
export async function runEnrichment(companies, contactsMap = MOCK_CONTACTS) {
  const logs = [];
  const addLog = (msg, type) => logs.push({ msg, type, ts: Date.now() });

  addLog("→ Connecting to BetterContact waterfall...", "system");
  await sleep(600);
  addLog("✓ 20+ data providers ready", "success");
  addLog("→ Connecting to Icypeas email finder...", "system");
  await sleep(500);
  addLog("✓ Catch-all verification enabled", "success");
  addLog("→ Connecting to Wiza LinkedIn enrichment...", "system");
  await sleep(500);
  addLog("✓ Real-time LinkedIn data active\n", "success");

  let allContacts = [];
  for (const company of companies) {
    addLog(`→ Enriching ${company.name}...`, "system");
    await sleep(400);
    const contacts = contactsMap[company.id] || [];
    for (const contact of contacts) {
      await sleep(300 + Math.random() * 400);
      addLog(`  ✓ ${contact.name} (${contact.title}) — ${contact.email} — verified ✓`, "data");
    }
    allContacts = allContacts.concat(contacts.map((c) => ({ ...c, company: company.name, companyId: company.id })));
  }
  addLog(`\n✓ Enrichment complete: ${allContacts.length} verified contacts across ${companies.length} companies`, "success");
  return { enrichedContacts: allContacts, logs };
}

/**
 * runImportEnrichment — enrich imported CSV leads (verify email, find phone, company data, ICP score, personalisation)
 * Simulates multi-step enrichment pipeline for imported file.
 * @param {number} rowCount - number of rows to process
 * @param {Object} options - { verifyEmail, findPhone, companyData, icpScore, personalisation }
 * @returns {{ logs: Array, progress: number }}
 */
export async function runImportEnrichment(rowCount, options = { verifyEmail: true, findPhone: true, companyData: true, icpScore: true, personalisation: true }) {
  const steps = ["verifyEmail", "findPhone", "companyData", "icpScore", "personalisation"].filter((k) => options[k]);
  const logs = [];
  for (let i = 0; i <= steps.length; i++) {
    await sleep(1200);
    logs.push({ progress: i, step: steps[i - 1], msg: i < steps.length ? `Completed ${steps[i]}` : "Enrichment complete" });
  }
  return { logs, progress: steps.length, rowCount };
}

// =============================================================================
// 3. PERSONALIZATION (AI-generated cold emails)
// =============================================================================

/**
 * skipPersonalization — create placeholder emails without AI
 * @param {Array} contacts
 * @returns {Object} { contactId: { subject, body } }
 */
export function skipPersonalization(contacts) {
  const emails = {};
  for (const contact of contacts) {
    emails[contact.id] = {
      subject: `Quick question for ${contact.company}`,
      body: `Hi ${contact.name.split(" ")[0]},\n\n[Personalized email body — to be written]\n\nBest,\n[Your name]`,
    };
  }
  return emails;
}

/**
 * generatePreview — generate preview emails for first 3 contacts
 * @param {Array} contacts
 * @param {Object} personalizedEmailsMap - PERSONALIZED_EMAILS or similar
 * @returns {Object} { contactId: { subject, body } }
 */
export async function generatePreview(contacts, personalizedEmailsMap = PERSONALIZED_EMAILS) {
  await sleep(1500 + Math.random() * 1000);
  const previews = {};
  const slice = contacts.slice(0, 3);
  for (const contact of slice) {
    previews[contact.id] = personalizedEmailsMap[contact.id] || {
      subject: `Quick question for ${contact.name}`,
      body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\nBest,\n[Your name]`,
    };
  }
  return previews;
}

/**
 * approveAndPersonalizeAll — generate personalized emails for all contacts (AI/claude)
 * @param {Array} contacts
 * @param {Object} personalizedEmailsMap - pre-built emails or AI output
 * @param {Object} savedPrompt - { label, text }
 * @returns {{ emails: Object, logs: Array }}
 */
export async function approveAndPersonalizeAll(contacts, personalizedEmailsMap = PERSONALIZED_EMAILS, savedPrompt = null) {
  const logs = [];
  const addLog = (msg, type) => logs.push({ msg, type, ts: Date.now() });
  addLog("→ Connecting to Claude API (claude-sonnet-4-5)...", "system");
  await sleep(600);
  addLog("✓ Model ready", "success");
  if (savedPrompt) addLog(`→ Using prompt: "${savedPrompt.label || "Custom"}"`, "info");

  const emails = {};
  for (const contact of contacts) {
    addLog(`→ Generating personalized email for ${contact.name} (${contact.company})...`, "system");
    await sleep(800 + Math.random() * 1200);
    const email = personalizedEmailsMap[contact.id];
    emails[contact.id] = email || {
      subject: `Quick question for ${contact.name}`,
      body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\n[Your name]`,
    };
  }
  addLog(`\n✓ Personalization complete: ${Object.keys(emails).length} unique emails generated`, "success");
  return { emails, logs };
}

// =============================================================================
// 4. OUTREACH / QUEUE (push to email & LinkedIn platforms)
// =============================================================================

/**
 * runQueueOutreach — queue enriched & personalized leads to outreach platforms
 * Simulates pushing to Instantly/SmartLead (email) and HeyReach/AimFox (LinkedIn).
 * @param {Array} contacts
 * @param {Object} personalizedEmails - { contactId: { subject, body } }
 * @param {Object} channelAssignments - { contactId: { email, linkedin, listOnly } }
 * @param {Object} options - { listName, emailPlatform, linkedinPlatform, emailCampaign, linkedinCampaign }
 * @returns {{ outreachQueue: Array, logs: Array }}
 */
export async function runQueueOutreach(contacts, personalizedEmails, channelAssignments, options = {}) {
  const logs = [];
  const addLog = (msg, type) => logs.push({ msg, type, ts: Date.now() });
  const listName = options.listName || "Untitled List";

  addLog(`→ Saving lead list: "${listName}"...`, "system");
  await sleep(500);
  addLog(`✓ ${contacts.length} contacts saved to "${listName}"\n`, "success");

  const emailContacts = contacts.filter((c) => channelAssignments[c.id]?.email);
  const linkedinContacts = contacts.filter((c) => channelAssignments[c.id]?.linkedin);
  const listOnlyContacts = contacts.filter((c) => channelAssignments[c.id]?.listOnly);

  if (emailContacts.length > 0) {
    const platform = options.emailPlatform === "instantly" ? "Instantly.ai" : "SmartLead";
    addLog(`→ Connecting to ${platform}...`, "system");
    await sleep(600);
    addLog("✓ Authenticated", "success");
    addLog(`→ Pushing ${emailContacts.length} leads to campaign: "${options.emailCampaign || "Default Campaign"}"`, "system");
    for (const contact of emailContacts) {
      await sleep(150 + Math.random() * 200);
      addLog(`  + ${contact.name} → ${contact.email}`, "data");
    }
    addLog(`✓ ${emailContacts.length} leads queued in ${platform}\n`, "success");
  }
  if (linkedinContacts.length > 0) {
    const platform = options.linkedinPlatform === "heyreach" ? "HeyReach" : "AimFox";
    addLog(`→ Connecting to ${platform}...`, "system");
    await sleep(600);
    addLog("✓ Authenticated", "success");
    addLog(`→ Pushing ${linkedinContacts.length} leads to campaign: "${options.linkedinCampaign || "Default Campaign"}"`, "system");
    for (const contact of linkedinContacts) {
      await sleep(150 + Math.random() * 200);
      addLog(`  + ${contact.name} → ${contact.linkedin || "profile found"}`, "data");
    }
    addLog(`✓ ${linkedinContacts.length} leads queued in ${platform}\n`, "success");
  }
  if (listOnlyContacts.length > 0) {
    addLog(`→ ${listOnlyContacts.length} leads saved to list only (no outreach platform)`, "info");
  }

  const outreachQueue = contacts.map((c) => ({
    contact: c,
    email: personalizedEmails[c.id],
    channels: channelAssignments[c.id] || {},
    status: "queued",
  }));
  return { outreachQueue, logs };
}

// =============================================================================
// 5. API HANDLERS (require: query, getOrgId from api/db.js)
// =============================================================================

/**
 * listLeads — GET /api/leads
 * @param {Object} ctx - { orgId, list_id?, company_id? }
 * @param {Function} query - from api/db.js
 */
export async function listLeads(ctx, query) {
  const { orgId, list_id, company_id } = ctx;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  let sql = `SELECT l.id, l.list_id, l.company_id, l.first_name, l.last_name, l.email, l.title, l.linkedin_url, l.company, l.company_domain, l.email_verified, l.email_bounce_risk, l.icp_score, l.personalisation_json, l.company_data_json
             FROM leads l WHERE l.org_id = $1`;
  const params = [orgId];
  if (list_id) { sql += " AND l.list_id = $2"; params.push(list_id); }
  if (company_id) { sql += ` AND l.company_id = $${params.length + 1}`; params.push(company_id); }
  sql += " ORDER BY l.created_at";
  const result = await query(sql, params);
  return result.rows.map((r) => {
    const ld = r.company_data_json?.linkedinData || r.company_data_json?.linkedin_data || {};
    return {
      id: r.id,
      name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email || "Unknown",
      first_name: r.first_name,
      last_name: r.last_name,
      title: r.title,
      email: r.email,
      linkedin: r.linkedin_url,
      company: r.company,
      companyId: r.company_id,
      bounceRisk: r.email_bounce_risk || "low",
      verified: r.email_verified,
      icp_score: r.icp_score,
      linkedinData: ld.connections ? { ...ld } : null,
      personalisation_json: r.personalisation_json,
    };
  });
}

/**
 * createLead — POST /api/leads
 * @param {Object} ctx - { orgId }
 * @param {Object} body - { list_id, company_id?, first_name?, last_name?, email?, title?, company?, company_domain?, linkedin_url?, email_bounce_risk?, linkedinData?, personalisation_json? }
 * @param {Function} query
 */
export async function createLead(ctx, body, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const { list_id, company_id, first_name, last_name, email, title, company, company_domain, linkedin_url, email_bounce_risk, linkedinData, personalisation_json } = body || {};
  if (!list_id) return { error: "list_id required", status: 400 };
  const company_data = linkedinData ? { linkedinData, linkedin_data: linkedinData } : {};
  const result = await query(
    `INSERT INTO leads (org_id, list_id, company_id, first_name, last_name, email, title, company, company_domain, linkedin_url, email_verified, email_bounce_risk, company_data_json, personalisation_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14::jsonb)
     RETURNING id, list_id, company_id, first_name, last_name, email, title, company, email_bounce_risk, personalisation_json`,
    [orgId, list_id, company_id || null, first_name || null, last_name || null, email || null, title || null, company || null, company_domain || null, linkedin_url || null, email_bounce_risk === "low", email_bounce_risk || "low", JSON.stringify(company_data), personalisation_json ? JSON.stringify(personalisation_json) : null]
  );
  const r = result.rows[0];
  return { status: 201, lead: { id: r.id, list_id: r.list_id, company_id: r.company_id, name: [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email, first_name: r.first_name, last_name: r.last_name, email: r.email, title: r.title, company: r.company, bounceRisk: r.email_bounce_risk, personalisation_json: r.personalisation_json } };
}

/**
 * updateLead — PUT /api/leads/:id (personalisation_json)
 * @param {Object} ctx - { orgId }
 * @param {string} leadId
 * @param {Object} body - { personalisation_json? }
 * @param {Function} query
 */
export async function updateLead(ctx, leadId, body, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const { personalisation_json } = body || {};
  const result = await query(
    `UPDATE leads SET personalisation_json = COALESCE($2::jsonb, personalisation_json), updated_at = now()
     WHERE id = $1 AND org_id = $3 RETURNING id, personalisation_json`,
    [leadId, personalisation_json ? JSON.stringify(personalisation_json) : null, orgId]
  );
  if (result.rows.length === 0) return { error: "Not found", status: 404 };
  return { lead: result.rows[0] };
}

/**
 * listCompanies — GET /api/companies (discovery results)
 * @param {Object} ctx - { orgId, list_id? }
 * @param {Function} query
 */
export async function listCompanies(ctx, query) {
  const { orgId, list_id } = ctx;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  let sql = `SELECT c.id, c.name, c.domain, c.industry, c.employee_count, c.employee_range, c.revenue_range, c.headquarters_city, c.headquarters_state, c.headquarters_country, c.technologies, c.icp_fit_score, c.enrichment_data_json
             FROM companies c WHERE c.org_id = $1`;
  const params = [orgId];
  if (list_id) {
    sql += ` AND EXISTS (SELECT 1 FROM leads l WHERE l.company_id = c.id AND l.list_id = $2 AND l.org_id = c.org_id)`;
    params.push(list_id);
  }
  sql += " ORDER BY c.icp_fit_score DESC NULLS LAST, c.name";
  const result = await query(sql, params);
  return result.rows.map((r) => {
    const enrich = r.enrichment_data_json || {};
    return {
      id: r.id,
      name: r.name,
      domain: r.domain,
      industry: r.industry,
      employees: r.employee_count,
      employee_range: r.employee_range,
      location: [r.headquarters_city, r.headquarters_state, r.headquarters_country].filter(Boolean).join(", "),
      revenue: r.revenue_range,
      techStack: r.technologies || [],
      icpScore: r.icp_fit_score,
      recentNews: enrich.recentNews || enrich.recent_news || "",
    };
  });
}

/**
 * createCompany — POST /api/companies (from discovery)
 * @param {Object} ctx - { orgId }
 * @param {Object} body - { name, domain?, industry?, employees?, location?, revenue?, techStack?, icpScore?, recentNews? }
 * @param {Function} query
 */
export async function createCompany(ctx, body, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const { name, domain, industry, employees, location, revenue, techStack, icpScore, recentNews } = body || {};
  const [city, state, country] = (location || "").split(",").map((s) => s?.trim()).filter(Boolean);
  const result = await query(
    `INSERT INTO companies (org_id, name, domain, industry, employee_count, headquarters_city, headquarters_state, headquarters_country, revenue_range, technologies, icp_fit_score, enrichment_data_json, enriched_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::text[], $11, $12::jsonb, now())
     RETURNING id, name, domain, industry, employee_count, revenue_range, technologies, icp_fit_score`,
    [orgId, name, domain || null, industry, employees || null, city || null, state || null, country || null, revenue || null, techStack || [], icpScore || null, JSON.stringify({ recentNews: recentNews || "" })]
  );
  const r = result.rows[0];
  return { status: 201, company: r };
}

/**
 * listLeadLists — GET /api/lead-lists
 * @param {Object} ctx - { orgId }
 * @param {Function} query
 */
export async function listLeadLists(ctx, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const result = await query(
    `SELECT ll.id, ll.name, ll.source, ll.status, ll.total_contacts, ll.enriched_count, ll.created_at,
      COALESCE(json_agg(json_build_object('id', l.id, 'first_name', l.first_name, 'last_name', l.last_name, 'email', l.email, 'title', l.title, 'company', l.company, 'company_domain', l.company_domain, 'linkedin_url', l.linkedin_url, 'personalisation_json', l.personalisation_json, 'email_bounce_risk', l.email_bounce_risk)) FILTER (WHERE l.id IS NOT NULL), '[]')::json as leads
     FROM lead_lists ll
     LEFT JOIN leads l ON l.list_id = ll.id AND l.org_id = ll.org_id
     WHERE ll.org_id = $1
     GROUP BY ll.id ORDER BY ll.created_at DESC`,
    [orgId]
  );
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name,
    source: r.source,
    status: r.status,
    total_contacts: r.total_contacts,
    enriched_count: r.enriched_count,
    createdAt: r.created_at,
    contacts: (r.leads && Array.isArray(r.leads) ? r.leads : []).filter(Boolean).map((l) => ({
      id: l.id,
      name: [l.first_name, l.last_name].filter(Boolean).join(" ") || l.email,
      email: l.email,
      title: l.title,
      company: l.company,
      personalisation_json: l.personalisation_json,
      bounceRisk: l.email_bounce_risk === "low" ? "low" : l.email_bounce_risk === "high" ? "high" : "medium",
    })),
  }));
}

/**
 * createLeadList — POST /api/lead-lists
 * @param {Object} ctx - { orgId }
 * @param {Object} body - { name?, source? }
 * @param {Function} query
 */
export async function createLeadList(ctx, body, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const { name, source } = body || {};
  const result = await query(
    `INSERT INTO lead_lists (org_id, name, source, status, total_contacts, enriched_count)
     VALUES ($1, $2, $3, 'draft', 0, 0)
     RETURNING id, name, source, status, total_contacts, enriched_count, created_at`,
    [orgId, name || "Untitled List", source || "discovery"]
  );
  return { status: 201, list: result.rows[0] };
}

/**
 * listIcpProfiles — GET /api/icp-profiles
 * @param {Object} ctx - { orgId }
 * @param {Function} query
 */
export async function listIcpProfiles(ctx, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const result = await query(`SELECT * FROM icp_profiles WHERE org_id = $1 ORDER BY created_at DESC`, [orgId]);
  return result.rows.map((r) => ({
    id: r.id,
    name: r.name || "Untitled",
    industry: r.industry || "",
    keywords: r.keywords || [],
    employeeRanges: r.employee_ranges || [],
    regions: r.regions || [],
    roles: r.roles || [],
    lookalikeDomains: r.lookalike_domains || [],
    maxLeads: r.max_leads,
    createdAt: r.created_at,
  }));
}

/**
 * createIcpProfile — POST /api/icp-profiles
 * @param {Object} ctx - { orgId }
 * @param {Object} body - { name?, industry?, keywords?, employeeRanges?, regions?, roles?, lookalikeDomains?, maxLeads? }
 * @param {Function} query
 */
export async function createIcpProfile(ctx, body, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const { name, industry, keywords, employeeRanges, regions, roles, lookalikeDomains, maxLeads } = body || {};
  const kw = Array.isArray(keywords) ? keywords : keywords ? [String(keywords)] : [];
  const result = await query(
    `INSERT INTO icp_profiles (org_id, name, industry, keywords, employee_ranges, regions, roles, lookalike_domains, max_leads)
     VALUES ($1, $2, $3, $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9)
     RETURNING id, name, industry, keywords, employee_ranges, regions, roles, lookalike_domains, max_leads`,
    [orgId, name || "Untitled", industry || "", kw, employeeRanges || [], regions || [], roles || [], lookalikeDomains || [], maxLeads || null]
  );
  return { status: 201, profile: result.rows[0] };
}

/**
 * getDefaultIcpProfile — GET /api/icp-profiles/default
 * @param {Object} ctx - { orgId }
 * @param {Function} query
 */
export async function getDefaultIcpProfile(ctx, query) {
  const orgId = ctx.orgId;
  const DEFAULT_ICP = { listName: "", industry: "B2B SaaS", keywords: "", employeeRange: "51-200", regions: ["North America", "Europe"], roles: ["VP Growth", "CTO", "Head of Product"], lookalike: "" };
  if (!orgId) return DEFAULT_ICP;
  const result = await query("SELECT * FROM icp_profiles WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1", [orgId]);
  const r = result.rows[0];
  if (!r) return DEFAULT_ICP;
  return {
    listName: r.name || "",
    industry: r.industry || "B2B SaaS",
    keywords: Array.isArray(r.keywords) ? r.keywords.join(", ") : r.keywords || "",
    employeeRange: (r.employee_ranges || ["51-200"])[0] || "51-200",
    regions: r.regions || ["North America", "Europe"],
    roles: r.roles || ["VP Growth", "CTO", "Head of Product"],
    lookalike: Array.isArray(r.lookalike_domains) ? r.lookalike_domains.join(", ") : r.lookalike_domains || "",
  };
}

/**
 * listPrompts — GET /api/prompts (personalisation prompts)
 * @param {Object} ctx - { orgId }
 * @param {Function} query
 */
export async function listPrompts(ctx, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const result = await query(`SELECT id, name, content, audience, use_count, created_at FROM messaging_copies WHERE org_id = $1 AND category = 'value_prop' ORDER BY use_count DESC, created_at DESC`, [orgId]);
  return result.rows.map((r) => ({ id: r.id, key: r.id, label: r.name || "Untitled", text: r.content || "", audience: r.audience, useCount: r.use_count, createdAt: r.created_at }));
}

/**
 * createPrompt — POST /api/prompts
 * @param {Object} ctx - { orgId }
 * @param {Object} body - { label?, text?, key? }
 * @param {Function} query
 */
export async function createPrompt(ctx, body, query) {
  const orgId = ctx.orgId;
  if (!orgId) return { error: "No organisation configured", status: 503 };
  const { label, text } = body || {};
  const result = await query(
    `INSERT INTO messaging_copies (org_id, name, category, content) VALUES ($1, $2, 'value_prop', $3)
     RETURNING id, name, content, use_count, created_at`,
    [orgId, label || "Custom Prompt", text || ""]
  );
  return { status: 201, prompt: result.rows[0] };
}
