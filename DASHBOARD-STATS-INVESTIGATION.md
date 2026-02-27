# Dashboard Stats Investigation

Investigation of the six stat cards in the Dashboard grid and where each value needs to be stored and calculated, **associated to the current project**.

---

## 1. Stat Cards Overview

| Stat | Current Source | Current Scope | Value in Your Screenshot |
|------|----------------|---------------|--------------------------|
| **TOTAL LEADS** | `leads` table COUNT | `org_id` | 0 |
| **TOTAL LEADS (verified)** | `leads` WHERE `email_verified = true` | `org_id` | 0 verified |
| **COMPANIES** | `companies` table COUNT | `org_id` | 38 |
| **LEAD LISTS** | `lead_lists` table COUNT | `org_id` | 2 |
| **OUTREACH SENT** | Hardcoded `0` (TODO in stats.js) | — | 0 |
| **RESPONSES** | Hardcoded `0` | — | 0 |
| **MEETINGS BOOKED** | Hardcoded `0` | — | 0 |

---

## 2. Current Data Flow

- **API:** `GET /api/stats/dashboard` → `api/routes/stats.js`
- **Frontend:** `DashboardView` calls `api.stats.dashboard()` on mount; receives `{ stats, recentActivity }`
- **Project scope:** Dashboard does **NOT** receive `selectedAuditProject`; stats are org-wide, not project-scoped
- **Stats route:** Filters all queries by `req.orgId` only

---

## 3. Current Postgres Schema (Relevant Tables)

### 3.1 `leads`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | TEXT | NOT NULL — **no project_id** |
| list_id | UUID | FK → lead_lists |
| company_id | UUID | FK → companies (nullable) |
| first_name, last_name, email, title, company, company_domain, linkedin_url | TEXT | |
| email_verified | BOOLEAN | Used for "X verified" subtext |
| email_bounce_risk | TEXT | |
| company_data_json | JSONB | |
| personalisation_json | JSONB | |
| created_at | TIMESTAMPTZ | |

**No columns for:** `outreach_sent_at`, `responded_at`, `meeting_booked_at`, `project_id`

---

### 3.2 `lead_lists`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | TEXT | NOT NULL — **no project_id** |
| name, source, status | TEXT | |
| total_contacts, enriched_count | INT | |
| created_at | TIMESTAMPTZ | |

---

### 3.3 `companies`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| org_id | TEXT | NOT NULL — **no project_id** |
| name, domain, industry, etc. | — | |

---

### 3.4 `organisations` (Projects)

Projects are stored as `organisations` with `is_project = true` and `org_id` (owner org). Project id = `organisations.id`.

---

## 4. Where Each Value Needs to Be Stored (Project-Scoped)

### 4.1 TOTAL LEADS

**Current storage:** `leads` table, filtered by `org_id`  
**Needed for project scope:** Add `project_id` (or equivalent) to `leads`  
**Calculation:**  
```sql
SELECT COUNT(*) FROM leads 
WHERE org_id = $1 AND (project_id = $2 OR project_id IS NULL)
```  
Or, if project = top-level scope:  
```sql
SELECT COUNT(*) FROM leads WHERE project_id = $1
```

**Recommendation:** Add `project_id` to `leads` (FK → organisations where is_project = true). Filter stats by `project_id` when a project is selected.

---

### 4.2 TOTAL LEADS (verified)

**Current storage:** Same as TOTAL LEADS + `email_verified = true`  
**Calculation:**  
```sql
SELECT COUNT(*) FROM leads 
WHERE project_id = $1 AND email_verified = true
```  
No schema change beyond `project_id` on `leads`.

---

### 4.3 COMPANIES

**Current storage:** `companies` table, filtered by `org_id`  
**Needed:** Add `project_id` to `companies`  
**Calculation:**  
```sql
SELECT COUNT(*) FROM companies WHERE project_id = $1
```  
Companies are created from discovery/import; creation flow must set `project_id`.

---

### 4.4 LEAD LISTS

**Current storage:** `lead_lists` table, filtered by `org_id`  
**Needed:** Add `project_id` to `lead_lists`  
**Calculation:**  
```sql
SELECT COUNT(*) FROM lead_lists WHERE project_id = $1
```  
`leads` reference `list_id` → `lead_lists`; both should share the same `project_id` for consistency.

---

### 4.5 OUTREACH SENT

**Current storage:** None — hardcoded `0`. Outreach APIs (HeyReach, Instantly) are called but nothing is written to DB.

**Options for storage:**

**A) Add column to `leads`:**

| Column | Type | Notes |
|--------|------|-------|
| outreach_sent_at | TIMESTAMPTZ | Set when lead is sent to HeyReach/Instantly |
| outreach_platform | TEXT | e.g. 'heyreach', 'instantly' |

**Calculation:**
```sql
SELECT COUNT(*) FROM leads 
WHERE project_id = $1 AND outreach_sent_at IS NOT NULL
```

**B) New table `outreach_events`:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| lead_id | UUID | FK → leads |
| project_id | UUID | For project-scoped counts |
| platform | TEXT | heyreach, instantly |
| sent_at | TIMESTAMPTZ | |

**Calculation:**
```sql
SELECT COUNT(*) FROM outreach_events WHERE project_id = $1
```

**Recommendation:** Option A — add `outreach_sent_at` (and optionally `outreach_platform`) to `leads`. Update these when `POST /api/lead-generation/outreach/heyreach` or `.../instantly` succeeds for a lead.

---

### 4.6 RESPONSES

**Current storage:** None — hardcoded `0`.

**Options:**

**A) Add column to `leads`:**

| Column | Type | Notes |
|--------|------|-------|
| responded_at | TIMESTAMPTZ | When lead replied to outreach |

**B) New table `outreach_responses`:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| lead_id | UUID | FK |
| project_id | UUID | For project scope |
| responded_at | TIMESTAMPTZ | |
| source | TEXT | e.g. 'email', 'linkedin' |

**Calculation:**  
```sql
SELECT COUNT(*) FROM leads WHERE project_id = $1 AND responded_at IS NOT NULL
```  
(or equivalent from `outreach_responses`)

**Data source:** Responses are typically detected via:
- Email: webhook from Instantly/SmartLead or inbound parsing
- LinkedIn: webhook from HeyReach/AimFox or manual entry

**Recommendation:** Add `responded_at` to `leads` for simplicity. Populate via webhooks or a manual “Mark as responded” action.

---

### 4.7 MEETINGS BOOKED

**Current storage:** None — hardcoded `0`.

**Options:**

**A) Add column to `leads`:**

| Column | Type | Notes |
|--------|------|-------|
| meeting_booked_at | TIMESTAMPTZ | When meeting was booked |

**B) New table `meetings`:**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| lead_id | UUID | FK |
| project_id | UUID | For project scope |
| booked_at | TIMESTAMPTZ | |
| calendar_link | TEXT | Optional |

**Calculation:**  
```sql
SELECT COUNT(*) FROM leads WHERE project_id = $1 AND meeting_booked_at IS NOT NULL
```  
(or from `meetings`)

**Data source:** Calendar integration (Calendly, Cal.com) webhooks, or manual “Mark meeting booked”.

**Recommendation:** Add `meeting_booked_at` to `leads` to match outreach/response pattern.

---

## 5. Summary: Schema Changes for Project-Scoped Stats

| Table | Change | Purpose |
|-------|--------|---------|
| **leads** | Add `project_id` (UUID, FK → organisations, nullable for migration) | Scope leads by project |
| **leads** | Add `outreach_sent_at` (TIMESTAMPTZ, nullable) | OUTREACH SENT count |
| **leads** | Add `outreach_platform` (TEXT, nullable) | Optional: which platform |
| **leads** | Add `responded_at` (TIMESTAMPTZ, nullable) | RESPONSES count |
| **leads** | Add `meeting_booked_at` (TIMESTAMPTZ, nullable) | MEETINGS BOOKED count |
| **lead_lists** | Add `project_id` (UUID, FK → organisations) | Scope lists by project |
| **companies** | Add `project_id` (UUID, FK → organisations) | Scope companies by project |

---

## 6. API and Frontend Changes (Conceptual)

1. **Stats API:** Accept `project_id` query param; filter all counts by `project_id` (or fall back to org if not provided).
2. **DashboardView:** Pass `selectedAuditProject` into the component; include it when calling `api.stats.dashboard({ projectId })`.
3. **Outreach endpoints:** After successful send to HeyReach/Instantly, update `leads.outreach_sent_at` for each sent lead.
4. **Response/meeting updates:** Provide endpoints or webhooks to set `responded_at` and `meeting_booked_at` on leads.

---

## 7. Entity Relationships (Target State)

```
organisations (parent org)
└── organisations (is_project = true) = Project
    ├── lead_lists (project_id)
    │   └── leads (list_id, project_id)
    │       ├── outreach_sent_at
    │       ├── responded_at
    │       └── meeting_booked_at
    └── companies (project_id)
```

---

## 8. Calculation Queries (Final Form)

Assuming `project_id` is added and used:

```sql
-- TOTAL LEADS
SELECT COUNT(*) FROM leads WHERE project_id = $1;

-- VERIFIED
SELECT COUNT(*) FROM leads WHERE project_id = $1 AND email_verified = true;

-- COMPANIES
SELECT COUNT(*) FROM companies WHERE project_id = $1;

-- LEAD LISTS
SELECT COUNT(*) FROM lead_lists WHERE project_id = $1;

-- OUTREACH SENT
SELECT COUNT(*) FROM leads WHERE project_id = $1 AND outreach_sent_at IS NOT NULL;

-- RESPONSES
SELECT COUNT(*) FROM leads WHERE project_id = $1 AND responded_at IS NOT NULL;

-- MEETINGS BOOKED
SELECT COUNT(*) FROM leads WHERE project_id = $1 AND meeting_booked_at IS NOT NULL;
```
