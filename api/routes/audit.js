import { Router } from 'express';
import { query, ensureOrgExists, getIntegrationCredentials } from '../db.js';

const router = Router();

let _surveyTablesReady = false;
async function ensureSurveyTables() {
  if (_surveyTablesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS audit_surveys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      project_id TEXT,
      title TEXT NOT NULL DEFAULT 'Untitled Survey',
      description TEXT,
      questions_json JSONB DEFAULT '[]',
      status TEXT DEFAULT 'draft',
      target_respondents INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_audit_surveys_org ON audit_surveys(org_id)').catch(() => {});
  await query(`ALTER TABLE audit_surveys ALTER COLUMN project_id DROP NOT NULL`).catch(() => {});
  const surCols = [
    { name: 'target_respondents', type: 'INT DEFAULT 0' },
  ];
  for (const c of surCols) {
    await query(`ALTER TABLE audit_surveys ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`).catch(() => {});
  }

  await query(`
    CREATE TABLE IF NOT EXISTS audit_responses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      survey_id UUID NOT NULL,
      respondent_name TEXT,
      respondent_email TEXT,
      respondent_role TEXT,
      answers_json JSONB DEFAULT '{}',
      completed_at TIMESTAMPTZ DEFAULT now(),
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_audit_responses_survey ON audit_responses(survey_id)').catch(() => {});
  const resCols = [
    { name: 'respondent_role', type: 'TEXT' },
    { name: 'completed_at', type: 'TIMESTAMPTZ DEFAULT now()' },
  ];
  for (const c of resCols) {
    await query(`ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`).catch(() => {});
  }
  _surveyTablesReady = true;
}

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
    await ensureSurveyTables();
    const { project_id } = req.query;
    let sql = `SELECT s.*, COALESCE(rc.cnt, 0) AS response_count
               FROM audit_surveys s
               LEFT JOIN (SELECT survey_id, COUNT(*) AS cnt FROM audit_responses GROUP BY survey_id) rc
               ON rc.survey_id = s.id
               WHERE s.org_id = $1`;
    const params = [orgId];
    if (project_id) { sql += ' AND s.project_id = $2'; params.push(project_id); }
    sql += ' ORDER BY s.created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows.map(r => ({
      ...r,
      questions: r.questions_json || [],
      responses: parseInt(r.response_count) || 0,
      total: r.target_respondents || 0,
    })));
  } catch (err) {
    console.error('audit/surveys GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/surveys/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureSurveyTables();
    const result = await query('SELECT * FROM audit_surveys WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    const countRes = await query('SELECT COUNT(*) AS cnt FROM audit_responses WHERE survey_id = $1', [row.id]);
    res.json({
      ...row,
      questions: row.questions_json || [],
      responses: parseInt(countRes.rows[0]?.cnt) || 0,
      total: row.target_respondents || 0,
    });
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
    await ensureSurveyTables();
    const { project_id, title, description, questions_json, status, target_respondents } = req.body || {};
    const result = await query(
      `INSERT INTO audit_surveys (org_id, project_id, title, description, questions_json, status, target_respondents)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7) RETURNING *`,
      [orgId, project_id || null, title || 'Untitled Survey', description || null,
       questions_json ? JSON.stringify(questions_json) : '[]', status || 'draft', target_respondents || 0]
    );
    const row = result.rows[0];
    res.status(201).json({ ...row, questions: row.questions_json || [], responses: 0, total: row.target_respondents || 0 });
  } catch (err) {
    console.error('audit/surveys POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/surveys/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureSurveyTables();
    const { title, description, questions_json, status, target_respondents } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (title !== undefined) { sets.push(`title = $${p++}`); vals.push(title); }
    if (description !== undefined) { sets.push(`description = $${p++}`); vals.push(description); }
    if (questions_json !== undefined) { sets.push(`questions_json = $${p++}::jsonb`); vals.push(JSON.stringify(questions_json)); }
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (target_respondents !== undefined) { sets.push(`target_respondents = $${p++}`); vals.push(target_respondents); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(
      `UPDATE audit_surveys SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    const countRes = await query('SELECT COUNT(*) AS cnt FROM audit_responses WHERE survey_id = $1', [row.id]);
    res.json({ ...row, questions: row.questions_json || [], responses: parseInt(countRes.rows[0]?.cnt) || 0, total: row.target_respondents || 0 });
  } catch (err) {
    console.error('audit/surveys PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/surveys/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureSurveyTables();
    await query('DELETE FROM audit_responses WHERE survey_id = $1', [req.params.id]).catch(() => {});
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
    await ensureSurveyTables();
    const survey = await query('SELECT id FROM audit_surveys WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    if (!survey.rows.length) return res.status(404).json({ error: 'Survey not found' });
    const result = await query('SELECT * FROM audit_responses WHERE survey_id = $1 ORDER BY completed_at DESC, created_at DESC', [req.params.id]);
    res.json(result.rows.map(r => ({
      ...r,
      answers: r.answers_json || {},
    })));
  } catch (err) {
    console.error('audit/surveys/:id/responses GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/surveys/:id/responses', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureSurveyTables();
    const survey = await query('SELECT id FROM audit_surveys WHERE id = $1 AND org_id = $2', [req.params.id, orgId]);
    if (!survey.rows.length) return res.status(404).json({ error: 'Survey not found' });
    const { respondent_name, respondent_email, respondent_role, answers_json } = req.body || {};
    const result = await query(
      `INSERT INTO audit_responses (survey_id, respondent_name, respondent_email, respondent_role, answers_json, completed_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, now()) RETURNING *`,
      [req.params.id, respondent_name || null, respondent_email || null, respondent_role || null,
       answers_json ? JSON.stringify(answers_json) : '{}']
    );
    const row = result.rows[0];
    res.status(201).json({ ...row, answers: row.answers_json || {} });
  } catch (err) {
    console.error('audit/surveys/:id/responses POST', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Interviews CRUD ---
let _interviewTableReady = false;
async function ensureInterviewsTable() {
  if (_interviewTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS audit_interview_questions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      project_id TEXT,
      interviewee_name TEXT,
      interviewee_role TEXT,
      interviewee_type TEXT DEFAULT 'Stakeholder',
      department TEXT,
      questions_json JSONB DEFAULT '[]',
      status TEXT DEFAULT 'generated',
      scheduled_at TIMESTAMPTZ,
      duration_minutes INT,
      recording_url TEXT,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_audit_interviews_org ON audit_interview_questions(org_id)').catch(() => {});
  await query(`ALTER TABLE audit_interview_questions ALTER COLUMN project_id DROP NOT NULL`).catch(() => {});
  const cols = [
    { name: 'interviewee_type', type: "TEXT DEFAULT 'Stakeholder'" },
  ];
  for (const c of cols) {
    await query(`ALTER TABLE audit_interview_questions ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`).catch(() => {});
  }
  _interviewTableReady = true;
}

router.get('/interviews', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureInterviewsTable();
    const result = await query('SELECT * FROM audit_interview_questions WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows.map(r => ({
      ...r,
      questions: r.questions_json || [],
    })));
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
    await ensureInterviewsTable();
    const { project_id, interviewee_name, interviewee_role, interviewee_type, department, questions_json, status, scheduled_at, duration_minutes, notes } = req.body || {};
    const result = await query(
      `INSERT INTO audit_interview_questions (org_id, project_id, interviewee_name, interviewee_role, interviewee_type, department, questions_json, status, scheduled_at, duration_minutes, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11) RETURNING *`,
      [orgId, project_id || null, interviewee_name || null, interviewee_role || null, interviewee_type || 'Stakeholder',
       department || null, questions_json ? JSON.stringify(questions_json) : '[]',
       status || 'generated', scheduled_at || null, duration_minutes || null, notes || null]
    );
    const row = result.rows[0];
    res.status(201).json({ ...row, questions: row.questions_json || [] });
  } catch (err) {
    console.error('audit/interviews POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/interviews/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureInterviewsTable();
    const { status, notes, recording_url, questions_json, scheduled_at, duration_minutes, interviewee_name, interviewee_role, interviewee_type, department } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (interviewee_name !== undefined) { sets.push(`interviewee_name = $${p++}`); vals.push(interviewee_name); }
    if (interviewee_role !== undefined) { sets.push(`interviewee_role = $${p++}`); vals.push(interviewee_role); }
    if (interviewee_type !== undefined) { sets.push(`interviewee_type = $${p++}`); vals.push(interviewee_type); }
    if (department !== undefined) { sets.push(`department = $${p++}`); vals.push(department); }
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
    const row = result.rows[0];
    res.json({ ...row, questions: row.questions_json || [] });
  } catch (err) {
    console.error('audit/interviews PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/interviews/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureInterviewsTable();
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
let _analysisTableReady = false;
async function ensureAnalysesTable() {
  if (_analysisTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS audit_analyses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      project_id TEXT,
      status TEXT DEFAULT 'pending',
      analysis_json JSONB DEFAULT '{}',
      source_summary JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_audit_analyses_org ON audit_analyses(org_id)').catch(() => {});
  const cols = [
    { name: 'source_summary', type: "JSONB DEFAULT '{}'" },
  ];
  for (const c of cols) {
    await query(`ALTER TABLE audit_analyses ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`).catch(() => {});
  }
  _analysisTableReady = true;
}

async function getAnthropicKeyForAudit(orgId) {
  const row = await getIntegrationCredentials(orgId, 'anthropic');
  return row?.credentials_json?.api_key || process.env.ANTHROPIC_API_KEY;
}

async function callClaude(apiKey, systemPrompt, userPrompt, maxTokens = 4096) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey.trim(),
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Anthropic API error ${resp.status}: ${errBody}`);
  }
  const data = await resp.json();
  return data.content?.[0]?.text || '';
}

const ANALYSIS_SYSTEM_PROMPT = `You are an expert AI strategy consultant conducting an in-depth analysis of audit data for a client organisation. You have been given interview transcripts, survey responses, and interview question sets.

Your task: Analyse ALL provided data and produce a comprehensive strategic analysis as a JSON object.

Return ONLY a JSON object with this exact structure (no markdown fences, no extra text):
{
  "reasoning_steps": [
    { "type": "reading", "text": "description of data source being read", "detail": "what you're extracting" },
    { "type": "insight", "text": "specific finding from the data", "tag": "PAIN POINT|BUDGET|STRATEGIC|CRITICAL RISK|COMPLIANCE|SURVEY|OPPORTUNITY" },
    { "type": "theme", "text": "cross-cutting theme identified", "detail": "supporting evidence" },
    { "type": "matrix", "text": "opportunity classification" },
    { "type": "roadmap", "text": "implementation phase" },
    { "type": "value", "text": "ROI/value projection" },
    { "type": "complete", "text": "summary of analysis completion" }
  ],
  "themes": [
    { "title": "Theme title", "description": "Detailed description", "evidence": "Data sources supporting this", "impact": "high|medium|low" }
  ],
  "opportunities": [
    { "title": "Opportunity title", "description": "What to do", "category": "quick_win|big_swing|strategic|foundation", "impact": "high|medium|low", "complexity": "high|medium|low", "estimated_value": "£X" }
  ],
  "roadmap": [
    { "phase": 1, "title": "Phase title", "timeline": "Month X-Y", "description": "What happens", "estimated_cost": "£X-Y", "key_deliverables": ["item1", "item2"] }
  ],
  "executive_summary": "2-3 paragraph executive summary of the findings",
  "roi_summary": { "total_investment": "£X-Y", "year1_value": "£X-Y", "roi_multiple": "X.Xx", "payback_months": N }
}

IMPORTANT:
- Base ALL findings on the actual data provided — do NOT fabricate or assume data not present.
- If there are no transcripts or surveys, state that in the analysis.
- reasoning_steps should show your work — include 15-25 steps showing how you processed each data source.
- Be specific with numbers, names, and quotes from the data.
- For financial projections, be conservative and clearly mark estimates.`;

const ANALYSIS_CHAT_SYSTEM = `You are an AI strategy analyst who has completed a comprehensive audit analysis. You have access to the full analysis results and the original source data.

Answer the user's questions based on the analysis data and source transcripts/surveys provided. Be specific, cite data points, and reference specific people's names and roles when relevant.

If the user asks to modify analysis findings or deck content, provide the updated content. If they ask questions about data you don't have, say so honestly.

Keep responses concise but substantive. Use markdown-style formatting (bold with **, lists with •).`;

router.post('/analyse', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureAnalysesTable();

    const apiKey = await getAnthropicKeyForAudit(orgId);
    if (!apiKey) {
      return res.status(503).json({ error: 'Anthropic API key not configured. Add it in Settings > Integrations > LLM.' });
    }

    const { project_id } = req.body || {};

    const [transcriptsRes, interviewsRes, surveysRes] = await Promise.all([
      query('SELECT * FROM audit_transcripts WHERE org_id = $1 ORDER BY created_at DESC', [orgId]).catch(() => ({ rows: [] })),
      query('SELECT * FROM audit_interview_questions WHERE org_id = $1 ORDER BY created_at DESC', [orgId]).catch(() => ({ rows: [] })),
      query(`SELECT s.*, COALESCE(rc.cnt, 0) AS response_count
             FROM audit_surveys s
             LEFT JOIN (SELECT survey_id, COUNT(*) AS cnt FROM audit_responses GROUP BY survey_id) rc ON rc.survey_id = s.id
             WHERE s.org_id = $1 ORDER BY s.created_at DESC`, [orgId]).catch(() => ({ rows: [] })),
    ]);

    const surveyIds = surveysRes.rows.map(s => s.id);
    let allResponses = [];
    if (surveyIds.length > 0) {
      const respRes = await query('SELECT * FROM audit_responses WHERE survey_id = ANY($1) ORDER BY completed_at DESC', [surveyIds]).catch(() => ({ rows: [] }));
      allResponses = respRes.rows;
    }

    let dataPrompt = 'Here is the audit data to analyse:\n\n';

    if (transcriptsRes.rows.length > 0) {
      dataPrompt += '=== INTERVIEW TRANSCRIPTS ===\n';
      for (const t of transcriptsRes.rows) {
        dataPrompt += `\n--- Transcript: ${t.name || 'Untitled'} ---\n`;
        dataPrompt += `Speaker: ${t.speaker_name || 'Unknown'}, Role: ${t.speaker_role || 'Unknown'}, Department: ${t.department || 'Unknown'}\n`;
        if (t.content_text) dataPrompt += `Content:\n${t.content_text.substring(0, 8000)}\n`;
        if (t.ai_summary) dataPrompt += `AI Summary: ${t.ai_summary}\n`;
      }
    } else {
      dataPrompt += '=== NO INTERVIEW TRANSCRIPTS AVAILABLE ===\n';
    }

    if (interviewsRes.rows.length > 0) {
      dataPrompt += '\n=== INTERVIEW QUESTION SETS ===\n';
      for (const iv of interviewsRes.rows) {
        dataPrompt += `\nInterviewee: ${iv.interviewee_name || 'Unknown'}, Role: ${iv.interviewee_role || 'Unknown'}, Department: ${iv.department || 'Unknown'}, Type: ${iv.interviewee_type || 'Stakeholder'}\n`;
        const q = iv.questions_json || [];
        if (Array.isArray(q)) {
          for (const section of q) {
            if (section.section) dataPrompt += `  Section: ${section.section}\n`;
            if (Array.isArray(section.questions)) {
              for (const qText of section.questions) dataPrompt += `    - ${qText}\n`;
            }
          }
        }
        if (iv.notes) dataPrompt += `  Notes: ${iv.notes}\n`;
      }
    }

    if (surveysRes.rows.length > 0) {
      dataPrompt += '\n=== SURVEYS & RESPONSES ===\n';
      for (const s of surveysRes.rows) {
        const questions = s.questions_json || [];
        const responses = allResponses.filter(r => r.survey_id === s.id);
        dataPrompt += `\n--- Survey: ${s.title} (${responses.length} responses, status: ${s.status}) ---\n`;
        if (s.description) dataPrompt += `Description: ${s.description}\n`;
        dataPrompt += 'Questions:\n';
        for (const q of questions) {
          dataPrompt += `  Q (${q.type}): ${q.question}\n`;
          if (q.options?.length > 0) dataPrompt += `    Options: ${q.options.join(', ')}\n`;
        }
        if (responses.length > 0) {
          dataPrompt += 'Responses:\n';
          for (const r of responses) {
            dataPrompt += `  Respondent: ${r.respondent_name || 'Anonymous'}${r.respondent_role ? ` (${r.respondent_role})` : ''}\n`;
            const answers = r.answers_json || {};
            for (const [qId, ans] of Object.entries(answers)) {
              dataPrompt += `    ${qId}: ${typeof ans === 'string' ? ans : JSON.stringify(ans)}\n`;
            }
          }
        }
      }
    } else {
      dataPrompt += '\n=== NO SURVEYS AVAILABLE ===\n';
    }

    dataPrompt += '\n\nNow perform the full analysis and return the JSON result.';

    const rawContent = await callClaude(apiKey, ANALYSIS_SYSTEM_PROMPT, dataPrompt, 8192);

    let analysis;
    try {
      const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = {
        reasoning_steps: [{ type: 'complete', text: rawContent.substring(0, 500) }],
        themes: [],
        opportunities: [],
        roadmap: [],
        executive_summary: rawContent,
        roi_summary: {},
      };
    }

    const sourceSummary = {
      transcripts: transcriptsRes.rows.length,
      interviews: interviewsRes.rows.length,
      surveys: surveysRes.rows.length,
      total_responses: allResponses.length,
    };

    const result = await query(
      `INSERT INTO audit_analyses (org_id, project_id, status, analysis_json, source_summary)
       VALUES ($1, $2, 'completed', $3::jsonb, $4::jsonb) RETURNING *`,
      [orgId, project_id || null, JSON.stringify(analysis), JSON.stringify(sourceSummary)]
    );

    res.json({
      ...result.rows[0],
      analysis: analysis,
      source_summary: sourceSummary,
    });
  } catch (err) {
    console.error('audit/analyse POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyse/chat', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    const apiKey = await getAnthropicKeyForAudit(orgId);
    if (!apiKey) {
      return res.status(503).json({ error: 'Anthropic API key not configured.' });
    }

    const { message, analysis_context, history } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });

    let contextPrompt = ANALYSIS_CHAT_SYSTEM;
    if (analysis_context) {
      contextPrompt += `\n\nHere is the completed analysis data:\n${JSON.stringify(analysis_context).substring(0, 12000)}`;
    }

    const messages = [];
    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        messages.push({ role: h.role === 'agent' ? 'assistant' : 'user', content: h.text || h.content || '' });
      }
    }
    messages.push({ role: 'user', content: message });

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: contextPrompt,
        messages,
      }),
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      return res.status(resp.status).json({ error: `LLM error: ${errBody}` });
    }

    const data = await resp.json();
    const reply = data.content?.[0]?.text || 'I was unable to generate a response.';

    res.json({ role: 'agent', text: reply });
  } catch (err) {
    console.error('audit/analyse/chat POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/analyses', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureAnalysesTable();
    const { project_id } = req.query;
    let sql = 'SELECT * FROM audit_analyses WHERE org_id = $1';
    const params = [orgId];
    if (project_id) { sql += ' AND project_id = $2'; params.push(project_id); }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows.map(r => ({
      ...r,
      analysis: r.analysis_json || {},
    })));
  } catch (err) {
    console.error('audit/analyses GET', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
