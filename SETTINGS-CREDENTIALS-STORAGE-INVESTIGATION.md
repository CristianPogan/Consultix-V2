# Settings Tab — Credentials & API Keys Storage Investigation

This document maps where credentials and API keys for the Settings integrations should be stored in Postgres, and how they should be read/written.

---

## 1. Current Database Schema

### 1.1 `user_settings` (existing)

**Source:** `api/routes/settings.js`

| Column        | Type   | Notes                          |
|---------------|--------|--------------------------------|
| id            | UUID   | PK                             |
| user_id       | UUID   | NOT NULL — links to app_users  |
| org_id        | TEXT   | NOT NULL — links to organisation/project |
| settings_type | TEXT   | e.g. `brand_voice`, `buyer_persona` |
| settings_data | JSONB  | NOT NULL — flexible JSON       |
| created_at    | TIMESTAMPTZ |                         |
| updated_at    | TIMESTAMPTZ |                         |

**Unique:** `(user_id, settings_type)` — one row per user per settings type.

**API:**
- `GET /api/settings/:type` — reads `settings_data` where `user_id` and `settings_type` match
- `POST /api/settings/:type` — upserts row with `settings_data` from body

**Currently used for:** `brand_voice`, `buyer_persona` (non-sensitive form data).

---

## 2. Integrations in the Settings Tab

| Integration   | Key           | Category       | Credentials Needed |
|---------------|---------------|----------------|--------------------|
| Fathom        | fathom        | Call Recording | API key / OAuth access token |
| Fireflies.ai  | fireflies     | Call Recording | API key |
| Zoom          | zoom          | Call Recording | OAuth (client_id, client_secret, tokens) or JWT |
| LinkedIn      | linkedin_api  | Outreach       | OAuth (access_token, refresh_token) or API key |
| Instantly     | instantly     | Outreach       | API key, Campaign ID |
| SmartLead     | smartlead     | Outreach       | API key, workspace/campaign IDs |
| HeyReach      | heyreach      | Outreach       | API key, Campaign ID |
| AimFox        | aimfox        | Outreach       | API key, campaign IDs |

---

## 3. Where to Store Credentials

### Option A: Use `user_settings` (simplest)

Store integration credentials as another `settings_type`:

| settings_type  | settings_data (JSONB) |
|----------------|------------------------|
| `integrations` | `{ fathom: { apiKey: "encrypted_or_masked", connected: true }, instantly: { apiKey: "...", campaignId: "..." }, ... }` |

**Read:** `GET /api/settings/integrations`  
**Write:** `POST /api/settings/integrations` with `{ settings: { fathom: {...}, instantly: {...} } }`

**Pros:** No schema change, reuses existing API  
**Cons:** All credentials in one JSONB; harder to encrypt per-integration; `(user_id, settings_type)` gives one “integrations” blob per user.

---

### Option B: New table `integration_credentials` (recommended)

**Purpose:** Store API keys and tokens per integration, scoped by org (project) or user.

```sql
CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  integration_key TEXT NOT NULL,
  credentials_json JSONB NOT NULL,
  connected BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(org_id, integration_key)
);
```

**Alternative (user-scoped):** Add `user_id` and use `UNIQUE(user_id, integration_key)` if credentials are per user.

**Credentials shape per integration:**

| integration_key | credentials_json |
|-----------------|-------------------|
| fathom | `{ "apiKey": "..." }` or `{ "accessToken": "...", "refreshToken": "..." }` |
| fireflies | `{ "apiKey": "..." }` |
| zoom | `{ "clientId": "...", "clientSecret": "...", "accessToken": "...", "refreshToken": "..." }` |
| linkedin_api | `{ "accessToken": "...", "refreshToken": "..." }` |
| instantly | `{ "apiKey": "...", "campaignId": "..." }` |
| smartlead | `{ "apiKey": "...", "workspaceId": "..." }` |
| heyreach | `{ "apiKey": "...", "campaignId": "..." }` |
| aimfox | `{ "apiKey": "...", "campaignId": "..." }` |

**Read:** `GET /api/integrations/credentials` → returns non-sensitive status + masked keys  
**Write:** `POST /api/integrations/:key/connect` → stores credentials for org, marks connected  
**Disconnect:** `POST /api/integrations/:key/disconnect` → clears or nullifies credentials, sets connected = false  

---

### Option C: Hybrid — `user_settings` for integrations blob

Use `settings_type = 'integrations'` with a structured JSON:

```json
{
  "fathom": { "connected": true },
  "instantly": { "connected": true, "campaignId": "abc123" }
}
```

**Separate encrypted store:** Sensitive values (API keys, tokens) in a dedicated table or service; `user_settings` holds only connection status and non-sensitive IDs.

---

## 4. Recommended Approach

**Use `user_settings` with `settings_type = 'integrations'`** for the first iteration:

1. Reuses existing table and API.
2. Keeps integration status (connected/disconnected) and non-sensitive config (e.g. campaign IDs) in `settings_data`.
3. Sensitive values (API keys, tokens) should be stored server-side only:
   - Either in the same `settings_data` (acceptable if DB access is restricted and TLS is used), or  
   - In a separate `integration_credentials` table with optional application-level encryption.

**Schema for `settings_data` when `settings_type = 'integrations'`:**

```json
{
  "fathom": { "connected": true },
  "fireflies": { "connected": false },
  "zoom": { "connected": false },
  "linkedin_api": { "connected": true },
  "instantly": { "connected": true, "campaignId": "abc" },
  "smartlead": { "connected": false },
  "heyreach": { "connected": true, "campaignId": "xyz" },
  "aimfox": { "connected": false }
}
```

API keys and tokens are either:
- Omitted from responses to the client (never sent to frontend), or  
- Stored in `settings_data` and only read by backend services when calling external APIs.

---

## 5. Scoping: User vs Organisation (Project)

| Integration   | Scope   | Reason |
|---------------|---------|--------|
| Fathom        | org_id  | Shared call recordings for the project |
| Fireflies     | org_id  | Same as Fathom |
| Zoom          | org_id  | Shared Zoom account for the org |
| LinkedIn      | user_id | Personal LinkedIn account |
| Instantly     | org_id  | Org’s email campaigns |
| SmartLead     | org_id  | Org’s email campaigns |
| HeyReach      | org_id  | Org’s LinkedIn campaigns |
| AimFox        | org_id  | Org’s LinkedIn campaigns |

Current `user_settings` is `(user_id, settings_type)` — user-scoped. For org-scoped integrations, you’d either:

- Add `settings_type` values like `integrations_org` and scope reads by `org_id` (and optionally user’s org membership), or  
- Introduce an `org_settings` (or similar) table keyed by `org_id`.

---

## 6. Read/Write Flow

### Read (for Settings UI)

1. Call `GET /api/settings/integrations` (or equivalent).
2. Backend loads from `user_settings` (or `integration_credentials`) for the current user/org.
3. Response includes:
   - `connected` for each integration.
   - Non-sensitive fields (e.g. `campaignId`, `workspaceId`).
   - No raw API keys or tokens.

### Write (Connect integration)

1. User submits credentials in the Connect flow.
2. Frontend calls `POST /api/integrations/fathom/connect` (or `POST /api/settings/integrations` with updated blob).
3. Backend validates, then upserts into `user_settings` or `integration_credentials`.
4. Sensitive values are never echoed back to the client.

### Use (when calling external APIs)

1. Lead generation, outreach, etc. need HeyReach, Instantly, etc.
2. Backend loads credentials for the current org (or user for LinkedIn) from the database.
3. Uses them when calling external APIs (as in `lead-services.js`).
4. Fallback: if DB has no credentials, fall back to env vars (current behaviour).

---

## 7. Implementation Checklist

| Step | Action |
|------|--------|
| 1 | Add `settings_type = 'integrations'` support; frontend loads/saves via `api.settings.get/save('integrations')`. |
| 2 | Update Settings UI to read `connected` and config from API instead of hardcoded `INTEGRATIONS`. |
| 3 | Add Connect modals that collect API key, campaign ID, etc. and POST to backend. |
| 4 | Update `lead-services.js` (and similar) to resolve credentials from DB first, then env vars. |
| 5 | Ensure all credential writes go through backend; never persist raw keys in frontend state or localStorage. |

---

## 8. Security Notes

- API keys and tokens must never be sent to the frontend once stored.
- Use HTTPS and restrict DB access.
- Consider encrypting sensitive fields (e.g. `credentials_json`) at rest.
- For OAuth, store only server-side; use auth code or PKCE flow, never expose client secrets to the client.
