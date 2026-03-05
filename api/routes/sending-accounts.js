import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

let _tableReady = false;
async function ensureSendingAccountsTable() {
  if (_tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS sending_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      type TEXT NOT NULL,
      email TEXT,
      domain TEXT,
      profile_url TEXT,
      profile_name TEXT,
      status TEXT DEFAULT 'active',
      warmup_status TEXT DEFAULT 'pending',
      health_score INTEGER DEFAULT 0,
      daily_limit INTEGER DEFAULT 30,
      sent_today INTEGER DEFAULT 0,
      account_type TEXT,
      config_json JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_sending_accounts_org ON sending_accounts(org_id)').catch(() => {});
  _tableReady = true;
}

router.get('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureSendingAccountsTable();
    let sql = 'SELECT * FROM sending_accounts WHERE org_id = $1';
    const params = [orgId];
    let p = 2;
    const { type } = req.query;
    if (type) { sql += ` AND type = $${p++}`; params.push(type); }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('sending-accounts GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    await ensureSendingAccountsTable();
    const { type, email, domain, profile_url, profile_name, status, warmup_status, health_score, daily_limit, account_type, config_json } = req.body || {};
    const result = await query(
      `INSERT INTO sending_accounts (org_id, type, email, domain, profile_url, profile_name, status, warmup_status, health_score, daily_limit, account_type, config_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb) RETURNING *`,
      [orgId, type || 'email', email || null, domain || null, profile_url || null, profile_name || null,
       status || 'active', warmup_status || 'pending', health_score || 0, daily_limit || 30,
       account_type || null, config_json ? JSON.stringify(config_json) : '{}']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('sending-accounts POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureSendingAccountsTable();
    const { type, email, domain, profile_url, profile_name, status, warmup_status, health_score, daily_limit, sent_today, account_type, config_json } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (type !== undefined) { sets.push(`type = $${p++}`); vals.push(type); }
    if (email !== undefined) { sets.push(`email = $${p++}`); vals.push(email); }
    if (domain !== undefined) { sets.push(`domain = $${p++}`); vals.push(domain); }
    if (profile_url !== undefined) { sets.push(`profile_url = $${p++}`); vals.push(profile_url); }
    if (profile_name !== undefined) { sets.push(`profile_name = $${p++}`); vals.push(profile_name); }
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (warmup_status !== undefined) { sets.push(`warmup_status = $${p++}`); vals.push(warmup_status); }
    if (health_score !== undefined) { sets.push(`health_score = $${p++}`); vals.push(health_score); }
    if (daily_limit !== undefined) { sets.push(`daily_limit = $${p++}`); vals.push(daily_limit); }
    if (sent_today !== undefined) { sets.push(`sent_today = $${p++}`); vals.push(sent_today); }
    if (account_type !== undefined) { sets.push(`account_type = $${p++}`); vals.push(account_type); }
    if (config_json !== undefined) { sets.push(`config_json = $${p++}::jsonb`); vals.push(JSON.stringify(config_json)); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(
      `UPDATE sending_accounts SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('sending-accounts PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureSendingAccountsTable();
    const result = await query('DELETE FROM sending_accounts WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('sending-accounts DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
