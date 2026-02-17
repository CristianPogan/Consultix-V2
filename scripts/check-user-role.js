#!/usr/bin/env node
/**
 * Check a user's role
 * Usage: node scripts/check-user-role.js <email>
 */
import 'dotenv/config';
import { query } from '../api/db.js';

const email = process.argv[2] || 'john12345@doe.com';

async function main() {
  try {
    const result = await query(
      `SELECT id, email, name, role FROM app_users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    
    if (result.rows.length === 0) {
      console.error(`User with email "${email}" not found`);
      process.exit(1);
    }
    
    const user = result.rows[0];
    console.log('User details:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Role: ${user.role || 'NULL'}`);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
