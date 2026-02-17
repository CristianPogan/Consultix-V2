/**
 * Seed organisations table with default projects (Hastingwood, Acme, TechStart).
 * Run: node scripts/seed-organisations.js  or  npm run seed-organisations
 * Requires: DATABASE_URL or DB_* env vars
 */
import 'dotenv/config';
import { query } from '../api/db.js';

const DEFAULT_PROJECTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Hastingwood Securities', full_name: 'Hastingwood Securities AI Audit', slug: 'hastingwood-securities', created: '2026-01-15' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Acme Corp', full_name: 'Acme Corp Digital Transformation', slug: 'acme-corp', created: '2026-01-20' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'TechStart', full_name: 'TechStart AI Assessment', slug: 'techstart', created: '2026-02-01' },
];

async function ensureOrganisationsTable() {
  await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS full_name TEXT').catch(() => {});
  await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()').catch(() => {});
  await query('ALTER TABLE organisations ADD COLUMN IF NOT EXISTS is_project BOOLEAN DEFAULT false').catch(() => {});
}

async function seedProjects() {
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
    );
  }
}

async function main() {
  try {
    await ensureOrganisationsTable();
    await seedProjects();
    console.log('Organisations seeded:', DEFAULT_PROJECTS.map(p => p.name).join(', '));
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
