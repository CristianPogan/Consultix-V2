const API_BASE = '/api';
const TOKEN_KEY = 'jwt_token';
const API_KEY_KEY = 'api_key';

export class AuthError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

// Bootstrap: read apiKey from URL ?apiKey=xxx and store
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('apiKey');
  if (key) localStorage.setItem(API_KEY_KEY, key);
}

function getStoredToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
}

function setStoredToken(token) {
  if (typeof localStorage !== 'undefined' && token) localStorage.setItem(TOKEN_KEY, token);
}

function clearStoredToken() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem(TOKEN_KEY);
}

async function getToken() {
  let token = getStoredToken();
  if (token) return token;
  const apiKey = (typeof localStorage !== 'undefined' ? localStorage.getItem(API_KEY_KEY) : null) || import.meta.env?.VITE_API_KEY;
  if (!apiKey) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sessionexpired'));
    }
    throw new Error('Session expired or no API key. Please log in again, or add your API key (e.g. ?apiKey=xxx in the URL).');
  }
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to get token');
  token = data.token;
  setStoredToken(token);
  return token;
}

function toQS(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v != null) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
}

async function req(method, path, body) {
  const token = await getToken();
  const opt = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  if (body) opt.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opt);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearStoredToken();
    const apiKey = (typeof localStorage !== 'undefined' ? localStorage.getItem(API_KEY_KEY) : null) || import.meta.env?.VITE_API_KEY;
    if (!apiKey && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('sessionexpired'));
    }
  }
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

async function authReq(method, path, body) {
  const token = getStoredToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const opt = { method, headers };
  if (body) opt.body = JSON.stringify(body);
  const res = await fetch(`/api${path}`, opt);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export const api = {
  setApiKey: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(API_KEY_KEY, key);
  },
  getToken,
  clearToken: clearStoredToken,
  async login(email, password) {
    const { res, data } = await authReq('POST', '/auth/login', { email, password });
    if (!res.ok) throw new AuthError(data.error || res.statusText, data.code);
    setStoredToken(data.token);
    return { user: data.user, token: data.token };
  },
  async validateSignupToken(accessToken) {
    const { res, data } = await authReq('GET', `/auth/validate-signup-token?token=${encodeURIComponent(accessToken || '')}`);
    return res.ok ? data : { valid: false, error: data.error || 'Invalid token' };
  },
  async signup(email, password, name, accessToken) {
    const { res, data } = await authReq('POST', '/auth/signup', { email, password, name, accessToken });
    if (!res.ok) throw new AuthError(data.error || res.statusText, data.code);
    setStoredToken(data.token);
    return { user: data.user, token: data.token };
  },
  async me() {
    const { res, data } = await authReq('GET', '/auth/me');
    return res.ok ? data : null;
  },
  async updateProfile(updates) {
    const { res, data } = await authReq('PUT', '/auth/profile', updates);
    if (!res.ok) throw new AuthError(data.error || res.statusText, data.code);
    return data.user;
  },
  async uploadProfilePhoto(file) {
    const token = getStoredToken();
    if (!token) throw new AuthError('Not authenticated', 'NO_TOKEN');
    
    const formData = new FormData();
    formData.append('photo', file);
    
    const res = await fetch('/api/auth/upload-photo', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new AuthError(data.error || res.statusText, data.code);
    return data;
  },
  icpProfiles: {
    list: () => req('GET', '/icp-profiles'),
    create: (data) => req('POST', '/icp-profiles', data),
    update: (id, data) => req('PUT', `/icp-profiles/${id}`, data),
    getDefault: () => req('GET', '/icp-profiles/default'),
  },
  leadLists: {
    list: () => req('GET', '/lead-lists'),
    create: (data) => req('POST', '/lead-lists', data),
    import: (data) => req('POST', '/lead-lists/import', data),
  },
  companies: {
    list: (params) => req('GET', '/companies' + (params?.list_id ? `?list_id=${params.list_id}` : '')),
    create: (data) => req('POST', '/companies', data),
  },
  leads: {
    list: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return req('GET', '/leads' + (q ? `?${q}` : ''));
    },
    create: (data) => req('POST', '/leads', data),
    update: (id, data) => req('PUT', `/leads/${id}`, data),
  },
  aiSdr: {
    generateSample: (params) => req('POST', '/ai-sdr/generate-sample', params),
  },
  aiCouncil: {
    chat: (params) => req('POST', '/ai-council/chat', params),
    getSystemPrompt: () => req('GET', '/ai-council/system-prompt'),
    saveSystemPrompt: (systemPrompt) => req('POST', '/ai-council/system-prompt', { systemPrompt }),
  },
  crm: {
    pipeline: (params) => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      return req('GET', '/crm/pipeline' + (q.toString() ? `?${q}` : ''));
    },
  },
  prompts: {
    list: () => req('GET', '/prompts'),
    create: (data) => req('POST', '/prompts', data),
    getDefaults: () => req('GET', '/prompts/defaults'),
  },
  leadGeneration: {
    getDiscoverStatus: () => req('GET', '/lead-generation/discover/status'),
    discover: (params) => req('POST', '/lead-generation/discover', params),
    discoverApollo: (params) => req('POST', '/lead-generation/discover/apollo', params),
    discoverGoogleMaps: (params) => req('POST', '/lead-generation/discover/google-maps', params),
    discoverIcyPeas: (params) => req('POST', '/lead-generation/discover/icypeas', params),
    
    // Enrichment
    enrichEmail: (person) => req('POST', '/lead-generation/enrich/email', person),
    verifyEmail: (email) => req('POST', '/lead-generation/verify/email', { email }),
    enrichBulk: (params) => req('POST', '/lead-generation/enrich/bulk', params),
    scrapeWebsite: (url) => req('POST', '/lead-generation/scrape/website', { url }),
    getLinkedInCompany: (slug) => req('GET', `/lead-generation/linkedin/company/${slug}`),
    
    // Personalization
    personalize: (params) => req('POST', '/lead-generation/personalize', params),
    
    // Outreach
    sendToHeyReach: (leads) => req('POST', '/lead-generation/outreach/heyreach', { leads }),
    sendToInstantly: (leads) => req('POST', '/lead-generation/outreach/instantly', { leads }),
  },
  settings: {
    get: (type, params) => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      return req('GET', `/settings/${type}` + (q.toString() ? `?${q}` : ''));
    },
    save: (type, settings, params) => {
      const body = { settings };
      if (params?.projectId != null) body.projectId = params.projectId;
      return req('POST', `/settings/${type}` + (params?.projectId != null ? `?project_id=${encodeURIComponent(params.projectId)}` : ''), body);
    },
    getFormSchema: (formType) => req('GET', `/settings/schema/${formType}`),
  },
  integrations: {
    list: () => req('GET', '/integrations'),
    get: (key) => req('GET', `/integrations/${encodeURIComponent(key)}`),
    save: (key, credentials) => req('POST', `/integrations/${encodeURIComponent(key)}`, { credentials }),
    connect: (path, credentials) => req('POST', `/integrations${path}`, { credentials }),
    getGoogleCalendarAuthUrl: () => req('GET', '/integrations/google-calendar/auth'),
    getCosts: () => req('GET', '/integrations/costs'),
    getLeadSearchOrder: () => req('GET', '/integrations/order/lead-search'),
    saveLeadSearchOrder: (order) => req('POST', '/integrations/order/lead-search', order),
  },
  instantly: {
    campaigns: {
      list: (opts) => req('GET', '/instantly/campaigns' + toQS(opts)),
      get: (id) => req('GET', `/instantly/campaigns/${id}`),
      activate: (id) => req('POST', `/instantly/campaigns/${id}/activate`),
      pause: (id) => req('POST', `/instantly/campaigns/${id}/pause`),
    },
    analytics: (opts) => req('GET', '/instantly/analytics' + toQS(opts)),
    analyticsOverview: (opts) => req('GET', '/instantly/analytics/overview' + toQS(opts)),
    leads: {
      create: (data) => req('POST', '/instantly/leads', data),
      bulk: (leads, campaign) => req('POST', '/instantly/leads/bulk', { leads, campaign }),
      get: (id) => req('GET', `/instantly/leads/${id}`),
      list: (opts) => req('POST', '/instantly/leads/list', opts || {}),
    },
    accounts: (opts) => req('GET', '/instantly/accounts' + toQS(opts)),
    emails: {
      list: (opts) => req('GET', '/instantly/emails' + toQS(opts)),
      unreadCount: () => req('GET', '/instantly/emails/unread/count'),
    },
    leadLists: {
      list: (opts) => req('GET', '/instantly/lead-lists' + toQS(opts)),
      create: (name) => req('POST', '/instantly/lead-lists', { name }),
    },
  },
  heyreach: {
    campaigns: {
      list: (opts) => req('GET', '/heyreach/campaigns' + toQS(opts)),
      get: (id) => req('GET', `/heyreach/campaigns/${id}`),
      pause: (id) => req('POST', `/heyreach/campaigns/${id}/pause`),
      resume: (id) => req('POST', `/heyreach/campaigns/${id}/resume`),
      addLeads: (id, leads) => req('POST', `/heyreach/campaigns/${id}/leads`, { leads }),
      addLeadsDefault: (leads, campaignId) => req('POST', '/heyreach/campaigns/add-leads', { leads, campaignId }),
    },
    leads: {
      lookup: (profileUrl) => req('POST', '/heyreach/leads/lookup', { profileUrl }),
    },
    conversations: (opts) => req('POST', '/heyreach/conversations', opts || {}),
    stats: (opts) => req('POST', '/heyreach/stats', opts || {}),
    lists: {
      list: (opts) => req('GET', '/heyreach/lists' + toQS(opts)),
      create: (name, listType) => req('POST', '/heyreach/lists', { name, listType }),
    },
    network: (senderId) => req('POST', '/heyreach/network', { senderId }),
  },
  calendar: {
    getEvents: (date) => req('GET', '/calendar/events' + (date ? `?date=${encodeURIComponent(date)}` : '')),
  },
  stats: {
    dashboard: (params) => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      return req('GET', '/stats/dashboard' + (q.toString() ? `?${q}` : ''));
    },
    chart: (params) => {
      const q = new URLSearchParams();
      if (params?.projectId) q.set('project_id', params.projectId);
      if (params?.range) q.set('range', params.range);
      return req('GET', '/stats/chart' + (q.toString() ? `?${q}` : ''));
    },
  },
  organisations: {
    list: () => req('GET', '/organisations'),
    create: (data) => req('POST', '/organisations', data),
  },
  conversations: {
    list: () => req('GET', '/conversations'),
    get: (id) => req('GET', `/conversations/${id}`),
    create: (data) => req('POST', '/conversations', data),
    update: (id, data) => req('PUT', `/conversations/${id}`, data),
    delete: (id) => req('DELETE', `/conversations/${id}`),
  },
  messages: {
    list: (conversationId) => req('GET', `/messages?conversation_id=${conversationId}`),
    create: (data) => req('POST', '/messages', data),
  },
  activity: {
    list: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return req('GET', '/activity' + (q ? `?${q}` : ''));
    },
    create: (data) => req('POST', '/activity', data),
  },
  audit: {
    research: (data) => req('POST', '/audit/research', data),
    surveys: {
      list: (params) => {
        const q = new URLSearchParams(params || {}).toString();
        return req('GET', '/audit/surveys' + (q ? `?${q}` : ''));
      },
      get: (id) => req('GET', `/audit/surveys/${id}`),
      create: (data) => req('POST', '/audit/surveys', data),
      update: (id, data) => req('PUT', `/audit/surveys/${id}`, data),
      delete: (id) => req('DELETE', `/audit/surveys/${id}`),
      listResponses: (id) => req('GET', `/audit/surveys/${id}/responses`),
      submitResponse: (id, data) => req('POST', `/audit/surveys/${id}/responses`, data),
    },
    interviews: {
      list: () => req('GET', '/audit/interviews'),
      create: (data) => req('POST', '/audit/interviews', data),
      update: (id, data) => req('PUT', `/audit/interviews/${id}`, data),
      delete: (id) => req('DELETE', `/audit/interviews/${id}`),
    },
    transcripts: {
      list: () => req('GET', '/audit/transcripts'),
      create: (data) => req('POST', '/audit/transcripts', data),
      update: (id, data) => req('PUT', `/audit/transcripts/${id}`, data),
      delete: (id) => req('DELETE', `/audit/transcripts/${id}`),
    },
    processMaps: {
      list: () => req('GET', '/audit/process-maps'),
      create: (data) => req('POST', '/audit/process-maps', data),
      update: (id, data) => req('PUT', `/audit/process-maps/${id}`, data),
      delete: (id) => req('DELETE', `/audit/process-maps/${id}`),
    },
    analyse: (data) => req('POST', '/audit/analyse', data),
    analyseChat: (data) => req('POST', '/audit/analyse/chat', data),
    analyses: {
      list: (params) => {
        const q = new URLSearchParams(params || {}).toString();
        return req('GET', '/audit/analyses' + (q ? `?${q}` : ''));
      },
    },
  },
  implementation: {
    list: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return req('GET', '/implementation/phases' + (q ? `?${q}` : ''));
    },
    create: (data) => req('POST', '/implementation/phases', data),
    bulkCreate: (data) => req('POST', '/implementation/phases/bulk', data),
    update: (id, data) => req('PUT', `/implementation/phases/${id}`, data),
    delete: (id) => req('DELETE', `/implementation/phases/${id}`),
  },
  workflows: {
    list: () => req('GET', '/workflows'),
    create: (data) => req('POST', '/workflows', data),
    update: (id, data) => req('PUT', `/workflows/${id}`, data),
    delete: (id) => req('DELETE', `/workflows/${id}`),
  },
  messagingCopies: {
    list: () => req('GET', '/messaging-copies'),
    create: (data) => req('POST', '/messaging-copies', data),
    update: (id, data) => req('PUT', `/messaging-copies/${id}`, data),
    delete: (id) => req('DELETE', `/messaging-copies/${id}`),
    generate: (data) => req('POST', '/messaging-copies/generate', data),
    copywriterChat: (data) => req('POST', '/messaging-copies/copywriter-chat', data),
  },
  campaigns: {
    list: () => req('GET', '/campaigns'),
    get: (id) => req('GET', `/campaigns/${id}`),
    create: (data) => req('POST', '/campaigns', data),
    update: (id, data) => req('PUT', `/campaigns/${id}`, data),
    delete: (id) => req('DELETE', `/campaigns/${id}`),
  },
  niches: {
    list: () => req('GET', '/niches'),
    create: (data) => req('POST', '/niches', data),
    update: (id, data) => req('PUT', `/niches/${id}`, data),
    delete: (id) => req('DELETE', `/niches/${id}`),
    chat: (params) => req('POST', '/niches/chat', params),
  },
  salesScripts: {
    list: () => req('GET', '/sales-scripts'),
    create: (data) => req('POST', '/sales-scripts', data),
    update: (id, data) => req('PUT', `/sales-scripts/${id}`, data),
    delete: (id) => req('DELETE', `/sales-scripts/${id}`),
    generate: (data) => req('POST', '/sales-scripts/generate', data),
  },
  callAnalyses: {
    list: () => req('GET', '/call-analyses'),
    get: (id) => req('GET', `/call-analyses/${id}`),
    create: (data) => req('POST', '/call-analyses', data),
  },
  contentPosts: {
    list: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return req('GET', '/content-posts' + (q ? `?${q}` : ''));
    },
    create: (data) => req('POST', '/content-posts', data),
    update: (id, data) => req('PUT', `/content-posts/${id}`, data),
    delete: (id) => req('DELETE', `/content-posts/${id}`),
    extractInsights: () => req('POST', '/content-posts/extract-insights', {}),
    generate: (data) => req('POST', '/content-posts/generate', data),
  },
  trackedCompetitors: {
    list: () => req('GET', '/tracked-competitors'),
    create: (data) => req('POST', '/tracked-competitors', data),
    delete: (id) => req('DELETE', `/tracked-competitors/${id}`),
  },
  community: {
    accounts: {
      list: () => req('GET', '/community/accounts'),
      create: (data) => req('POST', '/community/accounts', data),
      delete: (id) => req('DELETE', `/community/accounts/${id}`),
    },
    keywords: {
      list: () => req('GET', '/community/keywords'),
      create: (data) => req('POST', '/community/keywords', data),
      delete: (id) => req('DELETE', `/community/keywords/${id}`),
    },
    voiceSamples: {
      list: () => req('GET', '/community/voice-samples'),
      create: (data) => req('POST', '/community/voice-samples', data),
      delete: (id) => req('DELETE', `/community/voice-samples/${id}`),
    },
    feed: {
      list: (params) => {
        const q = new URLSearchParams(params || {}).toString();
        return req('GET', '/community/feed' + (q ? `?${q}` : ''));
      },
      updateReply: (id, data) => req('PUT', `/community/feed/${id}/reply`, data),
      updateStatus: (id, data) => req('PUT', `/community/feed/${id}/status`, data),
    },
  },
  assistant: {
    chat: (data) => req('POST', '/assistant/chat', data),
    history: () => req('GET', '/assistant/history'),
    clearHistory: () => req('DELETE', '/assistant/history'),
  },
  billing: {
    plan: () => req('GET', '/billing/plan'),
    plans: () => req('GET', '/billing/plans'),
    invoices: () => req('GET', '/billing/invoices'),
    credits: () => req('GET', '/billing/credits'),
    creditHistory: () => req('GET', '/billing/credits/history'),
    usageByAction: () => req('GET', '/billing/credits/usage-by-action'),
    creditCosts: () => req('GET', '/billing/credits/costs'),
  },
  notifications: {
    list: (params) => {
      const q = new URLSearchParams(params || {}).toString();
      return req('GET', '/notifications' + (q ? `?${q}` : ''));
    },
    markRead: (id) => req('PUT', `/notifications/${id}/read`),
    markAllRead: () => req('PUT', '/notifications/read-all'),
  },
  admin: {
    agencies: {
      list: () => req('GET', '/admin/agencies'),
      create: (data) => req('POST', '/admin/agencies', data),
      update: (id, data) => req('PUT', `/admin/agencies/${id}`, data),
      delete: (id) => req('DELETE', `/admin/agencies/${id}`),
    },
    organisations: {
      list: () => req('GET', '/admin/organisations'),
      get: (id) => req('GET', `/admin/organisations/${id}`),
      adjustCredits: (id, data) => req('PUT', `/admin/organisations/${id}/credits`, data),
      changePlan: (id, data) => req('PUT', `/admin/organisations/${id}/plan`, data),
    },
    users: {
      list: (params) => {
        const q = new URLSearchParams(params || {}).toString();
        return req('GET', '/admin/users' + (q ? `?${q}` : ''));
      },
    },
    supportTickets: {
      list: (params) => {
        const q = new URLSearchParams(params || {}).toString();
        return req('GET', '/admin/support-tickets' + (q ? `?${q}` : ''));
      },
      create: (data) => req('POST', '/admin/support-tickets', data),
      update: (id, data) => req('PUT', `/admin/support-tickets/${id}`, data),
    },
    featureFlags: {
      list: () => req('GET', '/admin/feature-flags'),
      update: (id, data) => req('PUT', `/admin/feature-flags/${id}`, data),
    },
    systemHealth: () => req('GET', '/admin/system-health'),
    errors: {
      list: () => req('GET', '/admin/errors'),
      resolve: (id, data) => req('PUT', `/admin/errors/${id}/resolve`, data),
    },
    billing: {
      plans: {
        list: () => req('GET', '/admin/billing/plans'),
        update: (id, data) => req('PUT', `/admin/billing/plans/${id}`, data),
      },
      invoices: {
        list: () => req('GET', '/admin/billing/invoices'),
        create: (data) => req('POST', '/admin/billing/invoices', data),
      },
      invoiceRetry: (id) => req('POST', `/admin/invoices/${id}/retry`),
      invoiceRefund: (id) => req('POST', `/admin/invoices/${id}/refund`),
    },
    discountCodes: {
      list: () => req('GET', '/admin/discount-codes'),
      create: (data) => req('POST', '/admin/discount-codes', data),
    },
  },
};
