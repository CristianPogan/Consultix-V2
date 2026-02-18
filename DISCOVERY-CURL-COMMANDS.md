# Discovery cURL Commands

Use these when Postgres returns 0 companies. Replace `YOUR_*_API_KEY` with keys from Settings → Integrations.

**Lead search order (from Settings):** IcyPeas → Findy → AI Ark → Wiza

---

## 1. IcyPeas Find People (Primary)

Finds people by job title, industry keyword, location. Companies are derived from people's current companies.

**HVAC search (Industry: HVAC, Keywords: HVAC, Regions: North America + Asia Pacific + Europe + MENA + UK & Ireland, Roles: CEO, CTO, COO, etc.):**

```bash
curl -X POST "https://app.icypeas.com/api/find-people" \
  -H "Content-Type: application/json" \
  -H "Authorization: YOUR_ICYPEAS_API_KEY" \
  -d '{
    "query": {
      "currentJobTitle": { "include": ["CEO", "CTO", "COO", "CFO", "CRO", "VP Sales", "CMO", "VP Engineering", "VP Marketing"] },
      "location": { "include": ["US", "CA", "MX", "United States", "Canada", "JP", "AU", "SG", "IN", "KR", "Japan", "Australia", "GB", "DE", "FR", "NL", "ES", "IT", "United Kingdom", "Germany", "France", "AE", "SA", "IE"] },
      "keyword": { "include": ["HVAC"] },
      "headcount": { ">=": 1 }
    },
    "pagination": { "size": 100 }
  }'
```

**Response:** `{ success, total, leads: [...], pagination }`. Each lead has `currentCompanyName`, `currentCompanyWebsite`, etc. Use these to derive companies.

---

## 2. AI Ark Company Search (Fallback 2)

Semantic company search by industry, keywords, location. Uses `X-TOKEN` header (not Bearer).

```bash
curl -X POST "https://api.ai-ark.com/api/developer-portal/v1/companies" \
  -H "Content-Type: application/json" \
  -H "X-TOKEN: YOUR_AI_ARK_API_KEY" \
  -H "Accept: application/json" \
  -d '{
    "page": 0,
    "size": 100,
    "account": {
      "industry": { "any": { "include": ["HVAC"] } },
      "keyword": { "any": { "include": { "mode": "SMART", "content": ["HVAC"] } } },
      "location": { "any": { "include": ["United States", "Canada", "Mexico", "Japan", "Australia", "Singapore", "India", "United Kingdom", "Germany", "France", "Netherlands", "Spain", "Italy", "United Arab Emirates", "Saudi Arabia", "Ireland"] } },
      "employeeSize": {
        "type": "RANGE",
        "range": [
          { "start": 1, "end": 10 },
          { "start": 11, "end": 50 },
          { "start": 51, "end": 200 },
          { "start": 201, "end": 500 },
          { "start": 501, "end": 1000 },
          { "start": 1001, "end": 5000 },
          { "start": 5001, "end": 999999 }
        ]
      }
    }
  }'
```

**Response:** `{ content: [...], totalElements, pageable }`. Each item has `summary.name`, `link.domain`, `location.headquarter`, etc.

---

## 3. AI Ark Lookalike (when you have seed domains)

Use when "Lookalike Search Only" is ON and you provide seed domains (e.g. `carrier.com` or `trane.com`):

```bash
# Replace SEED_DOMAIN with e.g. carrier.com or https://linkedin.com/company/carrier
curl -X POST "https://api.ai-ark.com/api/developer-portal/v1/companies" \
  -H "Content-Type: application/json" \
  -H "X-TOKEN: YOUR_AI_ARK_API_KEY" \
  -H "Accept: application/json" \
  -d '{
    "lookalikeDomains": ["https://carrier.com"],
    "page": 0,
    "size": 50,
    "account": {
      "industry": { "any": { "include": ["HVAC"] } },
      "location": { "any": { "include": ["United States", "Canada"] } }
    }
  }'
```

---

## 4. Findy & Wiza

Not yet implemented for discovery. When added, cURL examples will go here.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| IcyPeas returns 0 leads | Try `location: { "include": ["US"] }` only, or add more keyword variations ("HVAC contractor", "heating cooling") |
| AI Ark 404 | Ensure you use `https://api.ai-ark.com/api/developer-portal/v1/companies` and `X-TOKEN` header |
| AI Ark 401 | Check API key in Settings → Integrations → AI Ark |
| Postgres 0 rows | Org has no HVAC companies; waterfall (IcyPeas, AI Ark) will run automatically |
