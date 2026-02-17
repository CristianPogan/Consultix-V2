import pg from 'pg';

const { Pool } = pg;

// Heroku provides DATABASE_URL; otherwise use individual env vars
// SSL: Heroku Postgres and many RDS/cloud Postgres use certs that trigger "unable to get local issuer certificate"
// when rejectUnauthorized is true. Use false to avoid 500s on DB operations (connection remains encrypted).
const sslOpt = { rejectUnauthorized: false };
const config = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL, 
      ssl: sslOpt,
      // Add connection pool settings to handle timeouts
      max: 10, // maximum number of clients in the pool
      idleTimeoutMillis: 30000, // close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // return an error after 10 seconds if connection cannot be established
    }
  : {
      host: process.env.DB_HOST || 'cbhnv71uilek74.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'da9fpsg176u1ef',
      user: process.env.DB_USER || 'u2bsp865bnr7av',
      password: process.env.DB_PASSWORD,
      ssl: sslOpt,
      // Add connection pool settings
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(config);

// Handle pool errors to prevent app crash
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

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

export async function ensureOrgExists(orgId) {
  if (!orgId) return false;
  
  try {
    // Check if org exists
    const checkResult = await query('SELECT id FROM organisations WHERE id = $1', [orgId]);
    if (checkResult.rows.length > 0) return true;
    
    // Create org if it doesn't exist - generate slug from orgId
    const slug = `org-${orgId.substring(0, 8)}`;
    
    await query(
      `INSERT INTO organisations (id, name, slug) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (id) DO NOTHING`,
      [orgId, 'Default Organisation', slug]
    );
    
    return true;
  } catch (err) {
    console.error('Failed to ensure org exists:', err);
    return false;
  }
}

// Projects stored as organisations — seed default projects (table may have UUID or TEXT id)
const DEFAULT_PROJECTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Hastingwood Securities', full_name: 'Hastingwood Securities AI Audit', slug: 'hastingwood-securities', created: '2026-01-15' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Acme Corp', full_name: 'Acme Corp Digital Transformation', slug: 'acme-corp', created: '2026-01-20' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'TechStart', full_name: 'TechStart AI Assessment', slug: 'techstart', created: '2026-02-01' },
];

async function ensureOrganisationsTable() {
  try {
    await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS full_name TEXT').catch(() => {});
    await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()').catch(() => {});
    await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS is_project BOOLEAN DEFAULT false').catch(() => {});
  } catch (_) {}
}

async function seedDefaultProjects() {
  try {
    for (const p of DEFAULT_PROJECTS) {
      await query(
        `INSERT INTO organisations (id, name, slug, full_name, created_at, is_project)
         VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, true)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           slug = EXCLUDED.slug,
           full_name = COALESCE(EXCLUDED.full_name, organisations.full_name),
           created_at = COALESCE(EXCLUDED.created_at::timestamptz, organisations.created_at),
           is_project = true,
           updated_at = now()`,
        [p.id, p.name, p.slug, p.full_name || p.name, p.created]
      ).catch(() => {});
    }
  } catch (_) {}
}

let _organisationsReady = false;
export async function ensureOrganisationsReady() {
  if (_organisationsReady) return;
  await ensureOrganisationsTable();
  await seedDefaultProjects();
  _organisationsReady = true;
}

export async function listOrganisations() {
  await ensureOrganisationsReady();
  const projectIds = DEFAULT_PROJECTS.map(p => p.id);
  let rows = [];
  try {
    const res = await query(
      `SELECT id, name, slug, full_name, created_at FROM organisations WHERE is_project = true ORDER BY id`
    );
    rows = res?.rows || [];
  } catch (e) {
    try {
      const res = await query(
        `SELECT id, name, slug, full_name, created_at FROM organisations WHERE id IN ($1::uuid, $2::uuid, $3::uuid) ORDER BY id`,
        projectIds
      );
      rows = res?.rows || [];
    } catch (_) {
      return [];
    }
  }
  return rows.map(r => ({
    ...r,
    full_name: r.full_name ?? r.name,
  }));
}

// =============================================================================
// integration_credentials — API keys & tokens per org (linked via org_id)
// =============================================================================

async function ensureIntegrationCredentialsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS integration_credentials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      org_id TEXT NOT NULL,
      integration_key TEXT NOT NULL,
      credentials_json JSONB NOT NULL DEFAULT '{}',
      connected BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(org_id, integration_key)
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_integration_credentials_org ON integration_credentials(org_id)').catch(() => {});
}

export async function getIntegrationCredentials(orgId, integrationKey) {
  await ensureIntegrationCredentialsTable();
  const res = await query(
    'SELECT integration_key, credentials_json, connected FROM integration_credentials WHERE org_id = $1 AND integration_key = $2',
    [orgId, integrationKey]
  );
  return res.rows[0] || null;
}

export async function listIntegrationCredentials(orgId) {
  await ensureIntegrationCredentialsTable();
  const res = await query(
    'SELECT integration_key, connected FROM integration_credentials WHERE org_id = $1 ORDER BY integration_key',
    [orgId]
  );
  return res.rows;
}

export async function saveIntegrationCredentials(orgId, integrationKey, credentials = {}) {
  await ensureIntegrationCredentialsTable();
  await query(
    `INSERT INTO integration_credentials (org_id, integration_key, credentials_json, connected, updated_at)
     VALUES ($1, $2, $3::jsonb, true, now())
     ON CONFLICT (org_id, integration_key)
     DO UPDATE SET credentials_json = $3::jsonb, connected = true, updated_at = now()`,
    [orgId, integrationKey, JSON.stringify(credentials)]
  );
  return { integration_key: integrationKey, connected: true };
}

export async function disconnectIntegration(orgId, integrationKey) {
  await ensureIntegrationCredentialsTable();
  await query(
    `UPDATE integration_credentials SET credentials_json = '{}'::jsonb, connected = false, updated_at = now()
     WHERE org_id = $1 AND integration_key = $2`,
    [orgId, integrationKey]
  );
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
      role TEXT DEFAULT 'org_member',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email)').catch(() => {});
  // Add new columns to existing tables
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS company TEXT').catch(() => {});
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT \'Europe/London\'').catch(() => {});
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT').catch(() => {});
  await query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT \'org_member\'').catch(() => {});
}

let _usersTableReady = false;
async function ensureUsersTableReady() {
  if (_usersTableReady) return;
  await ensureAppUsersTable();
  _usersTableReady = true;
}

export async function findUserByEmail(email) {
  await ensureUsersTableReady();
  const res = await query('SELECT id, email, password_hash, name, org_id, company, timezone, profile_photo_url, role FROM app_users WHERE LOWER(email) = LOWER($1)', [email]);
  return res.rows[0] || null;
}

export async function findUserById(userId) {
  await ensureUsersTableReady();
  const res = await query('SELECT id, email, name, org_id, company, timezone, profile_photo_url, role, created_at FROM app_users WHERE id = $1', [userId]);
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
