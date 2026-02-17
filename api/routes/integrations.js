import { Router } from 'express';
import {
  listIntegrationCredentials,
  getIntegrationCredentials,
  saveIntegrationCredentials,
  getIntegrationServiceOrder,
  saveIntegrationServiceOrder,
  getIntegrationCosts,
} from '../db.js';

const router = Router();

// POST /api/integrations/anthropic/connect - Validate API key then save (must be before :key)
router.post('/anthropic/connect', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { credentials } = req.body || {};
    const apiKey = credentials?.api_key || credentials?.apiKey;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'API key required' });
    }
    const testRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    if (!testRes.ok) {
      const err = await testRes.text();
      if (testRes.status === 401) return res.status(401).json({ error: 'Invalid API key' });
      if (testRes.status === 403) return res.status(403).json({ error: 'API key lacks permission or billing issue' });
      return res.status(400).json({ error: err || 'Failed to validate API key' });
    }
    await saveIntegrationCredentials(orgId, 'anthropic', { api_key: apiKey.trim() });
    res.json({ integration_key: 'anthropic', connected: true });
  } catch (err) {
    console.error('Anthropic connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/openai/connect - Validate API key then save
router.post('/openai/connect', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { credentials } = req.body || {};
    const apiKey = credentials?.api_key || credentials?.apiKey;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    if (!apiKey || typeof apiKey !== 'string') return res.status(400).json({ error: 'API key required' });
    const testRes = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });
    if (!testRes.ok) {
      if (testRes.status === 401) return res.status(401).json({ error: 'Invalid API key' });
      if (testRes.status === 403) return res.status(403).json({ error: 'API key lacks permission or billing issue' });
      return res.status(400).json({ error: (await testRes.text()) || 'Failed to validate API key' });
    }
    await saveIntegrationCredentials(orgId, 'openai', { api_key: apiKey.trim() });
    res.json({ integration_key: 'openai', connected: true });
  } catch (err) {
    console.error('OpenAI connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/gemini/connect - Validate API key then save
router.post('/gemini/connect', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { credentials } = req.body || {};
    const apiKey = credentials?.api_key || credentials?.apiKey;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    if (!apiKey || typeof apiKey !== 'string') return res.status(400).json({ error: 'API key required' });
    const testRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey.trim())}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }),
    });
    if (!testRes.ok) {
      if (testRes.status === 401 || testRes.status === 400) return res.status(401).json({ error: 'Invalid API key' });
      if (testRes.status === 403) return res.status(403).json({ error: 'API key lacks permission or billing issue' });
      return res.status(400).json({ error: (await testRes.text()) || 'Failed to validate API key' });
    }
    await saveIntegrationCredentials(orgId, 'gemini', { api_key: apiKey.trim() });
    res.json({ integration_key: 'gemini', connected: true });
  } catch (err) {
    console.error('Gemini connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/grok/connect - Validate API key then save
router.post('/grok/connect', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { credentials } = req.body || {};
    const apiKey = credentials?.api_key || credentials?.apiKey;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    if (!apiKey || typeof apiKey !== 'string') return res.status(400).json({ error: 'API key required' });
    const testRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });
    if (!testRes.ok) {
      const errText = await testRes.text();
      if (testRes.status === 401) return res.status(401).json({ error: 'Invalid API key' });
      if (testRes.status === 403) return res.status(403).json({ error: 'API key lacks permission or billing issue' });
      return res.status(400).json({ error: errText || 'Failed to validate API key' });
    }
    await saveIntegrationCredentials(orgId, 'grok', { api_key: apiKey.trim() });
    res.json({ integration_key: 'grok', connected: true });
  } catch (err) {
    console.error('Grok connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/calendly/connect - Save Calendly OAuth credentials (client_id, client_secret, webhook_signing_key)
router.post('/calendly/connect', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { credentials } = req.body || {};
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    const clientId = credentials?.client_id;
    const clientSecret = credentials?.client_secret;
    const webhookKey = credentials?.webhook_signing_key;
    if (!clientId || !clientSecret || !webhookKey || typeof clientId !== 'string' || typeof clientSecret !== 'string' || typeof webhookKey !== 'string') {
      return res.status(400).json({ error: 'Client ID, Client Secret, and Webhook Signing Key required' });
    }
    await saveIntegrationCredentials(orgId, 'calendly', {
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
      webhook_signing_key: webhookKey.trim(),
    });
    res.json({ integration_key: 'calendly', connected: true });
  } catch (err) {
    console.error('Calendly connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/calcom/connect - Validate API key then save
router.post('/calcom/connect', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { credentials } = req.body || {};
    const apiKey = credentials?.api_key || credentials?.apiKey;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    if (!apiKey || typeof apiKey !== 'string') return res.status(400).json({ error: 'API key required' });
    const testRes = await fetch('https://api.cal.com/v2/me', {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
    });
    if (!testRes.ok) {
      if (testRes.status === 401) return res.status(401).json({ error: 'Invalid API key' });
      if (testRes.status === 403) return res.status(403).json({ error: 'API key lacks permission' });
      return res.status(400).json({ error: (await testRes.text()) || 'Failed to validate API key' });
    }
    await saveIntegrationCredentials(orgId, 'calcom', { api_key: apiKey.trim() });
    res.json({ integration_key: 'calcom', connected: true });
  } catch (err) {
    console.error('Cal.com connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/google-calendar/connect - Save OAuth credentials; user completes sign-in via /google-calendar/auth
router.post('/google-calendar/connect', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { credentials } = req.body || {};
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    const clientId = credentials?.client_id;
    const clientSecret = credentials?.client_secret;
    if (!clientId || !clientSecret || typeof clientId !== 'string' || typeof clientSecret !== 'string') {
      return res.status(400).json({ error: 'Client ID and Client Secret required' });
    }
    await saveIntegrationCredentials(orgId, 'google_calendar', {
      client_id: clientId.trim(),
      client_secret: clientSecret.trim(),
    });
    res.json({ integration_key: 'google_calendar', connected: true });
  } catch (err) {
    console.error('Google Calendar connect error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/google-calendar/auth - Return Google OAuth URL for Sign in with Google (SPA uses window.location)
router.get('/google-calendar/auth', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    const row = await getIntegrationCredentials(orgId, 'google_calendar');
    const clientId = row?.credentials_json?.client_id;
    if (!clientId) return res.status(400).json({ error: 'Configure Google Calendar (Client ID & Secret) in Settings > Integrations first' });
    const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/google-calendar/callback`;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events');
    const state = Buffer.from(JSON.stringify({ orgId })).toString('base64');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
    res.json({ redirectUrl: url });
  } catch (err) {
    console.error('Google Calendar auth error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/google-calendar/callback - OAuth callback, exchange code for tokens
router.get('/google-calendar/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) return res.redirect(`/?google_calendar_error=${encodeURIComponent(error)}`);
    if (!code || !state) return res.redirect('/?google_calendar_error=missing_params');
    let orgId;
    try { orgId = JSON.parse(Buffer.from(state, 'base64').toString()).orgId; } catch (_) { return res.redirect('/?google_calendar_error=invalid_state'); }
    const row = await getIntegrationCredentials(orgId, 'google_calendar');
    const clientSecret = row?.credentials_json?.client_secret;
    if (!clientSecret) return res.redirect('/?google_calendar_error=no_credentials');
    const redirectUri = `${req.protocol}://${req.get('host')}/api/integrations/google-calendar/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: row.credentials_json.client_id, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code',
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) return res.redirect(`/?google_calendar_error=${encodeURIComponent(tokenData.error_description || tokenData.error || 'token_exchange_failed')}`);
    await saveIntegrationCredentials(orgId, 'google_calendar', {
      ...row.credentials_json,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expiry: tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null,
    });
    res.redirect('/?google_calendar_connected=1');
  } catch (err) {
    console.error('Google Calendar callback error:', err);
    res.redirect(`/?google_calendar_error=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/integrations/costs - Get cost_label per integration (must be before :key)
router.get('/costs', async (req, res) => {
  try {
    const costs = await getIntegrationCosts();
    res.json({ costs });
  } catch (err) {
    console.error('Get integration costs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/order/lead-search - Get lead search & enrichment order (must be before :key)
router.get('/order/lead-search', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    const row = await getIntegrationServiceOrder(orgId);
    res.json({
      leadSearch: row?.lead_search_order || [],
      leadEnrichment: row?.lead_enrichment_order || [],
    });
  } catch (err) {
    console.error('Get lead search order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/order/lead-search - Save lead search & enrichment order
router.post('/order/lead-search', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { leadSearch, leadEnrichment } = req.body;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    await saveIntegrationServiceOrder(orgId, leadSearch, leadEnrichment);
    res.json({ success: true });
  } catch (err) {
    console.error('Save lead search order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations - List all integration status for org
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) {
      return res.status(401).json({ error: 'Organization required' });
    }

    const rows = await listIntegrationCredentials(orgId);
    const statusMap = {};
    for (const r of rows) {
      if (r.integration_key === 'google_calendar') {
        const row = await getIntegrationCredentials(orgId, 'google_calendar');
        const signedIn = !!(row?.credentials_json?.access_token);
        statusMap[r.integration_key] = { connected: r.connected, signedIn };
      } else {
        statusMap[r.integration_key] = r.connected;
      }
    }
    res.json({ integrations: statusMap });
  } catch (err) {
    console.error('List integrations error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/integrations/:key - Get credential status for a single integration (returns connected, no secret values)
router.get('/:key', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { key } = req.params;
    if (!orgId || !key) {
      return res.status(400).json({ error: 'Organization and integration key required' });
    }

    const row = await getIntegrationCredentials(orgId, key);
    if (!row) {
      return res.json({ integration_key: key, connected: false, signedIn: false, credentials_json: {} });
    }
    const creds = row.credentials_json || {};
    const signedIn = key === 'google_calendar' ? !!creds.access_token : null;
    res.json({
      integration_key: row.integration_key,
      connected: row.connected,
      signedIn: signedIn ?? undefined,
      credentials_json: row.credentials_json,
    });
  } catch (err) {
    console.error('Get integration error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/integrations/:key - Save credentials for an integration
router.post('/:key', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { key } = req.params;
    const { credentials } = req.body;

    if (!orgId || !key) {
      return res.status(400).json({ error: 'Organization and integration key required' });
    }

    const creds = credentials && typeof credentials === 'object' ? credentials : {};
    await saveIntegrationCredentials(orgId, key, creds);
    res.json({ integration_key: key, connected: true });
  } catch (err) {
    console.error('Save integration error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
