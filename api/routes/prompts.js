import { Router } from 'express';
import { query, getOrgId } from '../db.js';

const router = Router();

// messaging_copies: category = messaging_category (email_subject, linkedin_opener, value_prop, etc.)
// We use a custom category 'personalisation_prompt' for saved prompts
// Schema: category messaging_category, content text, name text

// GET /api/prompts — list saved personalisation prompts (messaging_copies with category we define)
router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT id, name, content, audience, use_count, created_at
       FROM messaging_copies
       WHERE org_id = $1 AND category = 'value_prop'
       ORDER BY use_count DESC, created_at DESC`,
      [orgId]
    );
    const rows = result.rows.map(r => ({
      id: r.id,
      key: r.id,
      label: r.name || 'Untitled',
      text: r.content || '',
      audience: r.audience,
      useCount: r.use_count,
      createdAt: r.created_at,
    }));
    res.json(rows);
  } catch (err) {
    console.error('prompts GET', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prompts — create saved prompt
router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { label, text, key } = req.body || {};
    const result = await query(
      `INSERT INTO messaging_copies (org_id, name, category, content)
       VALUES ($1, $2, 'value_prop', $3)
       RETURNING id, name, content, use_count, created_at`,
      [orgId, label || 'Custom Prompt', text || '']
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      key: key || r.id,
      label: r.name,
      text: r.content,
      useCount: r.use_count,
      createdAt: r.created_at,
    });
  } catch (err) {
    console.error('prompts POST', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prompts/defaults — seed/default prompts (when DB has none, return hardcoded fallbacks)
router.get('/defaults', async (req, res) => {
  const defaults = {
    default: {
      label: 'Cold Intro — Pain Point Focused',
      text: `You are a world-class cold email copywriter. Write a personalized cold email for each lead using the enrichment data provided.

Rules:
- Open with something specific to THEM (recent news, LinkedIn activity, company milestone)
- Connect their situation to the value we provide — don't just pitch
- Keep it under 120 words
- Sound like a real person, not a marketer
- End with a low-friction CTA (15-min call, not "buy now")
- Never use "I hope this email finds you well" or similar filler

Available data per lead:
- Name, title, company, industry
- Company news & recent events
- LinkedIn bio, recent posts, connections
- Tech stack, employee count, revenue`,
    },
    warm: { label: 'Warm Referral Style', text: `You are writing a warm, referral-style cold email. The tone should feel like a mutual connection introduced you. Rules: Lead with a specific observation. Be conversational, under 80 words. CTA: "Would it make sense to connect?"` },
    direct: { label: 'Direct Value Prop', text: `Direct, no-nonsense cold email. One sentence context, one sentence value, one sentence proof. Under 60 words. CTA: "15 min this week?"` },
    founder: { label: 'Founder-to-Founder', text: `Founder writing to founder/CEO. Peer-to-peer tone. Reference something they've built. Keep under 100 words. CTA: "Would love to compare notes."` },
  };
  res.json(defaults);
});

export default router;
