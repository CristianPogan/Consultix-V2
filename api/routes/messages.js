import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { conversation_id } = req.query;
    if (!conversation_id) return res.status(400).json({ error: 'conversation_id required' });
    const conv = await query('SELECT id FROM conversations WHERE id = $1 AND org_id = $2', [conversation_id, orgId]);
    if (!conv.rows.length) return res.status(404).json({ error: 'Conversation not found' });
    const result = await query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sent_at ASC',
      [conversation_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('messages GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { conversation_id, direction, sender_name, sender_email, body, ai_drafted } = req.body || {};
    if (!body) return res.status(400).json({ error: 'body required' });
    if (!conversation_id) return res.status(400).json({ error: 'conversation_id required' });
    const conv = await query('SELECT id FROM conversations WHERE id = $1 AND org_id = $2', [conversation_id, orgId]);
    if (!conv.rows.length) return res.status(404).json({ error: 'Conversation not found' });
    const result = await query(
      `INSERT INTO messages (conversation_id, direction, sender_name, sender_email, body, ai_drafted)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [conversation_id, direction || 'outbound', sender_name || null, sender_email || null, body, ai_drafted || false]
    );
    await query('UPDATE conversations SET last_message_at = now() WHERE id = $1', [conversation_id]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('messages POST', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
