import { Router } from 'express';
import { query, ensureDiscountCodesReady, ensureCreditSystemReady, getCreditActionCosts, updateCreditActionCost, recordPlatformApiCost, getPlatformApiCosts, getPlatformApiCostTotal } from '../db.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.orgId) return res.status(401).json({ error: 'Authentication required' });
  next();
}

router.use(requireAdmin);

// --- Agencies ---
router.get('/agencies', async (req, res) => {
  try {
    let result;
    try {
      await ensureDiscountCodesReady();
      result = await query(`
        SELECT a.*,
          COALESCE((SELECT COUNT(*)::int FROM organisations o WHERE (o.agency_id::text = a.id::text OR o.agency_id = a.id)), 0) AS clients,
          COALESCE(a.platform_fee::numeric, 497) AS platform_fee,
          COALESCE(a.per_workspace_fee::numeric, 97) AS per_workspace_fee
        FROM agencies a
        ORDER BY a.created_at DESC NULLS LAST
      `);
    } catch (_) {
      result = await query('SELECT * FROM agencies ORDER BY created_at DESC NULLS LAST');
    }
    const rows = result.rows || [];
    for (const r of rows) {
      r.platformFee = Number(r.platform_fee ?? r.platformFee ?? 497) || 497;
      r.perWorkspaceFee = Number(r.per_workspace_fee ?? r.perWorkspaceFee ?? 97) || 97;
      r.clients = r.clients ?? 0;
      r.workspaceFees = r.clients * r.perWorkspaceFee;
    }
    res.json(rows);
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
// Returns orgs with derived mrr (from billing_plans.price_monthly + plan_tier) and credits from credit_transactions.
router.get('/organisations', async (req, res) => {
  try {
    let rows = [];
    try {
      const result = await query(`
        SELECT o.*,
          COALESCE(bp.price_monthly::numeric, 0) AS mrr,
          COALESCE(o.credits_allocated, bp.credits_monthly, 0)::int AS credits_allocated,
          (SELECT COALESCE(SUM(ct.amount), 0)::int FROM credit_transactions ct WHERE ct.org_id::text = o.id::text) AS credits_balance,
          (SELECT COALESCE(SUM(ABS(ct.amount)), 0)::int FROM credit_transactions ct WHERE ct.org_id::text = o.id::text AND ct.amount < 0) AS credits_used
        FROM organisations o
        LEFT JOIN billing_plans bp ON (
          (bp.tier_key::text = o.plan_tier::text) OR
          (bp.name::text = o.plan_tier::text)
        )
        ORDER BY o.created_at DESC NULLS LAST, o.id
        LIMIT 200
      `);
      rows = result.rows || [];
    } catch (joinErr) {
      const fallback = await query('SELECT * FROM organisations ORDER BY created_at DESC NULLS LAST LIMIT 200');
      rows = fallback.rows || [];
      for (const r of rows) {
        r.mrr = 0;
        const cr = await query('SELECT COALESCE(SUM(amount), 0)::int AS bal FROM credit_transactions WHERE org_id::text = $1', [String(r.id)]).catch(() => ({ rows: [{ bal: 0 }] }));
        r.credits_total = cr.rows[0]?.bal ?? 0;
      }
    }
    for (const r of rows) {
      r.mrr = Number(r.mrr) || 0;
      r.credits_total = r.credits_allocated ?? r.credits_total ?? 0;
      if (r.credits_used == null) {
        const cu = await query('SELECT COALESCE(SUM(ABS(amount)), 0)::int AS used FROM credit_transactions WHERE org_id::text = $1 AND amount < 0', [String(r.id)]).catch(() => ({ rows: [{ used: 0 }] }));
        r.credits_used = cu.rows[0]?.used ?? 0;
      }
    }
    res.json(rows);
  } catch (err) {
    console.error('admin/organisations GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/organisations/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT o.*,
        COALESCE(bp.price_monthly::numeric, 0) AS mrr,
        COALESCE(o.credits_allocated, bp.credits_monthly, 0)::int AS credits_allocated,
        (SELECT COALESCE(SUM(ct.amount), 0)::int FROM credit_transactions ct WHERE ct.org_id::text = o.id::text) AS credits_balance,
        (SELECT COALESCE(SUM(ABS(ct.amount)), 0)::int FROM credit_transactions ct WHERE ct.org_id::text = o.id::text AND ct.amount < 0) AS credits_used
      FROM organisations o
      LEFT JOIN billing_plans bp ON ((bp.tier_key::text = o.plan_tier::text) OR (bp.name::text = o.plan_tier::text))
      WHERE o.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    const row = result.rows[0];
    row.mrr = Number(row.mrr) || 0;
    row.credits_total = row.credits_allocated ?? row.credits_total ?? 0;
    row.credits_used = row.credits_used ?? 0;
    res.json(row);
  } catch (err) {
    console.error('admin/organisations/:id GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/organisations/:id/credits', async (req, res) => {
  try {
    const { amount, description } = req.body || {};
    if (amount === undefined) return res.status(400).json({ error: 'amount required' });
    const transactionType = amount >= 0 ? 'grant' : 'consumption';
    await query(
      `INSERT INTO credit_transactions (org_id, amount, description, created_by, transaction_type, action)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.id, amount, description || 'Admin adjustment', req.userId || null, transactionType, amount >= 0 ? 'admin_adjustment' : null]
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
    const planRes = await query(
      'SELECT credits_monthly FROM billing_plans WHERE tier_key::text = $1 OR name::text = $1 LIMIT 1',
      [String(plan_tier)]
    ).catch(() => ({ rows: [] }));
    const creditsAllocated = planRes.rows[0]?.credits_monthly ?? null;
    const sets = ['plan_tier = $1', 'updated_at = now()'];
    const vals = [plan_tier, req.params.id];
    if (creditsAllocated != null) {
      sets.push('credits_allocated = $3');
      vals.push(creditsAllocated);
    }
    const result = await query(
      `UPDATE organisations SET ${sets.join(', ')} WHERE id = $2 RETURNING *`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/organisations/:id/plan PUT', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Users (admin view) ---
// Returns users with org name (from organisations JOIN). Supports roles: org_member, org_owner, org_admin, platform_admin.
router.get('/users', async (req, res) => {
  try {
    const { org_id } = req.query;
    let sql = `SELECT u.id, u.email, u.name, u.org_id, u.role, u.created_at, o.name AS org_name
      FROM app_users u
      LEFT JOIN organisations o ON o.id = u.org_id`;
    const params = [];
    if (org_id) { sql += ' WHERE u.org_id = $1'; params.push(org_id); }
    sql += ' ORDER BY u.created_at DESC LIMIT 200';
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

// --- Admin Billing ---
router.get('/billing/plans', async (req, res) => {
  try {
    const result = await query('SELECT * FROM billing_plans ORDER BY price_monthly ASC NULLS LAST');
    res.json(result.rows);
  } catch (err) {
    console.error('admin/billing/plans GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/billing/plans/:id', async (req, res) => {
  try {
    const { price_monthly, credits_monthly, max_users, features_json, tier_key, name } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (price_monthly !== undefined) { sets.push(`price_monthly = $${p++}`); vals.push(price_monthly); }
    if (credits_monthly !== undefined) { sets.push(`credits_monthly = $${p++}`); vals.push(credits_monthly); }
    if (max_users !== undefined) { sets.push(`max_users = $${p++}`); vals.push(max_users); }
    if (features_json !== undefined) { sets.push(`features_json = $${p++}`); vals.push(typeof features_json === 'string' ? features_json : JSON.stringify(features_json)); }
    if (tier_key !== undefined) { sets.push(`tier_key = $${p++}`); vals.push(tier_key); }
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    vals.push(req.params.id);
    const result = await query(`UPDATE billing_plans SET ${sets.join(', ')} WHERE id = $${p} RETURNING *`, vals);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/billing/plans/:id PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/billing/invoices', async (req, res) => {
  try {
    const result = await query(`
      SELECT i.*, o.name AS org_name, o.plan_tier
      FROM invoices i
      LEFT JOIN organisations o ON o.id::text = i.org_id::text
      ORDER BY i.created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('admin/billing/invoices GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/billing/invoices', async (req, res) => {
  try {
    const { org_id, amount_due, amount_paid, status, stripe_invoice_id, invoice_pdf_url } = req.body || {};
    if (!org_id) return res.status(400).json({ error: 'org_id required' });
    const result = await query(
      `INSERT INTO invoices (org_id, amount_due, amount_paid, status, stripe_invoice_id, invoice_pdf_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        org_id,
        amount_due ?? 0,
        amount_paid ?? 0,
        status ?? 'draft',
        stripe_invoice_id ?? null,
        invoice_pdf_url ?? null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('admin/billing/invoices POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/invoices/:id/retry', async (req, res) => {
  try {
    const result = await query(
      `UPDATE invoices SET status = 'open', updated_at = now() WHERE id = $1 AND status IN ('failed', 'past_due') RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Invoice not found or not retryable' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/invoices/:id/retry POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/invoices/:id/refund', async (req, res) => {
  try {
    const result = await query(
      `UPDATE invoices SET status = 'refunded', updated_at = now() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('admin/invoices/:id/refund POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/discount-codes', async (req, res) => {
  try {
    await ensureDiscountCodesReady();
    const result = await query('SELECT * FROM discount_codes ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('admin/discount-codes GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/discount-codes', async (req, res) => {
  try {
    await ensureDiscountCodesReady();
    const { code, discount_text, max_uses, status } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code required' });
    const result = await query(
      `INSERT INTO discount_codes (code, discount_text, max_uses, status) VALUES ($1, $2, $3, $4) RETURNING *`,
      [code, discount_text ?? null, max_uses ?? null, status ?? 'active']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('admin/discount-codes POST', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Credit Action Costs & Platform API Costs ---
router.get('/credits/action-costs', async (req, res) => {
  try {
    const rows = await getCreditActionCosts();
    res.json(rows);
  } catch (err) {
    console.error('admin/credits/action-costs GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/credits/action-costs/:id', async (req, res) => {
  try {
    const updated = await updateCreditActionCost(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    console.error('admin/credits/action-costs/:id PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/credits/api-costs', async (req, res) => {
  try {
    const { from, to } = req.query;
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fromDate = from || thirtyDaysAgo;
    const toDate = to || today;
    const rows = await getPlatformApiCosts(fromDate, toDate);
    const todayTotal = await getPlatformApiCostTotal();
    res.json({ rows, todayTotalDollars: todayTotal });
  } catch (err) {
    console.error('admin/credits/api-costs GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/credits/api-costs', async (req, res) => {
  try {
    const { provider, amountCents, costDate, description } = req.body || {};
    if (!provider) return res.status(400).json({ error: 'provider required' });
    const amt = Number(amountCents) || 0;
    const row = await recordPlatformApiCost(provider, amt, costDate, description);
    res.status(201).json(row);
  } catch (err) {
    console.error('admin/credits/api-costs POST', err);
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
