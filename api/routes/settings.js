import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

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

// GET /api/settings/:type - Get user settings by type (brand_voice, buyer_persona, etc.)
router.get('/:type', async (req, res) => {
  try {
    const userId = req.userId;
    const orgId = req.orgId;
    const { type } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    await ensureSettingsTable();
    
    const result = await query(
      'SELECT settings_data FROM user_settings WHERE user_id = $1 AND settings_type = $2',
      [userId, type]
    );
    
    if (result.rows.length === 0) {
      return res.json({ settings: null });
    }
    
    res.json({ settings: result.rows[0].settings_data });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/:type - Save user settings
router.post('/:type', async (req, res) => {
  try {
    const userId = req.userId;
    const orgId = req.orgId;
    const { type } = req.params;
    const { settings } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    if (!settings) {
      return res.status(400).json({ error: 'Settings data required' });
    }
    
    // Ensure organisation exists
    if (orgId) await ensureOrgExists(orgId);
    
    await ensureSettingsTable();
    
    const result = await query(
      `INSERT INTO user_settings (user_id, org_id, settings_type, settings_data)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, settings_type)
       DO UPDATE SET settings_data = $4, updated_at = now()
       RETURNING id, settings_data`,
      [userId, orgId, type, JSON.stringify(settings)]
    );
    
    res.json({ 
      success: true,
      settings: result.rows[0].settings_data 
    });
  } catch (err) {
    console.error('Save settings error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
