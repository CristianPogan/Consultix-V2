import { Router } from 'express';
import { query, ensureOrgExists, getIntegrationCredentials } from '../db.js';
import { getSystemPromptForOrg } from './admin-prompts.js';

const router = Router();

let _nichesTableReady = false;
async function ensureNichesTable() {
  if (_nichesTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS niches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Untitled Niche',
      audience TEXT,
      market_size TEXT,
      competition TEXT,
      demand TEXT,
      avg_deal TEXT,
      positioning TEXT,
      score INT,
      monetisation TEXT,
      advantage TEXT,
      channels TEXT,
      why_niche TEXT,
      details JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_niches_org ON niches(org_id)').catch(() => {});
  const cols = [
    { name: 'monetisation', type: 'TEXT' },
    { name: 'advantage', type: 'TEXT' },
    { name: 'channels', type: 'TEXT' },
    { name: 'why_niche', type: 'TEXT' },
    { name: 'details', type: 'JSONB DEFAULT \'{}\''},
  ];
  for (const c of cols) {
    await query(`ALTER TABLE niches ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`).catch(() => {});
  }
  _nichesTableReady = true;
}

async function getAnthropicKey(orgId) {
  const row = await getIntegrationCredentials(orgId, 'anthropic');
  return row?.credentials_json?.api_key || process.env.ANTHROPIC_API_KEY;
}

const NICHE_SYSTEM_PROMPT = `You are a Niche Research Strategist helping consultants, agency owners, and B2B service providers find their ideal market niche.

Guide the user through a structured discovery conversation. Ask ONE concise question at a time (1-2 sentences). Your flow:
1. Ask about their core skills and expertise
2. Ask who they've had the best results with (industry, company size, job role)
3. Ask what problem they solve better than anyone
4. Ask about their price range and model (project, retainer, productised)
5. Ask how competitive they want their niche to be
6. Ask where their target customers hang out (channels, communities)

After the user has answered all 6 questions (you will have sent 5 follow-up questions after the initial greeting, and received 6 total user messages), generate exactly 4 niche recommendations.

When generating niches, output the recommendations as a JSON array wrapped in <NICHES> tags. Include a short conversational message before the tags telling the user to check the dashboard.

Example format:
I've identified 4 high-potential niches based on your expertise. Check the dashboard on the right — each card shows score, market size, and avg deal. Click any card for details.

Hit 💾 Save on any niche to add it to your library.

<NICHES>
[
  {
    "name": "AI Automation for Mid-Market B2B SaaS",
    "score": 92,
    "size": "~12,000 companies",
    "competition": "Medium",
    "demand": "High",
    "avgDeal": "£15-30K",
    "audience": "VPs of Sales & CROs at Series B+ B2B SaaS (50-500 employees)",
    "positioning": "The one-person AI consultancy delivering enterprise-level outbound systems",
    "monetisation": "AI Audit (£2-5K) → Implementation (£15-30K) → Retainer (£3-5K/mo)",
    "advantage": "AI-native methodology, rapid deployment, proven systems",
    "channels": "LinkedIn, Skool, cold outreach, referral network",
    "why": "High willingness to pay, proven demand, methodology gives unfair speed advantage"
  }
]
</NICHES>

Rules for niche generation:
- score: 0-100 based on market fit, demand vs competition, and alignment with their skills
- competition: one of "Very Low", "Low", "Medium", "High", "Very High"
- demand: one of "Low", "Medium", "High", "Very High"
- Generate 4 niches with varying scores (at least one 85+, one 70-84)
- Make niches specific and actionable, not generic
- avgDeal should reflect their stated pricing model/range
- Tailor everything to the user's actual skills and experience

If the user sends a refinement message AFTER niches have been generated, re-generate 4 adjusted niches using the same <NICHES> format, incorporating their feedback.

IMPORTANT: Only output the <NICHES> tags when you have gathered enough information (after ~6 user messages). Before that, ask your discovery questions one at a time.`;

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureNichesTable();
    const result = await query('SELECT * FROM niches WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('niches GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    await ensureNichesTable();
    const { name, audience, market_size, competition, demand, avg_deal, positioning, score,
            monetisation, advantage, channels, why_niche, details } = req.body || {};
    const result = await query(
      `INSERT INTO niches (org_id, name, audience, market_size, competition, demand, avg_deal,
        positioning, score, monetisation, advantage, channels, why_niche, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [orgId, name || 'Untitled Niche', audience || null, market_size || null,
       competition || null, demand || null, avg_deal || null, positioning || null,
       score || null, monetisation || null, advantage || null, channels || null,
       why_niche || null, details ? JSON.stringify(details) : '{}']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('niches POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/chat', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organisation required' });

    const apiKey = await getAnthropicKey(orgId);
    if (!apiKey) {
      return res.status(503).json({
        error: 'Anthropic not connected. Add your API key in Settings → Integrations → LLM.',
        code: 'ANTHROPIC_NOT_CONFIGURED',
      });
    }

    const { message, messages: history = [] } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message required' });

    const anthropicMessages = history.slice(-20).map(m => ({
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
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: await getSystemPromptForOrg(orgId, 'niche_researcher'),
        messages: anthropicMessages,
      }),
    });

    const resText = await anthropicRes.text();
    if (!anthropicRes.ok) {
      if (anthropicRes.status === 401) {
        return res.status(503).json({
          error: 'Invalid Anthropic API key. Check Settings → Integrations → LLM.',
          code: 'ANTHROPIC_INVALID_KEY',
        });
      }
      return res.status(anthropicRes.status).json({ error: resText || 'Anthropic API error', code: 'ANTHROPIC_ERROR' });
    }

    const data = JSON.parse(resText);
    const fullText = (data.content || [])[0]?.text?.trim() || '';

    let agentText = fullText;
    let niches = null;

    const nichesMatch = fullText.match(/<NICHES>\s*([\s\S]*?)\s*<\/NICHES>/);
    if (nichesMatch) {
      try {
        niches = JSON.parse(nichesMatch[1]);
        if (!Array.isArray(niches)) niches = null;
      } catch (_) {
        niches = null;
      }
      agentText = fullText.replace(/<NICHES>[\s\S]*<\/NICHES>/, '').trim();
      if (!agentText) {
        agentText = "I've identified high-potential niches based on your expertise. Check the dashboard on the right — click any card for details.\n\nHit 💾 Save on any niche to add it to your library.";
      }
    }

    res.json({ agentText, niches });
  } catch (err) {
    console.error('niches/chat error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureNichesTable();
    const fields = ['name', 'audience', 'market_size', 'competition', 'demand', 'avg_deal',
                    'positioning', 'score', 'monetisation', 'advantage', 'channels', 'why_niche', 'details'];
    const sets = []; const vals = []; let p = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        sets.push(`${f} = $${p++}`);
        vals.push(f === 'details' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE niches SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('niches PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureNichesTable();
    const result = await query('DELETE FROM niches WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('niches DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
