import { Router } from 'express';
import { getIntegrationCredentials } from '../db.js';

const router = Router();

async function getAnthropicKey(orgId) {
  const row = await getIntegrationCredentials(orgId, 'anthropic');
  return row?.credentials_json?.api_key || process.env.ANTHROPIC_API_KEY;
}

// POST /api/ai-sdr/generate-sample - Generate a sample SDR response via Anthropic
router.post('/generate-sample', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    const { guidelines, refineText } = req.body || {};
    const apiKey = await getAnthropicKey(orgId);
    if (!apiKey) return res.status(503).json({ error: 'Anthropic not connected. Add your API key in Settings > Integrations > LLM.' });

    const prompt = refineText
      ? `Rewrite this sales reply to be better (same intent, improved tone/clarity). Return ONLY the rewritten reply, no preamble:\n\n"${refineText}"`
      : `Generate one short, natural sales reply (2-4 sentences) for when a prospect shows interest. Professional, friendly, offers a meeting. Include no subject line or greeting — just the body. Guidelines: ${guidelines || 'Professional B2B tone'}`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      if (anthropicRes.status === 401) return res.status(401).json({ error: 'Invalid Anthropic API key' });
      return res.status(anthropicRes.status).json({ error: errText || 'Anthropic API error' });
    }

    const data = await anthropicRes.json();
    const text = data.content?.[0]?.text?.trim() || '';
    res.json({ text });
  } catch (err) {
    console.error('AI SDR generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
