import { Router } from 'express';
import { query } from '../db.js';

const router = Router();

// GET /api/stats/dashboard - Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    // Get total leads
    const leadsResult = await query(
      'SELECT COUNT(*) as total FROM leads WHERE org_id = $1',
      [orgId]
    );
    const totalLeads = parseInt(leadsResult.rows[0]?.total || 0);

    // Get total companies
    const companiesResult = await query(
      'SELECT COUNT(*) as total FROM companies WHERE org_id = $1',
      [orgId]
    );
    const totalCompanies = parseInt(companiesResult.rows[0]?.total || 0);

    // Get total lead lists
    const listsResult = await query(
      'SELECT COUNT(*) as total FROM lead_lists WHERE org_id = $1',
      [orgId]
    );
    const totalLists = parseInt(listsResult.rows[0]?.total || 0);

    // Get verified emails
    const verifiedResult = await query(
      'SELECT COUNT(*) as total FROM leads WHERE org_id = $1 AND email_verified = true',
      [orgId]
    );
    const verifiedEmails = parseInt(verifiedResult.rows[0]?.total || 0);

    // Get recent activity (last 10 actions)
    const recentActivity = await query(
      `SELECT 'Lead list created' as action, name as detail, created_at as time
       FROM lead_lists WHERE org_id = $1
       UNION ALL
       SELECT 'Company added' as action, name as detail, created_at as time
       FROM companies WHERE org_id = $1
       ORDER BY time DESC LIMIT 10`,
      [orgId]
    );

    res.json({
      stats: {
        totalLeads,
        totalCompanies,
        totalLists,
        verifiedEmails,
        outreachSent: 0, // TODO: Track when implementing actual outreach
        responses: 0,
        meetings: 0,
        deals: 0,
        revenue: 0,
      },
      recentActivity: recentActivity.rows.map(r => ({
        action: r.action,
        detail: r.detail,
        time: r.time,
      })),
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
