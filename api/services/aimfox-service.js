/**
 * AimFox API Service
 *
 * Base URL: https://api.aimfox.com/api/v2
 * Auth: Authorization: Bearer <api_key>
 *
 * Key endpoints:
 *   GET  /accounts                                – list LinkedIn accounts (also used for key validation)
 *   GET  /campaigns                               – list campaigns (optional ?outreach_type, ?accepts_profiles)
 *   GET  /campaigns/:id                           – single campaign
 *   PATCH /campaigns/:id                          – update campaign (pause: {state:"PAUSED"}, resume: {state:"ACTIVE"})
 *   GET  /campaigns/:id/metrics                  – per-campaign stats
 *   POST /campaigns/:id/audience                 – add single profile
 *   POST /campaigns/:id/audience/multiple        – add multiple profiles with custom variables
 *   POST /leads:search                            – search leads (paginated)
 *   GET  /leads/:id                               – get lead by ID
 *   GET  /conversations                           – inbox/conversations (?in_app, ?before, ?campaigns)
 *   GET  /analytics/interactions                  – time-series analytics (?bucket, ?from, ?to)
 *   GET  /analytics/recent-leads                  – recently acquired connections
 */

const BASE = 'https://api.aimfox.com/api/v2';

async function aimfoxFetch(apiKey, method, path, body = null, qs = '') {
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const msg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : data;
    const err = new Error(`AimFox ${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
// AimFox has no dedicated auth-check endpoint; validating by fetching accounts.
export async function checkApiKey(apiKey) {
  return aimfoxFetch(apiKey, 'GET', '/accounts');
}

// ── Accounts (LinkedIn accounts connected to AimFox) ─────────────────────────
export async function getAccounts(apiKey) {
  return aimfoxFetch(apiKey, 'GET', '/accounts');
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
export async function getAllCampaigns(apiKey, { outreachType = null, acceptsProfiles = null } = {}) {
  const qs = new URLSearchParams();
  if (outreachType) qs.set('outreach_type', outreachType);
  if (acceptsProfiles !== null) qs.set('accepts_profiles', String(acceptsProfiles));
  return aimfoxFetch(apiKey, 'GET', '/campaigns', null, qs.toString() || '');
}

export async function getCampaignById(apiKey, campaignId) {
  return aimfoxFetch(apiKey, 'GET', `/campaigns/${encodeURIComponent(campaignId)}`);
}

export async function pauseCampaign(apiKey, campaignId) {
  return aimfoxFetch(apiKey, 'PATCH', `/campaigns/${encodeURIComponent(campaignId)}`, { state: 'PAUSED' });
}

export async function resumeCampaign(apiKey, campaignId) {
  return aimfoxFetch(apiKey, 'PATCH', `/campaigns/${encodeURIComponent(campaignId)}`, { state: 'ACTIVE' });
}

export async function getCampaignMetrics(apiKey, campaignId) {
  return aimfoxFetch(apiKey, 'GET', `/campaigns/${encodeURIComponent(campaignId)}/metrics`);
}

// ── Leads ─────────────────────────────────────────────────────────────────────

/**
 * Add leads to an AimFox campaign via LinkedIn profile URLs.
 * Campaign must be ACTIVE, PAUSED, DONE, or CREATED (not GROUP/EVENT MESSAGE types).
 *
 * @param {string} apiKey
 * @param {string} campaignId  – AimFox campaign UUID
 * @param {Array<{profileUrl, firstName?, lastName?, companyName?, position?}>} leads
 */
export async function addLeadsToCampaign(apiKey, campaignId, leads) {
  const profiles = leads.map(lead => {
    const profile = {
      profile_url: lead.profileUrl || lead.linkedinUrl || lead.profile_url,
    };
    const vars = {};
    if (lead.firstName) vars['first name'] = lead.firstName;
    if (lead.lastName) vars['last name'] = lead.lastName;
    if (lead.companyName || lead.company) vars['company'] = lead.companyName || lead.company;
    if (lead.position || lead.title) vars['title'] = lead.position || lead.title;
    if (Object.keys(vars).length) profile.custom_variables = vars;
    return profile;
  });
  return aimfoxFetch(apiKey, 'POST', `/campaigns/${encodeURIComponent(campaignId)}/audience/multiple`, {
    type: 'profile_url',
    profiles,
  });
}

/**
 * Add a single lead to a campaign by profile URL.
 */
export async function addLeadToCampaign(apiKey, campaignId, profileUrl) {
  return aimfoxFetch(apiKey, 'POST', `/campaigns/${encodeURIComponent(campaignId)}/audience`, {
    profile_url: profileUrl,
  });
}

export async function getLeadById(apiKey, leadId) {
  return aimfoxFetch(apiKey, 'GET', `/leads/${encodeURIComponent(leadId)}`);
}

export async function searchLeads(apiKey, { keywords = '', locations = [], labels = [], start = 0, count = 20 } = {}) {
  const qs = new URLSearchParams({ start: String(start), count: String(count) });
  return aimfoxFetch(apiKey, 'POST', '/leads:search', { keywords, locations, labels }, qs.toString());
}

// ── Inbox / Conversations ─────────────────────────────────────────────────────
export async function getConversations(apiKey, { inApp = true, before = null, campaigns = null } = {}) {
  const qs = new URLSearchParams({ in_app: String(inApp) });
  if (before) qs.set('before', String(before));
  if (campaigns && Array.isArray(campaigns) && campaigns.length) {
    qs.set('campaigns', JSON.stringify(campaigns));
  }
  return aimfoxFetch(apiKey, 'GET', '/conversations', null, qs.toString());
}

// ── Stats / Analytics ─────────────────────────────────────────────────────────
/**
 * Aggregate stats across campaigns.
 * Fetches metrics for each campaign and sums them.
 * Returns { aggregate, perCampaign } matching the shape of HeyReach overallStats.
 */
export async function getOverallStats(apiKey, { campaignIds = [] } = {}) {
  let ids = campaignIds;
  if (!ids.length) {
    const data = await getAllCampaigns(apiKey);
    const camps = data.campaigns || (Array.isArray(data) ? data : []);
    ids = camps.map(c => c.id).filter(Boolean);
  }
  if (!ids.length) return { aggregate: {}, perCampaign: [] };

  const perCampaign = await Promise.all(
    ids.map(id => getCampaignMetrics(apiKey, id).then(d => ({ id, ...d })).catch(() => ({ id, metrics: {} })))
  );

  const aggregate = perCampaign.reduce((acc, camp) => {
    const m = camp.metrics || {};
    for (const [k, v] of Object.entries(m)) {
      acc[k] = (acc[k] || 0) + (v || 0);
    }
    return acc;
  }, {});

  // Map to shape consistent with HeyReach overallStats keys
  const overallStats = {
    connectionsSent: aggregate.sent_connections || 0,
    connectionsAccepted: aggregate.accepted_connections || 0,
    connectionAcceptanceRate: aggregate.sent_connections
      ? Math.round((aggregate.accepted_connections / aggregate.sent_connections) * 100)
      : 0,
    messagesSent: aggregate.sent_messages || 0,
    replies: aggregate.replies || 0,
    messageReplyRate: aggregate.sent_messages
      ? Math.round((aggregate.replies / aggregate.sent_messages) * 100)
      : 0,
    views: aggregate.views || 0,
  };

  return { overallStats, aggregate, perCampaign };
}

export async function getInteractions(apiKey, { from = null, to = null, bucket = '1 day', accountIds = [] } = {}) {
  const qs = new URLSearchParams({ bucket });
  if (from) qs.set('from', String(from));
  if (to) qs.set('to', String(to));
  if (accountIds.length) qs.set('account_ids', JSON.stringify(accountIds));
  return aimfoxFetch(apiKey, 'GET', '/analytics/interactions', null, qs.toString());
}

export async function getRecentLeads(apiKey) {
  return aimfoxFetch(apiKey, 'GET', '/analytics/recent-leads');
}
