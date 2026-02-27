# External Services for Lead Generation & Enrichment

This document maps external APIs (from n8n JSON workflows in `Consultix-V2/Consultix-Heroku-App/Lead-Generation-and-Sales-Workflows/`) to the functions in `lead-generation-and-enrichment.js` and the web application.

**Required env vars:** Store API keys in environment (e.g. `ICYPEAS_API_KEY`, `APIFY_API_KEY`, etc.) — never hardcode.

---

## 1. COMPANY LEAD GENERATION

### 1.1 Apify B2B Leads Finder (Apollo-based person/company search)

**Service:** Apify Actor `olympus~b2b-leads-finder`  
**Source JSON:** `Workflow-V4-Outreach-Engine-Fallbacks-A-Webhook_fkv0pKwvYgU1GqZF.json`, `Workflow-V4-Outreach-Engine-Fallbacks-Webhooks_pn7hk5QbwmTQFvTi.json`  
**Purpose:** Find people/companies matching Apollo search criteria (industry, titles, location, etc.)

**cURL:**
```bash
curl -X POST "https://api.apify.com/v2/acts/olympus~b2b-leads-finder/runs" \
  -H "Authorization: Bearer YOUR_APIFY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "cookies": "YOUR_APOLLO_COOKIES_FROM_BROWSER",
    "maxResults": 1000,
    "searchUrl": "https://app.apollo.io/#/people?personTitles[]=VP+Sales&personLocations[]=Belgium&..."
  }'
```

**Web App Function:** `runDiscovery`  
**Where to implement:** Replace mock `MOCK_COMPANIES` logic with this API call. Poll for run completion via `GET https://api.apify.com/v2/actor-runs/{runId}?token=...`, then fetch dataset items.

---

### 1.2 Apify Google Maps Scraper (local business discovery)

**Service:** Apify Actor `compass~crawler-google-places`  
**Source JSON:** `Apify Google Maps Scraper with Status Check_rnZMNmyBO0356eHS.json`  
**Purpose:** Discover local businesses by search query (e.g. "plumbers in Brussels")

**cURL – Start run:**
```bash
curl -X POST "https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "searchStringsArray": ["plumbers in Brussels"],
    "maxCrawledPlacesPerSearch": 100
  }'
```

**cURL – Check run status:**
```bash
curl "https://api.apify.com/v2/actor-runs/{runId}?token=YOUR_APIFY_TOKEN"
```

**cURL – Get results:**
```bash
curl "https://api.apify.com/v2/datasets/{defaultDatasetId}/items?token=YOUR_APIFY_TOKEN"
```

**Web App Function:** `runDiscovery` (alternative path for local/B2C leads)  
**Where to implement:** Add a “Local Businesses / Google Maps” mode to discovery that uses this actor instead of Apollo-based search.

---

### 1.3 IcyPeas Find People (person search by criteria)

**Service:** IcyPeas API  
**Source JSON:** `Workflow-V5-Outreach-Engine-IcyPeas-A-Webhook_qFOye3IEWZ71N6dp.json`  
**Purpose:** Find people by job title, industry, location, keyword (person-lead generation, but company is often used as filter)

**cURL:**
```bash
curl -X POST "https://app.icypeas.com/api/find-people" \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_ICYPEAS_API_KEY" \
  -d '{
    "query": {
      "currentJobTitle": { "include": ["Manager", "VP Sales"] },
      "location": { "include": ["Belgium", "BE"] },
      "currentCompanyName": { "include": ["Information technology"] },
      "keyword": { "include": ["SaaS"] }
    },
    "pagination": { "size": 100 }
  }'
```

**Web App Function:** `runDiscovery`  
**Where to implement:** Use IcyPeas as primary person-discovery source. Map ICP form (industry, roles, regions, keywords) to the `query` object. Paginate with `pagination.token` if present in response.

---

## 2. PERSON LEAD GENERATION & ENRICHMENT

### 2.1 IcyPeas Email Search (find email for a person)

**Service:** IcyPeas API  
**Source JSON:** `Add-Emails-and-Personalisation-to-Lead-Group_YTNuE1PMzoJ5HOic.json`, `Workflow-V5-Outreach-Engine-IcyPeas-A-Webhook_qFOye3IEWZ71N6dp.json`  
**Purpose:** Find email address for a person given first name, last name, and company/domain

**cURL – Submit search:**
```bash
curl -X POST "https://app.icypeas.com/api/email-search" \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_ICYPEAS_API_KEY" \
  -d '{
    "firstname": "Sarah",
    "lastname": "Chen",
    "domainOrCompany": "Meridian Health Systems"
  }'
```

**cURL – Check result (poll until status != IN_PROGRESS):**
```bash
curl -X POST "https://app.icypeas.com/api/bulk-single-searchs/read" \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_ICYPEAS_API_KEY" \
  -d '{
    "id": "RESPONSE_ITEM._id_FROM_EMAIL_SEARCH"
  }'
```

**Web App Function:** `runEnrichment`, `runImportEnrichment`  
**Where to implement:** Inside `runEnrichment`, call IcyPeas for each contact that lacks an email. Use `bulk-single-searchs/read` in a polling loop (with Wait) until status is `COMPLETED` or `FAILED`.

---

### 2.2 NeverBounce (email verification)

**Service:** NeverBounce API  
**Source JSON:** `Workflow-V4-Outreach-Engine-Fallbacks-Webhooks_pn7hk5QbwmTQFvTi.json`  
**Purpose:** Verify email deliverability and bounce risk

**cURL:**
```bash
curl "https://api.neverbounce.com/v4.2/single/check?key=YOUR_NEVERBOUNCE_API_KEY&email=test@example.com"
```

**Web App Function:** `runEnrichment`, `runImportEnrichment` (verifyEmail step)  
**Where to implement:** After fetching emails (IcyPeas or from import), call NeverBounce for each email. Map result to `bounceRisk` / `verified` fields on leads.

---

### 2.3 ScrapingBee (website scraping for company data)

**Service:** ScrapingBee API  
**Source JSON:** `Workflow-Personalisation-Webhook_7sN5f9tPr0sagG8c.json`, `Workflow-V4-Outreach-Engine-Fallbacks-Webhooks_pn7hk5QbwmTQFvTi.json`  
**Purpose:** Scrape company website HTML for AI enrichment / personalisation context

**cURL:**
```bash
curl "https://app.scrapingbee.com/api/v1?api_key=YOUR_SCRAPINGBEE_API_KEY&url=https://example.com"
```

**Web App Function:** `approveAndPersonalizeAll` (company enrichment step)  
**Where to implement:** Before personalisation, optionally scrape `organization.website_url` (or company domain) and pass HTML/content to the AI prompt for richer context.

---

### 2.4 Unipile (LinkedIn company profile)

**Service:** Unipile API  
**Source JSON:** `Workflow-Personalisation-Webhook_7sN5f9tPr0sagG8c.json`  
**Purpose:** Fetch LinkedIn company page data for enrichment

**cURL:**
```bash
curl "https://api12.unipile.com/api/v1/linkedin/company/COMPANY_SLUG?account_id=ACCOUNT_ID" \
  -H "accept: application/json" \
  -H "X-API-KEY: YOUR_UNIPILE_ACCESS_TOKEN"
```

**Note:** `COMPANY_SLUG` is extracted from LinkedIn URL (e.g. `linkedin.com/company/meridian` → `meridian`).

**Web App Function:** `runEnrichment` (companyData / LinkedIn enrichment)  
**Where to implement:** Enrich company with LinkedIn profile data. Store in `company_data_json` or `linkedinData` on leads.

---

### 2.5 OpenAI (personalisation)

**Service:** OpenAI Chat Completions API  
**Source JSON:** `Add-Emails-and-Personalisation-to-Lead-Group_YTNuE1PMzoJ5HOic.json`, `Workflow-Personalisation-Webhook_7sN5f9tPr0sagG8c.json`, `Update-Personalisation-Direct-From-Frontend_f8hw0ntH6QbfmJtU.json`  
**Purpose:** Generate personalised cold email from prompt + lead context

**cURL:**
```bash
curl -X POST "https://api.openai.com/v1/chat/completions" \
  -H "Authorization: Bearer YOUR_OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [
      { "role": "assistant", "content": " personalised prompt with {{firstName}} and {{company_data}} replaced by lead data " }
    ]
  }'
```

**Web App Function:** `approveAndPersonalizeAll`, `createPrompt`  
**Where to implement:** Replace mock `PERSONALIZED_EMAILS` lookup with OpenAI call. Use `listPrompts`/saved prompts as template; substitute `{{firstName}}`, `{{company_data}}` etc. with lead fields.

---

## 3. OUTREACH (push leads to platforms)

### 3.1 HeyReach (LinkedIn outreach)

**Service:** HeyReach API  
**Source JSON:** `Workflow-V4-Outreach-Engine-Fallbacks-Webhooks_pn7hk5QbwmTQFvTi.json`  
**Purpose:** Add leads to a HeyReach LinkedIn campaign

**cURL:**
```bash
curl -X POST "https://api.heyreach.io/api/public/campaign/AddLeadsToCampaignV2" \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: YOUR_HEYREACH_API_KEY" \
  -d '{
    "campaignId": "YOUR_CAMPAIGN_ID",
    "accountLeadPairs": [
      {
        "lead": {
          "profileUrl": "https://linkedin.com/in/sarahchen",
          "firstName": "Sarah",
          "lastName": "Chen",
          "emailAddress": "sarah@example.com",
          "companyName": "Meridian Health",
          "position": "VP of Growth"
        }
      }
    ]
  }'
```

**Web App Function:** `runQueueOutreach`  
**Where to implement:** For contacts with `channelAssignments[c.id].linkedin`, call HeyReach to add them to the campaign.

---

### 3.2 Instantly.ai (email outreach)

**Service:** Instantly.ai API  
**Source JSON:** `Workflow-V4-Outreach-Engine-Fallbacks-Webhooks_pn7hk5QbwmTQFvTi.json`  
**Purpose:** Add leads to an Instantly email campaign

**cURL:**
```bash
curl -X POST "https://api.instantly.ai/api/v2/leads" \
  -H "Authorization: Bearer YOUR_INSTANTLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign": "YOUR_CAMPAIGN_ID",
    "email": "sarah@example.com",
    "first_name": "Sarah",
    "personalization": "Your personalised message body here"
  }'
```

**Web App Function:** `runQueueOutreach`  
**Where to implement:** For contacts with `channelAssignments[c.id].email`, call Instantly to add them. Map `personalizedEmails[c.id].body` to `personalization`.

---

## 4. SUMMARY TABLE

| Service          | Type           | Use Case                         | Web App Function(s)                          |
|-----------------|----------------|----------------------------------|---------------------------------------------|
| Apify B2B Leads | Company/Person | Apollo-based person discovery    | `runDiscovery`                              |
| Apify GMaps     | Company        | Local business discovery         | `runDiscovery` (local mode)                  |
| IcyPeas Find People | Person     | Person search by criteria        | `runDiscovery`                              |
| IcyPeas Email Search | Person     | Find email for person            | `runEnrichment`, `runImportEnrichment`       |
| NeverBounce     | Person         | Email verification               | `runEnrichment`, `runImportEnrichment`       |
| ScrapingBee     | Company        | Website scraping                 | `approveAndPersonalizeAll`                   |
| Unipile         | Company        | LinkedIn company data            | `runEnrichment`                              |
| OpenAI          | Person         | AI personalisation               | `approveAndPersonalizeAll`, `createPrompt`   |
| HeyReach        | Outreach       | LinkedIn campaigns               | `runQueueOutreach`                           |
| Instantly.ai    | Outreach       | Email campaigns                  | `runQueueOutreach`                           |

---

## 5. N8N WEBHOOKS (internal, not external APIs)

These call other n8n workflows; use as reference if mirroring logic in the app:

| Webhook Path                                      | Purpose                                       |
|---------------------------------------------------|-----------------------------------------------|
| `add-leads-to-lead-group-and-personalise-and-enrich` | Trigger Add-Emails-and-Personalisation workflow |
| `apify-scraper`                                   | Trigger Apify Google Maps scraper             |
| `icy-peas-lead-generator`                         | Trigger IcyPeas lead generator workflow       |
| `message-personalisation`                         | Trigger personalisation workflow              |
| `lead-waterfall-verification`                     | Lead verification waterfall                   |
| `generate-example-personsalisation-layer-1/2/3`    | Generate example personalisation per layer    |

---

## 6. ENV VARS TO CONFIGURE

```bash
# Company & Person Discovery
APIFY_API_KEY=
ICYPEAS_API_KEY=

# Enrichment
NEVERBOUNCE_API_KEY=
SCRAPINGBEE_API_KEY=
UNIPILE_ACCESS_TOKEN=
UNIPILE_DSN=api12.unipile.com:14291

# AI Personalisation
OPENAI_API_KEY=

# Outreach
HEYREACH_API_KEY=
HEYREACH_CAMPAIGN_ID=
INSTANTLY_API_KEY=
INSTANTLY_CAMPAIGN_ID=

# Optional (Apollo via Apify)
APOLLO_COOKIES=      # From browser, for Apollo actor
```
