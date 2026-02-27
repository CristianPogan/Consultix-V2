/**
 * HeyReach API Service
 *
 * Base URL: https://api.heyreach.io/api/public
 * Auth: X-API-KEY header
 *
 * Confirmed working endpoints (Jan 2025 audit):
 *   GET  /auth/CheckApiKey
 *   POST /campaign/GetAll               – paginated campaign list
 *   GET  /campaign/GetById?campaignId=X  – single campaign
 *   POST /campaign/Pause?campaignId=X    – pause campaign
 *   POST /campaign/Resume?campaignId=X   – resume campaign
 *   POST /campaign/AddLeadsToCampaignV2  – add leads (requires ACTIVE campaign)
 *   POST /lead/GetLead                   – get lead by profileUrl
 *   POST /inbox/GetConversationsV2       – conversations/inbox
 *   POST /stats/GetOverallStats          – analytics
 *   POST /list/GetAll                    – paginated list of lists
 *   POST /list/CreateEmptyList           – create a new list
 *   POST /MyNetwork/GetMyNetworkForSender – network info for a sender
 */

const BASE = 'https://api.heyreach.io/api/public';

async function heyFetch(apiKey, method, path, body = null, qs = '') {
  const url = `${BASE}${path}${qs ? `?${qs}` : ''}`;
  const opts = {
    method,
    headers: {
      'X-API-KEY': apiKey,
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
    const err = new Error(`HeyReach ${res.status}: ${msg}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function checkApiKey(apiKey) {
  return heyFetch(apiKey, 'GET', '/auth/CheckApiKey');
}

// ── Campaigns ─────────────────────────────────────────────────────────────────
export async function getAllCampaigns(apiKey, { offset = 0, limit = 50 } = {}) {
  return heyFetch(apiKey, 'POST', '/campaign/GetAll', { offset, limit });
}

export async function getCampaignById(apiKey, campaignId) {
  return heyFetch(apiKey, 'GET', '/campaign/GetById', null, `campaignId=${encodeURIComponent(campaignId)}`);
}

export async function pauseCampaign(apiKey, campaignId) {
  return heyFetch(apiKey, 'POST', '/campaign/Pause', null, `campaignId=${encodeURIComponent(campaignId)}`);
}

export async function resumeCampaign(apiKey, campaignId) {
  return heyFetch(apiKey, 'POST', '/campaign/Resume', null, `campaignId=${encodeURIComponent(campaignId)}`);
}

/**
 * Add leads to a HeyReach campaign.
 * Campaign must be ACTIVE with LinkedIn accounts assigned.
 *
 * @param {string} apiKey
 * @param {string|number} campaignId
 * @param {Array<{profileUrl, firstName, lastName, emailAddress?, companyName?, position?}>} leads
 */
export async function addLeadsToCampaign(apiKey, campaignId, leads) {
  const accountLeadPairs = leads.map(lead => ({
    lead: {
      profileUrl: lead.profileUrl || lead.linkedinUrl,
      firstName: lead.firstName,
      lastName: lead.lastName,
      emailAddress: lead.emailAddress || lead.email,
      companyName: lead.companyName || lead.company,
      position: lead.position || lead.title,
    },
  }));
  return heyFetch(apiKey, 'POST', '/campaign/AddLeadsToCampaignV2', {
    campaignId: Number(campaignId),
    accountLeadPairs,
  });
}

// ── Leads ─────────────────────────────────────────────────────────────────────
export async function getLead(apiKey, profileUrl) {
  return heyFetch(apiKey, 'POST', '/lead/GetLead', { profileUrl });
}

// ── Inbox / Conversations ─────────────────────────────────────────────────────
export async function getConversations(apiKey, { offset = 0, limit = 50, campaignId = null, linkedInAccountId = null } = {}) {
  const body = { offset, limit };
  if (campaignId) body.campaignId = Number(campaignId);
  if (linkedInAccountId) body.linkedInAccountId = Number(linkedInAccountId);
  return heyFetch(apiKey, 'POST', '/inbox/GetConversationsV2', body);
}

// ── Stats ─────────────────────────────────────────────────────────────────────
/**
 * HeyReach stats requires both AccountIds and CampaignIds (PascalCase).
 * If neither supplied we auto-discover campaigns first.
 */
export async function getOverallStats(apiKey, { campaignIds = [], accountIds = [] } = {}) {
  if (!campaignIds.length) {
    const camps = await getAllCampaigns(apiKey, { offset: 0, limit: 100 });
    const items = Array.isArray(camps) ? camps : camps.items || camps.campaigns || [];
    campaignIds = items.map(c => c.id).filter(Boolean);
    if (!campaignIds.length) return {};
  }
  return heyFetch(apiKey, 'POST', '/stats/GetOverallStats', {
    CampaignIds: campaignIds.map(Number),
    AccountIds: accountIds.length ? accountIds.map(Number) : [],
  });
}

// ── Lists ─────────────────────────────────────────────────────────────────────
export async function getAllLists(apiKey, { offset = 0, limit = 50 } = {}) {
  return heyFetch(apiKey, 'POST', '/list/GetAll', { offset, limit });
}

export async function createEmptyList(apiKey, name, listType = 'LEAD_LIST') {
  return heyFetch(apiKey, 'POST', '/list/CreateEmptyList', { name, listType });
}

// ── Network ───────────────────────────────────────────────────────────────────
export async function getMyNetworkForSender(apiKey, senderId) {
  return heyFetch(apiKey, 'POST', '/MyNetwork/GetMyNetworkForSender', { senderId: Number(senderId) });
}
