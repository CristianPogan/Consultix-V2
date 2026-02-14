const API_BASE = '/api';

async function req(method, path, body) {
  const opt = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opt.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, opt);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
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
};
