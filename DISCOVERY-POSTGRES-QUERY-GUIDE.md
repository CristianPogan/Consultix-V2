# Discovery: Postgres Query Guide

## Recommended filters to get leads from Postgres

If you see "0 companies (source: postgres)", try these selections:

### 1. **Filters that return data** (based on your DB)

| Field | Try This | Why |
|-------|----------|-----|
| **TARGET INDUSTRY** | `B2B SaaS` or `Facilities Services` or `Restaurants` | These industries exist in the DB |
| **KEYWORDS** | `SaaS` or `lead generation` | Matches name, description, keywords |
| **COMPANY SIZE** | `51-200` only, or leave empty | Many companies have null employee_count |
| **TARGET REGIONS** | `North America` only | Avoid Asia Pacific if your DB has few APAC companies |
| **MAX LEADS** | `50` or `100` | |

### 2. **HVAC-specific**

Your DB has HVAC companies in **name** or **keywords** (not industry). Use:
- **TARGET INDUSTRY**: `HVAC`
- **KEYWORDS**: `HVAC`
- **TARGET REGIONS**: `North America` only (remove Asia Pacific)
- **COMPANY SIZE**: Include `1-10`, `11-50` to catch small HVAC shops

### 3. **SQL queries in Agent Log**

After running discovery, the Agent Log shows:
- All Postgres SQL queries run
- Parameters used
- Row count per query
- Waterfall attempts (IcyPeas, AI Ark, etc.)

### 4. **Browser console**

Open DevTools (F12) → Console. After discovery you'll see:
```js
[Discovery] API result: { count, source, sqlQueriesCount, sqlQueries, waterfallLog }
```

### 5. **Waterfall order** (when Postgres returns 0)

1. **IcyPeas** (primary) — person/company search
2. **AI Ark** (fallback) — B2B semantic search
3. Findy, Wiza — not yet implemented for discovery

Configure credentials in **Settings → Integrations** for the waterfall to run.
