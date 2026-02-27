import { Router } from 'express';
import { query, ensureOrgExists, getIntegrationCredentials } from '../db.js';

const router = Router();

const ASSISTANT_SYSTEM_PROMPT = `You are a helpful AI Assistant with full context on the user's Pipeline account — their leads, CRM deals, campaigns, audit projects, and more.

Your role: Answer questions, provide insights, and help with tasks using the user's actual data context.

Guidelines:
- Be concise and helpful
- Reference specific data points when available
- Suggest actionable next steps
- Use a professional but friendly tone
- If you don't have specific data, acknowledge it and suggest how to get it`;

async function getSystemPrompt(orgId) {
  try {
    const res = await query(
      `SELECT settings_data FROM project_settings
       WHERE org_id = $1 AND settings_type = 'ai_assistant'
       AND (user_id IS NULL) LIMIT 1`,
      [orgId]
    );
    const data = res.rows[0]?.settings_data;
    return (data && typeof data === 'object' && data.system_prompt) ? data.system_prompt : ASSISTANT_SYSTEM_PROMPT;
  } catch {
    return ASSISTANT_SYSTEM_PROMPT;
  }
}

async function getAnthropicKey(orgId) {
  const row = await getIntegrationCredentials(orgId, 'anthropic');
  return row?.credentials_json?.api_key || process.env.ANTHROPIC_API_KEY;
}

async function getOrgContext(orgId) {
  try {
    const [leadsRes, dealsRes, campaignsRes] = await Promise.allSettled([
      query('SELECT COUNT(*) as count FROM leads WHERE org_id = $1', [orgId]),
      query('SELECT COUNT(*) as count, stage FROM crm_deals WHERE org_id = $1 GROUP BY stage', [orgId]),
      query('SELECT COUNT(*) as count FROM outreach_campaigns WHERE org_id = $1', [orgId]),
    ]);
    const leadCount = leadsRes.status === 'fulfilled' ? leadsRes.value.rows[0]?.count || 0 : 0;
    const dealStages = dealsRes.status === 'fulfilled' ? dealsRes.value.rows : [];
    const campaignCount = campaignsRes.status === 'fulfilled' ? campaignsRes.value.rows[0]?.count || 0 : 0;
    return `\n\nCurrent account context:\n- Total leads: ${leadCount}\n- CRM deals: ${dealStages.map(d => `${d.stage}: ${d.count}`).join(', ') || 'none'}\n- Active campaigns: ${campaignCount}`;
  } catch {
    return '';
  }
}

router.post('/chat', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { message } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    await ensureOrgExists(orgId);
    await query(
      `INSERT INTO assistant_chat_history (org_id, user_id, role, content) VALUES ($1, $2, 'user', $3)`,
      [orgId, req.userId || null, message]
    );

    const apiKey = await getAnthropicKey(orgId);
    let reply;

    if (apiKey) {
      const systemPrompt = await getSystemPrompt(orgId);
      const orgContext = await getOrgContext(orgId);

      const historyRes = await query(
        `SELECT role, content FROM assistant_chat_history WHERE org_id = $1 AND (user_id = $2 OR user_id IS NULL) ORDER BY created_at DESC LIMIT 20`,
        [orgId, req.userId || null]
      );
      const history = historyRes.rows.reverse().slice(0, -1);

      const anthropicMessages = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content || '',
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
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          system: systemPrompt + orgContext,
          messages: anthropicMessages,
        }),
      });

      if (anthropicRes.ok) {
        const data = await anthropicRes.json();
        reply = (data.content || [])[0]?.text?.trim() || 'I couldn\'t generate a response. Please try again.';
      } else {
        reply = `I can help you with that. Based on your data, here's what I found regarding: "${message.substring(0, 100)}"\n\n(AI response unavailable — check Anthropic API key in Settings > Integrations)`;
      }
    } else {
      reply = `I can help you with that. Based on your data, here's what I found regarding: "${message.substring(0, 100)}"\n\nTo enable full AI responses, connect your Anthropic API key in Settings > Integrations.`;
    }

    await query(
      `INSERT INTO assistant_chat_history (org_id, user_id, role, content) VALUES ($1, $2, 'assistant', $3)`,
      [orgId, req.userId || null, reply]
    );
    res.json({ reply, role: 'assistant' });
  } catch (err) {
    console.error('assistant/chat POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT * FROM assistant_chat_history WHERE org_id = $1 AND (user_id = $2 OR user_id IS NULL) ORDER BY created_at ASC LIMIT 200`,
      [orgId, req.userId || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('assistant/history GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/history', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await query('DELETE FROM assistant_chat_history WHERE org_id = $1 AND (user_id = $2 OR user_id IS NULL)', [orgId, req.userId || null]);
    res.json({ deleted: true });
  } catch (err) {
    console.error('assistant/history DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
