/**
 * Instantly.ai API v2 Service
 *
 * Base URL: https://api.instantly.ai
 * Auth: Authorization: Bearer <API_KEY>
 * Docs: https://developer.instantly.ai/api/v2
 *
 * Key endpoints used:
 *   GET  /api/v2/campaigns                     – list campaigns
 *   GET  /api/v2/campaigns/:id                  – get campaign
 *   POST /api/v2/campaigns/:id/activate         – activate/resume
 *   POST /api/v2/campaigns/:id/pause            – pause
 *   GET  /api/v2/campaigns/analytics             – per-campaign analytics
 *   GET  /api/v2/campaigns/analytics/overview    – aggregate analytics
 *   POST /api/v2/leads                           – create lead (add to campaign)
 *   GET  /api/v2/leads/:id                       – get lead
 *   POST /api/v2/leads/list                      – list leads (paginated)
 *   GET  /api/v2/accounts                        – list sender accounts
 *   GET  /api/v2/emails                          – list emails (Unibox)
 *   GET  /api/v2/emails/unread/count             – unread count
 *   POST /api/v2/lead-lists                      – create lead list
 *   GET  /api/v2/lead-lists                      – list lead lists
 *
 * Status codes: 0=Draft, 1=Active, 2=Paused, 3=Completed
 */

const BASE = 'https://api.instantly.ai';

async function iFetch(apiKey, method, path, body = null, qs = '') {
  const url = `${BASE}${path}${qs ? (path.includes('?') ? '&' : '?') + qs : ''}`;
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
    const msg = typeof data === 'object' ? (data.message || data.error || data.detail || JSON.stringify(data)) : data;
    const err = new Error(`Instantly ${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
export async function listCampaigns(apiKey, { limit = 100, skip = 0, status } = {}) {
  const params = [`limit=${limit}`, `skip=${skip}`];
  if (status !== undefined) params.push(`status=${status}`);
  return iFetch(apiKey, 'GET', `/api/v2/campaigns?${params.join('&')}`);
}

export async function getCampaign(apiKey, id) {
  return iFetch(apiKey, 'GET', `/api/v2/campaigns/${encodeURIComponent(id)}`);
}

export async function activateCampaign(apiKey, id) {
  return iFetch(apiKey, 'POST', `/api/v2/campaigns/${encodeURIComponent(id)}/activate`);
}

export async function pauseCampaign(apiKey, id) {
  return iFetch(apiKey, 'POST', `/api/v2/campaigns/${encodeURIComponent(id)}/pause`);
}

// ── Analytics ─────────────────────────────────────────────────────────────────
export async function getCampaignAnalytics(apiKey, { id, ids } = {}) {
  const params = [];
  if (id) params.push(`id=${encodeURIComponent(id)}`);
  if (ids?.length) ids.forEach(i => params.push(`ids=${encodeURIComponent(i)}`));
  return iFetch(apiKey, 'GET', `/api/v2/campaigns/analytics${params.length ? '?' + params.join('&') : ''}`);
}

export async function getCampaignAnalyticsOverview(apiKey, { id, ids, start_date, end_date, campaign_status } = {}) {
  const params = [];
  if (id) params.push(`id=${encodeURIComponent(id)}`);
  if (ids?.length) ids.forEach(i => params.push(`ids=${encodeURIComponent(i)}`));
  if (start_date) params.push(`start_date=${encodeURIComponent(start_date)}`);
  if (end_date) params.push(`end_date=${encodeURIComponent(end_date)}`);
  if (campaign_status !== undefined) params.push(`campaign_status=${campaign_status}`);
  return iFetch(apiKey, 'GET', `/api/v2/campaigns/analytics/overview${params.length ? '?' + params.join('&') : ''}`);
}

// ── Leads ─────────────────────────────────────────────────────────────────────
export async function createLead(apiKey, { email, campaign, first_name, last_name, company_name, personalization, ...custom } = {}) {
  return iFetch(apiKey, 'POST', '/api/v2/leads', {
    email,
    campaign,
    first_name,
    last_name,
    company_name,
    personalization,
    ...custom,
  });
}

export async function getLead(apiKey, id) {
  return iFetch(apiKey, 'GET', `/api/v2/leads/${encodeURIComponent(id)}`);
}

export async function listLeads(apiKey, { campaign_id, limit = 100, starting_after, email } = {}) {
  const body = { limit };
  if (campaign_id) body.campaign_id = campaign_id;
  if (starting_after) body.starting_after = starting_after;
  if (email) body.email = email;
  return iFetch(apiKey, 'POST', '/api/v2/leads/list', body);
}

export async function deleteLead(apiKey, { email, campaign_id, delete_all_from_company } = {}) {
  return iFetch(apiKey, 'DELETE', '/api/v2/leads', { email, campaign_id, delete_all_from_company });
}

// ── Accounts (sender accounts) ────────────────────────────────────────────────
export async function listAccounts(apiKey, { limit = 100, skip = 0 } = {}) {
  return iFetch(apiKey, 'GET', `/api/v2/accounts?limit=${limit}&skip=${skip}`);
}

// ── Emails (Unibox) ──────────────────────────────────────────────────────────
export async function listEmails(apiKey, { limit = 50, skip = 0, campaign_id, is_read } = {}) {
  const params = [`limit=${limit}`, `skip=${skip}`];
  if (campaign_id) params.push(`campaign_id=${encodeURIComponent(campaign_id)}`);
  if (is_read !== undefined) params.push(`is_read=${is_read}`);
  return iFetch(apiKey, 'GET', `/api/v2/emails?${params.join('&')}`);
}

export async function getUnreadCount(apiKey) {
  return iFetch(apiKey, 'GET', '/api/v2/emails/unread/count');
}

// ── Lead Lists ────────────────────────────────────────────────────────────────
export async function listLeadLists(apiKey, { limit = 100, skip = 0 } = {}) {
  return iFetch(apiKey, 'GET', `/api/v2/lead-lists?limit=${limit}&skip=${skip}`);
}

export async function createLeadList(apiKey, name) {
  return iFetch(apiKey, 'POST', '/api/v2/lead-lists', { name });
}

// ── Auth check (list campaigns with limit=1 as validation) ────────────────────
export async function checkApiKey(apiKey) {
  return iFetch(apiKey, 'GET', '/api/v2/campaigns?limit=1&skip=0');
}
