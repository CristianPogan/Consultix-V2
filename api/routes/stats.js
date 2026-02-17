import { Router } from 'express';
import { query, ensureProjectStatsColumns } from '../db.js';

const router = Router();

// Build WHERE clause: project-scoped or org-scoped
function leadWhere(projectId, orgId) {
  if (projectId) return ['project_id = $1', projectId];
  return ['org_id = $1', orgId];
}

// GET /api/stats/dashboard - Get dashboard statistics (project-scoped when project_id provided)
router.get('/dashboard', async (req, res) => {
  try {
    const orgId = req.orgId;
    const projectId = req.query.project_id || null;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    await ensureProjectStatsColumns();

    const [leadCond, leadParam] = leadWhere(projectId, orgId);
    const params = [leadParam];

    // Total leads
    const leadsResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE ${leadCond}`,
      params
    );
    const totalLeads = parseInt(leadsResult.rows[0]?.total || 0);

    // Verified emails
    const verifiedResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE ${leadCond} AND email_verified = true`,
      params
    );
    const verifiedEmails = parseInt(verifiedResult.rows[0]?.total || 0);

    // Outreach sent
    const outreachResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE ${leadCond} AND outreach_sent_at IS NOT NULL`,
      params
    );
    const outreachSent = parseInt(outreachResult.rows[0]?.total || 0);

    // Responses
    const responsesResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE ${leadCond} AND responded_at IS NOT NULL`,
      params
    );
    const responses = parseInt(responsesResult.rows[0]?.total || 0);

    // Meetings booked
    const meetingsResult = await query(
      `SELECT COUNT(*) as total FROM leads WHERE ${leadCond} AND meeting_booked_at IS NOT NULL`,
      params
    );
    const meetings = parseInt(meetingsResult.rows[0]?.total || 0);

    // Companies
    const companyCond = projectId ? 'project_id = $1' : 'org_id = $1';
    const companiesResult = await query(
      `SELECT COUNT(*) as total FROM companies WHERE ${companyCond}`,
      params
    );
    const totalCompanies = parseInt(companiesResult.rows[0]?.total || 0);

    // Lead lists
    const listCond = projectId ? 'project_id = $1' : 'org_id = $1';
    const listsResult = await query(
      `SELECT COUNT(*) as total FROM lead_lists WHERE ${listCond}`,
      params
    );
    const totalLists = parseInt(listsResult.rows[0]?.total || 0);

    // Recent activity
    const actCond = projectId ? 'project_id = $1' : 'org_id = $1';
    const recentActivity = await query(
      `SELECT 'Lead list created' as action, name as detail, created_at as time
       FROM lead_lists WHERE ${actCond}
       UNION ALL
       SELECT 'Company added' as action, name as detail, created_at as time
       FROM companies WHERE ${actCond}
       ORDER BY time DESC LIMIT 10`,
      params
    );

    res.json({
      stats: {
        totalLeads,
        totalCompanies,
        totalLists,
        verifiedEmails,
        outreachSent,
        responses,
        meetings,
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

// GET /api/stats/chart - Time-bucketed chart data (outreach, responses, meetings) for current project
router.get('/chart', async (req, res) => {
  try {
    const orgId = req.orgId;
    const projectId = req.query.project_id || null;
    const range = (req.query.range || '30D').toUpperCase();
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    if (!['7D', '30D', '90D', '12M'].includes(range)) return res.status(400).json({ error: 'Invalid range. Use 7D, 30D, 90D, or 12M' });

    await ensureProjectStatsColumns();

    const [leadCond, leadParam] = leadWhere(projectId, orgId);

    let sql;
    const params = [leadParam];

    if (range === '7D' || range === '30D') {
      const days = range === '7D' ? 6 : 29; // 7 points (today-6..today) or 30 points (today-29..today)
      params.push(days);
      sql = `
        WITH buckets AS (
          SELECT d::date AS bucket_date
          FROM generate_series(CURRENT_DATE - $2::int, CURRENT_DATE, '1 day'::interval) AS d
        ),
        outreach_counts AS (
          SELECT DATE(l.outreach_sent_at) AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.outreach_sent_at IS NOT NULL AND l.outreach_sent_at >= CURRENT_DATE - $2::int
          GROUP BY DATE(l.outreach_sent_at)
        ),
        response_counts AS (
          SELECT DATE(l.responded_at) AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.responded_at IS NOT NULL AND l.responded_at >= CURRENT_DATE - $2::int
          GROUP BY DATE(l.responded_at)
        ),
        meeting_counts AS (
          SELECT DATE(l.meeting_booked_at) AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.meeting_booked_at IS NOT NULL AND l.meeting_booked_at >= CURRENT_DATE - $2::int
          GROUP BY DATE(l.meeting_booked_at)
        )
        SELECT b.bucket_date, COALESCE(o.cnt, 0)::int AS outreach, COALESCE(r.cnt, 0)::int AS responses, COALESCE(m.cnt, 0)::int AS meetings
        FROM buckets b
        LEFT JOIN outreach_counts o ON o.dt = b.bucket_date
        LEFT JOIN response_counts r ON r.dt = b.bucket_date
        LEFT JOIN meeting_counts m ON m.dt = b.bucket_date
        ORDER BY b.bucket_date
      `;
    } else if (range === '90D') {
      sql = `
        WITH buckets AS (
          SELECT (date_trunc('week', d)::date) AS bucket_date
          FROM generate_series((CURRENT_DATE - 90)::timestamp, CURRENT_DATE::timestamp, '7 days'::interval) AS d
        ),
        outreach_counts AS (
          SELECT date_trunc('week', l.outreach_sent_at)::date AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.outreach_sent_at IS NOT NULL AND l.outreach_sent_at >= CURRENT_DATE - 90
          GROUP BY date_trunc('week', l.outreach_sent_at)
        ),
        response_counts AS (
          SELECT date_trunc('week', l.responded_at)::date AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.responded_at IS NOT NULL AND l.responded_at >= CURRENT_DATE - 90
          GROUP BY date_trunc('week', l.responded_at)
        ),
        meeting_counts AS (
          SELECT date_trunc('week', l.meeting_booked_at)::date AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.meeting_booked_at IS NOT NULL AND l.meeting_booked_at >= CURRENT_DATE - 90
          GROUP BY date_trunc('week', l.meeting_booked_at)
        )
        SELECT b.bucket_date, COALESCE(o.cnt, 0)::int AS outreach, COALESCE(r.cnt, 0)::int AS responses, COALESCE(m.cnt, 0)::int AS meetings
        FROM buckets b
        LEFT JOIN outreach_counts o ON o.dt = b.bucket_date
        LEFT JOIN response_counts r ON r.dt = b.bucket_date
        LEFT JOIN meeting_counts m ON m.dt = b.bucket_date
        ORDER BY b.bucket_date
      `;
    } else {
      sql = `
        WITH buckets AS (
          SELECT (date_trunc('month', d)::date) AS bucket_date
          FROM generate_series(CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE, '1 month'::interval) AS d
        ),
        outreach_counts AS (
          SELECT date_trunc('month', l.outreach_sent_at)::date AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.outreach_sent_at IS NOT NULL AND l.outreach_sent_at >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY date_trunc('month', l.outreach_sent_at)
        ),
        response_counts AS (
          SELECT date_trunc('month', l.responded_at)::date AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.responded_at IS NOT NULL AND l.responded_at >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY date_trunc('month', l.responded_at)
        ),
        meeting_counts AS (
          SELECT date_trunc('month', l.meeting_booked_at)::date AS dt, COUNT(*) AS cnt
          FROM leads l
          WHERE ${leadCond} AND l.meeting_booked_at IS NOT NULL AND l.meeting_booked_at >= CURRENT_DATE - INTERVAL '12 months'
          GROUP BY date_trunc('month', l.meeting_booked_at)
        )
        SELECT b.bucket_date, COALESCE(o.cnt, 0)::int AS outreach, COALESCE(r.cnt, 0)::int AS responses, COALESCE(m.cnt, 0)::int AS meetings
        FROM (SELECT (date_trunc('month', d)::date) AS bucket_date FROM generate_series(CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE, '1 month'::interval) AS d) b
        LEFT JOIN outreach_counts o ON o.dt = b.bucket_date
        LEFT JOIN response_counts r ON r.dt = b.bucket_date
        LEFT JOIN meeting_counts m ON m.dt = b.bucket_date
        ORDER BY b.bucket_date
      `;
    }

    const result = await query(sql, params);
    const rows = result.rows || [];
    const outreach = rows.map(r => r.outreach);
    const responses = rows.map(r => r.responses);
    const meetings = rows.map(r => r.meetings);
    const dates = rows.map(r => r.bucket_date);

    res.json({ outreach, responses, meetings, dates, startDate: rows[0]?.bucket_date, endDate: rows[rows.length - 1]?.bucket_date });
  } catch (err) {
    console.error('Chart stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
