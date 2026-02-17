#!/usr/bin/env node
/**
 * Set a user as platform admin
 * Usage: node scripts/set-admin-role.js <email>
 */
import 'dotenv/config';
import { query } from '../api/db.js';

const email = process.argv[2];

if (!email) {
  console.error('Usage: node scripts/set-admin-role.js <email>');
  process.exit(1);
}

async function main() {
  try {
    const result = await query(
      `UPDATE app_users SET role = 'platform_admin' WHERE LOWER(email) = LOWER($1) RETURNING id, email, name, role`,
      [email]
    );
    
    if (result.rows.length === 0) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('✓ User updated to platform_admin:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
