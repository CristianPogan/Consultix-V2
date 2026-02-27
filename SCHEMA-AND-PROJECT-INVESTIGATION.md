# PostgreSQL Schema & Project Storage Investigation

## Summary

The **Project** select element (Hastingwood Securities, Acme Corp, TechStart) is currently **hardcoded** in `pipeline-code.jsx`. There is **no `projects` table** in the database. All data is scoped by **`org_id`** (organisation). To implement Project as the highest-level scope for settings, leads, and data, Project must be stored and linked through the schema.

---

## 1. Complete Database Schema (from codebase)

### 1.1 `organisations`

**Source:** `api/db.js` (INSERT only; no CREATE TABLE in this repo — table likely created elsewhere)

| Column   | Type   | Notes                |
|----------|--------|----------------------|
| id       | TEXT   | Primary key          |
| name     | TEXT   | Display name         |
| slug     | TEXT   | URL-safe identifier  |

**Usage:** `getOrgId()` returns `DEMO_ORG_ID` env var or `SELECT id FROM organisations LIMIT 1`. JWT and all APIs use this as `org_id`.

---

### 1.2 `app_users`

**Source:** `api/db.js`, `scripts/init_users_table.sql`

| Column          | Type   | Notes                            |
|----------------|--------|----------------------------------|
| id             | UUID   | PK                               |
| email          | TEXT   | UNIQUE NOT NULL                  |
| password_hash  | TEXT   | NOT NULL                         |
| name           | TEXT   | NOT NULL                         |
| org_id         | TEXT   | NOT NULL — links to organisation |
| company        | TEXT   |                                  |
| timezone       | TEXT   | Default 'Europe/London'           |
| profile_photo_url | TEXT |                                  |
| role           | TEXT   | Default 'org_member'              |
| created_at     | TIMESTAMPTZ |                             |
| updated_at     | TIMESTAMPTZ |                             |

---

### 1.3 `user_settings`

**Source:** `api/routes/settings.js`

| Column        | Type   | Notes                         |
|--------------|--------|-------------------------------|
| id           | UUID   | PK                            |
| user_id      | UUID   | NOT NULL                      |
| org_id       | TEXT   | NOT NULL                      |
| settings_type| TEXT   | e.g. brand_voice, buyer_persona |
| settings_data| JSONB  | NOT NULL                      |
| created_at   | TIMESTAMPTZ |                      |
| updated_at   | TIMESTAMPTZ |                      |

**Unique:** `(user_id, settings_type)` — settings are per user, not per project.

---

### 1.4 `leads`

**Source:** `api/routes/leads.js`, `lead-generation-and-enrichment.js`

| Column            | Type   | Notes                          |
|-------------------|--------|--------------------------------|
| id                | UUID   | PK                             |
| org_id            | TEXT   | NOT NULL — scoped to org       |
| list_id           | UUID   | FK to lead_lists               |
| company_id        | UUID   | FK to companies (nullable)     |
| first_name        | TEXT   |                                |
| last_name         | TEXT   |                                |
| email             | TEXT   |                                |
| title             | TEXT   |                                |
| company           | TEXT   |                                |
| company_domain    | TEXT   |                                |
| linkedin_url      | TEXT   |                                |
| email_verified    | BOOLEAN|                                |
| email_bounce_risk | TEXT   | e.g. low, high                 |
| icp_score         | numeric|                                |
| company_data_json | JSONB  |                                |
| personalisation_json | JSONB |                             |
| created_at        | TIMESTAMPTZ |                     |

---

### 1.5 `lead_lists`

**Source:** `api/routes/lead-lists.js`

| Column         | Type   | Notes                |
|----------------|--------|----------------------|
| id             | UUID   | PK                   |
| org_id         | TEXT   | NOT NULL             |
| name           | TEXT   |                      |
| source         | TEXT   | e.g. discovery       |
| status         | TEXT   | e.g. draft           |
| total_contacts | INT    |                      |
| enriched_count | INT    |                      |
| created_at     | TIMESTAMPTZ |                 |

---

### 1.6 `companies`

**Source:** `api/routes/companies.js`

| Column               | Type   | Notes    |
|----------------------|--------|----------|
| id                   | UUID   | PK       |
| org_id               | TEXT   | NOT NULL |
| name                 | TEXT   |          |
| domain               | TEXT   |          |
| industry             | TEXT   |          |
| employee_count       | INT    |          |
| employee_range       | TEXT   |          |
| headquarters_city    | TEXT   |          |
| headquarters_state   | TEXT   |          |
| headquarters_country| TEXT   |          |
| revenue_range        | TEXT   |          |
| technologies         | TEXT[] |          |
| icp_fit_score        | numeric|          |
| description          | TEXT   |          |
| enrichment_data_json | JSONB  |          |
| enriched_at          | TIMESTAMPTZ |       |

---

### 1.7 `icp_profiles`

**Source:** `api/routes/icp-profiles.js`

| Column             | Type   | Notes    |
|--------------------|--------|----------|
| id                 | UUID   | PK       |
| org_id             | TEXT   | NOT NULL |
| name               | TEXT   |          |
| industry           | TEXT   |          |
| keywords           | TEXT[] |          |
| employee_ranges    | TEXT[] |          |
| regions            | TEXT[] |          |
| roles              | TEXT[] |          |
| lookalike_domains   | TEXT[] |          |
| max_leads          | INT    |          |
| created_at         | TIMESTAMPTZ |     |

---

### 1.8 `messaging_copies` (prompts)

**Source:** `api/routes/prompts.js`

| Column     | Type   | Notes                    |
|------------|--------|---------------------------|
| id         | UUID   | PK                        |
| org_id     | TEXT   | NOT NULL                  |
| name       | TEXT   |                           |
| category   | TEXT   | e.g. value_prop           |
| content    | TEXT   |                           |
| audience   | TEXT   |                           |
| use_count  | INT    |                           |
| created_at | TIMESTAMPTZ |                    |

---

### 1.9 `password_reset_tokens`

**Source:** `api/db.js` — user_id → app_users

---

### 1.10 `signup_access_tokens`

**Source:** `api/db.js` — token, assigned_credits, status

---

## 2. Current Hierarchy

```
Organisation (org_id)
├── app_users (org_id)
├── user_settings (user_id, org_id)
├── leads (org_id)
├── lead_lists (org_id)
├── companies (org_id)
├── icp_profiles (org_id)
└── messaging_copies (org_id)
```

- **JWT payload:** `{ orgId, userId }`
- **Auth middleware:** sets `req.orgId` from JWT
- **All data routes:** filter by `org_id = req.orgId`

---

## 3. Project Select in the UI

**Location:** `src/pipeline-code.jsx`

**Current implementation (hardcoded):**

```javascript
const auditProjects = [
  { id: 1, name: "Hastingwood Securities AI Audit", client: "Hastingwood Securities", created: "2026-01-15" },
  { id: 2, name: "Acme Corp Digital Transformation", client: "Acme Corp", created: "2026-01-20" },
  { id: 3, name: "TechStart AI Assessment", client: "TechStart", created: "2026-02-01" },
];
const [selectedAuditProject, setSelectedAuditProject] = useState(1);
```

**Usage:** Audit and Implementation views use `selectedAuditProject` to show project-specific content. The Lead Generation pipeline (ICP, discovery, enrichment, personalisation, outreach) does **not** use this project; it uses `org_id` from the JWT.

---

## 4. Where Project Needs to Be Stored

You need Project as the highest-level scope, with settings, values, leads, and data linked to it.

### Option A: Use `organisations` as Projects (simplest)

Treat **one organisation = one project**.

- Store projects in `organisations`: `id`, `name`, `slug`
- The select values 1, 2, 3 map to `organisations.id`
- All existing `org_id` columns already scope data by project
- **Change:** Populate `organisations` with rows for Hastingwood Securities, Acme Corp, TechStart
- **Change:** User chooses a project (organisation) at login or via a project switcher; JWT carries that `orgId`

**Tables that already scope by project (via org_id):**

| Table             | Scopes by org_id | Purpose                              |
|-------------------|------------------|--------------------------------------|
| leads             | ✓                | Lead records                         |
| lead_lists        | ✓                | Lead lists                           |
| companies         | ✓                | Enriched companies                   |
| icp_profiles      | ✓                | ICP definitions                      |
| messaging_copies  | ✓                | Prompts/value props                  |
| user_settings     | ✓ (also user_id) | Per-user settings (may need project) |

**Gap:** `user_settings` is scoped by `(user_id, settings_type)` only — not by project. For per-project settings, you’d need either `project_id` (or `org_id`) in the UNIQUE constraint, or a different design.

---

### Option B: Introduce a `projects` Table (Project under Organisation)

If Organisation = account/tenant and Project = workspace:

```
Organisation (account)
└── Project (workspace)
    ├── leads
    ├── lead_lists
    ├── companies
    ├── icp_profiles
    ├── messaging_copies
    └── project_settings (or user_settings with project_id)
```

**New table:**

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Changes to existing tables (add `project_id`):**

| Table             | Add column  | Notes                                           |
|-------------------|------------|-------------------------------------------------|
| leads             | project_id | Replace or supplement org_id for lead scope     |
| lead_lists        | project_id | Same                                            |
| companies         | project_id | Same                                            |
| icp_profiles      | project_id | Same                                            |
| messaging_copies  | project_id | Same                                            |
| user_settings     | project_id | UNIQUE(user_id, project_id, settings_type)      |

**Auth flow:** JWT includes `projectId` (and possibly `orgId`); APIs filter by `project_id`.

---

## 5. Recommendation

- If **Project = Organisation** (each project is a separate “workspace/org”):
  - Use **`organisations`** as the Project store.
  - Map the select options to `organisations.id`.
  - Ensure `user_settings` can be project-scoped (e.g. include `org_id` in the unique key if it isn’t already).

- If **Organisation ≠ Project** (org = account, project = workspace):
  - Add **`projects`** table with `org_id`.
  - Add **`project_id`** to all tables that should be project-scoped.
  - Use `project_id` in the JWT and API scoping instead of (or in addition to) `org_id`.

---

## 6. Tables That Must Link to Project (per your requirement)

These must ultimately be scoped by Project:

| Table             | Currently scoped by | Needs project link? |
|-------------------|--------------------|---------------------|
| leads             | org_id             | ✓ (via org or project_id) |
| lead_lists        | org_id             | ✓                   |
| companies         | org_id             | ✓                   |
| icp_profiles      | org_id             | ✓                   |
| messaging_copies  | org_id             | ✓                   |
| user_settings     | user_id, org_id    | ✓ (per-project settings) |

---

## 7. No `projects` Table Today

- There is **no** `projects` table in the current schema.
- Project is only represented in the UI via the hardcoded `auditProjects` array.
- To persist Project and make it the top-level scope for data, either:
  1. Use `organisations` as projects (Option A), or  
  2. Add `projects` and migrate child tables to use `project_id` (Option B).
