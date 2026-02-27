import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

router.get('/plan', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT bp.* FROM billing_plans bp
       JOIN organisations o ON o.plan_tier = bp.tier_key OR o.plan_tier = bp.name
       WHERE o.id = $1 LIMIT 1`,
      [orgId]
    );
    if (!result.rows.length) {
      return res.json({ plan: 'starter', name: 'Starter', credits: 500, seats: 1 });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('billing/plan GET', err);
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
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      `SELECT COALESCE(SUM(amount), 0)::int as balance FROM credit_transactions WHERE org_id = $1`,
      [orgId]
    );
    res.json({ balance: result.rows[0]?.balance || 0 });
  } catch (err) {
    console.error('billing/credits GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/credits/history', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    const result = await query(
      'SELECT * FROM credit_transactions WHERE org_id = $1 ORDER BY created_at DESC LIMIT 100',
      [orgId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('billing/credits/history GET', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
