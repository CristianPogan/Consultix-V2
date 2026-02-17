import { Router } from 'express';
import { query, getIntegrationCredentials, ensureOrgExists, ensureProjectSettingsTable } from '../db.js';

const router = Router();

async function getAnthropicKey(orgId) {
  const row = await getIntegrationCredentials(orgId, 'anthropic');
  return row?.credentials_json?.api_key || process.env.ANTHROPIC_API_KEY;
}

const DEFAULT_SYSTEM_PROMPT = `You are the AI Council — a strategic advisor powered by the user's project data, audit findings, and market intelligence.

Your role: Provide multi-perspective strategic analysis. When the user asks a strategy question, implementation advice, or asks you to analyse a decision, respond with a structured analysis.

IMPORTANT: You MUST respond with valid JSON only. Use this exact structure (no markdown, no extra text):
{"title":"Strategic Analysis","sections":[{"heading":"Assessment","content":"..."},{"heading":"Recommendation","content":"..."},{"heading":"Risk Factors","content":"..."},{"heading":"Next Steps","content":"..."}]}

Rules:
- heading must be one of: Assessment, Recommendation, Risk Factors, Next Steps (in that order)
- content is plain text, use \\n for newlines within a section
- Be concise but substantive — 2-4 sentences per section
- For short greetings or non-analysis questions, return a simple agent message instead of JSON (see below)

For simple conversational replies (greetings, clarifications, "thanks"), respond with plain text only — no JSON. The client will detect JSON vs plain text.`;

async function getSystemPrompt(orgId) {
  await ensureProjectSettingsTable();
  const res = await query(
    `SELECT settings_data FROM project_settings
     WHERE org_id = $1 AND project_id = '' AND settings_type = 'ai_council'
     AND (user_id IS NULL)`,
    [orgId]
  );
  const data = res.rows[0]?.settings_data;
  return (data && typeof data === 'object' && data.system_prompt) ? data.system_prompt : DEFAULT_SYSTEM_PROMPT;
}

async function saveSystemPrompt(orgId, systemPrompt) {
  await ensureOrgExists(orgId);
  await ensureProjectSettingsTable();
  const existing = await query(
    `SELECT id FROM project_settings
     WHERE org_id = $1 AND project_id = '' AND settings_type = 'ai_council'
     AND user_id IS NULL`,
    [orgId]
  );
  if (existing.rows.length > 0) {
    await query(
      `UPDATE project_settings SET settings_data = $2, updated_at = now()
       WHERE org_id = $1 AND project_id = '' AND settings_type = 'ai_council'
       AND user_id IS NULL`,
      [orgId, JSON.stringify({ system_prompt: systemPrompt })]
    );
  } else {
    await query(
      `INSERT INTO project_settings (org_id, project_id, user_id, settings_type, settings_data)
       VALUES ($1, '', NULL, 'ai_council', $2)`,
      [orgId, JSON.stringify({ system_prompt: systemPrompt })]
    );
  }
  return { success: true };
}

// GET /api/ai-council/system-prompt
router.get('/system-prompt', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    const prompt = await getSystemPrompt(orgId);
    res.json({ systemPrompt: prompt });
  } catch (err) {
    console.error('AI Council get system prompt error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-council/system-prompt
router.post('/system-prompt', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });
    const { systemPrompt } = req.body || {};
    if (typeof systemPrompt !== 'string') return res.status(400).json({ error: 'systemPrompt string required' });
    await saveSystemPrompt(orgId, systemPrompt);
    res.json({ success: true });
  } catch (err) {
    console.error('AI Council save system prompt error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-council/chat
router.post('/chat', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organization required' });

    const apiKey = await getAnthropicKey(orgId);
    if (!apiKey) {
      return res.status(503).json({
        error: 'Anthropic not connected. Add your API key in Settings > Integrations > LLM.',
        code: 'ANTHROPIC_NOT_CONFIGURED',
      });
    }

    const { message, messages: history = [] } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });

    const systemPrompt = await getSystemPrompt(orgId);

    const anthropicMessages = history.slice(-10).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text || '',
    }));
    anthropicMessages.push({ role: 'user', content: message });

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2048,
        system: systemPrompt,
        messages: anthropicMessages,
      }),
    });

    const resText = await anthropicRes.text();
    if (!anthropicRes.ok) {
      if (anthropicRes.status === 401) {
        return res.status(503).json({
          error: 'Invalid Anthropic API key. Please check Settings > Integrations > LLM.',
          code: 'ANTHROPIC_INVALID_KEY',
        });
      }
      return res.status(anthropicRes.status).json({
        error: resText || 'Anthropic API error',
        code: 'ANTHROPIC_ERROR',
      });
    }

    const data = JSON.parse(resText);
    const text = (data.content || [])[0]?.text?.trim() || '';

    let output = null;
    let agentText = text;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.title && Array.isArray(parsed.sections)) {
          output = { title: parsed.title, sections: parsed.sections };
          agentText = "I've prepared a strategic analysis based on your question. Check the output panel for the full breakdown.\n\nWant me to dig deeper into any specific area?";
        }
      } catch (_) {}
    }

    res.json({ agentText, output });
  } catch (err) {
    console.error('AI Council chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
