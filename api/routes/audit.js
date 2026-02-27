import { Router } from 'express';
import { query, ensureOrgExists, getIntegrationCredentials } from '../db.js';

const router = Router();

async function getOpenRouterKey(orgId) {
  const row = await getIntegrationCredentials(orgId, 'openrouter');
  return row?.credentials_json?.api_key || process.env.OPENROUTER_API_KEY;
}

async function callPerplexitySonar(apiKey, systemPrompt, userPrompt) {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'perplexity/sonar-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4096,
      temperature: 0.3,
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`OpenRouter API error ${resp.status}: ${errBody}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || '';
}

const RESEARCH_SYSTEM_PROMPT = `You are a company research analyst. Given a company website URL, provide comprehensive, factual research about the company using the latest available information from the web.

Return your findings as a JSON object with this exact structure:
{
  "overview": "A 2-4 sentence summary of the company — what they do, their market position, founding year, headquarters, and notable facts.",
  "metrics": [
    { "key": "founded", "label": "Founded", "value": "YYYY" },
    { "key": "employees", "label": "Employees", "value": "count or range" },
    { "key": "revenue", "label": "Revenue", "value": "amount or range" },
    { "key": "industry", "label": "Industry", "value": "sector name" }
  ],
  "sections": [
    { "title": "Products & Services", "content": "Description of their main offerings..." },
    { "title": "Target Market", "content": "Who they serve, their ICP..." },
    { "title": "Technology Stack", "content": "Known technologies, platforms they use or build on..." },
    { "title": "Recent News", "content": "Notable recent developments, funding, partnerships..." },
    { "title": "Competitive Landscape", "content": "Key competitors and differentiation..." }
  ]
}

IMPORTANT:
- Use real, up-to-date data from the web. Do NOT fabricate information.
- If a data point is unavailable, use "N/A" for that value.
- For metrics, only include ones you have real data for. Remove any metric where the value would be "N/A".
- Keep sections concise but informative.
- Return ONLY the JSON object, no markdown fences, no explanation text.`;

// --- Company Research ---
router.post('/research', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { project_id, company_url } = req.body || {};
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    if (!company_url) return res.status(400).json({ error: 'company_url required' });

    const apiKey = await getOpenRouterKey(orgId);
    if (!apiKey) {
      return res.status(503).json({ error: 'OpenRouter API key not configured. Add it in Settings → Integrations → OpenRouter.' });
    }

    const rawContent = await callPerplexitySonar(
      apiKey,
      RESEARCH_SYSTEM_PROMPT,
      `Research this company thoroughly: ${company_url}`
    );

    let research;
    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      research = JSON.parse(cleaned);
    } catch {
      research = { overview: rawContent, metrics: [], sections: [] };
    }

    res.json({
      project_id,
      company_url,
      status: 'completed',
      research_data: research,
    });
  } catch (err) {
    console.error('audit/research POST', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Surveys CRUD ---
router.get('/surveys', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { project_id } = req.query;
    let sql = 'SELECT * FROM audit_surveys WHERE org_id = $1';
    const params = [orgId];
    if (project_id) { sql += ' AND project_id = $2'; params.push(project_id); }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('audit/surveys GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/surveys/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM audit_surveys WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('audit/surveys GET/:id', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/surveys', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { project_id, title, description, questions_json, status } = req.body || {};
    const result = await query(
      `INSERT INTO audit_surveys (org_id, project_id, title, description, questions_json, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6) RETURNING *`,
      [orgId, project_id || null, title || 'Untitled Survey', description || null,
       questions_json ? JSON.stringify(questions_json) : '[]', status || 'draft']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('audit/surveys POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/surveys/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { title, description, questions_json, status } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (title !== undefined) { sets.push(`title = $${p++}`); vals.push(title); }
    if (description !== undefined) { sets.push(`description = $${p++}`); vals.push(description); }
    if (questions_json !== undefined) { sets.push(`questions_json = $${p++}::jsonb`); vals.push(JSON.stringify(questions_json)); }
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(
      `UPDATE audit_surveys SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('audit/surveys PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/surveys/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM audit_surveys WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('audit/surveys DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// Survey responses
router.get('/surveys/:id/responses', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const survey = await query('SELECT id FROM audit_surveys WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    if (!survey.rows.length) return res.status(404).json({ error: 'Survey not found' });
    const result = await query('SELECT * FROM audit_responses WHERE survey_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    console.error('audit/surveys/:id/responses GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/surveys/:id/responses', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const survey = await query('SELECT id FROM audit_surveys WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    if (!survey.rows.length) return res.status(404).json({ error: 'Survey not found' });
    const { respondent_name, respondent_email, answers_json } = req.body || {};
    const result = await query(
      `INSERT INTO audit_responses (survey_id, respondent_name, respondent_email, answers_json)
       VALUES ($1, $2, $3, $4::jsonb) RETURNING *`,
      [req.params.id, respondent_name || null, respondent_email || null, answers_json ? JSON.stringify(answers_json) : '{}']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('audit/surveys/:id/responses POST', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Interviews CRUD ---
router.get('/interviews', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM audit_interview_questions WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('audit/interviews GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/interviews', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { project_id, interviewee_name, interviewee_role, department, questions_json, status, scheduled_at, duration_minutes, notes } = req.body || {};
    const result = await query(
      `INSERT INTO audit_interview_questions (org_id, project_id, interviewee_name, interviewee_role, department, questions_json, status, scheduled_at, duration_minutes, notes)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10) RETURNING *`,
      [orgId, project_id || null, interviewee_name || null, interviewee_role || null, department || null,
       questions_json ? JSON.stringify(questions_json) : '[]', status || 'scheduled', scheduled_at || null, duration_minutes || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('audit/interviews POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/interviews/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { status, notes, recording_url, questions_json, scheduled_at, duration_minutes } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (notes !== undefined) { sets.push(`notes = $${p++}`); vals.push(notes); }
    if (recording_url !== undefined) { sets.push(`recording_url = $${p++}`); vals.push(recording_url); }
    if (questions_json !== undefined) { sets.push(`questions_json = $${p++}::jsonb`); vals.push(JSON.stringify(questions_json)); }
    if (scheduled_at !== undefined) { sets.push(`scheduled_at = $${p++}`); vals.push(scheduled_at); }
    if (duration_minutes !== undefined) { sets.push(`duration_minutes = $${p++}`); vals.push(duration_minutes); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE audit_interview_questions SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('audit/interviews PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/interviews/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM audit_interview_questions WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('audit/interviews DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Transcripts CRUD ---
router.get('/transcripts', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM audit_transcripts WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('audit/transcripts GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/transcripts', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { project_id, name, speaker_name, speaker_role, department, content_text, source } = req.body || {};
    const result = await query(
      `INSERT INTO audit_transcripts (org_id, project_id, name, speaker_name, speaker_role, department, content_text, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orgId, project_id || null, name || 'Untitled', speaker_name || null, speaker_role || null, department || null, content_text || '', source || 'manual']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('audit/transcripts POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/transcripts/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { name, content_text, ai_summary, ai_insights, source } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name); }
    if (content_text !== undefined) { sets.push(`content_text = $${p++}`); vals.push(content_text); }
    if (ai_summary !== undefined) { sets.push(`ai_summary = $${p++}`); vals.push(ai_summary); }
    if (ai_insights !== undefined) { sets.push(`ai_insights = $${p++}::jsonb`); vals.push(JSON.stringify(ai_insights)); }
    if (source !== undefined) { sets.push(`source = $${p++}`); vals.push(source); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE audit_transcripts SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('audit/transcripts PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/transcripts/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM audit_transcripts WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('audit/transcripts DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Process Maps CRUD ---
router.get('/process-maps', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM process_maps WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('audit/process-maps GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/process-maps', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { project_id, title, description, nodes, edges, ai_generated } = req.body || {};
    const result = await query(
      `INSERT INTO process_maps (org_id, project_id, title, description, nodes, edges, ai_generated)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7) RETURNING *`,
      [orgId, project_id || null, title || 'Untitled', description || null,
       nodes ? JSON.stringify(nodes) : '[]', edges ? JSON.stringify(edges) : '[]', ai_generated || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('audit/process-maps POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/process-maps/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { title, description, nodes, edges } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (title !== undefined) { sets.push(`title = $${p++}`); vals.push(title); }
    if (description !== undefined) { sets.push(`description = $${p++}`); vals.push(description); }
    if (nodes !== undefined) { sets.push(`nodes = $${p++}::jsonb`); vals.push(JSON.stringify(nodes)); }
    if (edges !== undefined) { sets.push(`edges = $${p++}::jsonb`); vals.push(JSON.stringify(edges)); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE process_maps SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('audit/process-maps PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/process-maps/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM process_maps WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('audit/process-maps DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Analysis ---
router.post('/analyse', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { project_id } = req.body || {};
    if (!project_id) return res.status(400).json({ error: 'project_id required' });
    const result = await query(
      `INSERT INTO audit_analyses (org_id, project_id, status, analysis_json)
       VALUES ($1, $2, 'completed', '{}'::jsonb) RETURNING *`,
      [orgId, project_id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('audit/analyse POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analyses', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { project_id } = req.query;
    let sql = 'SELECT * FROM audit_analyses WHERE org_id = $1';
    const params = [orgId];
    if (project_id) { sql += ' AND project_id = $2'; params.push(project_id); }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('audit/analyses GET', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
