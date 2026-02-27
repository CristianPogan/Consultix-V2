import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT c.id, c.lead_id, c.channel, c.subject, c.status, c.last_message_at, c.unread, c.created_at,
              l.first_name, l.last_name, l.email, l.company
       FROM conversations c
       LEFT JOIN leads l ON l.id = c.lead_id
       WHERE c.org_id = $1
       ORDER BY c.last_message_at DESC NULLS LAST`,
      [orgId]
    );
    const rows = result.rows.map(r => ({
      id: r.id,
      name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Unknown',
      company: r.company || '',
      channel: r.channel,
      subject: r.subject,
      status: r.status,
      unread: r.unread,
      time: r.last_message_at,
      lead_id: r.lead_id,
      created_at: r.created_at,
    }));
    res.json(rows);
  } catch (err) {
    console.error('conversations GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT c.*, l.first_name, l.last_name, l.email, l.company
       FROM conversations c LEFT JOIN leads l ON l.id = c.lead_id
       WHERE c.id = $1 AND c.org_id = $2`,
      [req.params.id, orgId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const r = result.rows[0];
    res.json({
      id: r.id, name: [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Unknown',
      company: r.company || '', channel: r.channel, subject: r.subject, status: r.status,
      unread: r.unread, time: r.last_message_at, lead_id: r.lead_id, created_at: r.created_at,
    });
  } catch (err) {
    console.error('conversations GET/:id', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    const { lead_id, channel, subject, status } = req.body || {};
    const result = await query(
      `INSERT INTO conversations (org_id, lead_id, channel, subject, status, last_message_at)
       VALUES ($1, $2, $3, $4, $5, now())
       RETURNING *`,
      [orgId, lead_id || null, channel || 'email', subject || null, status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('conversations POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { status, unread, subject } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (unread !== undefined) { sets.push(`unread = $${p++}`); vals.push(unread); }
    if (subject !== undefined) { sets.push(`subject = $${p++}`); vals.push(subject); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    vals.push(req.params.id, orgId);
    const result = await query(
      `UPDATE conversations SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('conversations PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('DELETE FROM conversations WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('conversations DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
