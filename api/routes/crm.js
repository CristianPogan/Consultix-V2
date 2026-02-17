import { Router } from 'express';
import { query, ensureCRMPipelineColumns } from '../db.js';

const router = Router();

const STAGES = ['New', 'Contacted', 'Replied', 'Meeting Booked', 'Proposal Sent', 'Won', 'Lost'];

function deriveStage(row) {
  if (row.won_at) return 'Won';
  if (row.lost_at) return 'Lost';
  if (row.proposal_sent_at) return 'Proposal Sent';
  if (row.meeting_booked_at) return 'Meeting Booked';
  if (row.responded_at) return 'Replied';
  if (row.outreach_sent_at) return 'Contacted';
  return 'New';
}

function formatLastActivity(row) {
  const dates = [
    ['won_at', 'Won'],
    ['lost_at', 'Lost'],
    ['proposal_sent_at', 'Proposal sent'],
    ['meeting_booked_at', 'Meeting booked'],
    ['responded_at', 'Replied'],
    ['outreach_sent_at', 'Outreach sent'],
    ['created_at', 'Added'],
  ];
  let latest = null;
  let latestKey = null;
  for (const [key, label] of dates) {
    const d = row[key];
    if (d && (!latest || new Date(d) > new Date(latest))) {
      latest = d;
      latestKey = label;
    }
  }
  if (!latest) return 'Added';
  const ms = Date.now() - new Date(latest).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  let ago = '';
  if (mins < 60) ago = mins <= 1 ? 'just now' : `${mins}m ago`;
  else if (hours < 24) ago = `${hours}h ago`;
  else if (days < 7) ago = `${days}d ago`;
  else ago = new Date(latest).toLocaleDateString();
  return `${latestKey} ${ago}`;
}

// GET /api/crm/pipeline - List leads as CRM deals (project-scoped)
router.get('/pipeline', async (req, res) => {
  try {
    const orgId = req.orgId;
    const projectId = req.query.project_id || null;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    await ensureCRMPipelineColumns();

    const leadCond = projectId ? 'AND l.project_id = $2' : '';
    const params = projectId ? [orgId, projectId] : [orgId];

    const result = await query(
      `SELECT l.id, l.first_name, l.last_name, l.email, l.title, l.company, l.icp_score,
        l.outreach_sent_at, l.responded_at, l.meeting_booked_at, l.proposal_sent_at, l.won_at, l.lost_at,
        l.deal_value, l.crm_notes, l.created_at,
        ll.name AS list_name
       FROM leads l
       LEFT JOIN lead_lists ll ON ll.id = l.list_id AND ll.org_id = l.org_id
       WHERE l.org_id = $1 ${leadCond}
       ORDER BY l.created_at DESC`,
      params
    );

    const deals = (result.rows || []).map(r => {
      const name = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.email || 'Unknown';
      const stage = deriveStage(r);
      const value = r.deal_value != null ? parseFloat(r.deal_value) : null;
      const valueFmt = value != null ? `£${value.toLocaleString()}` : '—';
      return {
        id: r.id,
        name,
        title: r.title || '',
        company: r.company || '',
        score: r.icp_score != null ? parseInt(r.icp_score, 10) : null,
        stage,
        source: r.list_name || '—',
        lastActivity: formatLastActivity(r),
        value: valueFmt,
        valueNum: value,
        email: r.email,
        crm_notes: r.crm_notes,
      };
    });

    const pipelineValue = deals
      .filter(d => d.stage !== 'Lost')
      .reduce((sum, d) => sum + (d.valueNum || 0), 0);

    res.json({
      deals,
      totalDeals: deals.length,
      pipelineValue: Math.round(pipelineValue),
    });
  } catch (err) {
    console.error('CRM pipeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
