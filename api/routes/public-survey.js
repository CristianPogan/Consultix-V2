import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, title, description, questions_json, status FROM audit_surveys WHERE id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Survey not found' });
    const survey = result.rows[0];
    if (survey.status === 'closed') return res.status(410).json({ error: 'This survey is no longer accepting responses' });
    res.json({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions_json || [],
    });
  } catch (err) {
    console.error('public/surveys GET', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/respond', async (req, res) => {
  try {
    const surveyRes = await query(
      `SELECT id, status FROM audit_surveys WHERE id = $1`,
      [req.params.id]
    );
    if (!surveyRes.rows.length) return res.status(404).json({ error: 'Survey not found' });
    if (surveyRes.rows[0].status === 'closed') return res.status(410).json({ error: 'This survey is no longer accepting responses' });

    const { respondent_name, respondent_email, respondent_role, answers } = req.body || {};
    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers object is required' });
    }

    const cols = [
      { name: 'created_at', type: 'TIMESTAMPTZ DEFAULT now()' },
    ];
    for (const c of cols) {
      await query(`ALTER TABLE audit_responses ADD COLUMN IF NOT EXISTS ${c.name} ${c.type}`).catch(() => {});
    }

    const result = await query(
      `INSERT INTO audit_responses (survey_id, respondent_name, respondent_email, respondent_role, answers_json, completed_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, now()) RETURNING id`,
      [req.params.id, respondent_name || 'Anonymous', respondent_email || null, respondent_role || null,
       JSON.stringify(answers)]
    );
    res.status(201).json({ success: true, response_id: result.rows[0].id });
  } catch (err) {
    console.error('public/surveys POST respond', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
