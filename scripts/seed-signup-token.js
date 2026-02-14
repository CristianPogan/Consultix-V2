#!/usr/bin/env node
/**
 * Seed the default signup access token into the database.
 * Run: node scripts/seed-signup-token.js
 * Or on Heroku: heroku run node scripts/seed-signup-token.js
 */
import 'dotenv/config';
import { query } from '../api/db.js';

const DEFAULT_SIGNUP_TOKEN = process.env.DEFAULT_SIGNUP_TOKEN || 'KLNY9NIhBFNPGFjw';

async function main() {
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
    console.log('Table signup_access_tokens ready');

    const res = await query(
      `INSERT INTO signup_access_tokens (token, assigned_credits, status) VALUES ($1, 300, 'active')
       ON CONFLICT (token) DO UPDATE SET status = 'active', assigned_credits = 300, updated_at = now()
       RETURNING id, token, assigned_credits, status`,
      [DEFAULT_SIGNUP_TOKEN]
    );
    console.log('Token seeded:', res.rows[0]);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
