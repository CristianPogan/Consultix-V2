import { Router } from 'express';
import { query, getCreditActionCosts, ensureCreditSystemReady, ensureOrganisationsReady } from '../db.js';

const router = Router();

// Map action_key to display category for usage breakdown
const ACTION_TO_CATEGORY = {
  lead_discovery: 'Lead Discovery',
  email_verification: 'Enrichment',
  phone_lookup: 'Enrichment',
  company_enrichment: 'Enrichment',
  icp_scoring: 'Enrichment',
  ai_personalisation: 'Enrichment',
  ai_audit_analysis: 'AI Analysis',
  ai_assistant_query: 'AI Analysis',
  ai_council_query: 'AI Analysis',
  deck_generation: 'Content & Scripts',
  niche_research: 'Content & Scripts',
  script_generation: 'Content & Scripts',
  process_map: 'Content & Scripts',
};

router.get('/plan', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT bp.*, o.credits_allocated
       FROM organisations o
       LEFT JOIN billing_plans bp ON (bp.tier::text = o.plan_tier::text OR bp.name::text = o.plan_tier::text)
       WHERE o.id = $1 LIMIT 1`,
      [orgId]
    );
    if (!result.rows.length) return res.status(503).json({ error: 'Organisation not found' });
    const row = result.rows[0];
    const plan = row.tier || row.name || 'starter';
    const name = row.name || 'Starter';
    const credits = row.credits_monthly ?? row.credits_allocated ?? 500;
    const price = row.price_monthly ?? 97;
    res.json({
      plan,
      name,
      credits,
      price_monthly: price,
      max_users: row.max_users ?? 1,
      ...row,
    });
  } catch (err) {
    console.error('billing/plan GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/plans', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM billing_plans ORDER BY price_monthly ASC NULLS LAST');
    const plans = (result.rows || []).map(r => ({
      key: (r.tier || r.name || '').toLowerCase(),
      name: r.name || r.tier || 'Plan',
      price: Number(r.price_monthly) || 0,
      credits: Number(r.credits_monthly) || 0,
      max_users: Number(r.max_users) || 1,
      features_json: r.features_json,
    }));
    res.json(plans);
  } catch (err) {
    console.error('billing/plans GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/invoices', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query('SELECT * FROM invoices WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('billing/invoices GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/credits', async (req, res) => {
  try {
    await ensureCreditSystemReady();
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartIso = monthStart.toISOString();
    const amt = 'COALESCE(amount, credits_amount)';
    const [balanceRes, usedRes, allocRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(${amt}), 0)::int AS balance FROM credit_transactions WHERE org_id::text = $1`, [String(orgId)]),
      query(
        `SELECT COALESCE(SUM(ABS(${amt})), 0)::int AS used FROM credit_transactions WHERE org_id::text = $1 AND (${amt}) < 0 AND created_at >= $2`,
        [String(orgId), monthStartIso]
      ),
      query(
        `SELECT COALESCE(o.credits_allocated, bp.credits_monthly, 2000)::int AS allocated
         FROM organisations o
         LEFT JOIN billing_plans bp ON (bp.tier::text = o.plan_tier::text OR bp.name::text = o.plan_tier::text)
         WHERE o.id::text = $1 LIMIT 1`,
        [String(orgId)]
      ),
    ]);
    const balance = balanceRes.rows[0]?.balance ?? 0;
    const creditsUsedThisMonth = usedRes.rows[0]?.used ?? 0;
    const creditsAllocated = allocRes.rows[0]?.allocated ?? 2000;
    res.json({
      balance,
      credits_allocated: creditsAllocated,
      credits_used_this_month: creditsUsedThisMonth,
    });
  } catch (err) {
    console.error('billing/credits GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/credits/usage-by-action', async (req, res) => {
  try {
    await ensureCreditSystemReady();
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const amt = 'COALESCE(amount, credits_amount)';
    const result = await query(
      `SELECT action, COALESCE(SUM(ABS(${amt})), 0)::int AS credits
       FROM credit_transactions
       WHERE org_id::text = $1 AND (${amt}) < 0 AND created_at >= $2 AND action IS NOT NULL
       GROUP BY action`,
      [String(orgId), monthStart.toISOString()]
    );
    const byAction = Object.fromEntries((result.rows || []).map(r => [r.action, r.credits]));
    const categories = {};
    for (const [action, credits] of Object.entries(byAction)) {
      const cat = ACTION_TO_CATEGORY[action] || 'Other';
      categories[cat] = (categories[cat] || 0) + credits;
    }
    res.json({ byAction: byAction, byCategory: categories });
  } catch (err) {
    console.error('billing/credits/usage-by-action GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/credits/costs', async (req, res) => {
  try {
    await ensureCreditSystemReady();
    const rows = await getCreditActionCosts();
    res.json(rows.map(r => ({
      action_key: r.action_key,
      action_label: r.action_label,
      credits: r.credits,
      unit: r.unit || '',
      costDisplay: `${r.credits} credit${r.credits !== 1 ? 's' : ''}${r.unit ? '/' + r.unit.replace('per ', '') : ''}`,
    })));
  } catch (err) {
    console.error('billing/credits/costs GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/credits/history', async (req, res) => {
  try {
    await ensureCreditSystemReady();
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT id, COALESCE(amount, credits_amount) AS amount, description, action, created_at
       FROM credit_transactions WHERE org_id::text = $1 ORDER BY COALESCE(created_at, '1970-01-01') DESC LIMIT 100`,
      [String(orgId)]
    );
    const rows = result.rows || [];
    const totalBalance = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    let runningBalance = totalBalance;
    const withBalance = rows.map(r => {
      const balanceAfter = runningBalance;
      runningBalance -= Number(r.amount || 0);
      return {
        ...r,
        balance_after: balanceAfter,
      };
    });
    res.json(withBalance);
  } catch (err) {
    console.error('billing/credits/history GET', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Subscription (renewal date, payment method) ---
router.get('/subscription', async (req, res) => {
  try {
    await ensureOrganisationsReady();
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT subscription_current_period_end, payment_method_last4, payment_method_brand, stripe_customer_id
       FROM organisations WHERE id::text = $1 LIMIT 1`,
      [String(orgId)]
    );
    const row = result.rows[0];
    if (!row) return res.status(503).json({ error: 'Organisation not found' });
    const renewsAt = row.subscription_current_period_end;
    const hasPayment = !!(row.payment_method_last4 || row.stripe_customer_id);
    const d = renewsAt ? new Date(renewsAt) : new Date();
    if (!renewsAt) d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    res.json({
      renews_at: renewsAt || d.toISOString(),
      renewal_date: renewsAt ? new Date(renewsAt).toISOString().slice(0, 10) : d.toISOString().slice(0, 10),
      payment_method_last4: row.payment_method_last4 || null,
      payment_method_brand: row.payment_method_brand || null,
      has_payment_method: hasPayment,
    });
  } catch (err) {
    console.error('billing/subscription GET', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Manage subscription (Stripe Customer Portal) ---
router.post('/manage-subscription', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecret) {
      return res.status(501).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY to enable subscription management.' });
    }
    let st;
    try {
      const stripe = (await import('stripe')).default;
      st = new stripe(stripeSecret);
    } catch (e) {
      return res.status(501).json({ error: 'Stripe SDK not installed. Run: npm install stripe' });
    }
    const org = await query('SELECT stripe_customer_id FROM organisations WHERE id::text = $1 LIMIT 1', [String(orgId)]);
    const customerId = org.rows[0]?.stripe_customer_id;
    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer linked to this organisation.' });
    }
    const session = await st.billingPortal.sessions.create({
      customer: customerId,
      return_url: process.env.STRIPE_PORTAL_RETURN_URL || req.headers.origin || `${req.protocol}://${req.get('host')}`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('billing/manage-subscription POST', err);
    res.status(500).json({ error: err.message });
  }
});

// --- User plan change (upgrade/downgrade) ---
router.put('/plan', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const { plan_tier } = req.body || {};
    if (!plan_tier) return res.status(400).json({ error: 'plan_tier required' });
    const planRes = await query(
      'SELECT credits_monthly FROM billing_plans WHERE tier_key::text = $1 OR tier::text = $1 OR name::text = $1 LIMIT 1',
      [String(plan_tier)]
    ).catch(() => ({ rows: [] }));
    if (!planRes.rows.length) return res.status(400).json({ error: 'Invalid plan_tier. Choose starter, growth, or scale.' });
    const creditsAllocated = planRes.rows[0]?.credits_monthly ?? null;
    const sets = ['plan_tier = $1', 'updated_at = now()'];
    const vals = [plan_tier, orgId];
    if (creditsAllocated != null) {
      sets.push('credits_allocated = $3');
      vals.push(creditsAllocated);
    }
    const result = await query(
      `UPDATE organisations SET ${sets.join(', ')} WHERE id::text = $2 RETURNING *`,
      vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Organisation not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('billing/plan PUT', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
