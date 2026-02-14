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
  if (!apiKey) throw new Error('No API key. Set apiKey in localStorage or VITE_API_KEY.');
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
  prompts: {
    list: () => req('GET', '/prompts'),
    create: (data) => req('POST', '/prompts', data),
    getDefaults: () => req('GET', '/prompts/defaults'),
  },
  leadGeneration: {
    // Discovery
    discoverApollo: (params) => req('POST', '/lead-generation/discover/apollo', params),
    discoverGoogleMaps: (params) => req('POST', '/lead-generation/discover/google-maps', params),
    discoverIcyPeas: (params) => req('POST', '/lead-generation/discover/icypeas', params),
    
    // Enrichment
    enrichEmail: (person) => req('POST', '/lead-generation/enrich/email', person),
    verifyEmail: (email) => req('POST', '/lead-generation/verify/email', { email }),
    scrapeWebsite: (url) => req('POST', '/lead-generation/scrape/website', { url }),
    getLinkedInCompany: (slug) => req('GET', `/lead-generation/linkedin/company/${slug}`),
    
    // Personalization
    personalize: (params) => req('POST', '/lead-generation/personalize', params),
    
    // Outreach
    sendToHeyReach: (leads) => req('POST', '/lead-generation/outreach/heyreach', { leads }),
    sendToInstantly: (leads) => req('POST', '/lead-generation/outreach/instantly', { leads }),
  },
  settings: {
    get: (type) => req('GET', `/settings/${type}`),
    save: (type, settings) => req('POST', `/settings/${type}`, { settings }),
  },
  stats: {
    dashboard: () => req('GET', '/stats/dashboard'),
  },
};
