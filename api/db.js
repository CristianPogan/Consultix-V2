import pg from 'pg';

const { Pool } = pg;

// Heroku provides DATABASE_URL; otherwise use individual env vars
// SSL: Heroku Postgres and many RDS/cloud Postgres use certs that trigger "unable to get local issuer certificate"
// when rejectUnauthorized is true. Use false to avoid 500s on DB operations (connection remains encrypted).
const sslOpt = { rejectUnauthorized: false };
const config = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: sslOpt }
  : {
      host: process.env.DB_HOST || 'cbhnv71uilek74.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'da9fpsg176u1ef',
      user: process.env.DB_USER || 'u2bsp865bnr7av',
      password: process.env.DB_PASSWORD,
      ssl: sslOpt,
    };

const pool = new Pool(config);

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function getOrgId() {
  const orgId = process.env.DEMO_ORG_ID;
  if (orgId) return orgId;
  const res = await query('SELECT id FROM organisations LIMIT 1');
  return res.rows[0]?.id || null;
}

async function ensureAppUsersTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      org_id TEXT NOT NULL,
      company TEXT,
      timezone TEXT DEFAULT 'Europe/London',
      profile_photo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email)').catch(() => {});
  // Add new columns to existing tables
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS company TEXT').catch(() => {});
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'Europe/London\'').catch(() => {});
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT').catch(() => {});
}

let _usersTableReady = false;
async function ensureUsersTableReady() {
  if (_usersTableReady) return;
  await ensureAppUsersTable();
  _usersTableReady = true;
}

export async function findUserByEmail(email) {
  await ensureUsersTableReady();
  const res = await query('SELECT id, email, password_hash, name, org_id, company, timezone, profile_photo_url FROM app_users WHERE LOWER(email) = LOWER($1)', [email]);
  return res.rows[0] || null;
}

export async function findUserById(userId) {
  await ensureUsersTableReady();
  const res = await query('SELECT id, email, name, org_id, company, timezone, profile_photo_url, created_at FROM app_users WHERE id = $1', [userId]);
  return res.rows[0] || null;
}

export async function updateUserProfile(userId, updates) {
  await ensureUsersTableReady();
  const fields = [];
  const values = [];
  let paramCount = 1;
  
  if (updates.name !== undefined) {
    fields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }
  if (updates.company !== undefined) {
    fields.push(`company = $${paramCount++}`);
    values.push(updates.company);
  }
  if (updates.timezone !== undefined) {
    fields.push(`timezone = $${paramCount++}`);
    values.push(updates.timezone);
  }
  if (updates.profile_photo_url !== undefined) {
    fields.push(`profile_photo_url = $${paramCount++}`);
    values.push(updates.profile_photo_url);
  }
  
  if (fields.length === 0) return null;
  
  fields.push(`updated_at = now()`);
  values.push(userId);
  
  const res = await query(
    `UPDATE app_users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, org_id, company, timezone, profile_photo_url`,
    values
  );
  return res.rows[0] || null;
}

export async function createUser(email, passwordHash, name, orgId) {
  await ensureUsersTableReady();
  const res = await query(
    'INSERT INTO app_users (email, password_hash, name, org_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name, org_id',
    [email.toLowerCase().trim(), passwordHash, name.trim(), orgId]
  );
  return res.rows[0];
}

async function ensurePasswordResetTokensTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)').catch(() => {});
  await query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)').catch(() => {});
}

let _resetTokensTableReady = false;
async function ensureResetTokensReady() {
  if (_resetTokensTableReady) return;
  await ensureUsersTableReady();
  await ensurePasswordResetTokensTable();
  _resetTokensTableReady = true;
}

export async function createPasswordResetToken(userId) {
  await ensureResetTokensReady();
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
  return { token, expiresAt };
}

export async function findValidResetToken(token) {
  await ensureResetTokensReady();
  const res = await query(
    `SELECT prt.id, prt.user_id, prt.token, prt.expires_at
     FROM password_reset_tokens prt
     WHERE prt.token = $1 AND prt.used_at IS NULL AND prt.expires_at > now()`,
    [token]
  );
  return res.rows[0] || null;
}

export async function consumeResetToken(token) {
  await ensureResetTokensReady();
  await query('UPDATE password_reset_tokens SET used_at = now() WHERE token = $1', [token]);
}

export async function updateUserPassword(userId, passwordHash) {
  await ensureUsersTableReady();
  await query('UPDATE app_users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, userId]);
}

// Default signup token — matches scripts/update_credits_and_billing.py and tests
const DEFAULT_SIGNUP_TOKEN = process.env.DEFAULT_SIGNUP_TOKEN || 'KLNY9NIhBFNPGFjw';

async function ensureSignupAccessTokensTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS signup_access_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token TEXT UNIQUE NOT NULL,
        assigned_credits INTEGER DEFAULT 300,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_signup_access_tokens_token ON signup_access_tokens(token)').catch(() => {});
  } catch (e) {
    // Table may already exist with different schema
  }
  // Always try to upsert default token (idempotent) — handles empty table or schema differences
  try {
    await query(
      `INSERT INTO signup_access_tokens (token, assigned_credits, status) VALUES ($1, 300, 'active')
       ON CONFLICT (token) DO UPDATE SET status = 'active', assigned_credits = 300, updated_at = now()`,
      [DEFAULT_SIGNUP_TOKEN]
    );
  } catch (e) {
    // Schema may lack assigned_credits/status — try minimal insert
    try {
      await query(`INSERT INTO signup_access_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING`, [DEFAULT_SIGNUP_TOKEN]);
    } catch (_) {}
  }
}

let _signupTokensTableReady = false;
async function ensureSignupTokensReady() {
  if (_signupTokensTableReady) return;
  await ensureSignupAccessTokensTable();
  _signupTokensTableReady = true;
}

export async function validateSignupToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null;
  const token = accessToken.trim();
  if (!token) return null;
  try {
    await ensureSignupTokensReady();
    // Prefer full select; fallback to token-only if schema differs
    let row = null;
    try {
      const res = await query(
        `SELECT id, token, assigned_credits, status FROM signup_access_tokens WHERE token = $1`,
        [token]
      );
      row = res.rows[0];
    } catch (e) {
      try {
        const res = await query(`SELECT id, token FROM signup_access_tokens WHERE token = $1`, [token]);
        row = res.rows[0] ? { ...res.rows[0], assigned_credits: 300, status: 'active' } : null;
      } catch (_) {
        return null;
      }
    }
    if (!row && token === DEFAULT_SIGNUP_TOKEN) {
      for (const stmt of [
        `INSERT INTO signup_access_tokens (token, assigned_credits, status) VALUES ($1, 300, 'active') ON CONFLICT (token) DO NOTHING`,
        `INSERT INTO signup_access_tokens (token) VALUES ($1) ON CONFLICT (token) DO NOTHING`,
        `INSERT INTO signup_access_tokens (token, assigned_credits, status) VALUES ($1, 300, 'active')`,
      ]) {
        try {
          await query(stmt, [token]);
        } catch (_) {}
      }
      const retry = await query(`SELECT id, token FROM signup_access_tokens WHERE token = $1`, [token]).catch(() => ({ rows: [] }));
      row = retry.rows[0] ? { ...retry.rows[0], assigned_credits: 300, status: 'active' } : null;
    }
    if (!row) return null;
    const status = row.status == null ? 'active' : String(row.status).toLowerCase();
    if (status !== 'active') return { valid: false, reason: 'Token is inactive or expired' };
    return { valid: true, id: row.id, assignedCredits: row.assigned_credits ?? 300 };
  } catch (err) {
    if (err.code === '42P01') return null;
    throw err;
  }
}

export default pool;
