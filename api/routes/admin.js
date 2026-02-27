import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.orgId) return res.status(401).json({ error: 'Authentication required' });
  next();
}

router.use(requireAdmin);

// --- Agencies ---
router.get('/agencies', async (req, res) => {
  try {
    const result = await query('SELECT * FROM agencies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('admin/agencies GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/agencies', async (req, res) => {
  try {
    const { name, owner_name, email, plan, client_slots, credit_pool, domain } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name required' });
    const result = await query(
      `INSERT INTO agencies (name, owner_name, email, plan, client_slots, credit_pool, domain)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, owner_name || null, email || null, plan || null, client_slots || 0, credit_pool || 0, domain || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('admin/agencies POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/agencies/:id', async (req, res) => {
  try {
    const { name, owner_name, email, plan, client_slots, credit_pool, domain, is_active } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name); }
    if (owner_name !== undefined) { sets.push(`owner_name = $${p++}`); vals.push(owner_name); }
    if (email !== undefined) { sets.push(`email = $${p++}`); vals.push(email); }
    if (plan !== undefined) { sets.push(`plan = $${p++}`); vals.push(plan); }
    if (client_slots !== undefined) { sets.push(`client_slots = $${p++}`); vals.push(client_slots); }
    if (credit_pool !== undefined) { sets.push(`credit_pool = $${p++}`); vals.push(credit_pool); }
    if (domain !== undefined) { sets.push(`domain = $${p++}`); vals.push(domain); }
    if (is_active !== undefined) { sets.push(`is_active = $${p++}`); vals.push(is_active); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id);
    const result = await query(`UPDATE agencies SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/agencies PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/agencies/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM agencies WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('admin/agencies DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Organisations (admin view) ---
router.get('/organisations', async (req, res) => {
  try {
    const result = await query('SELECT * FROM organisations ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (err) {
    console.error('admin/organisations GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/organisations/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM organisations WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/organisations/:id GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/organisations/:id/credits', async (req, res) => {
  try {
    const { amount, description } = req.body || {};
    if (amount === undefined) return res.status(400).json({ error: 'amount required' });
    await query(
      `INSERT INTO credit_transactions (org_id, amount, description, created_by)
       VALUES ($1, $2, $3, $4)`,
      [req.params.id, amount, description || 'Admin adjustment', req.userId || null]
    );
    const bal = await query('SELECT COALESCE(SUM(amount), 0)::int as balance FROM credit_transactions WHERE org_id = $1', [req.params.id]);
    res.json({ balance: bal.rows[0]?.balance || 0 });
  } catch (err) {
    console.error('admin/organisations/:id/credits PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/organisations/:id/plan', async (req, res) => {
  try {
    const { plan_tier } = req.body || {};
    if (!plan_tier) return res.status(400).json({ error: 'plan_tier required' });
    const result = await query(
      'UPDATE organisations SET plan_tier = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [plan_tier, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/organisations/:id/plan PUT', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Users (admin view) ---
router.get('/users', async (req, res) => {
  try {
    const { org_id } = req.query;
    let sql = 'SELECT id, email, name, org_id, role, created_at FROM app_users';
    const params = [];
    if (org_id) { sql += ' WHERE org_id = $1'; params.push(org_id); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('admin/users GET', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Support Tickets ---
router.get('/support-tickets', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM support_tickets';
    const params = [];
    if (status) { sql += ' WHERE status = $1'; params.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 200';
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('admin/support-tickets GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/support-tickets', async (req, res) => {
  try {
    const orgId = req.orgId;
    const { subject, description, priority } = req.body || {};
    if (!subject) return res.status(400).json({ error: 'subject required' });
    const result = await query(
      `INSERT INTO support_tickets (org_id, user_id, subject, description, priority)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [orgId, req.userId || null, subject, description || null, priority || 'normal']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('admin/support-tickets POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/support-tickets/:id', async (req, res) => {
  try {
    const { status, assigned_to, priority } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (status !== undefined) {
      sets.push(`status = $${p++}`); vals.push(status);
      if (status === 'resolved') sets.push('resolved_at = now()');
    }
    if (assigned_to !== undefined) { sets.push(`assigned_to = $${p++}`); vals.push(assigned_to); }
    if (priority !== undefined) { sets.push(`priority = $${p++}`); vals.push(priority); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id);
    const result = await query(`UPDATE support_tickets SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/support-tickets PUT', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Feature Flags ---
router.get('/feature-flags', async (req, res) => {
  try {
    const result = await query('SELECT * FROM feature_flags ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('admin/feature-flags GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/feature-flags/:id', async (req, res) => {
  try {
    const { status, rollout_percentage } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (status !== undefined) { sets.push(`status = $${p++}`); vals.push(status); }
    if (rollout_percentage !== undefined) { sets.push(`rollout_percentage = $${p++}`); vals.push(rollout_percentage); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id);
    const result = await query(`UPDATE feature_flags SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/feature-flags PUT', err);
    res.status(500).json({ error: err.message });
  }
});

// --- System Health ---
router.get('/system-health', async (req, res) => {
  try {
    const dbCheck = await query('SELECT 1 as ok');
    res.json({ status: 'healthy', database: dbCheck.rows.length > 0 ? 'connected' : 'error', timestamp: new Date().toISOString() });
  } catch (err) {
    res.json({ status: 'degraded', database: 'error', error: err.message, timestamp: new Date().toISOString() });
  }
});

router.get('/errors', async (req, res) => {
  try {
    const result = await query('SELECT * FROM platform_error_logs ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    console.error('admin/errors GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/errors/:id/resolve', async (req, res) => {
  try {
    const { resolution_notes } = req.body || {};
    const result = await query(
      `UPDATE platform_error_logs SET resolved = true, resolution_notes = $1, resolved_at = now() WHERE id = $2 RETURNING *`,
      [resolution_notes || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/errors/:id/resolve PUT', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
