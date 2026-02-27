import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

// --- Accounts ---
router.get('/accounts', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM community_accounts WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('community/accounts GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { platform, name, credentials } = req.body || {};
    const result = await query(
      `INSERT INTO community_accounts (org_id, platform, name, credentials, connected)
       VALUES ($1, $2, $3, $4::jsonb, true) RETURNING *`,
      [orgId, platform || 'skool', name || 'Untitled', credentials ? JSON.stringify(credentials) : '{}']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('community/accounts POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM community_accounts WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('community/accounts DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Keywords ---
router.get('/keywords', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM community_keywords WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('community/keywords GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/keywords', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { keyword } = req.body || {};
    if (!keyword) return res.status(400).json({ error: 'keyword required' });
    const result = await query(
      `INSERT INTO community_keywords (org_id, keyword) VALUES ($1, $2)
       ON CONFLICT (org_id, keyword) DO NOTHING RETURNING *`,
      [orgId, keyword]
    );
    if (!result.rows.length) return res.status(409).json({ error: 'Keyword already exists' });
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('community/keywords POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/keywords/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM community_keywords WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('community/keywords DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Voice Samples ---
router.get('/voice-samples', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM community_voice_samples WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('community/voice-samples GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/voice-samples', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { content_type, title, content } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content required' });
    const result = await query(
      `INSERT INTO community_voice_samples (org_id, content_type, title, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [orgId, content_type || 'general', title || null, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('community/voice-samples POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/voice-samples/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM community_voice_samples WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('community/voice-samples DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Feed ---
router.get('/feed', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { platform } = req.query;
    let sql = 'SELECT * FROM community_feed_items WHERE org_id = $1';
    const params = [orgId];
    if (platform) { sql += ' AND platform = $2'; params.push(platform); }
    sql += ' ORDER BY created_at DESC LIMIT 100';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('community/feed GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/feed/:id/reply', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { ai_draft_reply, reply_status } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (ai_draft_reply !== undefined) { sets.push(`ai_draft_reply = $${p++}`); vals.push(ai_draft_reply); }
    if (reply_status !== undefined) { sets.push(`reply_status = $${p++}`); vals.push(reply_status); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    vals.push(req.params.id, orgId);
    const result = await query(`UPDATE community_feed_items SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('community/feed/:id/reply PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/feed/:id/status', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { reply_status } = req.body || {};
    if (!reply_status) return res.status(400).json({ error: 'reply_status required' });
    const result = await query(
      'UPDATE community_feed_items SET reply_status = $1 WHERE id = $2 AND org_id = $3 RETURNING *',
      [reply_status, req.params.id, orgId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('community/feed/:id/status PUT', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
