# Presentation / Deck Feature — Assessment & Fix Plan

## Investigation Summary

Tested the full presentation slide creation and export pipeline end-to-end. The feature has **3 distinct issues**: a blocking backend bug, non-functional export buttons, and hardcoded slide data.

---

## Issue 1: Analysis fails — missing `analysis_json` column (CRITICAL / BLOCKING)

**Symptom:** Running the analysis from Strategy → Analysis tab fails with:
```
column "analysis_json" of relation "audit_analyses" does not exist
```

**Root cause:** The `audit_analyses` table was created with an older schema containing separate columns (`findings_json`, `themes_json`, `matrix_json`, `roadmap_json`, `roi_json`). The code was later refactored to use a single `analysis_json` JSONB column, but the migration doesn't add this column to existing tables.

**Current remote DB schema:**
```
id, project_id, org_id, reasoning_log_json, findings_json, themes_json,
matrix_json, roadmap_json, roi_json, status, created_at, source_summary
```

**Expected schema (from CREATE TABLE in code):**
```
id, org_id, project_id, status, analysis_json, source_summary, created_at, updated_at
```

**Code location:** `api/routes/audit.js`, line 567–587 (`ensureAnalysesTable` function)

The `CREATE TABLE IF NOT EXISTS` doesn't modify existing tables, and the ALTER TABLE loop (line 581–586) only adds `source_summary`, not `analysis_json`.

### Fix steps:

**Step 1:** Add `analysis_json` to the ALTER TABLE migration in `ensureAnalysesTable`:

```javascript
// In api/routes/audit.js, inside ensureAnalysesTable(), after the existing cols array:
const cols = [
  { name: 'source_summary', type: "JSONB DEFAULT '{}'" },
  { name: 'analysis_json', type: "JSONB DEFAULT '{}'" },    // ← ADD THIS
  { name: 'updated_at', type: "TIMESTAMPTZ DEFAULT now()" }, // ← ADD THIS
];
```

**Step 2:** The INSERT at line 775 uses `analysis_json` — this will work once the column exists.

**Step 3:** The SELECT at line 853 reads `r.analysis_json` — this will work once the column exists.

No data migration is needed since the old columns (`findings_json`, etc.) contain data from the old format, and the new `analysis_json` column will start empty with `'{}'::jsonb` default. New analyses will write to `analysis_json`.

---

## Issue 2: "Export PPTX" buttons do nothing (MEDIUM)

**Symptom:** Two "Export PPTX" buttons exist in the UI but have no `onClick` handler — clicking them does absolutely nothing.

**Locations:**
1. **Analysis tab** — line 6531: `<button style={...}>Export PPTX</button>` (no onClick)
2. **Full Deck Editor** — line 6849: `<button style={...}>Export PPTX</button>` (no onClick)

**Additional non-functional export buttons:**
3. **Process Maps tab** — line 5724: "Download as PPTX" and "Export as PDF" labels in a dropdown (no handlers)

**Root cause:** No PPTX generation library is installed. `package.json` has no `pptxgenjs` or similar dependency.

### Fix steps:

**Step 1:** Install a PPTX generation library:
```bash
npm install pptxgenjs
```

**Step 2:** Create a `generatePptx` utility function that:
- Takes the `slideData` object from `AuditFullDeckViewer`
- Maps each slide to PptxGenJS slide objects
- Creates a download

**Step 3:** Wire the onClick handlers on both Export PPTX buttons to call the utility.

**Example implementation:**
```javascript
import PptxGenJS from "pptxgenjs";

function exportDeckToPptx(slideData, projectName) {
  const pptx = new PptxGenJS();
  pptx.title = projectName || "Consulting Deck";
  pptx.layout = "LAYOUT_WIDE"; // 16:9

  // Slide 0: Title
  const s0 = slideData[0];
  const slide0 = pptx.addSlide({ bkgd: "0F172A" });
  slide0.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.08, h: "100%", fill: { color: "EAB308" } });
  slide0.addText(s0.title.replace(/\n/g, "\n"), { x: 1, y: 1.5, w: 8, fontSize: 36, color: "FFFFFF", bold: true });
  slide0.addText(s0.subtitle, { x: 1, y: 3, w: 8, fontSize: 16, color: "94A3B8" });
  slide0.addText(s0.preparedFor, { x: 1, y: 4.5, w: 8, fontSize: 10, color: "EAB308", bold: true });
  slide0.addText(s0.date, { x: 1, y: 4.8, w: 8, fontSize: 10, color: "64748B" });

  // ... similar for slides 1-9 ...

  pptx.writeFile({ fileName: `${projectName || "Deck"}.pptx` });
}
```

**Step 4:** Add onClick to both buttons:
```jsx
<button onClick={() => exportDeckToPptx(slideData, project?.client)} style={...}>Export PPTX</button>
```

---

## Issue 3: Deck uses hardcoded data, not analysis results (LOW)

**Symptom:** The `AuditFullDeckViewer` always shows the same "Hodge Insurance" data regardless of which project is selected or what the analysis produced.

**Root cause:** `slideData` at line 6572 is initialized with hardcoded values. The `generateDeck` function at line 6375 just sets `deckGenerated = true` after a delay — it doesn't pass `analysisData` to the slide content.

**Code flow:**
1. `runAnalysis()` → calls `api.audit.analyse()` → stores result in `analysisData` state
2. `generateDeck()` → sets `deckGenerated = true` (ignores `analysisData`)
3. `AuditFullDeckViewer` → hardcoded `slideData` (ignores everything)

### Fix steps:

**Step 1:** Pass `analysisData` as a prop to `AuditFullDeckViewer`:
```jsx
if (showFullDeck) return <AuditFullDeckViewer project={project} analysisData={analysisData} onClose={() => setShowFullDeck(false)} />;
```

**Step 2:** In `AuditFullDeckViewer`, use `analysisData` to populate `slideData` initial state:
```javascript
function AuditFullDeckViewer({ project, analysisData, onClose }) {
  const [slideData, setSlideData] = useState(() => {
    if (analysisData) {
      return buildSlidesFromAnalysis(analysisData, project);
    }
    return DEFAULT_SLIDE_DATA; // current hardcoded data as fallback
  });
  // ...
}
```

**Step 3:** Create a `buildSlidesFromAnalysis(analysis, project)` function that maps the analysis JSON fields (executive_summary, themes, opportunities, roadmap, etc.) to the 10-slide structure.

---

## Issue 4: "Presentations" tab missing from AuditView (LOW)

**Context:** The uploaded demo file had a "Presentations" tab that showed previously generated decks. The current code doesn't have this tab — decks are only accessible through the Analysis tab's "Open Editor" button.

### Fix steps (optional):

**Step 1:** Add `{ key: "presentations", label: "📊 Presentations" }` to the AuditView tabs array.

**Step 2:** Add a `PresentationsTab` component that:
- Lists previously generated decks from the DB
- Shows thumbnails and dates
- Allows re-opening the deck editor

---

## Test Results Summary

| Test | Result | Notes |
|------|--------|-------|
| Navigate to Analysis tab | ✅ PASS | Chat interface + deck panel render correctly |
| Run analysis | ❌ FAIL | `analysis_json` column missing from DB |
| Generate Deck button | ⊘ BLOCKED | Cannot test — analysis must succeed first |
| Deck slide rendering | ⊘ BLOCKED | Cannot test via normal flow (hardcoded data would render) |
| Full Deck Editor | ⊘ BLOCKED | Cannot test via normal flow |
| Edit slide text | ⊘ BLOCKED | EditableText component looks correct in code |
| Export PPTX | ❌ FAIL | Button has no onClick handler, no PPTX library installed |
| Export PDF | ❌ FAIL | Button has no onClick handler |
| Slide data from analysis | ❌ FAIL | Hardcoded "Hodge Insurance" data, ignores real analysis |

---

## Fix Priority

| # | Fix | Severity | Effort | Impact |
|---|-----|----------|--------|--------|
| 1 | Add `analysis_json` column migration | **CRITICAL** | 5 min | Unblocks the entire analysis + deck flow |
| 2 | Wire Export PPTX with pptxgenjs | **MEDIUM** | 2-3 hrs | Enables actual file download |
| 3 | Populate slides from analysisData | **LOW** | 1-2 hrs | Makes deck content dynamic |
| 4 | Add Presentations tab | **LOW** | 30 min | Better UX for deck management |
