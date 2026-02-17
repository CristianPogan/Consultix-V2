#!/usr/bin/env node
/**
 * Add role column to app_users table
 */
import 'dotenv/config';
import { query } from '../api/db.js';

async function main() {
  try {
    console.log('Adding role column to app_users table...');
    
    await query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'org_member'`);
    
    console.log('✓ Role column added successfully');
    console.log('✓ Default role set to: org_member');
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
