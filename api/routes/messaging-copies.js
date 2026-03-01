import { Router } from 'express';
import { query, ensureOrgExists, getIntegrationCredentials } from '../db.js';
import { getSystemPromptForOrg } from './admin-prompts.js';

const router = Router();

async function getAnthropicKey(orgId) {
  const row = await getIntegrationCredentials(orgId, 'anthropic');
  return row?.credentials_json?.api_key || process.env.ANTHROPIC_API_KEY;
}

const COPYWRITER_SYSTEM_PROMPT = `You are an AI Copywriter — a skilled outbound messaging strategist who guides users to build high-converting cold email sequences, LinkedIn messages, and subject lines.

Your role: Conduct a structured discovery conversation, then generate a complete messaging suite tailored to their answers.

## DISCOVERY FLOW (ask ONE question at a time, in this order)
1. **Audience**: "Hey! Let's build your outbound messaging. First — who are you targeting with this campaign? You can describe them or pick from one of your existing ICP lists."
2. **Offer**: "Got it. Now, what's the core offer or outcome you want to lead with? What would make them stop scrolling and actually read?"
3. **Pain**: "Nice. What's the #1 pain point you're solving for them? The thing that keeps them up at night."
4. **Proof**: "What proof do you have that you can deliver? Think case studies, numbers, client names, testimonials — anything that builds instant credibility."
5. **CTA**: "What's the CTA? What do you want them to actually do — book a call, reply, click a link, something else?"
6. **Tone**: "Last one — what tone fits this audience best? Formal and corporate? Casual and direct? Provocative? Consultative? Or something else?"

## RULES
- Ask ONE question per turn. Wait for the user's answer before moving on.
- Keep agent messages concise (1-3 sentences). Be friendly and direct.
- Count user messages in the conversation. Only after exactly 6 user answers (audience, offer, pain, proof, cta, tone) — generate the suite. Never output <SUITE> before the 6th user message.

## WHEN GENERATING THE SUITE (after 6 answers)
Output a JSON object wrapped in <SUITE> tags. Format:

<SUITE>
{
  "emails": [
    { "id": "e1", "label": "Initial Email — Variant A (Pain-Led)", "subject": "...", "body": "..." },
    { "id": "e2", "label": "Initial Email — Variant B (Result-Led)", "subject": "...", "body": "..." },
    { "id": "e3", "label": "Follow-up #1 (2 days later)", "subject": "...", "body": "..." },
    { "id": "e4", "label": "Follow-up #2 (4 days later)", "subject": "...", "body": "..." }
  ],
  "linkedin": [
    { "id": "l1", "label": "Connection Request — Variant A", "body": "..." },
    { "id": "l2", "label": "Connection Request — Variant B", "body": "..." },
    { "id": "l3", "label": "Follow-up Message (after acceptance)", "body": "..." }
  ],
  "subjects": ["subject line 1", "subject line 2", ...]
}
</SUITE>

## EMAIL REQUIREMENTS
- Use merge variables: {{first_name}}, {{company_name}}, [Your name]
- Emails: 2 initial variants (pain-led and result-led), 2 follow-ups (shorter, value-add)
- Keep bodies concise (4-6 short paragraphs max). No walls of text.
- Subject lines: curiosity, personalisation, outcome-focused. 15-20 varied options.

## REVISE MODE
If the user asks to revise a specific piece (e.g. "I'd like to revise: Initial Email — Variant A"), output an updated <SUITE> with ONLY that piece changed. Keep all other pieces identical. Apply their feedback precisely.`;

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM messaging_copies WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('messaging-copies GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { name, category, content, subject, audience, tone, project_id } = req.body || {};
    const result = await query(
      `INSERT INTO messaging_copies (org_id, project_id, name, category, content, subject, audience, tone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orgId, project_id || null, name || 'Untitled', category || null, content || '', subject || null, audience || null, tone || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('messaging-copies POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/copywriter-chat', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    const apiKey = await getAnthropicKey(orgId);
    if (!apiKey) {
      return res.status(503).json({
        error: 'Anthropic not connected. Add your API key in Settings → Integrations → LLM.',
        code: 'ANTHROPIC_NOT_CONFIGURED',
      });
    }

    const { messages = [], reviseRequest, currentSuite } = req.body || {};
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

    const anthropicMessages = messages.slice(-24).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: (m.text || '').trim(),
    }));

    let systemPrompt = await getSystemPromptForOrg(orgId, 'copywriter');
    if (reviseRequest && currentSuite) {
      const suiteJson = JSON.stringify(currentSuite);
      systemPrompt += `\n\nREVISE MODE: User wants to revise "${reviseRequest.itemLabel}". Their feedback: "${reviseRequest.userFeedback || 'make it better'}".\nCurrent suite (update only the requested piece, keep others identical):\n${suiteJson}\n\nOutput <SUITE> with the revised piece.`;
    }

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
        system: systemPrompt,
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
    let suite = null;

    const suiteMatch = fullText.match(/<SUITE>\s*([\s\S]*?)\s*<\/SUITE>/);
    if (suiteMatch) {
      try {
        suite = JSON.parse(suiteMatch[1]);
        if (!suite || typeof suite !== 'object') suite = null;
        else {
          if (!Array.isArray(suite.emails)) suite.emails = [];
          if (!Array.isArray(suite.linkedin)) suite.linkedin = [];
          if (!Array.isArray(suite.subjects)) suite.subjects = [];
          suite.emails = suite.emails.map((e, i) => ({ id: e.id || `e${i + 1}`, label: e.label || 'Email', subject: e.subject || '', body: e.body || '' }));
          suite.linkedin = suite.linkedin.map((l, i) => ({ id: l.id || `l${i + 1}`, label: l.label || 'LinkedIn', body: l.body || '' }));
        }
      } catch (_) {
        suite = null;
      }
      agentText = fullText.replace(/<SUITE>[\s\S]*<\/SUITE>/, '').trim();
      if (!agentText && suite) {
        agentText = "Your messaging suite is ready! I've created email variants with follow-ups, LinkedIn messages, and subject lines to A/B test.\n\nClick ✏️ Revise on any piece to refine it. When you're happy, hit Save Playbook.";
      }
    }

    res.json({ agentText, suite });
  } catch (err) {
    console.error('messaging-copies/copywriter-chat POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { category, audience, tone, context } = req.body || {};
    res.json({
      generated: true,
      category: category || 'general',
      content: `Generated ${category || 'general'} copy for ${audience || 'target audience'} in ${tone || 'professional'} tone.`,
      audience, tone,
    });
  } catch (err) {
    console.error('messaging-copies/generate POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { name, category, content, subject, audience, tone } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name); }
    if (category !== undefined) { sets.push(`category = $${p++}`); vals.push(category); }
    if (content !== undefined) { sets.push(`content = $${p++}`); vals.push(content); }
    if (subject !== undefined) { sets.push(`subject = $${p++}`); vals.push(subject); }
    if (audience !== undefined) { sets.push(`audience = $${p++}`); vals.push(audience); }
    if (tone !== undefined) { sets.push(`tone = $${p++}`); vals.push(tone); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE messaging_copies SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('messaging-copies PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM messaging_copies WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('messaging-copies DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
