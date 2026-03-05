# Mock Data Audit & Wiring Plan

**Date:** 2026-03-05
**Scope:** Complete audit of every tab/component in the web application

---

## Current Status Summary

| Status | Count | Components |
|--------|-------|------------|
| FULLY WIRED | 21 | Dashboard metrics, CRM core, Unibox conversations, Implementation, Workflows, AI Council, all Audit sub-tabs (Company, Surveys, Interviews, Transcripts, Process Maps), Messaging Workshop, Niche Researcher, LinkedIn Content, AI Assistant, Settings (all tabs), ICPForm, Discovery/Enrichment/Campaign panels, LeadLists (core) |
| PARTIALLY WIRED | 6 | Dashboard (chart gaps), CRM (activity mock), AppointmentsView (booking tab), ColdEmail/LinkedIn campaigns (lead lists), Community (activity), Account (billing) |
| PURE MOCK | 7 | PrototypeLabTab, SalesScriptGenerator, SalesCallAnalyser, WebsiteBuilder, ContentStudio, SendingAccounts, AuditFullDeckViewer |
| MIXED | 3 | UniboxView (AI drafts), AuditAnalysisTab (deck gen), LeadListsView (import) |

---

## Detailed Findings Per Component

### PURE MOCK — Need Full Backend Wiring

#### 1. ContentStudioView
**Current state:** All data hardcoded — 10 content items, ideas, trending topics, competitors, generated posts, video scripts. No API calls.

**Existing infrastructure:**
- DB table: `content_posts` (exists)
- API route: `api/routes/content-posts.js` (exists)
- Frontend API: `api.contentPosts.list()`, `api.contentPosts.generate()` (exist)

**What needs to happen:**
- Wire `contentItems` to `api.contentPosts.list()` on mount
- Wire generate button to `api.contentPosts.generate()` with platform/format/topic params
- Wire schedule modal to `api.contentPosts.create()` or update with `scheduled_at`
- Add `platform` column to `content_posts` table if missing (currently may only have LinkedIn)
- Add `format`, `hook`, `video_script` columns if missing
- Wire trending/competitor data to `api.trackedCompetitors.list()` (already exists)
- Wire "From Calls" ideas to `api.callAnalyses.list()` or `api.contentPosts.extractInsights()`

**DB changes needed:**
```sql
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'linkedin';
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'text';
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS hook TEXT;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS video_script JSONB;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS engagement JSONB;
```

**API changes needed:** Extend existing `content-posts.js` with platform filter and scheduling.

---

#### 2. WebsiteBuilderView
**Current state:** Mock sites array, fake generate/refine/publish with setTimeout. No API calls.

**Existing infrastructure:**
- DB table: None
- API route: None

**What needs to happen:**
- Create `websites` table
- Create `api/routes/websites.js` with CRUD + generate/refine/publish endpoints
- Wire site list to `GET /api/websites`
- Wire generate to `POST /api/websites/generate` (LLM call)
- Wire refine to `POST /api/websites/:id/refine`
- Wire publish to `POST /api/websites/:id/publish`

**DB changes needed:**
```sql
CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT,
  status TEXT DEFAULT 'draft',
  template TEXT,
  prompt TEXT,
  generated_html TEXT,
  refinements JSONB DEFAULT '[]',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**New API endpoints:**
- `GET /api/websites` — list sites for org
- `POST /api/websites` — create
- `PUT /api/websites/:id` — update
- `DELETE /api/websites/:id` — delete
- `POST /api/websites/:id/generate` — LLM generate HTML
- `POST /api/websites/:id/refine` — LLM refine
- `POST /api/websites/:id/publish` — set live

---

#### 3. SendingAccountsView
**Current state:** Hardcoded 6 email accounts and 2 LinkedIn profiles. No API calls.

**Existing infrastructure:**
- DB table: None (integration_credentials has some related data)
- API route: None

**What needs to happen:**
- Create `sending_accounts` table
- Create `api/routes/sending-accounts.js`
- Wire email list to `GET /api/sending-accounts?type=email`
- Wire LinkedIn list to `GET /api/sending-accounts?type=linkedin`
- Wire add/remove to POST/DELETE
- Wire health check / warmup status updates

**DB changes needed:**
```sql
CREATE TABLE IF NOT EXISTS sending_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  type TEXT NOT NULL,
  email TEXT,
  domain TEXT,
  profile_url TEXT,
  profile_name TEXT,
  status TEXT DEFAULT 'active',
  warmup_status TEXT DEFAULT 'pending',
  health_score INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 30,
  sent_today INTEGER DEFAULT 0,
  account_type TEXT,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**New API endpoints:**
- `GET /api/sending-accounts` — list (filter by type)
- `POST /api/sending-accounts` — add
- `PUT /api/sending-accounts/:id` — update
- `DELETE /api/sending-accounts/:id` — remove

---

#### 4. PrototypeLabTab
**Current state:** 4 hardcoded opportunities, PRD/Lovable/Bolt generation via local string templates, fake "Send to Lovable" with setTimeout. No API calls.

**Existing infrastructure:**
- DB table: None
- API route: None
- Related: `audit_analyses` table has analysis results with opportunities

**What needs to happen:**
- Opportunities should come from `api.audit.analyses.list()` — the analysis result contains `opportunities` array
- PRD/Lovable/Bolt generation should use LLM API call
- Create `prototype_outputs` table to save generated content
- Create API endpoints for generation

**DB changes needed:**
```sql
CREATE TABLE IF NOT EXISTS prototype_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  project_id TEXT,
  opportunity_id TEXT NOT NULL,
  output_type TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**New API endpoints:**
- `GET /api/prototypes?project_id=X` — list saved outputs
- `POST /api/prototypes/generate` — generate PRD/Lovable/Bolt via LLM
- `POST /api/prototypes/send-to-lovable` — Lovable API integration

---

#### 5. SalesScriptGeneratorView
**Current state:** Script library from API (`api.salesScripts.list()`), but generation uses MOCK_SCRIPT with setTimeout. Save is local-only.

**Existing infrastructure:**
- DB table: `sales_scripts` (exists)
- API route: `api/routes/sales-scripts.js` (exists)
- Frontend API: `api.salesScripts.list()` (exists)

**What needs to happen:**
- Add `POST /api/sales-scripts/generate` endpoint (LLM call)
- Add `POST /api/sales-scripts` endpoint for saving
- Wire generate button to API instead of mock
- Wire save button to API

**DB changes needed:** None — `sales_scripts` table already exists.

**API changes needed:**
- Add `POST /api/sales-scripts` — create/save script
- Add `POST /api/sales-scripts/generate` — LLM generation

---

#### 6. SalesCallAnalyserView
**Current state:** Call list from API (`api.callAnalyses.list()`), but analysis uses MOCK_ANALYSIS with setTimeout. Objections are hardcoded.

**Existing infrastructure:**
- DB table: `call_analyses` (exists), `call_objections` (exists)
- API route: `api/routes/call-analyses.js` (exists)

**What needs to happen:**
- Add `POST /api/call-analyses/analyse` endpoint (LLM call with transcript)
- Wire analysis button to API instead of mock
- Read objections from `call_objections` table instead of hardcoded array

**DB changes needed:** None — tables exist.

**API changes needed:**
- Add `POST /api/call-analyses/analyse` — LLM analysis of call recording/transcript

---

#### 7. AuditFullDeckViewer
**Current state:** 10 slides with hardcoded "Hodge Insurance" data. No connection to real analysis results.

**Existing infrastructure:**
- DB table: `audit_decks` (exists but may not have correct schema)
- Analysis data in `audit_analyses` table

**What needs to happen:**
- Pass `analysisData` from `AuditAnalysisTab` to `AuditFullDeckViewer`
- Create `buildSlidesFromAnalysis()` function to map analysis JSON → 10-slide structure
- Wire "Export PPTX" button (requires `pptxgenjs` library)
- Save/load deck edits to `audit_decks` table

**DB changes needed:** Verify `audit_decks` schema; may need:
```sql
ALTER TABLE audit_decks ADD COLUMN IF NOT EXISTS slide_data JSONB DEFAULT '{}';
ALTER TABLE audit_decks ADD COLUMN IF NOT EXISTS project_id TEXT;
```

**API changes needed:**
- `GET /api/audit/decks?project_id=X` — list decks
- `POST /api/audit/decks` — save deck
- `PUT /api/audit/decks/:id` — update slide data

---

### PARTIALLY WIRED — Need Specific Fixes

#### 8. AppointmentsView — Booking Tab
**Current state:** Calls and Calendar tabs are wired to API. Booking tab uses MOCK_EVENT_TYPES, local availability state, local event creation form.

**Existing infrastructure:**
- DB table: None for booking
- Calendar integration exists via `api.calendar.getEvents()`

**What needs to happen:**
- Create `booking_event_types` table
- Create `booking_availability` table
- Create `api/routes/booking.js`
- Wire event type list to `GET /api/booking/event-types`
- Wire create/update/delete
- Wire availability to `GET/PUT /api/booking/availability`

**DB changes needed:**
```sql
CREATE TABLE IF NOT EXISTS booking_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  location TEXT DEFAULT 'zoom',
  slug TEXT,
  active BOOLEAN DEFAULT true,
  color TEXT,
  bookings_count INTEGER DEFAULT 0,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS booking_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '17:00'
);
```

**New API endpoints:**
- `GET /api/booking/event-types` — list
- `POST /api/booking/event-types` — create
- `PUT /api/booking/event-types/:id` — update
- `DELETE /api/booking/event-types/:id` — delete
- `GET /api/booking/availability` — get
- `PUT /api/booking/availability` — update

---

#### 9. ColdEmailCampaignsView + LinkedInCampaignsView — Lead Lists
**Current state:** Campaigns are wired to Instantly/HeyReach APIs. But lead list dropdowns in campaign builders use hardcoded arrays.

**Existing infrastructure:**
- DB table: `lead_lists` (exists)
- API route: `api/routes/lead-lists.js` (exists)
- Frontend API: `api.leadLists.list()` (exists)

**What needs to happen:**
- Wire `MOCK_LEAD_LISTS` / `LI_MOCK_LISTS` to `api.leadLists.list()` on component mount
- No new tables or endpoints needed

---

#### 10. UniboxView — AI Draft Generation
**Current state:** Conversations and messages from API. AI draft generation uses setTimeout + static text.

**Existing infrastructure:**
- `api.aiSdr.generateSample()` exists

**What needs to happen:**
- Wire `generateAIDrafts` to use `api.aiSdr.generateSample()` or a new `api.aiSdr.generateDrafts()` endpoint
- Pass conversation context to the API
- Replace setTimeout + mock text with real LLM call

---

#### 11. CRMPipelineView — Deal Activity Timeline
**Current state:** Pipeline deals from API. Deal detail panel has hardcoded activity items.

**Existing infrastructure:**
- DB table: `activity_log` (exists)
- API route: `api/routes/activity.js` (exists)

**What needs to happen:**
- Wire deal activity to `api.activity.list({ lead_id: deal.id })`
- No new tables needed

---

#### 12. AccountView — Billing & Usage
**Current state:** Profile from API. Plans, credits, usage breakdown, and usage history are hardcoded.

**Existing infrastructure:**
- DB tables: `billing_plans`, `credit_transactions`, `invoices` (all exist)
- API route: `api/routes/billing.js` (exists)

**What needs to happen:**
- Wire `PLANS` to `api.billing.plans()` or similar
- Wire credits/usage to `api.billing.credits()`
- Wire usage history to `api.billing.credits.history()`
- No new tables needed

---

#### 13. CommunityView — Activity Tab
**Current state:** Feed from API. Activity tab uses MOCK_ACTIVITY.

**Existing infrastructure:**
- DB tables: `community_feed_items`, `community_accounts` (exist)

**What needs to happen:**
- Wire activity tab to an API endpoint (could use `community_feed_items` with type filter)
- No new tables needed

---

#### 14. AuditAnalysisTab — Deck Generation
**Current state:** Analysis runs via API. "Generate Deck" just sets `deckGenerated = true` after delay.

**What needs to happen:**
- `generateDeck` should call an API that maps analysis data → slide structure
- Save generated deck to `audit_decks` table
- Pass real slide data to `AuditFullDeckViewer`

---

#### 15. LeadListsView — Import Flow
**Current state:** Lead lists from API. Import tab step 3-4 uses setTimeout loop for fake enrichment progress.

**What needs to happen:**
- Wire import enrichment to `api.leadGeneration.enrichBulk()` (already exists)
- Use SSE or polling for real progress updates

---

## Implementation Priority

| Priority | Component | Effort | Impact | Dependencies |
|----------|-----------|--------|--------|-------------|
| 1 | ColdEmail/LinkedIn lead lists | 30 min | HIGH | None — just wire existing API |
| 2 | CRM deal activity | 30 min | MEDIUM | None — wire existing API |
| 3 | Account billing/usage | 1 hr | MEDIUM | Wire existing billing API |
| 4 | Community activity | 30 min | LOW | Wire existing API |
| 5 | Unibox AI drafts | 1 hr | MEDIUM | Wire existing AI SDR API |
| 6 | SalesScriptGenerator | 2 hrs | HIGH | Add generate endpoint + LLM |
| 7 | SalesCallAnalyser | 2 hrs | HIGH | Add analyse endpoint + LLM |
| 8 | ContentStudioView | 3 hrs | HIGH | Extend content_posts table + API |
| 9 | SendingAccountsView | 3 hrs | HIGH | New table + API |
| 10 | AppointmentsView booking | 3 hrs | MEDIUM | New tables + API |
| 11 | PrototypeLabTab | 3 hrs | MEDIUM | New table + LLM API |
| 12 | WebsiteBuilderView | 4 hrs | MEDIUM | New table + LLM API |
| 13 | AuditFullDeckViewer | 4 hrs | HIGH | Deck builder + pptxgenjs |
| 14 | LeadLists import progress | 2 hrs | LOW | SSE/polling |

---

## Tables That Need to Be Created

| Table | For Component | Exists? |
|-------|---------------|---------|
| `websites` | WebsiteBuilderView | No |
| `sending_accounts` | SendingAccountsView | No |
| `prototype_outputs` | PrototypeLabTab | No |
| `booking_event_types` | AppointmentsView booking | No |
| `booking_availability` | AppointmentsView booking | No |

## Tables That Need Schema Updates

| Table | Column to Add | For Component |
|-------|--------------|---------------|
| `content_posts` | `platform`, `format`, `hook`, `video_script`, `scheduled_at`, `engagement` | ContentStudioView |
| `audit_analyses` | `analysis_json` (CRITICAL — blocks analysis) | AuditAnalysisTab |
| `audit_decks` | `slide_data`, `project_id` | AuditFullDeckViewer |

## API Routes That Need to Be Created

| Route File | Endpoints | For Component |
|------------|-----------|---------------|
| `api/routes/websites.js` | CRUD + generate/refine/publish | WebsiteBuilderView |
| `api/routes/sending-accounts.js` | CRUD | SendingAccountsView |
| `api/routes/prototypes.js` | list + generate | PrototypeLabTab |
| `api/routes/booking.js` | event-types CRUD + availability | AppointmentsView |

## API Routes That Need New Endpoints Added

| Existing Route | New Endpoint | For Component |
|----------------|-------------|---------------|
| `sales-scripts.js` | `POST /generate`, `POST /` (save) | SalesScriptGenerator |
| `call-analyses.js` | `POST /analyse` | SalesCallAnalyser |
| `content-posts.js` | Extend with platform filter, scheduling | ContentStudioView |
| `audit.js` | deck save/load endpoints | AuditFullDeckViewer |

## Frontend Wiring Only (No Backend Changes)

| Component | What to Wire | Existing API |
|-----------|-------------|-------------|
| ColdEmailCampaignsView | Lead list dropdown | `api.leadLists.list()` |
| LinkedInCampaignsView | Lead list dropdown | `api.leadLists.list()` |
| CRMPipelineView | Deal activity timeline | `api.activity.list()` |
| AccountView | Plans, credits, usage | `api.billing.*` |
| CommunityView | Activity tab | `api.community.feed.list()` |
| UniboxView | AI draft generation | `api.aiSdr.generateSample()` |
