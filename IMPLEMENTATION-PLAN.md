# Pipeline Demo v2 → Current Codebase: Implementation Plan

## Source File
`pipeline-demo-v2 (6) copy.txt` — 13,543 lines, full React frontend rewrite (demo/mock version)

---

## A. Brand New Components

| Component | New File Lines | Description |
|-----------|---------------|-------------|
| **`PrototypeLabTab`** | 6217–6896 (~680 lines) | New tab inside Strategy/Audit — generates PRDs, Lovable prompts, and Bolt prompts from audit opportunities. Includes TypeWriter display, copy-to-clipboard, and "Send to Lovable" flow |
| **`ContentStudioView`** | 10816–11459 (~640 lines) | Multi-platform content creation (LinkedIn, X, Instagram, TikTok, YouTube, Facebook) with kanban board, scheduling timeline, AI generation with 12 hook styles, video scripts, trending topics per platform, competitor tracking |
| **`WebsiteBuilderView`** | 11460–11776 (~320 lines) | AI website builder with 5 templates (landing, business, portfolio, coming_soon, funnel), prompt-to-site generation, live preview with mock rendered site, iterative refinement chat, and publish flow |
| **`SendingAccountsView`** | 12783–13231 (~450 lines) | Email infrastructure management — 3-step DFY domain purchase + inbox provisioning wizard, pre-warmed account marketplace, existing account import, health scores, warmup tracking, daily capacity stats, LinkedIn profile management |

---

## B. Replaced / Merged Views

| Current Code | New File | Change |
|---|---|---|
| `content_linkedin` → `LinkedInContentView` (lines ~9031) | Removed from sidebar routing | Merged into `ContentStudioView` as the LinkedIn platform tab |
| `content_video` → `VideoScriptView` (lines ~8504) | Removed from sidebar routing | Merged into `ContentStudioView` as video script generation within platform tabs |
| Sidebar: "LinkedIn" + "Video (Short Form)" under CONTENT | Sidebar: "Content Studio" + "Community" under CONTENT | Two items consolidated into one |

---

## C. Modified Existing Components — Detailed Diffs

### C.1 Sidebar Navigation

**Current sidebar CONTENT section:**
```jsx
{ key: "content_linkedin", label: "LinkedIn", icon: "💼", desc: "Posts, carousels & scheduling" },
{ key: "content_community", label: "Community", icon: "💬", desc: "Engagement & responses" },
{ key: "content_video", label: "Video (Short Form)", icon: "🎬", desc: "Scripts, ideas & repurposing" },
```

**New sidebar CONTENT section:**
```jsx
{ key: "content_studio", label: "Content Studio", icon: "📝", desc: "Create & schedule across platforms" },
{ key: "content_community", label: "Community", icon: "💬", desc: "Engagement & responses" },
```

**Current sidebar SOLUTIONS section:**
```jsx
{ key: "audit", label: "Strategy", icon: "🔍", desc: "AI audits & analysis" },
{ key: "implementation", label: "Implementation", icon: "📋", desc: "Project delivery" },
{ key: "workflows", label: "Workflows", icon: "⚙️", desc: "Automation library" },
{ key: "council", label: "AI Council", icon: "🧠", desc: "Strategic advisor" },
{ key: "sol_assistant", label: "AI Assistant", icon: "🤖", desc: "Ask anything" },
```

**New sidebar SOLUTIONS section (conditional items):**
```jsx
{ key: "audit", label: "Strategy", icon: "🔍", desc: "Client assessments" },
{ key: "implementation", label: "Implementation", icon: "📋", desc: "Project board" },
{ key: "workflows", label: "Workflows", icon: "⚙️", desc: "Automation library" },
{ key: "council", label: "AI Council", icon: "🧠", desc: "Strategic advisor" },
...(enabledSolutions.includes("sol_assistant") ? [{ key: "sol_assistant", label: "AI Assistant", icon: "🤖", desc: "Personal AI with org context" }] : []),
...(enabledSolutions.includes("website_builder") ? [{ key: "website_builder", label: "Website Builder", icon: "🌐", desc: "AI-powered sites" }] : []),
```

---

### C.2 App State Variables

**Added in new file:**
```jsx
const [enabledSolutions, setEnabledSolutions] = useState(["sol_assistant", "website_builder"]);
```

**Present in current but NOT in new file (demo doesn't use API):**
```jsx
const [savedPrompts, setSavedPrompts] = useState(SAVED_PROMPTS);  // current fetches from API
const [showAddProjectModal, setShowAddProjectModal] = useState(false);  // current uses API-based project creation
const [newProjectName, setNewProjectName] = useState("");
const [addProjectCreating, setAddProjectCreating] = useState(false);
const [discoverCanRun, setDiscoverCanRun] = useState(true);  // current checks discover status
```

**Note:** The new file uses `showNewProject`/`newProjectClient` for local project creation in the sidebar (without API). The current code uses `showAddProjectModal`/`newProjectName` with API calls. Keep the current API-based approach.

---

### C.3 Main Content Routing

**Added routes in new file:**
```jsx
{activePage === "content_studio" && <ContentStudioView />}
{activePage === "website_builder" && <WebsiteBuilderView />}
```

**Removed routes in new file:**
```jsx
// These exist in current code but are removed in the new file's routing:
{activePage === "content_linkedin" && <LinkedInContentView />}
{activePage === "content_video" && <VideoScriptView />}
```

**Modified route (Settings now receives enabledSolutions):**
```jsx
// Current:
{activePage === "settings" && <SettingsView />}
// New:
{activePage === "settings" && <SettingsView enabledSolutions={enabledSolutions} setEnabledSolutions={setEnabledSolutions} />}
```

---

### C.4 AuditView Tabs

**Current tabs:**
```jsx
{ key: "overview", label: "🔍 Company" },
{ key: "surveys", label: "📋 Surveys" },
{ key: "interviews", label: "🎤 Interviews" },
{ key: "transcripts", label: "📄 Transcripts" },
{ key: "processmaps", label: "🗺️ Process Maps" },
{ key: "analysis", label: "🤖 Analysis" },
{ key: "presentations", label: "📊 Presentations" },
```

**New tabs (added `prototypelab`):**
```jsx
{ key: "overview", label: "🔍 Company" },
{ key: "surveys", label: "📋 Surveys" },
{ key: "interviews", label: "🎤 Interviews" },
{ key: "transcripts", label: "📄 Transcripts" },
{ key: "processmaps", label: "🗺️ Process Maps" },
{ key: "prototypelab", label: "🧪 Prototype Lab" },   // ← NEW
{ key: "analysis", label: "🤖 Analysis" },
{ key: "presentations", label: "📊 Presentations" },
```

**New tab rendering:**
```jsx
{activeTab === "prototypelab" && <PrototypeLabTab project={project} />}
```

---

### C.5 SettingsView Tabs

**Current tabs:**
```jsx
{ key: "brand_voice", label: "🎙️ Brand Voice" },
{ key: "buyer_persona", label: "👤 Buyer Persona" },
{ key: "ai_sdr", label: "🤖 AI SDR" },
{ key: "integrations", label: "🔌 Integrations" },
{ key: "lead_search_order", label: "📊 Lead Search Order" },
```

**New tabs:**
```jsx
{ key: "brand_voice", label: "🎙️ Brand Voice" },
{ key: "buyer_persona", label: "👤 Buyer Persona" },
{ key: "sending_accounts", label: "🔑 Sending Accounts" },   // ← NEW (renders SendingAccountsView)
{ key: "integrations", label: "🔌 Integrations" },
{ key: "solutions", label: "🧩 Skills & Plugins" },           // ← NEW (marketplace + skill creator)
```

**Removed tabs:** `ai_sdr`, `lead_search_order`
**Note:** Keep `ai_sdr` and `lead_search_order` in the current code — they have real API-backed functionality. Add the new tabs alongside them.

---

### C.6 SettingsView — New "Skills & Plugins" Tab

The new file adds a full marketplace/plugin system at lines 9470–9875 with:
- **Built-in Solutions** — toggleable cards (AI Assistant, Website Builder, etc.) wired to `enabledSolutions`
- **Custom Skills** — creator form with name, icon, system prompt, data access, output type
- **Quick Import** — paste code from Claude Code / Agent Zero → auto-parse → configure surface → deploy
- **Imported Skills** — list with run counts, status, surface placement

New state variables in SettingsView:
```jsx
const [solFilter, setSolFilter] = useState("All");
const [showSkillCreator, setShowSkillCreator] = useState(false);
const [customSkills, setCustomSkills] = useState([...]);
const [newSkill, setNewSkill] = useState({ name: "", icon: "🔧", systemPrompt: "", dataAccess: [], outputType: "chat" });
const [importedSkills, setImportedSkills] = useState([...]);
const [quickImportStep, setQuickImportStep] = useState(0);
const [quickImportText, setQuickImportText] = useState("");
const [quickImportResult, setQuickImportResult] = useState(null);
```

---

### C.7 SettingsView — Integrations List

**Current:** Uses `INTEGRATIONS_META` array with full `credentialFields`, `connectEndpoint`, `category`, `orderTypes`, `costLabel`, `costTier` — wired to real API for credential saving and validation.

**New file:** Uses simpler hardcoded `INTEGRATIONS` array with just `key`, `label`, `icon`, `desc`, `connected` boolean. No API connection.

**Decision:** Keep current `INTEGRATIONS_META` approach (real API credentials). Do NOT regress to the demo's simplified version. Add any new integrations from the new list (e.g., `linkedin_api`, `zapier`) to `INTEGRATIONS_META`.

New integrations to add to `INTEGRATIONS_META`:
```jsx
{ key: "linkedin_api", label: "LinkedIn", icon: "💼", desc: "Publish posts & pull profile data", category: "enrichment", ... },
{ key: "zapier", label: "Zapier", icon: "⚡", desc: "Workflow automation triggers", category: "enrichment", ... },
```

---

### C.8 ColdEmailCampaignsView — Campaign Builder

**Current (lines ~7127–7374):** List view with mock campaigns, status badges, basic stats (leads, sent, opened, replied, booked). Add leads modal. No campaign creation/editing.

**New (lines 8125–8651):** Full expansion adding:
- **Campaign Builder** — 4-step wizard (Setup → Emails → Settings → Review)
- **Step 1 Setup:** campaign name, lead list selection, sender account multi-select
- **Step 2 Emails:** Initial email (multi-variant subjects + bodies with A/B), follow-ups with delay config, "Generate with AI" mode per variant, variable preview modal (`{{first_name}}`, `{{company_name}}`, etc.) with 3 sample leads
- **Step 3 Settings:** daily limit slider, date range, open tracking toggle, timezone, send window (hours + days of week)
- **Step 4 Review:** summary of all settings before launch

New state in ColdEmailCampaignsView:
```jsx
const [view, setView] = useState("list");       // list | create
const [builderStep, setBuilderStep] = useState(0);  // 0=setup, 1=emails, 2=settings, 3=review
const [showEmailPreview, setShowEmailPreview] = useState(false);
const [previewLoading, setPreviewLoading] = useState(false);
const [previewData, setPreviewData] = useState(null);
const [previewLabel, setPreviewLabel] = useState("");
const [campaignForm, setCampaignForm] = useState({
  name: "", selectedLeadList: "", senderAccounts: [],
  subjects: [{ id: 1, value: "", mode: "manual" }],
  bodies: [{ id: 1, value: "", mode: "manual" }],
  followups: [
    { id: 1, delay: 2, subjectLine: false, bodies: [{ id: 1, value: "", mode: "manual" }] },
    { id: 2, delay: 3, subjectLine: false, bodies: [{ id: 1, value: "", mode: "manual" }] },
  ],
  dailyLimit: 50, startDate: "", endDate: "", openTracking: true,
  timezone: "Europe/London", sendStart: "09:00", sendEnd: "17:00",
  sendDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
});
```

---

### C.9 LinkedInCampaignsView — Campaign Builder

**Current (lines ~7375–7455):** Basic list view with mock campaigns, stats table. No campaign creation.

**New (lines 8652–9260):** Full expansion adding:
- **Campaign Builder** — 4-step wizard (Setup → Sequence → Schedule → Review)
- **Step 1 Setup:** campaign name, connection degree selector (1st vs 2nd/3rd changes available step types), lead list selection
- **Step 2 Sequence:** Visual step builder with 4 step types:
  - `connection_request` — with note template and variable support
  - `message` — direct message with template
  - `delay` — configurable wait (hours/days)
  - `engage` — like post or view profile
  - Steps are added from a palette, reorderable, removable
  - Message preview modal with sample lead rendering
- **Step 3 Schedule:** days of week toggles, time window, timezone, daily limit
- **Step 4 Review:** summary before launch

New state:
```jsx
const [view, setView] = useState("campaigns");       // campaigns | builder
const [builderStep, setBuilderStep] = useState(0);   // 0=setup, 1=sequence, 2=schedule, 3=review
const [campaignName, setCampaignName] = useState("");
const [connectionDegree, setConnectionDegree] = useState("2nd_3rd");
const [selectedLeadList, setSelectedLeadList] = useState("");
const [sequenceSteps, setSequenceSteps] = useState([]);
const [scheduleDays, setScheduleDays] = useState({ mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false });
const [scheduleStart, setScheduleStart] = useState("09:00");
const [scheduleEnd, setScheduleEnd] = useState("17:00");
const [scheduleTimezone, setScheduleTimezone] = useState("Europe/London");
const [showMsgPreview, setShowMsgPreview] = useState(false);
const [msgPreviewData, setMsgPreviewData] = useState(null);
```

---

### C.10 AppointmentsView — Booking System

**Current (lines ~3519–3701):** Basic calls list, calendar view, appointment creation form, outcome tracking.

**New (lines 3239–4128):** Major expansion adding full booking system:
- **Calls tab:** Same as current but with outcome form
- **Calendar tab:** Same as current
- **Booking tab** (new) with sub-views:
  - **Events** — Event type cards with stats (bookings count, duration, assigned users, round-robin type, active toggle)
  - **Create Event** — Full form with:
    - Basic info (name, duration, description, location, slug)
    - Buffer times (before/after)
    - Minimum notice and maximum advance booking
    - Custom questions for guests
    - Team assignment with round-robin (none, priority, equal)
    - Confirmation email editor with variables (`{event_name}`, `{date}`, `{time}`, `{guest_name}`, etc.)
    - Reminder configuration (multiple reminders with timing)
    - Reschedule/cancel policies
    - SDR booking link toggle
  - **Availability** — Per-day-of-week editor (enabled/disabled, start/end times)
  - **Team** — Team members with roles, calendar connections, priority
  - **Brand** — Company name, primary color, logo, welcome text
  - **Connected Accounts** — Google Calendar, Zoom, Google Meet, Outlook, Teams

New state:
```jsx
const [bookingView, setBookingView] = useState("events");  // events, availability, team, create_event
const [editEvent, setEditEvent] = useState(null);
const [eventForm, setEventForm] = useState({
  name: "", duration: 30, description: "", location: "zoom",
  bufferBefore: 0, bufferAfter: 15,
  minNotice: 2, minNoticeUnit: "hours",
  maxAdvance: 30, maxAdvanceUnit: "days",
  questions: [{ id: 1, label: "What would you like to discuss?", type: "text", required: false }],
  assignedUsers: ["andrew"], roundRobin: "priority", slug: "",
  sdrLink: true,
  confirmationEnabled: true,
  confirmationSubject: "Confirmed: {event_name} on {date} at {time}",
  confirmationBody: "Hi {guest_name},\n\nYour {event_name} with {host_name} is confirmed.\n\n...",
  allowReschedule: true, rescheduleNotice: 24, rescheduleNoticeUnit: "hours",
  allowCancel: true, cancelNotice: 24, cancelNoticeUnit: "hours",
  reminders: [
    { id: 1, when: 24, unit: "hours", type: "email", subject: "Reminder: {event_name}...", enabled: true },
    { id: 2, when: 1, unit: "hours", type: "email", subject: "Starting soon: {event_name}...", enabled: true },
  ],
});
const [brandSettings, setBrandSettings] = useState({ companyName: "Vibe Consulting", primaryColor: "#D2F34C", ... });
const [connectedAccounts, setConnectedAccounts] = useState({ google_calendar: {...}, zoom: {...}, ... });
const [availability, setAvailability] = useState({ mon: {...}, tue: {...}, ... });
```

---

### C.11 ContentStudioView — Full Component Detail

**Key data structures in the new component:**

Hook Styles (12 presets):
```jsx
const HOOK_STYLES = ["Pattern Interrupt", "Question", "Bold Claim", "Story", "Controversy", "Tutorial", "Before/After", "POV"];
```

Saved Hooks (12 templates with style, source, example):
```jsx
const SAVED_HOOKS = [
  { id: "h1", template: "Stop scrolling if you [pain point]...", style: "Pattern Interrupt", source: "Custom", ... },
  { id: "h2", template: "I [impressive result] in [timeframe]. Here's how.", style: "Bold Claim", source: "Alex Hormozi", ... },
  // ... 12 total
];
```

Platforms:
```jsx
const PLATFORMS = [
  { key: "linkedin", label: "LinkedIn", icon: "💼", color: "#0077B5", connected: true },
  { key: "x", label: "X / Twitter", icon: "𝕏", color: "#1DA1F2", connected: true },
  { key: "instagram", label: "Instagram", icon: "📸", color: "#E1306C", connected: false },
  { key: "tiktok", label: "TikTok", icon: "🎵", color: "#010101", connected: false },
  { key: "youtube", label: "YouTube", icon: "▶️", color: "#FF0000", connected: false },
  { key: "facebook", label: "Facebook", icon: "📘", color: "#1877F2", connected: false },
];
```

Content statuses and kanban: `["Idea", "Drafting", "Review", "Scheduled", "Published"]`

Ideas panel with sub-tabs: ideas, calls (from sales calls), trending (per platform), competitors

Video script generation for TikTok/YouTube/Instagram with: hook, body, CTA, caption, duration

Format options change per platform:
- LinkedIn: text, carousel, image
- X: tweet, thread
- Instagram: reel, carousel, story
- TikTok: script
- YouTube: short

---

## D. Styling Differences

### COLORS Object

**Current code has `green` and `greenBg`:**
```jsx
green: "#22c55e",
greenBg: "rgba(34, 197, 94, 0.08)",
```

**New file does NOT define these in COLORS but references `COLORS.green` throughout.** This would be a runtime error in the demo. The current code is correct — keep `green`/`greenBg`.

No other color value changes.

### Font definitions — identical in both files.

---

## E. Important Notes

1. **The new file is a DEMO/MOCK version** — it uses `MOCK_COMPANIES`, `MOCK_CONTACTS`, `PERSONALIZED_EMAILS`, `sleep()` simulations, and zero API calls. The current codebase has real API integration via `./api.js`. **Do NOT regress** real API calls to mock data.

2. **Keep all existing API integrations** — the new file's simplified `INTEGRATIONS` array in SettingsView should NOT replace the current `INTEGRATIONS_META` with real credential fields and connect endpoints.

3. **Keep existing Settings tabs** — the new file removes `ai_sdr` and `lead_search_order` tabs, but these have real functionality in the current code. Add new tabs (`sending_accounts`, `solutions`) alongside existing ones.

4. **The new file defines `VideoScriptView` and `LinkedInContentView`** at lines 10293 and 11777 respectively, but they are **never routed** in the sidebar/main content. They are vestigial — their functionality is absorbed into `ContentStudioView`.

---

## F. Database Schema Updates Required

```sql
-- 1. Websites (WebsiteBuilderView)
CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  project_id TEXT,
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

-- 2. Sending Accounts (SendingAccountsView)
CREATE TABLE IF NOT EXISTS sending_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  type TEXT NOT NULL,
  email TEXT,
  domain TEXT,
  status TEXT DEFAULT 'active',
  warmup_status TEXT DEFAULT 'pending',
  health_score INTEGER DEFAULT 0,
  daily_limit INTEGER DEFAULT 30,
  account_type TEXT,
  config_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Content Items (ContentStudioView)
CREATE TABLE IF NOT EXISTS content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  title TEXT,
  platform TEXT NOT NULL,
  status TEXT DEFAULT 'Idea',
  format TEXT,
  content TEXT,
  hook TEXT,
  video_script JSONB,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  engagement JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Prototype Outputs (PrototypeLabTab)
CREATE TABLE IF NOT EXISTS prototype_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  project_id TEXT,
  opportunity_id TEXT NOT NULL,
  output_type TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Custom Skills (Settings Skills & Plugins)
CREATE TABLE IF NOT EXISTS custom_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🔧',
  system_prompt TEXT,
  data_access JSONB DEFAULT '[]',
  output_type TEXT DEFAULT 'chat',
  category TEXT DEFAULT 'Custom',
  source TEXT,
  status TEXT DEFAULT 'live',
  surface TEXT,
  inputs JSONB DEFAULT '[]',
  outputs JSONB DEFAULT '[]',
  runs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Enabled Solutions on organisations
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS enabled_solutions JSONB DEFAULT '["sol_assistant"]';

-- 7. Native Email Campaigns
CREATE TABLE IF NOT EXISTS native_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  lead_list_id UUID,
  sender_accounts JSONB DEFAULT '[]',
  steps JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Native LinkedIn Campaigns
CREATE TABLE IF NOT EXISTS native_linkedin_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  lead_list_id UUID,
  connection_degree TEXT DEFAULT '2nd_3rd',
  sequence_steps JSONB DEFAULT '[]',
  schedule JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Booking Event Types
CREATE TABLE IF NOT EXISTS booking_event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration INTEGER DEFAULT 30,
  location TEXT DEFAULT 'zoom',
  slug TEXT,
  active BOOLEAN DEFAULT true,
  assigned_users JSONB DEFAULT '[]',
  round_robin TEXT DEFAULT 'none',
  color TEXT,
  buffer_before INTEGER DEFAULT 0,
  buffer_after INTEGER DEFAULT 15,
  min_notice JSONB DEFAULT '{"value": 2, "unit": "hours"}',
  max_advance JSONB DEFAULT '{"value": 30, "unit": "days"}',
  questions JSONB DEFAULT '[]',
  confirmation JSONB DEFAULT '{}',
  reminders JSONB DEFAULT '[]',
  reschedule_policy JSONB DEFAULT '{}',
  cancel_policy JSONB DEFAULT '{}',
  sdr_link BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Booking Availability
CREATE TABLE IF NOT EXISTS booking_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id UUID,
  day_of_week TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  start_time TEXT DEFAULT '09:00',
  end_time TEXT DEFAULT '17:00'
);

-- 11. Booking Brand Settings
CREATE TABLE IF NOT EXISTS booking_brand_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  company_name TEXT,
  primary_color TEXT DEFAULT '#D2F34C',
  logo_url TEXT,
  welcome_text TEXT DEFAULT 'Pick a time that works best for you.'
);
```

---

## G. API Endpoints Required

### Websites
- `GET /api/websites` — list
- `POST /api/websites` — create
- `PUT /api/websites/:id` — update
- `DELETE /api/websites/:id` — delete
- `POST /api/websites/:id/generate` — AI generate
- `POST /api/websites/:id/refine` — AI refine
- `POST /api/websites/:id/publish` — publish

### Sending Accounts
- `GET /api/sending-accounts` — list
- `POST /api/sending-accounts` — add
- `PUT /api/sending-accounts/:id` — update
- `DELETE /api/sending-accounts/:id` — remove

### Content Items
- `GET /api/content-items` — list (filter by platform, status)
- `POST /api/content-items` — create
- `PUT /api/content-items/:id` — update
- `DELETE /api/content-items/:id` — delete
- `POST /api/content-items/generate` — AI generate
- `POST /api/content-items/generate-video-script` — AI video script

### Prototypes
- `GET /api/prototypes` — list for project
- `POST /api/prototypes/generate` — generate PRD/Lovable/Bolt

### Custom Skills
- `GET /api/custom-skills` — list
- `POST /api/custom-skills` — create
- `PUT /api/custom-skills/:id` — update
- `DELETE /api/custom-skills/:id` — delete
- `POST /api/custom-skills/import` — parse from code

### Native Campaigns
- `GET /api/native-campaigns/email` — list
- `POST /api/native-campaigns/email` — create
- `PUT /api/native-campaigns/email/:id` — update
- `GET /api/native-campaigns/linkedin` — list
- `POST /api/native-campaigns/linkedin` — create
- `PUT /api/native-campaigns/linkedin/:id` — update

### Booking
- `GET /api/booking/event-types` — list
- `POST /api/booking/event-types` — create
- `PUT /api/booking/event-types/:id` — update
- `DELETE /api/booking/event-types/:id` — delete
- `GET /api/booking/availability` — get
- `PUT /api/booking/availability` — update
- `GET /api/booking/brand` — get
- `PUT /api/booking/brand` — update

### Enabled Solutions
- `GET /api/organisations/:id/solutions` — get
- `PUT /api/organisations/:id/solutions` — update

---

## H. Implementation Priority

1. **PrototypeLabTab** — smallest scope, self-contained tab in AuditView
2. **SendingAccountsView + Settings tab** — foundation for campaign builders
3. **ContentStudioView** — replaces 2 views, high-impact consolidation
4. **WebsiteBuilderView + enabledSolutions** — new feature with conditional sidebar
5. **ColdEmailCampaignsView expansion** — campaign builder uses sending accounts
6. **LinkedInCampaignsView expansion** — campaign builder
7. **AppointmentsView expansion** — booking system
8. **Settings Skills & Plugins tab** — advanced feature, lower priority
