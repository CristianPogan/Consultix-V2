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
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email)').catch(() => {});
}

let _usersTableReady = false;
async function ensureUsersTableReady() {
  if (_usersTableReady) return;
  await ensureAppUsersTable();
  _usersTableReady = true;
}

export async function findUserByEmail(email) {
  await ensureUsersTableReady();
  const res = await query('SELECT id, email, password_hash, name, org_id FROM app_users WHERE LOWER(email) = LOWER($1)', [email]);
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

export async function validateSignupToken(accessToken) {
  if (!accessToken || typeof accessToken !== 'string') return null;
  const token = accessToken.trim();
  if (!token) return null;
  try {
    const res = await query(
      `SELECT id, token, assigned_credits, status FROM signup_access_tokens WHERE token = $1`,
      [token]
    );
    const row = res.rows[0];
    if (!row) return null;
    if (row.status && row.status !== 'active' && String(row.status).toLowerCase() !== 'active') return { valid: false, reason: 'Token is inactive or expired' };
    return { valid: true, id: row.id, assignedCredits: row.assigned_credits };
  } catch (err) {
    if (err.code === '42P01') return null;
    throw err;
  }
}

export default pool;
