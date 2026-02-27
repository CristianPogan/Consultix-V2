#!/usr/bin/env node
/**
 * List all users from app_users table.
 * Run: node scripts/list-users.js (requires DB connection env vars)
 */
import { query } from '../api/db.js';

async function main() {
  try {
    const res = await query(
      'SELECT id, email, name, created_at FROM app_users ORDER BY created_at DESC'
    );
    console.log('\nUsers (app_users):');
    console.log('─'.repeat(80));
    if (res.rows.length === 0) {
      console.log('No users found.');
      return;
    }
    for (const row of res.rows) {
      console.log(`ID: ${row.id}`);
      console.log(`Email: ${row.email}`);
      console.log(`Name: ${row.name}`);
      console.log(`Created: ${row.created_at}`);
      console.log('─'.repeat(80));
    }
    console.log(`Total: ${res.rows.length} user(s)\n`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

main();
