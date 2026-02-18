import { Router } from 'express';
import { query, ensureOrgExists, ensureProjectSettingsTable, getFormSchema } from '../db.js';

const router = Router();

// Ensure settings table exists
async function ensureSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      org_id TEXT NOT NULL,
      settings_type TEXT NOT NULL,
      settings_data JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, settings_type)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id)').catch(() => {});
}

// Project-scoped settings (ai_sdr): use project_settings table, allow userId null for org-level
const PROJECT_SCOPED_TYPES = ['ai_sdr'];
// User/org-level: when userId present use user_settings; when null use project_settings (org_id, project_id='')
const ORG_FALLBACK_TYPES = ['brand_voice', 'buyer_persona'];

// GET /api/settings/schema/:formType - Get form schema (Brand Voice questions from Postgres)
router.get('/schema/:formType', async (req, res) => {
  try {
    const { formType } = req.params;
    if (!['brand_voice', 'buyer_persona'].includes(formType)) {
      return res.status(400).json({ error: 'formType must be brand_voice or buyer_persona' });
    }
    const rows = await getFormSchema(formType);
    const sections = {};
    for (const r of rows) {
      if (!sections[r.section]) sections[r.section] = [];
      sections[r.section].push({
        key: r.field_key,
        label: r.label,
        placeholder: r.placeholder,
        type: r.field_type,
      });
    }
    const schema = Object.entries(sections).map(([section, items]) => ({ section, items }));
    res.json({ schema });
  } catch (err) {
    console.error('Get form schema error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/:type - Get settings by type. For ai_sdr, use ?project_id= for project scope.
router.get('/:type', async (req, res) => {
  try {
    const userId = req.userId;
    const orgId = req.orgId;
    const { type } = req.params;
    const projectId = req.query.project_id || '';

    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });

    if (PROJECT_SCOPED_TYPES.includes(type)) {
      await ensureProjectSettingsTable();
      const result = await query(
        `SELECT settings_data FROM project_settings
         WHERE org_id = $1 AND project_id = $2 AND settings_type = $3
         AND (user_id IS NOT DISTINCT FROM $4)`,
        [orgId, projectId, type, userId || null]
      );
      if (result.rows.length === 0) return res.json({ settings: null });
      return res.json({ settings: result.rows[0].settings_data });
    }

    // brand_voice, buyer_persona: user_settings when userId present; project_settings (org-level) when null
    if (ORG_FALLBACK_TYPES.includes(type)) {
      if (userId) {
        await ensureSettingsTable();
        const result = await query(
          'SELECT settings_data FROM user_settings WHERE user_id = $1 AND settings_type = $2',
          [userId, type]
        );
        if (result.rows.length > 0) return res.json({ settings: result.rows[0].settings_data });
      }
      await ensureProjectSettingsTable();
      const result = await query(
        `SELECT settings_data FROM project_settings
         WHERE org_id = $1 AND project_id = '' AND settings_type = $2 AND user_id IS NULL`,
        [orgId, type]
      );
      return res.json({ settings: result.rows[0]?.settings_data || null });
    }

    if (!userId) return res.status(401).json({ error: 'User ID required' });
    await ensureSettingsTable();
    const result = await query(
      'SELECT settings_data FROM user_settings WHERE user_id = $1 AND settings_type = $2',
      [userId, type]
    );
    if (result.rows.length === 0) return res.json({ settings: null });
    res.json({ settings: result.rows[0].settings_data });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/:type - Save settings. For ai_sdr, use ?project_id= or body projectId.
router.post('/:type', async (req, res) => {
  try {
    const userId = req.userId;
    const orgId = req.orgId;
    const { type } = req.params;
    const { settings, projectId } = req.body || {};
    const projectIdQuery = req.query.project_id || projectId || '';

    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    if (!settings) return res.status(400).json({ error: 'Settings data required' });
    if (orgId) await ensureOrgExists(orgId);

    if (PROJECT_SCOPED_TYPES.includes(type)) {
      await ensureProjectSettingsTable();
      const existing = await query(
        `SELECT id FROM project_settings
         WHERE org_id = $1 AND project_id = $2 AND settings_type = $3
         AND (user_id IS NOT DISTINCT FROM $4)`,
        [orgId, projectIdQuery, type, userId || null]
      );
      if (existing.rows.length > 0) {
        await query(
          `UPDATE project_settings SET settings_data = $4, updated_at = now()
           WHERE org_id = $1 AND project_id = $2 AND settings_type = $3
           AND (user_id IS NOT DISTINCT FROM $5)`,
          [orgId, projectIdQuery, type, JSON.stringify(settings), userId || null]
        );
      } else {
        await query(
          `INSERT INTO project_settings (org_id, project_id, user_id, settings_type, settings_data)
           VALUES ($1, $2, $3, $4, $5)`,
          [orgId, projectIdQuery, userId || null, type, JSON.stringify(settings)]
        );
      }
      const getResult = await query(
        `SELECT settings_data FROM project_settings
         WHERE org_id = $1 AND project_id = $2 AND settings_type = $3
         AND (user_id IS NOT DISTINCT FROM $4)`,
        [orgId, projectIdQuery, type, userId || null]
      );
      return res.json({ success: true, settings: getResult.rows[0]?.settings_data || settings });
    }

    // brand_voice, buyer_persona: save to user_settings when userId; else project_settings (org-level)
    if (ORG_FALLBACK_TYPES.includes(type)) {
      if (userId) {
        await ensureSettingsTable();
        const result = await query(
          `INSERT INTO user_settings (user_id, org_id, settings_type, settings_data)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, settings_type)
           DO UPDATE SET settings_data = $4, updated_at = now()
           RETURNING id, settings_data`,
          [userId, orgId, type, JSON.stringify(settings)]
        );
        return res.json({ success: true, settings: result.rows[0].settings_data });
      }
      await ensureProjectSettingsTable();
      const existing = await query(
        `SELECT id FROM project_settings WHERE org_id = $1 AND project_id = '' AND settings_type = $2 AND user_id IS NULL`,
        [orgId, type]
      );
      if (existing.rows.length > 0) {
        await query(
          `UPDATE project_settings SET settings_data = $3, updated_at = now()
           WHERE org_id = $1 AND project_id = '' AND settings_type = $2 AND user_id IS NULL`,
          [orgId, type, JSON.stringify(settings)]
        );
      } else {
        await query(
          `INSERT INTO project_settings (org_id, project_id, user_id, settings_type, settings_data)
           VALUES ($1, '', NULL, $2, $3)`,
          [orgId, type, JSON.stringify(settings)]
        );
      }
      const getResult = await query(
        `SELECT settings_data FROM project_settings
         WHERE org_id = $1 AND project_id = '' AND settings_type = $2 AND user_id IS NULL`,
        [orgId, type]
      );
      return res.json({ success: true, settings: getResult.rows[0]?.settings_data || settings });
    }

    if (!userId) return res.status(401).json({ error: 'User ID required' });
    await ensureSettingsTable();
    const result = await query(
      `INSERT INTO user_settings (user_id, org_id, settings_type, settings_data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, settings_type)
       DO UPDATE SET settings_data = $4, updated_at = now()
       RETURNING id, settings_data`,
      [userId, orgId, type, JSON.stringify(settings)]
    );
    res.json({ success: true, settings: result.rows[0].settings_data });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
