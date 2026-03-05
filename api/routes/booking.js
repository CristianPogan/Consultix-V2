import { Router } from 'express';
import { query, ensureOrgExists } from '../db.js';

const router = Router();

let _tablesReady = false;
async function ensureBookingTables() {
  if (_tablesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS booking_event_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      name TEXT NOT NULL,
      duration INTEGER DEFAULT 30,
      location TEXT DEFAULT 'zoom',
      slug TEXT,
      active BOOLEAN DEFAULT true,
      color TEXT,
      bookings_count INTEGER DEFAULT 0,
      config_json JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_booking_event_types_org ON booking_event_types(org_id)').catch(() => {});

  await query(`
    CREATE TABLE IF NOT EXISTS booking_availability (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      day_of_week TEXT NOT NULL,
      enabled BOOLEAN DEFAULT true,
      start_time TEXT DEFAULT '09:00',
      end_time TEXT DEFAULT '17:00'
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_booking_availability_org ON booking_availability(org_id)').catch(() => {});
  _tablesReady = true;
}

// --- Event Types ---
router.get('/event-types', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureBookingTables();
    const result = await query('SELECT * FROM booking_event_types WHERE org_id = $1 ORDER BY created_at DESC', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('booking/event-types GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/event-types', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    await ensureBookingTables();
    const { name, duration, location, slug, active, color, config_json } = req.body || {};
    const result = await query(
      `INSERT INTO booking_event_types (org_id, name, duration, location, slug, active, color, config_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb) RETURNING *`,
      [orgId, name || 'Untitled', duration || 30, location || 'zoom', slug || null,
       active !== undefined ? active : true, color || null, config_json ? JSON.stringify(config_json) : '{}']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('booking/event-types POST', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/event-types/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureBookingTables();
    const { name, duration, location, slug, active, color, config_json } = req.body || {};
    const sets = []; const vals = []; let p = 1;
    if (name !== undefined) { sets.push(`name = $${p++}`); vals.push(name); }
    if (duration !== undefined) { sets.push(`duration = $${p++}`); vals.push(duration); }
    if (location !== undefined) { sets.push(`location = $${p++}`); vals.push(location); }
    if (slug !== undefined) { sets.push(`slug = $${p++}`); vals.push(slug); }
    if (active !== undefined) { sets.push(`active = $${p++}`); vals.push(active); }
    if (color !== undefined) { sets.push(`color = $${p++}`); vals.push(color); }
    if (config_json !== undefined) { sets.push(`config_json = $${p++}::jsonb`); vals.push(JSON.stringify(config_json)); }
    if (!sets.length) return res.status(400).json({ error: 'No updates provided' });
    sets.push('updated_at = now()');
    vals.push(req.params.id, orgId);
    const result = await query(
      `UPDATE booking_event_types SET ${sets.join(', ')} WHERE id = $${p} AND org_id = $${p + 1} RETURNING *`, vals
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('booking/event-types PUT', err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/event-types/:id', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureBookingTables();
    const result = await query('DELETE FROM booking_event_types WHERE id = $1 AND org_id = $2 RETURNING id', [req.params.id, orgId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('booking/event-types DELETE', err);
    res.status(500).json({ error: err.message });
  }
});

// --- Availability ---
router.get('/availability', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureBookingTables();
    const result = await query('SELECT * FROM booking_availability WHERE org_id = $1 ORDER BY day_of_week', [orgId]);
    res.json(result.rows);
  } catch (err) {
    console.error('booking/availability GET', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/availability', async (req, res) => {
  try {
    const orgId = req.orgId;
    if (!orgId) return res.status(503).json({ error: 'No organisation configured' });
    await ensureOrgExists(orgId);
    await ensureBookingTables();
    const items = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array of availability items' });
    const results = [];
    for (const item of items) {
      const { day_of_week, enabled, start_time, end_time } = item;
      if (!day_of_week) continue;
      const existing = await query(
        'SELECT id FROM booking_availability WHERE org_id = $1 AND day_of_week = $2',
        [orgId, day_of_week]
      );
      if (existing.rows.length > 0) {
        const upd = await query(
          `UPDATE booking_availability SET enabled = $1, start_time = $2, end_time = $3
           WHERE org_id = $4 AND day_of_week = $5 RETURNING *`,
          [enabled !== undefined ? enabled : true, start_time || '09:00', end_time || '17:00', orgId, day_of_week]
        );
        results.push(upd.rows[0]);
      } else {
        const ins = await query(
          `INSERT INTO booking_availability (org_id, day_of_week, enabled, start_time, end_time)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [orgId, day_of_week, enabled !== undefined ? enabled : true, start_time || '09:00', end_time || '17:00']
        );
        results.push(ins.rows[0]);
      }
    }
    res.json(results);
  } catch (err) {
    console.error('booking/availability PUT', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
