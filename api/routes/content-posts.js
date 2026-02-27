import { Router } from 'express';
import { query, ensureOrgExists, getIntegrationCredentials } from '../db.js';

const router = Router();

async function getAnthropicKey(orgId) {
  const row = await getIntegrationCredentials(orgId, 'anthropic');
  return row?.credentials_json?.api_key || process.env.ANTHROPIC_API_KEY;
}

async function callClaude(apiKey, system, userMessage, maxTokens = 2048) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey.trim(), 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, system, messages: [{ role: 'user', content: userMessage }] }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || `Anthropic ${res.status}`);
  const data = JSON.parse(text);
  return (data.content || [])[0]?.text?.trim() || '';
}

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { status, platform } = req.query;
    let sql = 'SELECT * FROM content_posts WHERE org_id = $1';
    const params = [orgId];
    let p = 2;
    if (status) { sql += ` AND status = $${p++}`; params.push(status); }
    if (platform) { sql += ` AND platform = $${p++}`; params.push(platform); }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('content-posts GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { platform, title, body_text, format, slides, status, scheduled_at, project_id } = req.body || {};
    const result = await query(
      `INSERT INTO content_posts (org_id, project_id, platform, title, body_text, format, slides, status, scheduled_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10) RETURNING *`,
      [orgId, project_id || null, platform || 'linkedin', title || null, body_text || '',
       format || 'text', slides ? JSON.stringify(slides) : null, status || 'draft', scheduled_at || null, req.userId || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('content-posts POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { title, body_text, format, slides, status, scheduled_at, platform, stats: postStats } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (title !== undefined) { sets.push(`title = $${p++}`); vals.push(title); }
    if (body_text !== undefined) { sets.push(`body_text = $${p++}`); vals.push(body_text); }
    if (format !== undefined) { sets.push(`format = $${p++}`); vals.push(format); }
    if (slides !== undefined) { sets.push(`slides = $${p++}::jsonb`); vals.push(JSON.stringify(slides)); }
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (scheduled_at !== undefined) { sets.push(`scheduled_at = $${p++}`); vals.push(scheduled_at); }
    if (platform !== undefined) { sets.push(`platform = $${p++}`); vals.push(platform); }
    if (postStats !== undefined) { sets.push(`stats = $${p++}::jsonb`); vals.push(JSON.stringify(postStats)); }
    if (status === 'published') sets.push('published_at = now()');
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE content_posts SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('content-posts PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM content_posts WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('content-posts DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/extract-insights', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organisation required' });

    const apiKey = await getAnthropicKey(orgId);
    if (!apiKey) return res.status(503).json({ error: 'Anthropic not connected. Add your API key in Settings → Integrations.', code: 'ANTHROPIC_NOT_CONFIGURED' });

    let transcripts = [];
    try {
      const t1 = await query('SELECT id, name, transcript_text, prospect, source, created_at FROM call_analyses WHERE org_id = $1 ORDER BY created_at DESC LIMIT 20', [orgId]);
      transcripts = transcripts.concat(t1.rows.map(r => ({ type: 'call', id: r.id, name: r.name, prospect: r.prospect, text: r.transcript_text, date: r.created_at })));
    } catch (_) {}
    try {
      const t2 = await query('SELECT id, name, speaker_name, speaker_role, content_text, created_at FROM audit_transcripts WHERE org_id = $1 ORDER BY created_at DESC LIMIT 20', [orgId]);
      transcripts = transcripts.concat(t2.rows.map(r => ({ type: 'interview', id: r.id, name: r.name, speaker: r.speaker_name, role: r.speaker_role, text: r.content_text, date: r.created_at })));
    } catch (_) {}

    if (transcripts.length === 0) {
      return res.json({ insights: [], source: 'empty' });
    }

    const snippets = transcripts.slice(0, 15).map((t, i) => {
      const label = t.type === 'call'
        ? `Call${t.prospect ? ` with ${t.prospect}` : ''} — ${t.name || 'Untitled'}`
        : `Interview with ${t.speaker || 'Unknown'}${t.role ? ` (${t.role})` : ''} — ${t.name || 'Untitled'}`;
      const textSlice = (t.text || '').substring(0, 3000);
      return `--- Transcript ${i + 1}: ${label} (${t.date ? new Date(t.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }) : 'unknown date'}) ---\n${textSlice}`;
    }).join('\n\n');

    const system = `You extract compelling, quotable insights from sales calls and interview transcripts for use as LinkedIn content ideas.

For each transcript, find the most striking direct quote or paraphrased pain point that would resonate with a B2B audience on LinkedIn. Focus on:
- Pain points and frustrations
- Surprising admissions or "aha moments"  
- Budget/time waste revelations
- Misconceptions about technology or processes

Return a JSON array (no markdown, no extra text):
[{
  "title": "A short punchy quote in first person (use quotation marks)",
  "quote": "2-3 sentence context explaining what the person said and why it matters",
  "source": "Call with [Name] — [Date]" or "Interview with [Name] — [Date]",
  "callDate": "Mon DD"
}]

Generate 1 insight per transcript, max 6 total. Order by most compelling first.`;

    const llmResult = await callClaude(apiKey, system, `Extract content insights from these transcripts:\n\n${snippets}`);

    let insights = [];
    try {
      const match = llmResult.match(/\[[\s\S]*\]/);
      if (match) insights = JSON.parse(match[0]);
    } catch (_) {}

    res.json({ insights, source: 'llm', transcriptCount: transcripts.length });
  } catch (err) {
    console.error('content-posts/extract-insights error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(401).json({ error: 'Organisation required' });

    const apiKey = await getAnthropicKey(orgId);
    if (!apiKey) return res.status(503).json({ error: 'Anthropic not connected. Add your API key in Settings → Integrations.', code: 'ANTHROPIC_NOT_CONFIGURED' });

    const { topic, format, context } = req.body || {};
    if (!topic) return res.status(400).json({ error: 'topic required' });

    let brandVoice = '';
    try {
      const bv = await query(`SELECT settings_data FROM project_settings WHERE org_id = $1 AND settings_type = 'brand_voice' LIMIT 1`, [orgId]);
      if (bv.rows[0]?.settings_data) {
        const d = typeof bv.rows[0].settings_data === 'string' ? JSON.parse(bv.rows[0].settings_data) : bv.rows[0].settings_data;
        brandVoice = d.tone || d.voice || d.style || '';
      }
    } catch (_) {}

    const formatInstructions = {
      text: `Generate 2 LinkedIn text post options. Each should be 150-300 words, formatted for LinkedIn (short paragraphs, line breaks between ideas, use → for bullet points). Include a hook opening line and end with a question or CTA.

Return JSON (no markdown):
[{"content": "full post text here"}, {"content": "second option here"}]`,
      image: `Generate 2 LinkedIn image post options. Each has a short text caption (80-150 words) plus an image description. Format for LinkedIn with hook + context + CTA.

Return JSON (no markdown):
[{"content": "post caption text", "imageDescription": "description of what the image should show"}, {"content": "second option", "imageDescription": "image description"}]`,
      carousel: `Generate a LinkedIn carousel with 6-8 slides. Slide 1 is the title/hook, last slide is CTA. Each slide has short punchy text (max 20 words per slide).

Return JSON (no markdown):
{"slides": [{"slide": 1, "text": "Title text\\nSubtitle"}, {"slide": 2, "text": "Point 1\\nExplanation"}]}`,
    };

    const system = `You are a LinkedIn content strategist who writes viral, engaging B2B posts. Your style is conversational, direct, and insight-driven — never corporate or generic.

Writing rules:
- Start with a bold hook that stops the scroll
- Use short sentences and paragraphs (1-2 lines max)
- Include specific numbers and examples where possible
- Write in first person as a consultant/agency owner
- End with engagement drivers (questions, "agree or disagree?", polls)
- Never use hashtags in the middle of text (only at the very end if at all)
- Avoid clichés like "let me explain", "here's the thing", "game-changer"
${brandVoice ? `\nBrand voice guidelines: ${brandVoice}` : ''}

${formatInstructions[format] || formatInstructions.text}`;

    const userMsg = `Topic: ${topic}${context ? `\n\nAdditional context: ${context}` : ''}`;
    const llmResult = await callClaude(apiKey, system, userMsg, 3000);

    let posts = [];
    try {
      const match = llmResult.match(/[\[{][\s\S]*[\]}]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (format === 'carousel' && parsed.slides) {
          const colors = ['#4d9ef0', '#c4f04d', '#7B61FF', '#f0a84d', '#E1306C', '#22c55e', '#4d9ef0', '#c4f04d'];
          posts = [{ id: `gen_${Date.now()}`, format: 'carousel', slides: parsed.slides.map((s, i) => ({ ...s, bg: colors[i % colors.length] })) }];
        } else if (Array.isArray(parsed)) {
          posts = parsed.map((p, i) => ({ id: `gen_${Date.now()}_${i}`, format, content: p.content || '', imageDescription: p.imageDescription || null }));
        }
      }
    } catch (_) {}

    if (posts.length === 0) {
      posts = [{ id: `gen_${Date.now()}`, format: format || 'text', content: llmResult }];
    }

    res.json({ posts });
  } catch (err) {
    console.error('content-posts/generate error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
