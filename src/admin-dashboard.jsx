import { useState } from "react";

// --- Design Tokens (same dark theme, admin-blue accent) ---
const C = {
  bg: "#0a0a0f", surface: "#12121a", surfaceHover: "#1a1a26",
  border: "#1e1e2e", borderActive: "#3b3b5c",
  text: "#e2e2e8", textMuted: "#7a7a8e", textDim: "#4a4a5e",
  accent: "#4d9ef0", accentDim: "#3578c0", accentBg: "rgba(77,158,240,0.08)",
  danger: "#f04d4d", dangerBg: "rgba(240,77,77,0.08)",
  warn: "#f0a84d", warnBg: "rgba(240,168,77,0.08)",
  green: "#4df07a", greenBg: "rgba(77,240,122,0.08)",
  purple: "#7B61FF",
};
const F = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";
const FB = "'DM Sans', 'Segoe UI', system-ui, sans-serif";

// --- Helpers ---
function StatCard({ label, value, sub, icon, color, trend }) {
  return (
    <div style={{ padding: "18px 16px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 9, color: C.textDim, fontFamily: F, fontWeight: 600, letterSpacing: "0.06em" }}>{label.toUpperCase()}</span>
        <span style={{ fontSize: 14 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: F, color: color || C.text }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: trend === "up" ? C.green : trend === "down" ? C.danger : C.accent, fontWeight: 500, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text, color }) {
  const cols = { active: C.green, trialling: C.accent, churned: C.danger, suspended: C.warn, starter: "#888", growth: C.accent, scale: C.purple, agency_pro: "#2dd4a8", "pro (agency)": "#2dd4a8", "standard (agency)": C.accent, open: C.warn, resolved: C.green, healthy: C.green, degraded: C.warn, down: C.danger, owner: C.accent, admin: C.purple, member: C.textMuted };
  const c = cols[text.toLowerCase()] || C.accent;
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: F, fontWeight: 600, background: c + "15", color: c, border: `1px solid ${c}22`, textTransform: "capitalize" }}>{text}</span>;
}

// --- Mock Data ---

// PLATFORM PLANS (what Pipeline charges)
const PLATFORM_PLANS = [
  { id: "starter", name: "Starter", price: 97, annual: 970, credits: 500, seats: 1, color: "#888" },
  { id: "growth", name: "Growth", price: 247, annual: 2470, credits: 2000, seats: 3, color: C.accent },
  { id: "scale", name: "Scale", price: 497, annual: 4970, credits: 5000, seats: 10, color: C.purple },
  { id: "agency_pro", name: "Agency Pro", price: 497, annual: 4970, credits: 15000, seats: 3, color: "#2dd4a8", isAgency: true, perWorkspace: 97 },
];

// AGENCIES
const AGENCIES = [
  { id: "ag1", name: "Elevate AI Consulting", owner: "Sarah Mitchell", email: "sarah@elevateai.co", plan: "agency_pro", status: "Active", stripeConnected: true, domain: "app.elevateai.co", clients: 6, clientSlots: 10, creditPool: 15000, creditPoolUsed: 8420, mrr: 4482, workspaceFees: 582, platformFee: 497, created: "2025-09-01", lastActive: "1 hr ago" },
  { id: "ag2", name: "GrowthLab Digital", owner: "Daniel Torres", email: "daniel@growthlabdigital.com", plan: "agency_pro", status: "Active", stripeConnected: true, domain: "app.growthlabdigital.com", clients: 3, clientSlots: 10, creditPool: 15000, creditPoolUsed: 4100, mrr: 1788, workspaceFees: 291, platformFee: 497, created: "2025-11-15", lastActive: "3 hrs ago" },
];

const ORGS = [
  // Direct Platform clients (agency_id: null)
  { id: 1, name: "Dunn Consulting", agency_id: null, plan: "Scale", status: "Active", owner: "Andrew Dunn", email: "andrew@dunnco.co.uk", seats: "8/10", creditsUsed: 3840, creditsTotal: 5000, mrr: 497, created: "2025-10-12", lastActive: "2 hrs ago", projects: 5, leads: 4200, integrations: 6, health: 94 },
  { id: 2, name: "Apex Advisory", agency_id: null, plan: "Growth", status: "Active", owner: "Sarah Mitchell", email: "sarah@apexadvisory.io", seats: "2/3", creditsUsed: 1450, creditsTotal: 2000, mrr: 247, created: "2025-11-03", lastActive: "4 hrs ago", projects: 3, leads: 1850, integrations: 4, health: 82 },
  { id: 3, name: "Perry Salvagne Consulting", agency_id: null, plan: "Growth", status: "Active", owner: "Perry Salvagne", email: "perry@hodgeins.co.uk", seats: "3/3", creditsUsed: 1920, creditsTotal: 2000, mrr: 247, created: "2025-12-01", lastActive: "1 day ago", projects: 2, leads: 920, integrations: 3, health: 76 },
  { id: 4, name: "InsureTech Partners", agency_id: null, plan: "Starter", status: "Trialling", owner: "James Patel", email: "james@insuretechpro.com", seats: "1/1", creditsUsed: 180, creditsTotal: 500, mrr: 0, created: "2026-02-08", lastActive: "3 hrs ago", projects: 1, leads: 340, integrations: 1, health: 58 },
  { id: 5, name: "NexGen Consulting", agency_id: null, plan: "Growth", status: "Active", owner: "Emily Rodriguez", email: "emily@nexgenai.co", seats: "3/3", creditsUsed: 1780, creditsTotal: 2000, mrr: 247, created: "2025-11-15", lastActive: "6 hrs ago", projects: 4, leads: 2100, integrations: 5, health: 85 },
  { id: 6, name: "DataPulse Advisory", agency_id: null, plan: "Scale", status: "Active", owner: "Marcus Webb", email: "marcus@datapulse.com", seats: "6/10", creditsUsed: 4200, creditsTotal: 5000, mrr: 497, created: "2025-09-20", lastActive: "1 hr ago", projects: 7, leads: 5600, integrations: 8, health: 97 },
  { id: 7, name: "CloudMetrics Ltd", agency_id: null, plan: "Starter", status: "Churned", owner: "Lisa Thompson", email: "lisa@cloudmetrics.io", seats: "0/1", creditsUsed: 0, creditsTotal: 500, mrr: 0, created: "2025-08-10", lastActive: "45 days ago", projects: 1, leads: 280, integrations: 0, health: 8 },
  { id: 8, name: "SynthWave Partners", agency_id: null, plan: "Growth", status: "Active", owner: "David Kim", email: "david@synthwave.dev", seats: "2/3", creditsUsed: 890, creditsTotal: 2000, mrr: 247, created: "2026-01-05", lastActive: "12 hrs ago", projects: 2, leads: 640, integrations: 3, health: 52 },
  { id: 9, name: "FinLeap Consulting", agency_id: null, plan: "Growth", status: "Suspended", owner: "Nina Okoro", email: "nina@finleap.io", seats: "0/3", creditsUsed: 0, creditsTotal: 2000, mrr: 0, created: "2025-10-30", lastActive: "14 days ago", projects: 3, leads: 1200, integrations: 2, health: 12 },
  { id: 10, name: "AutoPilot Advisory", agency_id: null, plan: "Starter", status: "Trialling", owner: "Tom Bradley", email: "tom@autopilotai.com", seats: "1/1", creditsUsed: 95, creditsTotal: 500, mrr: 0, created: "2026-02-10", lastActive: "5 hrs ago", projects: 1, leads: 120, integrations: 0, health: 41 },
  // Agency-owned workspaces (via Elevate AI)
  { id: 11, name: "Hodge Insurance", agency_id: "ag1", plan: "Pro (Agency)", status: "Active", owner: "Perry Salvagne", email: "perry@hodgeins.co.uk", seats: "3/5", creditsUsed: 1840, creditsTotal: 2500, mrr: 497, created: "2025-11-01", lastActive: "2 hrs ago", projects: 3, leads: 1420, integrations: 4, health: 88, agency: "Elevate AI Consulting" },
  { id: 12, name: "NexGen Recruitment", agency_id: "ag1", plan: "Pro (Agency)", status: "Active", owner: "Emily Chen", email: "emily@nexgenrecruit.com", seats: "4/5", creditsUsed: 2100, creditsTotal: 2500, mrr: 497, created: "2025-10-20", lastActive: "1 hr ago", projects: 4, leads: 2340, integrations: 6, health: 94, agency: "Elevate AI Consulting" },
  { id: 13, name: "ABC Kitchens", agency_id: "ag1", plan: "Standard (Agency)", status: "Active", owner: "John Davies", email: "john@abckitchens.co.uk", seats: "2/3", creditsUsed: 1200, creditsTotal: 2000, mrr: 347, created: "2025-12-15", lastActive: "4 hrs ago", projects: 2, leads: 860, integrations: 2, health: 76, agency: "Elevate AI Consulting" },
  // Agency-owned workspaces (via GrowthLab)
  { id: 14, name: "Bright Futures Academy", agency_id: "ag2", plan: "Standard (Agency)", status: "Active", owner: "Hannah Lee", email: "hannah@brightfutures.edu", seats: "2/3", creditsUsed: 980, creditsTotal: 2000, mrr: 397, created: "2026-01-05", lastActive: "5 hrs ago", projects: 2, leads: 540, integrations: 3, health: 72, agency: "GrowthLab Digital" },
  { id: 15, name: "TerraVolt Energy", agency_id: "ag2", plan: "Pro (Agency)", status: "Active", owner: "Marcus Hale", email: "marcus@terravolt.io", seats: "3/5", creditsUsed: 1600, creditsTotal: 2500, mrr: 497, created: "2025-12-20", lastActive: "2 hrs ago", projects: 3, leads: 1100, integrations: 5, health: 81, agency: "GrowthLab Digital" },
];

const TICKETS = [
  { id: "T-1024", org: "Apex Advisory", subject: "Enrichment waterfall timing out on large lists", status: "Open", priority: "High", created: "2 hrs ago" },
  { id: "T-1023", org: "Perry Salvagne Consulting", subject: "Process map export not including all steps", status: "Open", priority: "Medium", created: "5 hrs ago" },
  { id: "T-1022", org: "DataPulse Advisory", subject: "API rate limit hit during batch enrichment", status: "Open", priority: "High", created: "8 hrs ago" },
  { id: "T-1021", org: "NexGen Consulting", subject: "Can't connect HeyReach integration", status: "Resolved", priority: "Medium", created: "1 day ago" },
  { id: "T-1020", org: "SynthWave Partners", subject: "AI Council giving outdated recommendations", status: "Resolved", priority: "Low", created: "2 days ago" },
];

const CREDIT_COSTS = [
  { action: "Lead Discovery", credits: 1, unit: "per lead", cost: "$0.012", margin: "88%" },
  { action: "Email Verification", credits: 1, unit: "per lead", cost: "$0.008", margin: "92%" },
  { action: "AI Personalisation", credits: 2, unit: "per lead", cost: "$0.035", margin: "82%" },
  { action: "AI Audit Analysis", credits: 25, unit: "per analysis", cost: "$0.42", margin: "83%" },
  { action: "Deck Generation", credits: 15, unit: "per deck", cost: "$0.28", margin: "81%" },
  { action: "Niche Research", credits: 10, unit: "per report", cost: "$0.18", margin: "82%" },
  { action: "Script Generation", credits: 5, unit: "per script", cost: "$0.09", margin: "82%" },
  { action: "Process Map", credits: 10, unit: "per map", cost: "$0.15", margin: "85%" },
  { action: "AI Assistant Query", credits: 1, unit: "per turn", cost: "$0.014", margin: "86%" },
  { action: "AI Council Query", credits: 2, unit: "per turn", cost: "$0.032", margin: "84%" },
];

const PROVIDERS = [
  { name: "BetterContact", type: "Email Enrichment", status: "Healthy", priority: 1, calls: "12,400", errorRate: "0.3%", avgLatency: "1.2s" },
  { name: "Icypeas", type: "Email Enrichment", status: "Healthy", priority: 2, calls: "4,800", errorRate: "0.5%", avgLatency: "1.8s" },
  { name: "Wiza", type: "LinkedIn Enrichment", status: "Degraded", priority: 1, calls: "2,100", errorRate: "2.1%", avgLatency: "3.4s" },
  { name: "Instantly", type: "Email Outreach", status: "Healthy", priority: 1, calls: "8,900", errorRate: "0.1%", avgLatency: "0.4s" },
  { name: "HeyReach", type: "LinkedIn Outreach", status: "Healthy", priority: 1, calls: "3,200", errorRate: "0.4%", avgLatency: "1.1s" },
  { name: "Claude API", type: "AI Engine", status: "Healthy", priority: 1, calls: "45,200", errorRate: "0.02%", avgLatency: "2.8s" },
];

const AI_PROMPTS = [
  { id: "p1", name: "AI Council — Strategic Advisor", model: "claude-sonnet-4-5-20250929", tokensToday: "124K", costToday: "$2.40", lastEdit: "Feb 10" },
  { id: "p2", name: "AI Assistant — Org Knowledge", model: "claude-sonnet-4-5-20250929", tokensToday: "89K", costToday: "$1.72", lastEdit: "Feb 12" },
  { id: "p3", name: "Audit Analysis Engine", model: "claude-sonnet-4-5-20250929", tokensToday: "210K", costToday: "$4.06", lastEdit: "Feb 8" },
  { id: "p4", name: "Messaging Workshop", model: "claude-haiku-4-5-20251001", tokensToday: "56K", costToday: "$0.28", lastEdit: "Feb 11" },
  { id: "p5", name: "Script Generator", model: "claude-haiku-4-5-20251001", tokensToday: "34K", costToday: "$0.17", lastEdit: "Feb 9" },
  { id: "p6", name: "Lead Personalisation", model: "claude-haiku-4-5-20251001", tokensToday: "312K", costToday: "$1.56", lastEdit: "Feb 13" },
  { id: "p7", name: "Process Map Generator", model: "claude-sonnet-4-5-20250929", tokensToday: "67K", costToday: "$1.30", lastEdit: "Feb 7" },
  { id: "p8", name: "Niche Researcher", model: "claude-sonnet-4-5-20250929", tokensToday: "45K", costToday: "$0.87", lastEdit: "Feb 6" },
];

const FEATURE_FLAGS = [
  { key: "lead_discovery", label: "Lead Discovery", desc: "AI-powered lead finding and enrichment", plans: ["Starter", "Growth", "Scale"], core: true },
  { key: "crm", label: "CRM Pipeline", desc: "Contact and deal management", plans: ["Starter", "Growth", "Scale"], core: true },
  { key: "email_campaigns", label: "Email Campaigns", desc: "Automated outreach sequences", plans: ["Starter", "Growth", "Scale"], core: true },
  { key: "ai_assistant", label: "AI Assistant", desc: "General-purpose AI chat and analysis", plans: ["Starter", "Growth", "Scale"], core: true },
  { key: "ai_council", label: "AI Council", desc: "Multi-perspective strategic analysis", plans: ["Growth", "Scale"] },
  { key: "linkedin_campaigns", label: "LinkedIn Campaigns", desc: "Automated LinkedIn outreach", plans: ["Growth", "Scale"] },
  { key: "audit_reports", label: "Audit Reports", desc: "AI-generated consulting audit decks", plans: ["Growth", "Scale"] },
  { key: "call_analyser", label: "Call Analyser", desc: "AI call transcription and insights", plans: ["Growth", "Scale"] },
  { key: "solutions_marketplace", label: "Solutions Marketplace", desc: "Install pre-built + community solutions", plans: ["Growth", "Scale"] },
  { key: "api_access", label: "Public API & Webhooks", desc: "REST API + webhook integrations", plans: ["Growth", "Scale"] },
  { key: "team_collaboration", label: "Team Collaboration", desc: "Multi-seat workspaces with roles", plans: ["Growth", "Scale"] },
  { key: "custom_solutions", label: "Custom Solutions", desc: "Build and deploy bespoke AI tools", plans: ["Scale"] },
  { key: "white_label_reports", label: "White-Label Reports", desc: "Remove Pipeline branding from exports", plans: ["Scale"] },
  { key: "advanced_analytics", label: "Advanced Analytics", desc: "Cohort retention, feature heatmaps", plans: ["Scale"] },
  { key: "custom_integrations", label: "Custom Integrations", desc: "Custom API access and webhook config", plans: ["Scale"] },
  { key: "beta_chrome_ext", label: "🧪 Chrome Extension (Beta)", desc: "AI Course Assistant browser extension", plans: [], beta: true },
  { key: "beta_video_gen", label: "🧪 Video Script AI v2 (Beta)", desc: "Enhanced video script generation with hooks", plans: [], beta: true },
];

// --- NAV ---
const NAV = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "agencies", label: "Agencies", icon: "🏛️" },
  { key: "orgs", label: "Organisations", icon: "🏢" },
  { key: "users", label: "Users", icon: "👤" },
  { key: "billing", label: "Billing & Revenue", icon: "💳" },
  { key: "credits", label: "Credit System", icon: "🪙" },
  { key: "leadgen", label: "Lead Gen Config", icon: "⚡" },
  { key: "ai", label: "AI & Prompts", icon: "🧠" },
  { key: "knowledge", label: "Knowledge Bases", icon: "📚" },
  { key: "solutions", label: "Solutions", icon: "🧩" },
  { key: "integrations", label: "Integrations", icon: "🔗" },
  { key: "content", label: "Content & Templates", icon: "📄" },
  { key: "support", label: "Support", icon: "🎧" },
  { key: "analytics", label: "Analytics", icon: "📈" },
  { key: "system", label: "System Health", icon: "🖥️" },
  { key: "security", label: "Security", icon: "🔒" },
];

// =====================
// MAIN APP
// =====================
export default function AdminDashboard() {
  const [page, setPage] = useState("overview");
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [orgFilter, setOrgFilter] = useState("All");
  const [orgSearch, setOrgSearch] = useState("");
  const [creditAdjustOrg, setCreditAdjustOrg] = useState(null);
  const [creditAdjustAmount, setCreditAdjustAmount] = useState("");
  const [creditAdjustNote, setCreditAdjustNote] = useState("");
  const [detailTab, setDetailTab] = useState("overview");
  const [showAddProvider, setShowAddProvider] = useState(null);
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderType, setNewProviderType] = useState("Email Enrichment");
  const [newProviderKey, setNewProviderKey] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [showGlobalResults, setShowGlobalResults] = useState(false);

  const inputStyle = { width: "100%", padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: FB, color: C.text, outline: "none", boxSizing: "border-box" };

  // ---- OVERVIEW ----
  const directMrr = ORGS.filter(o => !o.agency_id && o.mrr > 0).reduce((s, o) => s + o.mrr, 0);
  const agencyMrr = AGENCIES.reduce((s, a) => s + a.platformFee + a.workspaceFees, 0);
  const totalMrr = directMrr + agencyMrr;
  const renderOverview = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Platform MRR" value={`$${totalMrr.toLocaleString()}`} icon="💵" sub="↑ 12% vs last month" trend="up" color={C.green} />
        <StatCard label="Direct Client MRR" value={`$${directMrr.toLocaleString()}`} icon="🏢" sub={`${ORGS.filter(o => !o.agency_id && o.mrr > 0).length} paying orgs`} />
        <StatCard label="Agency MRR" value={`$${agencyMrr.toLocaleString()}`} icon="🏛️" sub={`${AGENCIES.length} agencies, ${AGENCIES.reduce((s, a) => s + a.clients, 0)} workspaces`} color="#2dd4a8" />
        <StatCard label="Credits Consumed" value={ORGS.reduce((s, o) => s + o.creditsUsed, 0).toLocaleString()} icon="🪙" sub={`of ${ORGS.reduce((s, o) => s + o.creditsTotal, 0).toLocaleString()} allocated`} color={C.accent} />
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Orgs" value={ORGS.length} icon="🏢" sub={`${ORGS.filter(o => !o.agency_id).length} direct + ${ORGS.filter(o => o.agency_id).length} agency-owned`} />
        <StatCard label="AI Token Cost Today" value="$12.36" icon="🧠" sub="↓ 8% vs yesterday" trend="down" />
        <StatCard label="Open Tickets" value="3" icon="🎧" sub="Avg resolution: 4.2 hrs" color={C.warn} />
        <StatCard label="Trial → Paid" value="42%" icon="📈" sub="↑ from 35% last month" trend="up" color={C.green} />
      </div>

      {/* Revenue Chart Placeholder */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 16 }}>MRR GROWTH — LAST 12 MONTHS</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 140 }}>
            {[420, 580, 740, 920, 1100, 1540, 1980, 2380, 2720, 3190, 3650, totalMrr].map((v, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 8, color: C.textDim, fontFamily: F }}>{i === 11 ? `$${v.toLocaleString()}` : ""}</span>
                <div style={{ width: "100%", height: `${(v / totalMrr) * 120}px`, background: i === 11 ? C.accent : C.accent + "33", borderRadius: 3 }} />
                <span style={{ fontSize: 7, color: C.textDim, fontFamily: F }}>{["M", "A", "M", "J", "J", "A", "S", "O", "N", "D", "J", "F"][i]}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 16 }}>REVENUE STREAMS</div>
          <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 8 }}>DIRECT CLIENTS</div>
          {[
            { plan: "Scale", count: ORGS.filter(o => !o.agency_id && o.plan === "Scale" && o.mrr > 0).length, mrr: ORGS.filter(o => !o.agency_id && o.plan === "Scale" && o.mrr > 0).reduce((s, o) => s + o.mrr, 0), color: C.purple },
            { plan: "Growth", count: ORGS.filter(o => !o.agency_id && o.plan === "Growth" && o.mrr > 0).length, mrr: ORGS.filter(o => !o.agency_id && o.plan === "Growth" && o.mrr > 0).reduce((s, o) => s + o.mrr, 0), color: C.accent },
            { plan: "Starter", count: ORGS.filter(o => !o.agency_id && o.plan === "Starter" && o.mrr > 0).length, mrr: ORGS.filter(o => !o.agency_id && o.plan === "Starter" && o.mrr > 0).reduce((s, o) => s + o.mrr, 0), color: "#888" },
            { plan: "Growth", count: 4, mrr: 988, color: C.accent },
            { plan: "Starter", count: 1, mrr: 97, color: C.textDim },
            { plan: "Trialling", count: 2, mrr: 0, color: C.warn },
          ].map(p => (
            <div key={p.plan} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: p.color }}>{p.plan} <span style={{ color: C.textDim, fontWeight: 400 }}>({p.count} orgs)</span></span>
                <span style={{ fontSize: 11, fontFamily: F, fontWeight: 600, color: C.text }}>${p.mrr}/mo</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: C.bg }}>
                <div style={{ width: `${(p.mrr / Math.max(totalMrr, 1)) * 100}%`, height: "100%", borderRadius: 2, background: p.color }} />
              </div>
            </div>
          ))}
          <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginTop: 10, marginBottom: 8 }}>AGENCY REVENUE</div>
          {AGENCIES.map(a => (
            <div key={a.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2dd4a8" }}>{a.name} <span style={{ color: C.textDim, fontWeight: 400 }}>({a.clients} clients)</span></span>
                <span style={{ fontSize: 11, fontFamily: F, fontWeight: 600 }}>${(a.platformFee + a.workspaceFees).toLocaleString()}/mo</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: C.bg }}>
                <div style={{ width: `${((a.platformFee + a.workspaceFees) / Math.max(totalMrr, 1)) * 100}%`, height: "100%", borderRadius: 2, background: "#2dd4a8" }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MRR Waterfall */}
      <div style={{ padding: "16px 20px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>MRR MOVEMENT — THIS MONTH</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Starting MRR", value: "$1,981", color: C.textMuted, icon: "📊" },
            { label: "New MRR", value: "+$247", color: C.green, icon: "🆕", detail: "2 new signups" },
            { label: "Expansion", value: "+$250", color: C.green, icon: "⬆️", detail: "1 upgrade Starter → Growth" },
            { label: "Contraction", value: "-$0", color: C.textDim, icon: "⬇️", detail: "No downgrades" },
            { label: "Churned", value: "-$247", color: C.danger, icon: "💔", detail: "FinLeap (payment failed)" },
            { label: "Reactivation", value: "+$0", color: C.textDim, icon: "🔄", detail: "No win-backs" },
            { label: "Net New MRR", value: "+$247", color: C.accent, icon: "✨" },
          ].map((m, i) => (
            <div key={i} style={{ flex: 1, padding: "10px 8px", background: C.bg, borderRadius: 6, textAlign: "center", border: `1px solid ${i === 6 ? C.accent + "33" : C.border}` }}>
              <span style={{ fontSize: 12, display: "block", marginBottom: 4 }}>{m.icon}</span>
              <div style={{ fontSize: 8, fontFamily: F, color: C.textDim, marginBottom: 4 }}>{m.label.toUpperCase()}</div>
              <div style={{ fontSize: 14, fontFamily: F, fontWeight: 700, color: m.color }}>{m.value}</div>
              {m.detail && <div style={{ fontSize: 8, color: C.textDim, marginTop: 3 }}>{m.detail}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Churn Risk Alerts */}
      <div style={{ padding: "16px 20px", background: C.dangerBg, border: `1px solid ${C.danger}22`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.danger, letterSpacing: "0.06em" }}>CHURN RISK ALERTS</span>
          <span style={{ fontSize: 10, color: C.textDim }}>— 3 orgs need attention</span>
        </div>
        {[
          { org: "FinLeap Consulting", risk: "Critical", signals: ["Payment failed 3x", "No login in 14 days", "0 credits used this month"], action: "Contact owner" },
          { org: "CloudMetrics Ltd", risk: "High", signals: ["No login in 45 days", "0 integrations connected", "Churned — win-back candidate"], action: "Send win-back email" },
          { org: "SynthWave Partners", risk: "Medium", signals: ["Usage dropped 62% week-over-week", "Only 890/2,000 credits used", "No campaigns running"], action: "Check in with owner" },
        ].map((alert, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: alert.risk === "Critical" ? C.danger : alert.risk === "High" ? C.warn : "#F59E0B88", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{alert.org}</span>
                <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 8, fontFamily: F, fontWeight: 600, background: alert.risk === "Critical" ? C.danger + "15" : C.warn + "15", color: alert.risk === "Critical" ? C.danger : C.warn, border: `1px solid ${alert.risk === "Critical" ? C.danger : C.warn}22` }}>{alert.risk.toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {alert.signals.map((s, j) => (
                  <span key={j} style={{ fontSize: 10, color: C.textDim }}>• {s}</span>
                ))}
              </div>
            </div>
            <button style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${alert.risk === "Critical" ? C.danger + "44" : C.warn + "44"}`, borderRadius: 6, color: alert.risk === "Critical" ? C.danger : C.warn, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{alert.action}</button>
          </div>
        ))}
      </div>

      {/* Recent Signups + Tickets */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>RECENT SIGNUPS</span>
          </div>
          {ORGS.slice().sort((a, b) => new Date(b.created) - new Date(a.created)).slice(0, 5).map(o => (
            <div key={o.id} onClick={() => { setSelectedOrg(o); setPage("orgs"); }} style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: C.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontFamily: F, fontWeight: 700, color: C.accent }}>{o.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{o.name}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>{o.email}</div>
              </div>
              <Badge text={o.plan} />
              <span style={{ fontSize: 9, color: C.textDim }}>{o.created}</span>
            </div>
          ))}
        </div>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>SUPPORT TICKETS</span>
          </div>
          {TICKETS.map(t => (
            <div key={t.id} style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, fontFamily: F, color: C.textDim }}>{t.id}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{t.subject}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>{t.org} · {t.created}</div>
              </div>
              <Badge text={t.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- AGENCIES ----
  const renderAgencies = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Active Agencies" value={AGENCIES.filter(a => a.status === "Active").length} icon="🏛️" color={C.green} />
        <StatCard label="Agency MRR" value={`$${AGENCIES.reduce((s, a) => s + a.platformFee + a.workspaceFees, 0).toLocaleString()}`} icon="💵" sub="Platform + workspace fees" />
        <StatCard label="Agency Clients" value={AGENCIES.reduce((s, a) => s + a.clients, 0)} icon="🏢" sub={`across ${AGENCIES.length} agencies`} />
        <StatCard label="Agency Credit Pools" value={AGENCIES.reduce((s, a) => s + a.creditPool, 0).toLocaleString()} icon="🪙" sub={`${Math.round((AGENCIES.reduce((s, a) => s + a.creditPoolUsed, 0) / AGENCIES.reduce((s, a) => s + a.creditPool, 0)) * 100)}% consumed`} />
      </div>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.8fr 1fr 1fr 0.8fr 0.8fr", padding: "10px 18px", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
          {["Agency", "Owner", "Status", "Plan", "Clients", "Revenue", "Credit Pool", ""].map(h => (
            <span key={h} style={{ fontSize: 9, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.04em" }}>{h.toUpperCase()}</span>
          ))}
        </div>
        {AGENCIES.map(a => (
          <div key={a.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 0.8fr 1fr 1fr 0.8fr 0.8fr", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{a.domain || "No custom domain"}</div>
            </div>
            <div style={{ fontSize: 11 }}>{a.owner}</div>
            <Badge text={a.status} />
            <Badge text="agency_pro" />
            <div>
              <span style={{ fontSize: 12, fontFamily: F, fontWeight: 600 }}>{a.clients}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>/{a.clientSlots}</span>
            </div>
            <div>
              <div style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: C.green }}>${(a.platformFee + a.workspaceFees).toLocaleString()}/mo</div>
              <div style={{ fontSize: 9, color: C.textDim }}>${a.platformFee} plan + ${a.workspaceFees} workspaces</div>
            </div>
            <div>
              <div style={{ fontSize: 11 }}>{a.creditPoolUsed.toLocaleString()}/{a.creditPool.toLocaleString()}</div>
              <div style={{ height: 3, borderRadius: 2, background: C.bg, marginTop: 2, width: 60 }}>
                <div style={{ width: `${(a.creditPoolUsed / a.creditPool) * 100}%`, height: "100%", borderRadius: 2, background: a.creditPoolUsed / a.creditPool > 0.8 ? C.warn : "#2dd4a8" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.accent}33`, borderRadius: 4, color: C.accent, fontFamily: F, fontSize: 8, cursor: "pointer" }}>View</button>
              <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Impersonate</button>
            </div>
          </div>
        ))}
      </div>
      {/* Agency economics breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>AGENCY ECONOMICS</div>
          {AGENCIES.map(a => (
            <div key={a.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</span>
                <span style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: C.green }}>${(a.platformFee + a.workspaceFees).toLocaleString()}/mo</span>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 9, color: C.textDim }}>Platform fee: ${a.platformFee}</span>
                <span style={{ fontSize: 9, color: C.textDim }}>Workspace fees: ${a.workspaceFees} ({a.clients} × $97)</span>
                <span style={{ fontSize: 9, color: C.textDim }}>Their MRR from clients: ${a.mrr.toLocaleString()}</span>
                <span style={{ fontSize: 9, color: "#2dd4a8" }}>Their margin: {Math.round(((a.mrr - a.platformFee - a.workspaceFees) / a.mrr) * 100)}%</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>AGENCY CLIENT WORKSPACES</div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 10 }}>All orgs owned by agencies. Platform can view and impersonate.</div>
          {ORGS.filter(o => o.agency_id).map(o => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 600, flex: 1 }}>{o.name}</span>
              <span style={{ fontSize: 9, color: "#2dd4a8" }}>{o.agency}</span>
              <Badge text={o.plan.split(" ")[0].toLowerCase()} />
              <span style={{ fontSize: 10, color: C.textDim }}>{o.lastActive}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- ORGANISATIONS ----
  const renderOrgs = () => {
    if (selectedOrg) return renderOrgDetail(selectedOrg);
    const statuses = ["All", "Active", "Trialling", "Churned", "Suspended"];
    const filtered = ORGS.filter(o => (orgFilter === "All" || o.status === orgFilter) && (orgSearch === "" || o.name.toLowerCase().includes(orgSearch.toLowerCase()) || o.email.toLowerCase().includes(orgSearch.toLowerCase())));
    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <input value={orgSearch} onChange={e => setOrgSearch(e.target.value)} placeholder="Search orgs..." style={{ ...inputStyle, width: 260 }} />
          {statuses.map(s => (
            <button key={s} onClick={() => setOrgFilter(s)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${orgFilter === s ? C.accent + "55" : C.border}`, background: orgFilter === s ? C.accentBg : "transparent", color: orgFilter === s ? C.accent : C.textMuted, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>{s}</button>
          ))}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: C.textDim }}>{filtered.length} organisations</span>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr 1fr 0.8fr 0.8fr 0.8fr", padding: "10px 18px", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            {["Organisation", "Plan", "Status", "Health", "Credits", "MRR", "Seats", "Last Active"].map(h => (
              <span key={h} style={{ fontSize: 9, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>{h.toUpperCase()}</span>
            ))}
          </div>
          {filtered.map(o => (
            <div key={o.id} onClick={() => { setSelectedOrg(o); setDetailTab("overview"); }} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 0.8fr 1fr 0.8fr 0.8fr 0.8fr", padding: "12px 18px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", alignItems: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.name}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>{o.email}{o.agency_id && <span style={{ marginLeft: 6, color: "#2dd4a8" }}>via {o.agency}</span>}</div>
              </div>
              <Badge text={o.plan} />
              <Badge text={o.status} />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${o.health > 70 ? C.green : o.health > 40 ? C.warn : C.danger}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 9, fontFamily: F, fontWeight: 700, color: o.health > 70 ? C.green : o.health > 40 ? C.warn : C.danger }}>{o.health}</span>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: C.text }}>{o.creditsUsed.toLocaleString()}</span>
                <span style={{ fontSize: 10, color: C.textDim }}>/{o.creditsTotal.toLocaleString()}</span>
                <div style={{ height: 3, borderRadius: 2, background: C.bg, marginTop: 4, width: 60 }}>
                  <div style={{ width: `${(o.creditsUsed / o.creditsTotal) * 100}%`, height: "100%", borderRadius: 2, background: o.creditsUsed / o.creditsTotal > 0.9 ? C.danger : o.creditsUsed / o.creditsTotal > 0.7 ? C.warn : C.accent }} />
                </div>
              </div>
              <span style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: o.mrr > 0 ? C.green : C.textDim }}>${o.mrr}</span>
              <span style={{ fontSize: 12, color: C.textMuted }}>{o.seats}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>{o.lastActive}</span>
            </div>
          ))}
        </div>

        {/* Bulk Operations */}
        <div style={{ marginTop: 16, padding: "18px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>BULK OPERATIONS</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Add Bonus Credits", desc: "Give credits to a segment", icon: "🪙" },
              { label: "Enable Beta Feature", desc: "Toggle feature for a plan tier", icon: "🧪" },
              { label: "Send Email Blast", desc: "Targeted email to segment", icon: "📧" },
              { label: "Extend All Trials", desc: "Add days to active trials", icon: "⏱️" },
              { label: "Export All Orgs", desc: "Download CSV of org data", icon: "⬇️" },
            ].map((op, i) => (
              <button key={i} style={{ padding: "10px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", textAlign: "left", flex: "1 1 180px", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent + "44"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
                <span style={{ fontSize: 16 }}>{op.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{op.label}</div>
                  <div style={{ fontSize: 9, color: C.textDim }}>{op.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---- ORG DETAIL ----
  const renderOrgDetail = (org) => {
    return (
      <div>
        <button onClick={() => setSelectedOrg(null)} style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>← Back to Organisations</button>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: C.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontFamily: F, fontWeight: 700, color: C.accent }}>{org.name[0]}</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: F }}>{org.name}</div>
            <div style={{ fontSize: 12, color: C.textDim }}>{org.owner} · {org.email}</div>
          </div>
          <div style={{ flex: 1 }} />
          <Badge text={org.status} />
          <Badge text={org.plan} />
          <button style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${C.warn}44`, borderRadius: 6, color: C.warn, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Impersonate</button>
          <button style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${C.danger}44`, borderRadius: 6, color: C.danger, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Suspend</button>
        </div>
        {org.agency_id && (
          <div style={{ padding: "10px 16px", background: "#2dd4a808", border: "1px solid #2dd4a822", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12 }}>🏛️</span>
            <span style={{ fontSize: 11, color: "#2dd4a8" }}>Managed by <strong>{org.agency}</strong></span>
            <span style={{ fontSize: 10, color: C.textDim }}>·</span>
            <span style={{ fontSize: 10, color: C.textDim }}>Agency-owned workspace — billing flows through agency, not direct</span>
            <div style={{ flex: 1 }} />
            <button onClick={() => { setSelectedOrg(null); setPage("agencies"); }} style={{ padding: "4px 10px", background: "transparent", border: "1px solid #2dd4a833", borderRadius: 6, color: "#2dd4a8", fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>View Agency →</button>
          </div>
        )}

        {/* Detail Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          {["overview", "credits", "features", "activity", "notes", "danger"].map(t => (
            <button key={t} onClick={() => setDetailTab(t)} style={{ padding: "10px 18px", background: "transparent", border: "none", borderBottom: detailTab === t ? `2px solid ${C.accent}` : "2px solid transparent", color: detailTab === t ? C.accent : C.textMuted, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
          ))}
        </div>

        {detailTab === "overview" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <StatCard label="Health Score" value={org.health} icon={org.health > 70 ? "💚" : org.health > 40 ? "🟡" : "🔴"} color={org.health > 70 ? C.green : org.health > 40 ? C.warn : C.danger} sub={org.health > 70 ? "Healthy" : org.health > 40 ? "At risk" : "Critical"} />
              <StatCard label="MRR" value={`$${org.mrr}`} icon="💵" color={org.mrr > 0 ? C.green : C.textDim} />
              <StatCard label="Seats" value={org.seats} icon="👤" />
              <StatCard label="Projects" value={org.projects} icon="📋" />
              <StatCard label="Total Leads" value={org.leads.toLocaleString()} icon="⚡" />
              <StatCard label="Integrations" value={org.integrations} icon="🔗" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>SUBSCRIPTION</div>
                {[["Plan", org.plan], ["Status", org.status], ["Created", org.created], ["Last Active", org.lastActive], ["Billing Email", org.email]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ fontSize: 12, color: C.textDim }}>{k}</span>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  <button style={{ padding: "6px 12px", background: C.accentBg, border: `1px solid ${C.accent}22`, borderRadius: 6, color: C.accent, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Change Plan</button>
                  <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Apply Discount</button>
                  <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Extend Trial</button>
                </div>
              </div>
              <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>TEAM MEMBERS</div>
                {[
                  { name: org.owner, role: "Owner", active: org.lastActive },
                  { name: "Team Member 2", role: "Admin", active: "1 day ago" },
                  { name: "Team Member 3", role: "Member", active: "3 days ago" },
                ].slice(0, parseInt(org.seats[0]) || 1).map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: C.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: F, fontWeight: 700, color: C.accent }}>{m.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{m.name}</div>
                    </div>
                    <Badge text={m.role} />
                    <span style={{ fontSize: 9, color: C.textDim }}>{m.active}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {detailTab === "credits" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              <StatCard label="Credits Used" value={org.creditsUsed.toLocaleString()} icon="🪙" sub={`of ${org.creditsTotal.toLocaleString()} allocated`} />
              <StatCard label="Usage Rate" value={`${Math.round((org.creditsUsed / org.creditsTotal) * 100)}%`} icon="📊" color={org.creditsUsed / org.creditsTotal > 0.9 ? C.danger : C.accent} />
              <StatCard label="Days Remaining" value="14" icon="📅" sub="in current billing cycle" />
            </div>
            <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>MANUAL CREDIT ADJUSTMENT</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 4 }}>AMOUNT (positive to add, negative to remove)</div>
                  <input value={creditAdjustAmount} onChange={e => setCreditAdjustAmount(e.target.value)} placeholder="e.g. 500 or -200" type="number" style={inputStyle} />
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 4 }}>REASON</div>
                  <input value={creditAdjustNote} onChange={e => setCreditAdjustNote(e.target.value)} placeholder="e.g. Goodwill credit for service interruption" style={inputStyle} />
                </div>
                <button style={{ padding: "8px 16px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", height: 34 }}>Apply</button>
              </div>
            </div>
            <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>CREDIT HISTORY</div>
              {[
                { action: "Lead Discovery — 150 leads", credits: -150, date: "Feb 14, 10:34am" },
                { action: "AI Audit Analysis — Hodge Insurance", credits: -25, date: "Feb 13, 3:15pm" },
                { action: "Email Verification — 89 emails", credits: -89, date: "Feb 13, 11:20am" },
                { action: "Monthly Allocation", credits: 5000, date: "Feb 1, 12:00am" },
                { action: "Bonus — Beta tester reward", credits: 500, date: "Jan 28, 9:00am" },
              ].map((h, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ flex: 1, fontSize: 12 }}>{h.action}</span>
                  <span style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: h.credits > 0 ? C.green : C.danger, marginRight: 16 }}>{h.credits > 0 ? "+" : ""}{h.credits}</span>
                  <span style={{ fontSize: 10, color: C.textDim }}>{h.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {detailTab === "features" && (
          <div>
            <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 16 }}>FEATURE TOGGLES — {org.name.toUpperCase()}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Override plan defaults. Toggling a feature ON gives this org access regardless of their plan. Toggling OFF removes access even if their plan includes it.</div>
              {FEATURE_FLAGS.map(ff => {
                const includedInPlan = ff.plans.includes(org.plan);
                const isBeta = ff.key.startsWith("beta_");
                return (
                  <div key={ff.key} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${C.border}`, gap: 12 }}>
                    <div onClick={e => { const toggle = e.currentTarget; const dot = toggle.querySelector("div"); if (toggle.dataset.on === "true") { toggle.dataset.on = "false"; toggle.style.background = C.border; dot.style.transform = "translateX(0)"; } else { toggle.dataset.on = "true"; toggle.style.background = C.accent; dot.style.transform = "translateX(14px)"; }}} data-on={includedInPlan ? "true" : "false"} style={{ width: 28, height: 14, borderRadius: 7, background: includedInPlan ? C.accent : C.border, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFF", position: "absolute", top: 2, left: 2, transition: "transform 0.2s", transform: includedInPlan ? "translateX(14px)" : "translateX(0)" }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ff.label}</div>
                      <div style={{ fontSize: 11, color: C.textDim }}>{ff.desc}</div>
                    </div>
                    {isBeta && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 8, fontFamily: F, fontWeight: 600, background: C.warn + "15", color: C.warn, border: `1px solid ${C.warn}22` }}>BETA</span>}
                    {!isBeta && <span style={{ fontSize: 9, color: C.textDim }}>{ff.plans.length > 0 ? `Included in: ${ff.plans.join(", ")}` : "Not in any plan"}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {detailTab === "activity" && (
          <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>RECENT ACTIVITY</div>
            {[
              { action: "Ran lead discovery", detail: "Insurance vertical — 150 leads found", time: "2 hrs ago", icon: "⚡" },
              { action: "Generated AI audit deck", detail: "Hodge Insurance — 24 slides", time: "5 hrs ago", icon: "📊" },
              { action: "Created custom skill", detail: "Competitor Pricing Analyst", time: "1 day ago", icon: "🧩" },
              { action: "Connected integration", detail: "HeyReach — LinkedIn outreach", time: "1 day ago", icon: "🔗" },
              { action: "Invited team member", detail: "sarah@apexadvisory.io — Admin role", time: "2 days ago", icon: "👤" },
              { action: "Upgraded plan", detail: "Starter → Growth", time: "5 days ago", icon: "💳" },
              { action: "Created project", detail: "Hodge Insurance Strategy", time: "7 days ago", icon: "📋" },
              { action: "Completed onboarding", detail: "Brand Voice + Buyer Persona submitted", time: "8 days ago", icon: "✅" },
            ].map((a, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, width: 28, textAlign: "center" }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{a.action}</div>
                  <div style={{ fontSize: 11, color: C.textDim }}>{a.detail}</div>
                </div>
                <span style={{ fontSize: 9, color: C.textDim }}>{a.time}</span>
              </div>
            ))}
          </div>
        )}

        {detailTab === "notes" && (
          <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>INTERNAL NOTES</div>
            <textarea placeholder="Add internal notes about this organisation..." rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6, marginBottom: 12 }} />
            <button style={{ padding: "8px 16px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Save Note</button>
            <div style={{ marginTop: 16, padding: "12px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600 }}>Andrew Dunn</span>
                <span style={{ fontSize: 9, color: C.textDim }}>Feb 12, 2026</span>
              </div>
              <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>Spoke with {org.owner} about upgrading to Scale. Interested in custom skills and white-label reports. Follow up next week with pricing proposal.</div>
            </div>
          </div>
        )}

        {detailTab === "danger" && (
          <div>
            <div style={{ padding: "16px 20px", background: C.dangerBg, border: `1px solid ${C.danger}22`, borderRadius: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.danger, letterSpacing: "0.06em", marginBottom: 4 }}>⚠️ DANGER ZONE</div>
              <div style={{ fontSize: 11, color: C.textDim }}>These actions are destructive and may not be reversible. Proceed with caution.</div>
            </div>
            {[
              { label: "Export Organisation Data", desc: "Download all org data as JSON: projects, leads, campaigns, settings, team info. Useful before deletion or for data portability requests.", button: "Export Data", color: C.accent, icon: "⬇️" },
              { label: "Cancel Subscription", desc: "Immediately cancels billing. Org retains read-only access until end of current billing cycle. Credits are not refunded.", button: "Cancel Subscription", color: C.warn, icon: "💳" },
              { label: "Reset Organisation", desc: "Deletes all projects, leads, campaigns, and generated content. Keeps account, plan, and team intact. Cannot be undone.", button: "Reset All Data", color: C.warn, icon: "🔄" },
              { label: "Transfer Ownership", desc: "Move the Owner role to a different team member. Current owner becomes Admin. Requires the target user to already be a member.", button: "Transfer", color: C.accent, icon: "👤" },
              { label: "Delete Organisation", desc: "Permanently removes this organisation, all users, all data, all projects. Triggers GDPR data deletion. This cannot be undone.", button: "Delete Organisation", color: C.danger, icon: "🗑️" },
            ].map((action, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 18px", background: C.surface, border: `1px solid ${action.color === C.danger ? C.danger + "22" : C.border}`, borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{action.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{action.label}</div>
                  <div style={{ fontSize: 11, color: C.textDim, lineHeight: 1.4 }}>{action.desc}</div>
                </div>
                <button style={{ padding: "8px 16px", background: action.color === C.danger ? C.danger + "15" : "transparent", border: `1px solid ${action.color}44`, borderRadius: 6, color: action.color, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{action.button}</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ---- CREDITS ----
  const renderCredits = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Credits Consumed Today" value="2,140" icon="🪙" />
        <StatCard label="This Week" value="12,800" icon="📊" />
        <StatCard label="This Month" value="14,355" icon="📅" sub="of 21,500 total allocated" />
        <StatCard label="Your Cost" value="$18.42" icon="💵" sub="Today's API spend" />
      </div>

      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>CREDIT COST CONFIGURATION</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Adjust how many credits each action costs. Changes apply immediately to all orgs.</div>
          </div>
          <button style={{ padding: "5px 12px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>+ Add Action</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 0.3fr", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          {["Action", "Credits", "Unit", "Your Cost", "Margin", ""].map(h => (
            <span key={h} style={{ fontSize: 9, fontFamily: F, fontWeight: 600, color: C.textDim }}>{h.toUpperCase()}</span>
          ))}
        </div>
        {CREDIT_COSTS.map((cc, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 0.3fr", padding: "10px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{cc.action}</span>
            <div><input defaultValue={cc.credits} style={{ width: 50, padding: "4px 8px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, fontFamily: F, color: C.accent, textAlign: "center", outline: "none" }} /></div>
            <span style={{ fontSize: 11, color: C.textDim }}>{cc.unit}</span>
            <span style={{ fontSize: 11, color: C.textDim }}>{cc.cost}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.green }}>{cc.margin}</span>
            <button style={{ padding: "3px 6px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer", justifySelf: "center" }}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>TOP CREDIT CONSUMERS</div>
        {ORGS.filter(o => o.creditsUsed > 0).sort((a, b) => b.creditsUsed - a.creditsUsed).slice(0, 5).map(o => (
          <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{o.name}</span>
            <Badge text={o.plan} />
            <div style={{ width: 120 }}>
              <div style={{ height: 4, borderRadius: 2, background: C.bg }}>
                <div style={{ width: `${(o.creditsUsed / o.creditsTotal) * 100}%`, height: "100%", borderRadius: 2, background: o.creditsUsed / o.creditsTotal > 0.9 ? C.danger : C.accent }} />
              </div>
            </div>
            <span style={{ fontSize: 11, fontFamily: F, fontWeight: 600, width: 80, textAlign: "right" }}>{o.creditsUsed.toLocaleString()}/{o.creditsTotal.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- LEAD GEN CONFIG ----
  const renderLeadGen = () => {
    const VALIDATION_PROVIDERS = [
      { name: "MillionVerifier", status: "Healthy", priority: 1, calls: "8,200", errorRate: "0.1%", avgLatency: "0.8s", bounceRate: "2.1%" },
      { name: "ZeroBounce", status: "Healthy", priority: 2, calls: "3,400", errorRate: "0.3%", avgLatency: "1.4s", bounceRate: "2.4%" },
      { name: "NeverBounce", status: "Healthy", priority: 3, calls: "1,200", errorRate: "0.2%", avgLatency: "1.1s", bounceRate: "2.8%" },
      { name: "Reoon", status: "Degraded", priority: 4, calls: "600", errorRate: "1.8%", avgLatency: "2.9s", bounceRate: "3.2%" },
    ];
    const makeWaterfall = (title, desc, providers, showBounce, waterfallKey) => (
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>{title}</div>
          <button onClick={() => setShowAddProvider(showAddProvider === waterfallKey ? null : waterfallKey)} style={{ padding: "5px 12px", background: showAddProvider === waterfallKey ? C.danger : C.accent, color: showAddProvider === waterfallKey ? "#FFF" : C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>{showAddProvider === waterfallKey ? "✕ Cancel" : "+ Add Provider"}</button>
        </div>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14 }}>{desc}</div>
        {showAddProvider === waterfallKey && (
          <div style={{ padding: "14px 16px", background: C.accentBg, border: `1px solid ${C.accent}22`, borderRadius: 8, marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontFamily: F, fontWeight: 600, color: C.accent, marginBottom: 8 }}>ADD NEW PROVIDER</div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>PROVIDER NAME</div><input value={newProviderName} onChange={e => setNewProviderName(e.target.value)} placeholder="e.g. Clearout" style={inputStyle} /></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>API KEY</div><input value={newProviderKey} onChange={e => setNewProviderKey(e.target.value)} placeholder="sk-..." type="password" style={inputStyle} /></div>
              <div style={{ width: 100 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>PRIORITY</div><select style={{ ...inputStyle, padding: "8px 8px" }}><option>Last</option><option>#1</option><option>#2</option><option>#3</option></select></div>
              <button style={{ padding: "8px 16px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer", height: 34, whiteSpace: "nowrap" }}>Add</button>
            </div>
          </div>
        )}
        {providers.map((p, i) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontFamily: F, fontWeight: 700, color: C.textDim, width: 20 }}>#{i + 1}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
                <Badge text={p.status} />
              </div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>{p.type || (showBounce ? "Email Validation" : "Email Enrichment")}</div>
            </div>
            <div style={{ textAlign: "center", marginRight: 12 }}>
              <div style={{ fontSize: 12, fontFamily: F, fontWeight: 600 }}>{p.calls}</div>
              <div style={{ fontSize: 8, color: C.textDim }}>CALLS/MO</div>
            </div>
            <div style={{ textAlign: "center", marginRight: 12 }}>
              <div style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: parseFloat(p.errorRate) > 1 ? C.warn : C.green }}>{p.errorRate}</div>
              <div style={{ fontSize: 8, color: C.textDim }}>ERROR</div>
            </div>
            {showBounce && <div style={{ textAlign: "center", marginRight: 12 }}>
              <div style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: parseFloat(p.bounceRate) > 3 ? C.warn : C.green }}>{p.bounceRate}</div>
              <div style={{ fontSize: 8, color: C.textDim }}>BOUNCE</div>
            </div>}
            <div style={{ textAlign: "center", marginRight: 8 }}>
              <div style={{ fontSize: 12, fontFamily: F, fontWeight: 600 }}>{p.avgLatency}</div>
              <div style={{ fontSize: 8, color: C.textDim }}>LATENCY</div>
            </div>
            <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.accent}33`, borderRadius: 4, color: C.accent, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Test</button>
            <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Edit</button>
            <div onClick={e => { const el = e.currentTarget; el.dataset.enabled = el.dataset.enabled === "true" ? "false" : "true"; const dot = el.querySelector("div"); if (el.dataset.enabled === "true") { el.style.background = C.accent; dot.style.transform = "translateX(14px)"; } else { el.style.background = C.border; dot.style.transform = "translateX(0)"; }}} data-enabled="true" style={{ width: 28, height: 14, borderRadius: 7, background: C.accent, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFF", position: "absolute", top: 2, left: 2, transition: "transform 0.2s", transform: "translateX(14px)" }} />
            </div>
            <button style={{ padding: "4px 6px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>
    );
    return (
      <div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <StatCard label="Leads Enriched (MTD)" value="4,820" icon="⚡" />
          <StatCard label="Emails Validated (MTD)" value="4,340" icon="✅" sub="98.2% deliverable" color={C.green} />
          <StatCard label="Enrichment Cost (MTD)" value="$57.84" icon="💵" />
          <StatCard label="Validation Cost (MTD)" value="$34.72" icon="💵" />
        </div>
        {makeWaterfall(
          "WATERFALL 1 — EMAIL ENRICHMENT",
          "Finds email addresses from name + company. Tries Provider 1 first, falls back to Provider 2 if no result, etc.",
          PROVIDERS.filter(p => p.type === "Email Enrichment"),
          false, "enrichment"
        )}
        {makeWaterfall(
          "WATERFALL 2 — EMAIL VALIDATION",
          "Verifies found emails are real and deliverable before outreach. Protects sender reputation.",
          VALIDATION_PROVIDERS,
          true, "validation"
        )}
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>OUTREACH PLATFORM CONNECTIONS</div>
            <button onClick={() => setShowAddProvider(showAddProvider === "outreach" ? null : "outreach")} style={{ padding: "5px 12px", background: showAddProvider === "outreach" ? C.danger : C.accent, color: showAddProvider === "outreach" ? "#FFF" : C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>{showAddProvider === "outreach" ? "✕ Cancel" : "+ Add Platform"}</button>
          </div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14 }}>Email and LinkedIn outreach platforms. These receive validated leads from the pipeline.</div>
          {showAddProvider === "outreach" && (
            <div style={{ padding: "14px 16px", background: C.accentBg, border: `1px solid ${C.accent}22`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>PLATFORM NAME</div><input placeholder="e.g. Lemlist" style={inputStyle} /></div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>TYPE</div><select style={{ ...inputStyle, padding: "8px 8px" }}><option>Email Outreach</option><option>LinkedIn Outreach</option></select></div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>API KEY</div><input placeholder="sk-..." type="password" style={inputStyle} /></div>
                <button style={{ padding: "8px 16px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer", height: 34 }}>Add</button>
              </div>
            </div>
          )}
          {PROVIDERS.filter(p => p.type !== "Email Enrichment" && p.type !== "AI Engine").map((p, i) => (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 4px ${C.green}66` }} />
              <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 11, color: C.textDim }}>{p.type}</span>
              <span style={{ fontSize: 11, fontFamily: F }}>{p.calls} calls/mo</span>
              <Badge text={p.status} />
              <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Edit</button>
              <button style={{ padding: "4px 6px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>✕</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---- AI & PROMPTS ----
  const renderAI = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Tokens Today" value="937K" icon="🧠" />
        <StatCard label="AI Cost Today" value="$12.36" icon="💵" sub="$8.91 Sonnet · $2.01 Haiku · $1.44 Opus" />
        <StatCard label="AI Cost MTD" value="$186.40" icon="📊" sub="Budget: $300/mo" />
        <StatCard label="Avg Response Time" value="2.4s" icon="⏱️" />
      </div>

      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>SYSTEM PROMPTS & MODEL SELECTION</div>
          <button style={{ padding: "5px 12px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>+ Add Prompt</button>
        </div>
        {AI_PROMPTS.map(p => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Last edited: {p.lastEdit}</div>
            </div>
            <div style={{ padding: "4px 10px", borderRadius: 4, background: C.bg, border: `1px solid ${C.border}` }}>
              <select defaultValue={p.model} style={{ background: "transparent", border: "none", color: C.accent, fontFamily: F, fontSize: 9, fontWeight: 600, outline: "none", cursor: "pointer" }}>
                <option value="claude-sonnet-4-5-20250929">Sonnet 4.5</option>
                <option value="claude-haiku-4-5-20251001">Haiku 4.5</option>
                <option value="claude-opus-4-6">Opus 4.6</option>
              </select>
            </div>
            <div style={{ textAlign: "right", minWidth: 70 }}>
              <div style={{ fontSize: 11, fontFamily: F, fontWeight: 600 }}>{p.tokensToday}</div>
              <div style={{ fontSize: 9, color: C.textDim }}>tokens today</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 60 }}>
              <div style={{ fontSize: 11, fontFamily: F, fontWeight: 600, color: C.warn }}>{p.costToday}</div>
              <div style={{ fontSize: 9, color: C.textDim }}>cost today</div>
            </div>
            <button style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${C.accent}33`, borderRadius: 6, color: C.accent, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Test</button>
            <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Edit</button>
            <button style={{ padding: "6px 8px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 6, color: C.danger, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- SYSTEM HEALTH ----
  const renderSystem = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Uptime (30d)" value="99.94%" icon="🖥️" color={C.green} />
        <StatCard label="Avg API Response" value="124ms" icon="⏱️" sub="P95: 340ms" />
        <StatCard label="DB Queries/sec" value="847" icon="💾" />
        <StatCard label="Error Rate (24h)" value="0.03%" icon="⚠️" color={C.green} />
      </div>

      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 16 }}>SERVICE STATUS</div>
        {[
          { name: "Web Application", status: "Operational", uptime: "99.99%" },
          { name: "API Gateway", status: "Operational", uptime: "99.97%" },
          { name: "Database (Supabase)", status: "Operational", uptime: "99.98%" },
          { name: "Claude API", status: "Operational", uptime: "99.92%" },
          { name: "Background Workers", status: "Operational", uptime: "99.95%" },
          { name: "Email Delivery (Resend)", status: "Operational", uptime: "99.99%" },
          { name: "File Storage", status: "Operational", uptime: "100%" },
        ].map(s => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, gap: 10 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 4px ${C.green}88` }} />
            <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.name}</span>
            <span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{s.status}</span>
            <span style={{ fontSize: 10, color: C.textDim, fontFamily: F, width: 60, textAlign: "right" }}>{s.uptime}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>BACKGROUND QUEUES</div>
        {[
          { name: "Enrichment Queue", pending: 34, processing: 8, failed: 0 },
          { name: "Email Send Queue", pending: 128, processing: 15, failed: 2 },
          { name: "AI Analysis Queue", pending: 3, processing: 1, failed: 0 },
          { name: "Webhook Delivery", pending: 12, processing: 4, failed: 1 },
        ].map(q => (
          <div key={q.name} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, gap: 16 }}>
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{q.name}</span>
            <span style={{ fontSize: 10, color: C.warn }}>{q.pending} pending</span>
            <span style={{ fontSize: 10, color: C.accent }}>{q.processing} processing</span>
            <span style={{ fontSize: 10, color: q.failed > 0 ? C.danger : C.textDim }}>{q.failed} failed</span>
          </div>
        ))}
      </div>

      {/* Recent Error Log */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>RECENT ERRORS — LAST 24 HOURS</div>
        {[
          { time: "14:22:08", level: "ERROR", service: "Enrichment Worker", message: "Wiza API timeout after 10s — fallback to Icypeas", org: "DataPulse Advisory", trace: "enrichment/waterfall.ts:142" },
          { time: "13:45:31", level: "WARN", service: "Email Delivery", message: "Resend rate limit hit (429) — queued for retry in 60s", org: "NexGen Consulting", trace: "campaigns/email-sender.ts:89" },
          { time: "11:12:44", level: "ERROR", service: "AI Analysis", message: "Claude API 529 overloaded — retry 2/3 succeeded", org: "Dunn Consulting", trace: "ai/claude-client.ts:201" },
          { time: "09:33:17", level: "WARN", service: "Webhook Delivery", message: "Webhook to https://hooks.zapier.com/... returned 502 — retry queued", org: "Apex Advisory", trace: "integrations/webhooks.ts:67" },
          { time: "08:01:52", level: "ERROR", service: "Auth", message: "Magic link expired for collaborator invite — user shown re-request page", org: "Perry Salvagne Consulting", trace: "auth/magic-link.ts:34" },
          { time: "02:15:09", level: "WARN", service: "Background Jobs", message: "Weekly digest generation took 45s (threshold: 30s) — performance degradation", org: "System", trace: "jobs/digest-worker.ts:18" },
        ].map((err, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 9, fontFamily: F, color: C.textDim, width: 55, flexShrink: 0 }}>{err.time}</span>
            <span style={{ fontSize: 8, fontFamily: F, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: err.level === "ERROR" ? C.danger + "15" : C.warn + "15", color: err.level === "ERROR" ? C.danger : C.warn, flexShrink: 0 }}>{err.level}</span>
            <span style={{ fontSize: 10, fontFamily: F, color: C.accent, width: 110, flexShrink: 0 }}>{err.service}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: C.text }}>{err.message}</div>
              <div style={{ fontSize: 9, color: C.textDim, marginTop: 2 }}>{err.org} · {err.trace}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  const renderKnowledge = () => {
    const KBS = [
      { id: "kb1", name: "Audit & Strategy Analysis", status: "Active", docs: 24, lastSync: "2 hrs ago", size: "4.2 MB", queries: 312, avgRetrieval: "0.28s", usedBy: ["Audit Analysis Engine", "AI Council", "Proposal Builder"], desc: "Core consulting methodology, VALUE scoring framework, ROI calculation models, McKinsey-style deck templates, industry benchmarks." },
      { id: "kb2", name: "Sales & Outreach", status: "Active", docs: 18, lastSync: "6 hrs ago", size: "2.8 MB", queries: 248, avgRetrieval: "0.22s", usedBy: ["Lead Personalisation", "Script Generator", "Messaging Workshop"], desc: "Cold email frameworks, objection handling playbooks, discovery call scripts, follow-up sequences, ICP targeting guides." },
      { id: "kb3", name: "Video & Content", status: "Active", docs: 31, lastSync: "1 day ago", size: "5.1 MB", queries: 156, avgRetrieval: "0.34s", usedBy: ["Content Engine", "Script Generator"], desc: "Hook frameworks, storytelling structures, LinkedIn content patterns, video script templates, engagement formulas." },
      { id: "kb4", name: "Platform Documentation", status: "Active", docs: 42, lastSync: "3 hrs ago", size: "3.6 MB", queries: 89, avgRetrieval: "0.18s", usedBy: ["AI Assistant", "Support Bot"], desc: "Pipeline feature docs, API reference, onboarding guides, troubleshooting FAQ, integration setup guides." },
      { id: "kb5", name: "Industry Knowledge — Insurance", status: "Active", docs: 15, lastSync: "3 days ago", size: "1.9 MB", queries: 34, avgRetrieval: "0.31s", usedBy: ["AI Council", "Niche Researcher"], desc: "Insurance industry AI use cases, regulatory considerations, Hodge Insurance case study, competitor landscape." },
      { id: "kb6", name: "Process Mapping", status: "Active", docs: 8, lastSync: "5 days ago", size: "1.1 MB", queries: 8, avgRetrieval: "0.15s", usedBy: ["Process Map Generator"], desc: "BPMN notation guide, process categorisation taxonomy, common business process templates, optimisation frameworks." },
    ];
    return (
      <div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Knowledge Bases" value={KBS.length} icon="📚" />
          <StatCard label="Total Documents" value={KBS.reduce((s, k) => s + k.docs, 0)} icon="📄" />
          <StatCard label="Total Size" value="18.7 MB" icon="💾" />
          <StatCard label="RAG Queries Today" value="847" icon="🔍" sub="Avg retrieval: 0.3s" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: C.textDim }}>Knowledge bases power AI quality across the platform. Customer-uploaded KBs via Custom Solutions use the same RAG pipeline.</div>
          <button style={{ padding: "8px 16px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Create Knowledge Base</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {KBS.map(kb => (
            <div key={kb.id} style={{ padding: "18px 22px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: C.accent + "12", border: `1px solid ${C.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>📚</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{kb.name}</span>
                    <Badge text={kb.status} />
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginBottom: 8 }}>{kb.desc}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {kb.usedBy.map(u => (
                      <span key={u} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: F, background: C.bg, border: `1px solid ${C.border}`, color: C.textDim }}>🧠 {u}</span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 16, fontSize: 10, color: C.textDim }}>
                    <span>📄 {kb.docs} documents</span>
                    <span>💾 {kb.size}</span>
                    <span>🔍 {kb.queries} queries today</span>
                    <span>⚡ {kb.avgRetrieval} avg retrieval</span>
                    <span>🔄 Synced {kb.lastSync}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Upload</button>
                  <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Manage</button>
                  <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Re-sync</button>
                  <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 6, color: C.danger, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, padding: "16px 20px", background: C.surface, border: `1px dashed ${C.accent}33`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 8 }}>CUSTOMER-UPLOADED KNOWLEDGE BASES</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10 }}>When customers create Custom Solutions with RAG, their uploaded documents are stored here. Monitor storage usage and content policy compliance.</div>
          {[
            { org: "Dunn Consulting", kb: "Insurance Case Studies", docs: 8, size: "1.4 MB" },
            { org: "DataPulse Advisory", kb: "Internal SOP Library", docs: 22, size: "3.8 MB" },
            { org: "Apex Advisory", kb: "Client Deliverables Archive", docs: 14, size: "2.1 MB" },
          ].map((ckb, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{ckb.org}</span>
              <span style={{ fontSize: 11, color: C.textMuted }}>{ckb.kb}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>{ckb.docs} docs · {ckb.size}</span>
              <button style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Review</button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---- USERS ----
  const renderUsers = () => {
    const USERS = [
      { name: "Andrew Dunn", email: "andrew@dunnco.co.uk", org: "Dunn Consulting", role: "Owner", lastActive: "2 hrs ago", created: "2025-10-12", logins: 342 },
      { name: "Sarah Mitchell", email: "sarah@apexadvisory.io", org: "Apex Advisory", role: "Owner", lastActive: "4 hrs ago", created: "2025-11-03", logins: 218 },
      { name: "Perry Salvagne", email: "perry@hodgeins.co.uk", org: "Perry Salvagne Consulting", role: "Owner", lastActive: "1 day ago", created: "2025-12-01", logins: 156 },
      { name: "Marcus Webb", email: "marcus@datapulse.com", org: "DataPulse Advisory", role: "Owner", lastActive: "1 hr ago", created: "2025-09-20", logins: 410 },
      { name: "Emily Rodriguez", email: "emily@nexgenai.co", org: "NexGen Consulting", role: "Owner", lastActive: "6 hrs ago", created: "2025-11-15", logins: 198 },
      { name: "James Chen", email: "james@datapulse.com", org: "DataPulse Advisory", role: "Admin", lastActive: "3 hrs ago", created: "2025-10-15", logins: 267 },
      { name: "Rachel Green", email: "rachel@dunnco.co.uk", org: "Dunn Consulting", role: "Admin", lastActive: "5 hrs ago", created: "2025-11-20", logins: 145 },
      { name: "Mike Thompson", email: "mike@dunnco.co.uk", org: "Dunn Consulting", role: "Member", lastActive: "1 day ago", created: "2026-01-05", logins: 67 },
      { name: "James Patel", email: "james@insuretechpro.com", org: "InsureTech Partners", role: "Owner", lastActive: "3 hrs ago", created: "2026-02-08", logins: 12 },
      { name: "Tom Bradley", email: "tom@autopilotai.com", org: "AutoPilot Advisory", role: "Owner", lastActive: "5 hrs ago", created: "2026-02-10", logins: 8 },
    ];
    return (
      <div>
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <StatCard label="Total Users" value={USERS.length} icon="👤" />
          <StatCard label="Active (7d)" value="8" icon="✅" color={C.green} />
          <StatCard label="Owners" value={USERS.filter(u => u.role === "Owner").length} icon="👑" />
          <StatCard label="Avg Logins/User" value={Math.round(USERS.reduce((s, u) => s + u.logins, 0) / USERS.length)} icon="📊" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button style={{ padding: "7px 16px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Create User Account</button>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1fr 1fr 1fr", padding: "10px 18px", borderBottom: `1px solid ${C.border}`, background: C.bg }}>
            {["User", "Organisation", "Role", "Logins", "Last Active", "Actions"].map(h => (
              <span key={h} style={{ fontSize: 9, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>{h.toUpperCase()}</span>
            ))}
          </div>
          {USERS.map((u, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1.5fr 1fr 1fr 1fr", padding: "11px 18px", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{u.name}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 12, color: C.textMuted }}>{u.org}</span>
              <Badge text={u.role} />
              <span style={{ fontSize: 12, fontFamily: F, color: C.textMuted }}>{u.logins}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>{u.lastActive}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Reset PW</button>
                <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Disable</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ---- BILLING ----
  const renderBilling = () => {
    const directOrgMrr = ORGS.filter(o => !o.agency_id && o.mrr > 0).reduce((s, o) => s + o.mrr, 0);
    const agencyFees = AGENCIES.reduce((s, a) => s + a.platformFee + a.workspaceFees, 0);
    const billingTotal = directOrgMrr + agencyFees;
    const payingOrgs = ORGS.filter(o => o.mrr > 0).length;
    return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total MRR" value={`$${billingTotal.toLocaleString()}`} icon="💵" color={C.green} sub={`$${directOrgMrr.toLocaleString()} direct + $${agencyFees.toLocaleString()} agency`} trend="up" />
        <StatCard label="ARR" value={`$${(billingTotal * 12).toLocaleString()}`} icon="📈" color={C.green} />
        <StatCard label="Avg Revenue / Org" value={`$${Math.round(directOrgMrr / Math.max(ORGS.filter(o => !o.agency_id && o.mrr > 0).length, 1))}`} icon="🏢" sub="Direct clients only" />
        <StatCard label="LTV (estimated)" value={`$${(Math.round(billingTotal / Math.max(payingOrgs, 1)) * 12).toLocaleString()}`} icon="💰" sub="12 month avg retention" />
      </div>
      {/* Agency Revenue Breakdown */}
      <div style={{ padding: "12px 16px", background: "#2dd4a808", border: "1px solid #2dd4a822", borderRadius: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 12 }}>🏛️</span>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: 11, color: "#2dd4a8", fontWeight: 600 }}>Agency Revenue: ${agencyFees.toLocaleString()}/mo</span>
          <span style={{ fontSize: 10, color: C.textDim, marginLeft: 12 }}>{AGENCIES.length} agencies × ($497 platform + $97/workspace)</span>
        </div>
        {AGENCIES.map(a => (
          <div key={a.id} style={{ padding: "4px 10px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#2dd4a8" }}>{a.name}</span>
            <span style={{ fontSize: 9, color: C.textDim, marginLeft: 6 }}>${(a.platformFee + a.workspaceFees).toLocaleString()}/mo</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>DIRECT CLIENT SUBSCRIPTIONS</div>
          {ORGS.filter(o => !o.agency_id && o.mrr > 0).map(o => (
            <div key={o.id} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, gap: 10 }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{o.name}</span>
              <Badge text={o.plan} />
              <span style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: C.green }}>${o.mrr}/mo</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>FAILED PAYMENTS</div>
          {[
            { org: "FinLeap Consulting", amount: "$247", attempts: 3, lastAttempt: "Feb 10", status: "Failed" },
          ].map((fp, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{fp.org}</div>
                <div style={{ fontSize: 10, color: C.textDim }}>{fp.attempts} attempts · Last: {fp.lastAttempt}</div>
              </div>
              <span style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: C.danger }}>{fp.amount}</span>
              <button style={{ padding: "5px 10px", background: C.dangerBg, border: `1px solid ${C.danger}22`, borderRadius: 6, color: C.danger, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Retry</button>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.bg, borderRadius: 6, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, marginBottom: 6 }}>DISCOUNT CODES</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[
                { code: "BETA50", discount: "50% off 3 months", used: 4 },
                { code: "LAUNCH20", discount: "20% off first year", used: 12 },
              ].map(d => (
                <div key={d.code} style={{ padding: "6px 10px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 11, fontFamily: F, fontWeight: 600, color: C.accent }}>{d.code}</span>
                  <div style={{ fontSize: 9, color: C.textDim }}>{d.discount} · Used {d.used}x</div>
                </div>
              ))}
              <button style={{ padding: "6px 12px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 6, color: C.textDim, fontFamily: F, fontSize: 9, cursor: "pointer" }}>+ Add Code</button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Plans Configuration */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>PRICING & PLAN CONFIGURATION</div>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>Edit plan pricing, credit allocations, and included features. Changes apply to new subscriptions immediately. Existing subscribers update at next billing cycle.</div>
          </div>
          <button style={{ padding: "6px 14px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add Plan</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {[
            { name: "Starter", price: 97, annual: 970, credits: 500, seats: 1, projects: 2, features: ["Lead Discovery", "CRM Pipeline", "Email Campaigns", "Basic AI Assistant", "3 Survey Templates"], color: C.textMuted, subs: 1 },
            { name: "Growth", price: 247, annual: 2470, credits: 2000, seats: 3, projects: 5, features: ["Everything in Starter", "AI Council", "LinkedIn Campaigns", "Strategy (Audits)", "Call Analyser", "Solutions Marketplace", "Public API Access", "Implementation Board", "10 Survey Templates"], color: C.accent, subs: 4, popular: true },
            { name: "Scale", price: 497, annual: 4970, credits: 5000, seats: 10, projects: "Unlimited", features: ["Everything in Growth", "Custom Skills", "White-Label Reports", "Priority Support", "Dedicated Onboarding", "Custom Integrations", "Unlimited Survey Templates", "Team Collaboration", "Advanced Analytics"], color: C.purple, subs: 2 },
          ].map(plan => (
            <div key={plan.name} style={{ padding: "18px 18px", background: C.bg, border: `1px solid ${plan.popular ? plan.color + "44" : C.border}`, borderRadius: 10, position: "relative" }}>
              {plan.popular && <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", padding: "2px 10px", background: plan.color, color: C.bg, fontSize: 8, fontFamily: F, fontWeight: 700, borderRadius: 4, letterSpacing: "0.05em" }}>MOST POPULAR</div>}
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: F, color: plan.color }}>{plan.name}</span>
                <span style={{ fontSize: 9, color: C.textDim }}>{plan.subs} active subs</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>MONTHLY PRICE</div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 12, color: C.textDim }}>$</span>
                  <input defaultValue={plan.price} style={{ width: 60, padding: "6px 8px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 16, fontFamily: F, fontWeight: 700, color: C.text, textAlign: "center", outline: "none" }} />
                  <span style={{ fontSize: 10, color: C.textDim }}>/mo</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: C.textDim }}>Annual: $</span>
                  <input defaultValue={plan.annual} style={{ width: 50, padding: "3px 6px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 11, fontFamily: F, color: C.textMuted, textAlign: "center", outline: "none" }} />
                  <span style={{ fontSize: 9, color: C.textDim }}>/yr</span>
                  <span style={{ fontSize: 8, color: C.green, marginLeft: 4 }}>Save {Math.round((1 - plan.annual / (plan.price * 12)) * 100)}%</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>CREDITS / MO</div>
                  <input defaultValue={plan.credits} style={{ width: "100%", padding: "5px 8px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, fontFamily: F, fontWeight: 600, color: C.accent, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>MAX SEATS</div>
                  <input defaultValue={plan.seats} style={{ width: "100%", padding: "5px 8px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 13, fontFamily: F, fontWeight: 600, color: C.text, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>MAX PROJECTS</div>
                <input defaultValue={plan.projects} style={{ width: "100%", padding: "5px 8px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 12, fontFamily: F, color: C.textMuted, textAlign: "center", outline: "none", boxSizing: "border-box" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 6 }}>INCLUDED FEATURES</div>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0" }}>
                    <span style={{ fontSize: 10, color: C.green }}>✓</span>
                    <span style={{ fontSize: 10, color: C.textMuted, flex: 1 }}>{f}</span>
                    <button style={{ padding: "1px 4px", background: "transparent", border: `1px solid ${C.danger}22`, borderRadius: 3, color: C.danger, fontSize: 7, cursor: "pointer", opacity: 0.5 }}>✕</button>
                  </div>
                ))}
                <button style={{ marginTop: 4, padding: "3px 8px", background: "transparent", border: `1px dashed ${C.border}`, borderRadius: 4, color: C.textDim, fontFamily: F, fontSize: 8, cursor: "pointer", width: "100%" }}>+ Add Feature</button>
              </div>

              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ flex: 1, padding: "7px 12px", background: plan.color + "15", border: `1px solid ${plan.color}22`, borderRadius: 6, color: plan.color, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
                {plan.name !== "Scale" && <button style={{ padding: "7px 10px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 6, color: C.danger, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Archive</button>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Credit Economics */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>CREDIT ECONOMICS — REVENUE PER CREDIT</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {[
            { plan: "Starter", price: 97, credits: 500, perCredit: "$0.194", color: C.textMuted },
            { plan: "Growth", price: 247, credits: 2000, perCredit: "$0.124", color: C.accent },
            { plan: "Scale", price: 497, credits: 5000, perCredit: "$0.099", color: C.purple },
          ].map(p => (
            <div key={p.plan} style={{ padding: "12px 14px", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: p.color, marginBottom: 4 }}>{p.plan}</div>
              <div style={{ fontSize: 18, fontFamily: F, fontWeight: 700 }}>{p.perCredit}</div>
              <div style={{ fontSize: 9, color: C.textDim }}>revenue per credit</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>${p.price} ÷ {p.credits.toLocaleString()} credits</div>
              <div style={{ height: 3, borderRadius: 2, background: C.surface, marginTop: 8 }}>
                <div style={{ width: `${(0.015 / parseFloat(p.perCredit.replace("$", ""))) * 100}%`, height: "100%", borderRadius: 2, background: C.green }} />
              </div>
              <div style={{ fontSize: 8, color: C.textDim, marginTop: 2 }}>Avg cost/credit: ~$0.015 → <span style={{ color: C.green, fontWeight: 600 }}>{Math.round((1 - 0.015 / parseFloat(p.perCredit.replace("$", ""))) * 100)}% margin</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>INVOICE HISTORY</div>
          <button style={{ padding: "5px 12px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>+ Manual Invoice</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 2fr 1fr 1fr 1fr 0.8fr 0.8fr", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
          {["Invoice #", "Organisation", "Plan", "Amount", "Date", "Status", ""].map(h => (
            <span key={h} style={{ fontSize: 9, fontFamily: F, fontWeight: 600, color: C.textDim }}>{h.toUpperCase()}</span>
          ))}
        </div>
        {[
          { num: "INV-0047", org: "DataPulse Advisory", plan: "Scale", amount: "$497.00", date: "Feb 1, 2026", status: "Paid" },
          { num: "INV-0046", org: "Dunn Consulting", plan: "Scale", amount: "$497.00", date: "Feb 1, 2026", status: "Paid" },
          { num: "INV-0045", org: "NexGen Consulting", plan: "Growth", amount: "$247.00", date: "Feb 1, 2026", status: "Paid" },
          { num: "INV-0044", org: "Apex Advisory", plan: "Growth", amount: "$247.00", date: "Feb 1, 2026", status: "Paid" },
          { num: "INV-0043", org: "Perry Salvagne Consulting", plan: "Growth", amount: "$247.00", date: "Feb 1, 2026", status: "Paid" },
          { num: "INV-0042", org: "SynthWave Partners", plan: "Growth", amount: "$247.00", date: "Feb 1, 2026", status: "Paid" },
          { num: "INV-0041", org: "FinLeap Consulting", plan: "Growth", amount: "$247.00", date: "Feb 1, 2026", status: "Failed" },
          { num: "INV-0040", org: "DataPulse Advisory", plan: "Scale", amount: "$497.00", date: "Jan 1, 2026", status: "Paid" },
          { num: "INV-0039", org: "Dunn Consulting", plan: "Scale", amount: "$497.00", date: "Jan 1, 2026", status: "Paid" },
        ].map((inv, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "0.8fr 2fr 1fr 1fr 1fr 0.8fr 0.8fr", padding: "8px 0", borderBottom: `1px solid ${C.border}`, alignItems: "center" }}>
            <span style={{ fontSize: 10, fontFamily: F, color: C.accent }}>{inv.num}</span>
            <span style={{ fontSize: 12, fontWeight: 500 }}>{inv.org}</span>
            <Badge text={inv.plan} />
            <span style={{ fontSize: 12, fontFamily: F, fontWeight: 600 }}>{inv.amount}</span>
            <span style={{ fontSize: 10, color: C.textDim }}>{inv.date}</span>
            <Badge text={inv.status === "Failed" ? "open" : "resolved"} />
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{ padding: "3px 6px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>PDF</button>
              {inv.status === "Failed" && <button style={{ padding: "3px 6px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Refund</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );};

  // ---- SOLUTIONS ----
  const renderSolutions = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Published Solutions" value="8" icon="🧩" />
        <StatCard label="Total Installs" value="3,430" icon="⬇️" />
        <StatCard label="Custom Skills (all orgs)" value="14" icon="🔧" />
        <StatCard label="Most Popular" value="AI Assistant" icon="⭐" sub="847 installs" />
      </div>
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>PUBLISHED SOLUTIONS</div>
          <button style={{ padding: "6px 14px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Add Solution</button>
        </div>
        {[
          { name: "AI Assistant", installs: 847, active: 620, category: "Productivity", status: "Published" },
          { name: "Proposal Builder", installs: 689, active: 410, category: "Sales", status: "Published" },
          { name: "ROI Tracker", installs: 523, active: 340, category: "Consulting", status: "Published" },
          { name: "Client Intake Forms", installs: 431, active: 280, category: "Consulting", status: "Published" },
          { name: "Client Health Dashboard", installs: 312, active: 190, category: "Delivery", status: "Published" },
          { name: "Board Report Generator", installs: 276, active: 150, category: "Consulting", status: "Published" },
          { name: "Training Hub", installs: 198, active: 90, category: "Delivery", status: "Published" },
          { name: "Contract Analyser", installs: 154, active: 80, category: "Operations", status: "Draft" },
        ].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</span>
            <span style={{ fontSize: 10, color: C.textDim, width: 80 }}>{s.category}</span>
            <span style={{ fontSize: 11, fontFamily: F, width: 60, textAlign: "right" }}>{s.installs}</span>
            <span style={{ fontSize: 10, color: C.textDim, width: 50 }}>installs</span>
            <span style={{ fontSize: 11, fontFamily: F, color: C.green, width: 50, textAlign: "right" }}>{s.active}</span>
            <span style={{ fontSize: 10, color: C.textDim, width: 40 }}>active</span>
            <Badge text={s.status === "Draft" ? "Draft" : "Active"} />
            <button style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Edit</button>
          </div>
        ))}
      </div>
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>CUSTOMER CUSTOM SKILLS — MONITOR</div>
        {[
          { org: "Dunn Consulting", skill: "Competitor Pricing Analyst", created: "Feb 12", queries: 34 },
          { org: "DataPulse Advisory", skill: "Client Onboarding Tracker", created: "Feb 8", queries: 89 },
          { org: "DataPulse Advisory", skill: "Sales Forecast Engine", created: "Feb 5", queries: 112 },
          { org: "Apex Advisory", skill: "Compliance Checker", created: "Feb 10", queries: 23 },
        ].map((cs, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{cs.org}</span>
            <span style={{ fontSize: 11, color: C.textMuted, flex: 1 }}>{cs.skill}</span>
            <span style={{ fontSize: 10, color: C.textDim }}>{cs.queries} queries</span>
            <span style={{ fontSize: 10, color: C.textDim }}>{cs.created}</span>
            <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Review</button>
          </div>
        ))}
      </div>

      {/* Assign Bespoke Solution */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.accent}18`, borderRadius: 10, marginTop: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.accent, letterSpacing: "0.06em", marginBottom: 8 }}>ASSIGN SOLUTION TO ORGANISATION</div>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12 }}>Push a bespoke or private solution to a specific client account. They'll see it in their Solutions sidebar.</div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 14 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>SOLUTION</div><select style={{ ...inputStyle, padding: "8px 8px" }}><option>Select solution...</option><option>AI Assistant</option><option>Proposal Builder</option><option>ROI Tracker</option><option>Contract Analyser</option><option>[Create New Bespoke]</option></select></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>ORGANISATION</div><select style={{ ...inputStyle, padding: "8px 8px" }}><option>Select org...</option>{ORGS.map(o => <option key={o.id}>{o.name}</option>)}</select></div>
          <div style={{ width: 120 }}><div style={{ fontSize: 9, fontFamily: F, color: C.textDim, marginBottom: 3 }}>VISIBILITY</div><select style={{ ...inputStyle, padding: "8px 8px" }}><option>Private</option><option>Public</option><option>Hidden</option></select></div>
          <button style={{ padding: "8px 16px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer", height: 34, whiteSpace: "nowrap" }}>Assign</button>
        </div>
        <div style={{ fontSize: 9, fontFamily: F, fontWeight: 600, color: C.textDim, marginBottom: 8 }}>CURRENT ASSIGNMENTS</div>
        {[
          { solution: "Menu Cost Analyser", org: "Hodge Insurance", visibility: "Private", assigned: "Feb 10" },
          { solution: "Employee Onboarding Tracker", org: "DataPulse Advisory", visibility: "Private", assigned: "Feb 6" },
          { solution: "Custom Pricing Model", org: "Dunn Consulting", visibility: "Private", assigned: "Jan 28" },
        ].map((a, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{a.solution}</span>
            <span style={{ fontSize: 11, color: C.textMuted }}>{a.org}</span>
            <Badge text={a.visibility.toLowerCase()} />
            <span style={{ fontSize: 10, color: C.textDim }}>{a.assigned}</span>
            <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Edit</button>
            <button style={{ padding: "4px 6px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Revoke</button>
          </div>
        ))}
      </div>
    </div>
  );
  const renderIntegrations = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Connected Integrations" value="32" icon="🔗" sub="across all orgs" />
        <StatCard label="API Keys Active" value="8" icon="🔑" />
        <StatCard label="Webhook Deliveries (24h)" value="1,247" icon="📡" sub="99.2% success" trend="up" color={C.green} />
        <StatCard label="Failed Deliveries" value="10" icon="⚠️" color={C.warn} />
      </div>
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 14 }}>INTEGRATION HEALTH</div>
        {PROVIDERS.map(p => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.status === "Healthy" ? C.green : p.status === "Degraded" ? C.warn : C.danger, boxShadow: `0 0 4px ${p.status === "Healthy" ? C.green : C.warn}66` }} />
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.name}</span>
            <span style={{ fontSize: 11, color: C.textDim, width: 140 }}>{p.type}</span>
            <Badge text={p.status} />
            <span style={{ fontSize: 11, fontFamily: F, width: 70, textAlign: "right" }}>{p.calls}</span>
            <span style={{ fontSize: 10, color: parseFloat(p.errorRate) > 1 ? C.warn : C.green, width: 50, textAlign: "right" }}>{p.errorRate}</span>
            <span style={{ fontSize: 11, fontFamily: F, width: 50, textAlign: "right" }}>{p.avgLatency}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>RATE LIMITS BY PLAN</div>
          {[
            { plan: "Starter", limit: "50 req/min", api: "No API access" },
            { plan: "Growth", limit: "100 req/min", api: "100 req/min" },
            { plan: "Scale", limit: "500 req/min", api: "500 req/min" },
          ].map(r => (
            <div key={r.plan} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, gap: 12 }}>
              <Badge text={r.plan} />
              <span style={{ flex: 1, fontSize: 12 }}>Internal: {r.limit}</span>
              <span style={{ fontSize: 12, color: C.textDim }}>API: {r.api}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>CUSTOMER API KEYS</div>
          {[
            { org: "DataPulse Advisory", label: "Production", lastUsed: "1 hr ago", calls: "2,400/mo" },
            { org: "Dunn Consulting", label: "Dev", lastUsed: "3 hrs ago", calls: "840/mo" },
            { org: "NexGen Consulting", label: "Production", lastUsed: "1 day ago", calls: "320/mo" },
          ].map((k, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, gap: 8 }}>
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{k.org}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>{k.label}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>{k.calls}</span>
              <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Revoke</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- CONTENT & TEMPLATES ----
  const renderContent = () => (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>WORKFLOW LIBRARY</div>
            <button style={{ padding: "5px 12px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>+ Add</button>
          </div>
          {["Lead Enrichment Pipeline", "Cold Email Sequence Builder", "LinkedIn Content Engine", "AI Audit Transcript Analyzer", "Content Repurposing Workflow"].map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12 }}>{w}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ padding: "3px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Edit</button>
                <button style={{ padding: "3px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>⭐</button>
                <button style={{ padding: "3px 6px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>SURVEY TEMPLATES</div>
            <button style={{ padding: "5px 12px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>+ Add</button>
          </div>
          {["AI Readiness Assessment", "Digital Maturity Survey", "Process Efficiency Audit", "Employee Sentiment Analysis"].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12 }}>{s}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ padding: "3px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Edit</button>
                <button style={{ padding: "3px 6px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 14 }}>HOOK LIBRARY — {47} HOOKS</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Curated video hooks used in the Video (Short Form) module.</div>
          <button style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Manage Hooks</button>
        </div>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 14 }}>ONBOARDING FLOW</div>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>Manage the new user onboarding sequence, welcome emails, and getting-started guides.</div>
          <button style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Edit Flow</button>
        </div>
      </div>
    </div>
  );

  // ---- SUPPORT ----
  const renderSupport = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Open Tickets" value="3" icon="🎧" color={C.warn} />
        <StatCard label="Avg Resolution" value="4.2 hrs" icon="⏱️" />
        <StatCard label="Resolved This Week" value="12" icon="✅" color={C.green} />
        <StatCard label="CSAT Score" value="4.8/5" icon="⭐" color={C.green} />
      </div>
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 14 }}>TICKET INBOX</div>
        {TICKETS.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 11, fontFamily: F, color: C.textDim, width: 50 }}>{t.id}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{t.subject}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{t.org} · {t.created}</div>
            </div>
            <Badge text={t.priority === "High" ? "High" : t.priority === "Medium" ? "Medium" : "Low"} />
            <Badge text={t.status} />
            <button style={{ padding: "5px 10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Open</button>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>ANNOUNCEMENTS</div>
          <textarea placeholder="Write an in-app announcement..." rows={3} style={{ ...inputStyle, resize: "vertical", marginBottom: 8 }} />
          <div style={{ display: "flex", gap: 6 }}>
            <select style={{ ...inputStyle, width: 140, padding: "6px 10px", fontSize: 10 }}><option>All Users</option><option>Scale Plan</option><option>Growth Plan</option><option>Trialling</option></select>
            <button style={{ padding: "6px 14px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Send</button>
          </div>
        </div>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>CHANGELOG</div>
          {[
            { version: "v3.2", date: "Feb 14", title: "AI Activity Feed + Custom Skills" },
            { version: "v3.1", date: "Feb 12", title: "Implementation Board Kanban rebuild" },
            { version: "v3.0", date: "Feb 10", title: "Solutions Marketplace launch" },
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.accent }}>{c.version}</span>
              <span style={{ flex: 1, fontSize: 12 }}>{c.title}</span>
              <span style={{ fontSize: 10, color: C.textDim }}>{c.date}</span>
            </div>
          ))}
          <button style={{ marginTop: 8, padding: "6px 14px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontFamily: F, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Add Entry</button>
        </div>
      </div>

      {/* Email Template Management */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>EMAIL TEMPLATES — TRANSACTIONAL</div>
          <button style={{ padding: "5px 12px", background: C.accent, color: C.bg, border: "none", borderRadius: 6, fontFamily: F, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>+ Add Template</button>
        </div>
        {[
          { name: "Welcome Email", trigger: "On signup", subject: "Welcome to Pipeline — let's get you set up", status: "Active", lastEdit: "Feb 8", sends: "48" },
          { name: "Trial Ending (3 days)", trigger: "3 days before trial ends", subject: "Your Pipeline trial ends in 3 days", status: "Active", lastEdit: "Feb 5", sends: "12" },
          { name: "Trial Ended", trigger: "Trial expiry", subject: "Your trial has ended — here's what you built", status: "Active", lastEdit: "Feb 5", sends: "6" },
          { name: "Credit Warning (80%)", trigger: "80% credits used", subject: "You've used 80% of your monthly credits", status: "Active", lastEdit: "Jan 28", sends: "34" },
          { name: "Credit Exhausted", trigger: "100% credits used", subject: "You've run out of credits this month", status: "Active", lastEdit: "Jan 28", sends: "8" },
          { name: "Weekly Digest", trigger: "Every Monday 9am", subject: "Your Pipeline weekly report", status: "Active", lastEdit: "Feb 10", sends: "147" },
          { name: "Campaign Complete", trigger: "Email/LinkedIn campaign finishes", subject: "Campaign complete — here are your results", status: "Active", lastEdit: "Feb 3", sends: "62" },
          { name: "Magic Link (Collaborator)", trigger: "Collaborator invited", subject: "You've been invited to view a project board", status: "Active", lastEdit: "Feb 1", sends: "28" },
          { name: "Payment Failed", trigger: "Stripe payment failure", subject: "We couldn't process your payment", status: "Active", lastEdit: "Jan 25", sends: "4" },
          { name: "Win-back (30 day inactive)", trigger: "No login 30 days", subject: "We miss you — here's what's new in Pipeline", status: "Draft", lastEdit: "Feb 12", sends: "0" },
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{t.trigger}</div>
            </div>
            <div style={{ flex: 3, fontSize: 11, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
            <span style={{ fontSize: 10, fontFamily: F, color: C.textDim, width: 50, textAlign: "right" }}>{t.sends} sent</span>
            <Badge text={t.status === "Draft" ? "Draft" : "Active"} />
            <div style={{ display: "flex", gap: 4 }}>
              <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.accent}33`, borderRadius: 4, color: C.accent, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Preview</button>
              <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Test</button>
              <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>Edit</button>
              <div onClick={e => { const el = e.currentTarget; el.dataset.on = el.dataset.on === "true" ? "false" : "true"; const dot = el.querySelector("div"); if (el.dataset.on === "true") { el.style.background = C.accent; dot.style.transform = "translateX(14px)"; } else { el.style.background = C.border; dot.style.transform = "translateX(0)"; }}} data-on={t.status !== "Draft" ? "true" : "false"} style={{ width: 28, height: 14, borderRadius: 7, background: t.status !== "Draft" ? C.accent : C.border, position: "relative", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFF", position: "absolute", top: 2, left: 2, transition: "transform 0.2s", transform: t.status !== "Draft" ? "translateX(14px)" : "translateX(0)" }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ---- ANALYTICS ----
  const renderAnalytics = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="DAU" value="28" icon="📊" />
        <StatCard label="WAU" value="34" icon="📈" />
        <StatCard label="Avg Session" value="18 min" icon="⏱️" />
        <StatCard label="Feature Adoption" value="74%" icon="✅" sub="Avg features used per org" color={C.green} />
      </div>
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 16 }}>FEATURE USAGE HEATMAP — ALL ORGS</div>
        {[
          { feature: "Lead Discovery", usage: 94, sessions: 420 },
          { feature: "CRM Pipeline", usage: 88, sessions: 380 },
          { feature: "Cold Email Campaigns", usage: 82, sessions: 340 },
          { feature: "AI Assistant", usage: 76, sessions: 290 },
          { feature: "Strategy (Audits)", usage: 71, sessions: 245 },
          { feature: "Messaging Workshop", usage: 65, sessions: 210 },
          { feature: "LinkedIn Campaigns", usage: 58, sessions: 180 },
          { feature: "Implementation Board", usage: 52, sessions: 150 },
          { feature: "Script Generator", usage: 45, sessions: 120 },
          { feature: "AI Council", usage: 38, sessions: 95 },
          { feature: "Niche Researcher", usage: 32, sessions: 78 },
          { feature: "Video (Short Form)", usage: 24, sessions: 52 },
          { feature: "Call Analyser", usage: 18, sessions: 34 },
          { feature: "Community", usage: 12, sessions: 22 },
        ].map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
            <span style={{ fontSize: 11, width: 160, color: C.textMuted }}>{f.feature}</span>
            <div style={{ flex: 1, height: 16, borderRadius: 3, background: C.bg }}>
              <div style={{ width: `${f.usage}%`, height: "100%", borderRadius: 3, background: f.usage > 70 ? C.green : f.usage > 40 ? C.accent : f.usage > 20 ? C.warn : C.danger + "88", transition: "width 0.3s" }} />
            </div>
            <span style={{ fontSize: 10, fontFamily: F, fontWeight: 600, width: 40, textAlign: "right" }}>{f.usage}%</span>
            <span style={{ fontSize: 9, color: C.textDim, width: 60, textAlign: "right" }}>{f.sessions} sess</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>TRIAL → PAID FUNNEL</div>
          {[
            { stage: "Signed Up", count: 48, pct: 100 },
            { stage: "Completed Onboarding", count: 38, pct: 79 },
            { stage: "Used Core Feature", count: 32, pct: 67 },
            { stage: "Reached AHA Moment", count: 24, pct: 50 },
            { stage: "Converted to Paid", count: 20, pct: 42 },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 11 }}>{s.stage}</span>
                <span style={{ fontSize: 11, fontFamily: F, fontWeight: 600 }}>{s.count} <span style={{ color: C.textDim, fontWeight: 400 }}>({s.pct}%)</span></span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: C.bg }}>
                <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 3, background: C.accent }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>COHORT RETENTION (monthly)</div>
          {[
            { month: "Oct 2025", m1: "92%", m2: "85%", m3: "78%", m4: "74%" },
            { month: "Nov 2025", m1: "88%", m2: "82%", m3: "76%", m4: "—" },
            { month: "Dec 2025", m1: "90%", m2: "84%", m3: "—", m4: "—" },
            { month: "Jan 2026", m1: "94%", m2: "—", m3: "—", m4: "—" },
          ].map((c, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{c.month}</span>
              {[c.m1, c.m2, c.m3, c.m4].map((v, j) => (
                <span key={j} style={{ fontSize: 11, fontFamily: F, color: v === "—" ? C.textDim : parseInt(v) > 80 ? C.green : C.warn, textAlign: "center" }}>{v}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Onboarding Step Completion */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginTop: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 14 }}>ONBOARDING STEP COMPLETION — WHERE USERS DROP OFF</div>
        {[
          { step: "Account Created", completed: 48, pct: 100 },
          { step: "Brand Voice Setup", completed: 42, pct: 88 },
          { step: "Buyer Persona Defined", completed: 38, pct: 79 },
          { step: "First Lead Discovery", completed: 34, pct: 71 },
          { step: "Connected Integration", completed: 28, pct: 58 },
          { step: "First Campaign Launched", completed: 22, pct: 46 },
          { step: "First AI Audit Run", completed: 16, pct: 33 },
          { step: "Invited Team Member", completed: 12, pct: 25 },
        ].map((s, i, arr) => {
          const dropoff = i > 0 ? arr[i - 1].completed - s.completed : 0;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <span style={{ width: 18, fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, textAlign: "right" }}>{i + 1}.</span>
              <span style={{ width: 180, fontSize: 11, color: C.textMuted }}>{s.step}</span>
              <div style={{ flex: 1, height: 16, borderRadius: 3, background: C.bg }}>
                <div style={{ width: `${s.pct}%`, height: "100%", borderRadius: 3, background: s.pct > 70 ? C.green : s.pct > 40 ? C.accent : C.warn }} />
              </div>
              <span style={{ width: 50, fontSize: 10, fontFamily: F, fontWeight: 600, textAlign: "right" }}>{s.pct}%</span>
              <span style={{ width: 30, fontSize: 10, fontFamily: F, textAlign: "right", color: C.textDim }}>{s.completed}</span>
              {dropoff > 0 && <span style={{ width: 50, fontSize: 9, color: C.danger, textAlign: "right" }}>-{dropoff} lost</span>}
              {dropoff === 0 && <span style={{ width: 50 }} />}
            </div>
          );
        })}
        <div style={{ marginTop: 10, padding: "8px 12px", background: C.warnBg, border: `1px solid ${C.warn}22`, borderRadius: 6 }}>
          <span style={{ fontSize: 10, color: C.warn, fontWeight: 600 }}>💡 Biggest drop-off: </span>
          <span style={{ fontSize: 10, color: C.textDim }}>42% of users never connect an integration. Consider adding integration prompts to the onboarding flow or post-signup email sequence.</span>
        </div>
      </div>
    </div>
  );
  const renderSecurity = () => (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <StatCard label="Admin Users" value="3" icon="🔒" />
        <StatCard label="Audit Events (24h)" value="127" icon="📝" />
        <StatCard label="GDPR Requests" value="0" icon="🛡️" sub="No pending requests" color={C.green} />
        <StatCard label="Last Security Audit" value="Feb 10" icon="✅" />
      </div>
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 14 }}>ADMIN AUDIT LOG</div>
        {[
          { admin: "Andrew Dunn", action: "Adjusted credits for Dunn Consulting", detail: "+500 credits — Beta tester reward", time: "2 hrs ago" },
          { admin: "Andrew Dunn", action: "Changed model for Messaging Workshop", detail: "Sonnet → Haiku (cost optimisation)", time: "5 hrs ago" },
          { admin: "Andrew Dunn", action: "Impersonated DataPulse Advisory", detail: "Debugging API rate limit issue", time: "8 hrs ago" },
          { admin: "Rachel Green", action: "Resolved ticket T-1021", detail: "NexGen HeyReach integration fix", time: "1 day ago" },
          { admin: "Andrew Dunn", action: "Published solution update", detail: "Contract Analyser → draft status", time: "2 days ago" },
          { admin: "Andrew Dunn", action: "Suspended FinLeap Consulting", detail: "Payment failed 3x — auto-suspended", time: "4 days ago" },
        ].map((log, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: C.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: F, fontWeight: 700, color: C.accent }}>{log.admin[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{log.action}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>{log.detail}</div>
            </div>
            <span style={{ fontSize: 11, color: C.textDim, fontWeight: 500 }}>{log.admin}</span>
            <span style={{ fontSize: 9, color: C.textDim }}>{log.time}</span>
          </div>
        ))}
      </div>

      {/* Impersonation Log */}
      <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.warn}18`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 14 }}>👁️</span>
          <span style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.warn, letterSpacing: "0.06em" }}>IMPERSONATION LOG</span>
          <span style={{ fontSize: 10, color: C.textDim }}>— every admin login-as session is recorded</span>
        </div>
        {[
          { admin: "Andrew Dunn", org: "DataPulse Advisory", reason: "Debugging API rate limit issue", start: "Feb 14, 10:22am", duration: "12 min", actions: 8 },
          { admin: "Andrew Dunn", org: "Apex Advisory", reason: "Testing enrichment pipeline fix", start: "Feb 12, 3:45pm", duration: "6 min", actions: 3 },
          { admin: "Rachel Green", org: "NexGen Consulting", reason: "Verifying HeyReach integration", start: "Feb 11, 11:10am", duration: "18 min", actions: 14 },
          { admin: "Andrew Dunn", org: "Perry Salvagne Consulting", reason: "Reviewing audit deck generation", start: "Feb 9, 2:30pm", duration: "22 min", actions: 11 },
        ].map((imp, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 4 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: C.warn + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: F, fontWeight: 700, color: C.warn }}>{imp.admin[0]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12 }}><span style={{ fontWeight: 600 }}>{imp.admin}</span> <span style={{ color: C.textDim }}>→</span> <span style={{ fontWeight: 600, color: C.accent }}>{imp.org}</span></div>
              <div style={{ fontSize: 10, color: C.textDim }}>{imp.reason}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600 }}>{imp.duration}</div>
              <div style={{ fontSize: 8, color: C.textDim }}>DURATION</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600 }}>{imp.actions}</div>
              <div style={{ fontSize: 8, color: C.textDim }}>ACTIONS</div>
            </div>
            <span style={{ fontSize: 9, color: C.textDim }}>{imp.start}</span>
            <button style={{ padding: "4px 8px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>View Log</button>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em" }}>ADMIN ACCESS CONTROL</div>
            <button style={{ padding: "4px 10px", background: C.accent, color: C.bg, border: "none", borderRadius: 4, fontFamily: F, fontSize: 8, fontWeight: 600, cursor: "pointer" }}>+ Add Admin</button>
          </div>
          {[
            { name: "Andrew Dunn", role: "Super Admin", access: "Full access" },
            { name: "Rachel Green", role: "Support", access: "Orgs, Tickets, Users (read-only billing)" },
            { name: "Mike Thompson", role: "Read Only", access: "View all, edit nothing" },
          ].map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: C.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: F, fontWeight: 700, color: C.accent }}>{a.name[0]}</div>
              <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{a.name}</span>
              <Badge text={a.role.toLowerCase() === "super admin" ? "admin" : a.role.toLowerCase()} />
              <span style={{ fontSize: 10, color: C.textDim }}>{a.access}</span>
              {a.role !== "Super Admin" && <button style={{ padding: "3px 6px", background: "transparent", border: `1px solid ${C.danger}33`, borderRadius: 4, color: C.danger, fontFamily: F, fontSize: 8, cursor: "pointer" }}>✕</button>}
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 24px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, fontFamily: F, fontWeight: 600, color: C.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>DATA & COMPLIANCE</div>
          {[
            { label: "GDPR Data Export Requests", value: "0 pending", action: "Process" },
            { label: "Right to Deletion Requests", value: "0 pending", action: "Process" },
            { label: "Data Retention Policy", value: "90 days inactive", action: "Edit" },
            { label: "IP Allowlist (Admin)", value: "Not configured", action: "Configure" },
          ].map((d, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}`, gap: 10 }}>
              <span style={{ flex: 1, fontSize: 12 }}>{d.label}</span>
              <span style={{ fontSize: 11, color: C.textDim }}>{d.value}</span>
              <button style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 4, color: C.textMuted, fontFamily: F, fontSize: 8, cursor: "pointer" }}>{d.action}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ---- RENDER PAGE ----
  const renderPage = () => {
    switch (page) {
      case "overview": return renderOverview();
      case "agencies": return renderAgencies();
      case "orgs": return renderOrgs();
      case "credits": return renderCredits();
      case "leadgen": return renderLeadGen();
      case "ai": return renderAI();
      case "system": return renderSystem();
      case "knowledge": return renderKnowledge();
      case "users": return renderUsers();
      case "billing": return renderBilling();
      case "solutions": return renderSolutions();
      case "integrations": return renderIntegrations();
      case "content": return renderContent();
      case "support": return renderSupport();
      case "analytics": return renderAnalytics();
      case "security": return renderSecurity();
      default: return renderOverview();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: C.bg, color: C.text, fontFamily: FB, fontSize: 14, overflow: "hidden" }}>
      {/* Environment Banner */}
      <div style={{ background: "#dc2626", padding: "3px 0", textAlign: "center", flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontFamily: F, fontWeight: 700, color: "#FFF", letterSpacing: "0.12em" }}>🔴 PRODUCTION ENVIRONMENT — ALL CHANGES AFFECT LIVE CUSTOMERS</span>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 240, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: C.accent + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 14 }}>⚙️</span>
            </div>
            <div>
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: C.accent, letterSpacing: "-0.02em" }}>PIPELINE</div>
              <div style={{ fontFamily: F, fontSize: 8, color: C.textDim, letterSpacing: "0.1em" }}>ADMIN CONSOLE</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "8px 6px" }}>
          {NAV.map(n => (
            <button key={n.key} onClick={() => { setPage(n.key); setSelectedOrg(null); }} style={{
              width: "100%", padding: "9px 10px", marginBottom: 1, background: page === n.key ? C.accentBg : "transparent",
              border: page === n.key ? `1px solid ${C.accent}22` : "1px solid transparent", borderRadius: 6,
              color: page === n.key ? C.accent : C.textMuted, fontFamily: FB, fontSize: 12, fontWeight: 500,
              cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
            }}><span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}</button>
          ))}
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: C.danger + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontFamily: F, fontWeight: 700, color: C.danger }}>A</div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>Admin</div>
            <div style={{ fontSize: 9, color: C.textDim }}>Super Admin</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontFamily: F, fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
              {NAV.find(n => n.key === page)?.icon} <span style={{ color: C.accent }}>{NAV.find(n => n.key === page)?.label}</span>
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Global Search */}
            <div style={{ position: "relative" }}>
              <input value={globalSearch} onChange={e => { setGlobalSearch(e.target.value); setShowGlobalResults(e.target.value.length > 0); }} onBlur={() => setTimeout(() => setShowGlobalResults(false), 200)} placeholder="Search orgs, users, tickets..." style={{ width: 260, padding: "7px 12px 7px 30px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, fontFamily: FB, color: C.text, outline: "none" }} />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.textDim }}>🔍</span>
              {showGlobalResults && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                  {ORGS.filter(o => o.name.toLowerCase().includes(globalSearch.toLowerCase()) || o.owner.toLowerCase().includes(globalSearch.toLowerCase()) || o.email.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 5).map(o => (
                    <div key={o.id} onClick={() => { setSelectedOrg(o); setPage("orgs"); setDetailTab("overview"); setGlobalSearch(""); setShowGlobalResults(false); }} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: 12 }}>🏢</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{o.name}</div>
                        <div style={{ fontSize: 9, color: C.textDim }}>{o.owner} · {o.email}</div>
                      </div>
                      <Badge text={o.status} />
                    </div>
                  ))}
                  {TICKETS.filter(t => t.subject.toLowerCase().includes(globalSearch.toLowerCase()) || t.org.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 3).map(t => (
                    <div key={t.id} onClick={() => { setPage("support"); setGlobalSearch(""); setShowGlobalResults(false); }} style={{ padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, borderBottom: `1px solid ${C.border}` }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <span style={{ fontSize: 12 }}>🎧</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{t.subject}</div>
                        <div style={{ fontSize: 9, color: C.textDim }}>{t.id} · {t.org}</div>
                      </div>
                      <Badge text={t.status} />
                    </div>
                  ))}
                  {ORGS.filter(o => o.name.toLowerCase().includes(globalSearch.toLowerCase())).length === 0 && TICKETS.filter(t => t.subject.toLowerCase().includes(globalSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: "12px", textAlign: "center", fontSize: 11, color: C.textDim }}>No results for "{globalSearch}"</div>
                  )}
                </div>
              )}
            </div>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 4px ${C.green}88` }} />
            <span style={{ fontSize: 10, color: C.textDim, fontFamily: F }}>All systems operational</span>
          </div>
        </div>
        {renderPage()}
      </div>
      </div>
    </div>
  );
}
