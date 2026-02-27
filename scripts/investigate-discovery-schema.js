#!/usr/bin/env node
/**
 * Investigate Postgres schema for companies, leads, lead_lists and run test discovery queries.
 * Run: node scripts/investigate-discovery-schema.js
 * Requires: DATABASE_URL or DB_* env vars
 */
import 'dotenv/config';
import { query } from '../api/db.js';

async function main() {
  console.log('\n=== 1. Table structure: companies ===\n');
  const colCompanies = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'companies'
    ORDER BY ordinal_position
  `);
  console.table(colCompanies.rows);

  console.log('\n=== 2. Table structure: leads ===\n');
  const colLeads = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'leads'
    ORDER BY ordinal_position
  `);
  console.table(colLeads.rows);

  console.log('\n=== 3. Sample org_ids in companies ===\n');
  const orgs = await query(`
    SELECT org_id, COUNT(*) as cnt
    FROM companies
    GROUP BY org_id
    ORDER BY cnt DESC
    LIMIT 10
  `);
  console.table(orgs.rows);

  console.log('\n=== 4. Sample companies (first 5 rows) ===\n');
  const sample = await query(`
    SELECT id, name, domain, industry, employee_count, employee_range,
           headquarters_country, headquarters_state, icp_fit_score
    FROM companies
    LIMIT 5
  `);
  console.table(sample.rows);

  console.log('\n=== 5. Industry values in companies (distinct) ===\n');
  const industries = await query(`
    SELECT industry, COUNT(*) as cnt
    FROM companies
    WHERE industry IS NOT NULL AND industry != ''
    GROUP BY industry
    ORDER BY cnt DESC
    LIMIT 20
  `);
  console.table(industries.rows);

  console.log('\n=== 6. Test: companies with industry ILIKE HVAC ===\n');
  const hvacIndustry = await query(`
    SELECT id, name, industry, employee_count, employee_range, headquarters_country
    FROM companies
    WHERE industry ILIKE '%HVAC%'
    LIMIT 10
  `);
  console.log(`Found ${hvacIndustry.rows.length} rows`);
  console.table(hvacIndustry.rows);

  console.log('\n=== 7. Test: companies with industry ILIKE B2B or SaaS ===\n');
  const b2b = await query(`
    SELECT id, name, industry, employee_count, employee_range, headquarters_country
    FROM companies
    WHERE (industry ILIKE '%B2B%' OR industry ILIKE '%SaaS%')
    LIMIT 10
  `);
  console.log(`Found ${b2b.rows.length} rows`);
  console.table(b2b.rows);

  console.log('\n=== 8. Test: companies with employee_count ===\n');
  const emp = await query(`
    SELECT 
      COUNT(*) FILTER (WHERE employee_count IS NOT NULL AND employee_count > 0) as with_employee_count,
      COUNT(*) as total
    FROM companies
  `);
  console.table(emp.rows);

  console.log('\n=== 9. company_size enum values ===\n');
  try {
    const enumVals = await query(`SELECT enum_range(NULL::company_size)::text as vals`);
    console.log('Enum:', enumVals.rows[0]?.vals);
  } catch (e) {
    console.log('Enum check failed:', e.message);
  }

  console.log('\n=== 9b. Sample headquarters_country values ===\n');
  const countries = await query(`
    SELECT headquarters_country, COUNT(*) as cnt
    FROM companies
    WHERE headquarters_country IS NOT NULL AND TRIM(headquarters_country) != ''
    GROUP BY headquarters_country
    ORDER BY cnt DESC
    LIMIT 15
  `);
  console.table(countries.rows);

  console.log('\n=== 10. Test: discovery-style query (org_id + industry HVAC + North America) ===\n');
  const firstOrg = orgs.rows[0]?.org_id;
  if (firstOrg) {
    const discoverTest = await query(`
      SELECT c.id, c.name, c.domain, c.industry, c.employee_count, c.employee_range,
             c.headquarters_country, c.icp_fit_score
      FROM companies c
      WHERE c.org_id = $1
        AND (c.industry ILIKE $2 OR c.industry = $2)
        AND (COALESCE(c.headquarters_country, '') ILIKE $3 OR COALESCE(c.headquarters_state, '') ILIKE $3)
      ORDER BY c.icp_fit_score DESC NULLS LAST
      LIMIT 10
    `, [firstOrg, '%HVAC%', '%North America%']);
    console.log(`Org ${firstOrg}: Found ${discoverTest.rows.length} with HVAC + North America`);
    console.table(discoverTest.rows);

    // Broader: just org_id + industry HVAC
    const hvacOnly = await query(`
      SELECT c.id, c.name, c.domain, c.industry, c.employee_count
      FROM companies c
      WHERE c.org_id = $1 AND c.industry ILIKE $2
      LIMIT 10
    `, [firstOrg, '%HVAC%']);
    console.log(`\nSame org, HVAC only: ${hvacOnly.rows.length} rows`);
    console.table(hvacOnly.rows);

    // Broadest: just org_id
    const allOrg = await query(`
      SELECT COUNT(*) as cnt FROM companies WHERE org_id = $1
    `, [firstOrg]);
    console.log(`\nTotal companies for org: ${allOrg.rows[0]?.cnt}`);
  }

  console.log('\n=== 11. Leads with title (for roles filter) ===\n');
  const leadTitles = await query(`
    SELECT title, COUNT(*) as cnt
    FROM leads
    WHERE title IS NOT NULL AND title != ''
    GROUP BY title
    ORDER BY cnt DESC
    LIMIT 15
  `);
  console.table(leadTitles.rows);

  console.log('\nDone.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
