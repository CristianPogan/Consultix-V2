import React, { useState, useEffect, useRef, useMemo } from "react";
import { api, AuthError } from "./api.js";

// --- Saved Prompts (loaded from API, with fallback defaults) ---
const FALLBACK_DEFAULT_PROMPT = `You are a world-class cold email copywriter. Write a personalized cold email for each lead using the enrichment data provided.

Rules:
- Open with something specific to THEM (recent news, LinkedIn activity, company milestone)
- Connect their situation to the value we provide — don't just pitch
- Keep it under 120 words
- Sound like a real person, not a marketer
- End with a low-friction CTA (15-min call, not "buy now")
- Never use "I hope this email finds you well" or similar filler

Available data per lead:
- Name, title, company, industry
- Company news & recent events
- LinkedIn bio, recent posts, connections
- Tech stack, employee count, revenue`;

let SAVED_PROMPTS = {
  default: { label: "Cold Intro — Pain Point Focused", text: FALLBACK_DEFAULT_PROMPT },
};

(async () => {
  try {
    const defaults = await api.prompts.getDefaults();
    if (defaults && typeof defaults === 'object') SAVED_PROMPTS = { ...SAVED_PROMPTS, ...defaults };
  } catch {}
  try {
    const saved = await api.prompts.list();
    if (Array.isArray(saved)) saved.forEach(p => { if (p.key || p.id) SAVED_PROMPTS[p.key || p.id] = { label: p.label || p.name, text: p.text || p.content }; });
  } catch {}
})();

// --- Utility Components ---

const ProgressDots = ({ active }) => {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setDots(d => (d + 1) % 4), 400);
    return () => clearInterval(i);
  }, [active]);
  return active ? <span style={{ fontFamily: "monospace", letterSpacing: 2 }}>{".".repeat(dots).padEnd(3, "\u00A0")}</span> : null;
};

const TypeWriter = ({ text, speed = 12, onDone }) => {
  const [displayed, setDisplayed] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    idx.current = 0;
    setDisplayed("");
    const i = setInterval(() => {
      idx.current++;
      setDisplayed(text.slice(0, idx.current));
      if (idx.current >= text.length) {
        clearInterval(i);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(i);
  }, [text]);
  return <>{displayed}</>;
};

// --- Styles ---
const COLORS = {
  bg: "#0a0a0f",
  surface: "#12121a",
  surfaceHover: "#1a1a26",
  border: "#1e1e2e",
  borderActive: "#3b3b5c",
  text: "#e2e2e8",
  textMuted: "#7a7a8e",
  textDim: "#4a4a5e",
  accent: "#c4f04d",
  accentDim: "#8ab025",
  accentBg: "rgba(196, 240, 77, 0.08)",
  danger: "#f04d4d",
  dangerBg: "rgba(240, 77, 77, 0.08)",
  warn: "#f0a84d",
  warnBg: "rgba(240, 168, 77, 0.08)",
  blue: "#4d9ef0",
  blueBg: "rgba(77, 158, 240, 0.08)",
  green: "#22c55e",
  greenBg: "rgba(34, 197, 94, 0.08)",
  purple: "#7B61FF",
  purpleBg: "rgba(123, 97, 255, 0.08)",
};

const FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";
const FONT_BODY = "'DM Sans', 'Segoe UI', system-ui, sans-serif";
const LOGO_SRC = "/logo.png";

// --- Auth Gate & Screen ---
function AuthScreen({ onSuccess, mode: initialMode = "signin", resetToken: urlToken = null }) {
  const [mode, setMode] = useState(urlToken ? "reset" : initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [resetToken] = useState(urlToken);
  const [name, setName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [tokenValidated, setTokenValidated] = useState(false);
  const [tokenValidating, setTokenValidating] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const validateToken = async () => {
    if (!accessToken.trim()) {
      setError("Enter your access token");
      setErrorCode("MISSING_ACCESS_TOKEN");
      return;
    }
    setError("");
    setErrorCode("");
    setTokenValidating(true);
    try {
      const result = await api.validateSignupToken(accessToken);
      if (result.valid) {
        setTokenValidated(true);
        setError("");
      } else {
        setError(result.error || "Invalid access token");
        setErrorCode("INVALID_ACCESS_TOKEN");
        setTokenValidated(false);
      }
    } catch (err) {
      setError(err.message || "Could not validate token");
      setErrorCode("VALIDATION_ERROR");
      setTokenValidated(false);
    } finally {
      setTokenValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrorCode("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        await api.forgotPassword(email);
        setForgotSent(true);
      } else if (mode === "reset") {
        if (password !== passwordConfirm) {
          setError("Passwords do not match");
          setErrorCode("PASSWORD_MISMATCH");
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setErrorCode("WEAK_PASSWORD");
          setLoading(false);
          return;
        }
        await api.resetPassword(resetToken, password);
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("reset");
          url.searchParams.delete("token");
          window.history.replaceState({}, "", url.pathname + url.search);
        }
        setMode("signin");
        setPassword("");
        setPasswordConfirm("");
        setError("");
        setErrorCode("");
        setResetSuccess(true);
        setTimeout(() => setResetSuccess(false), 5000);
      } else if (mode === "signin") {
        await api.login(email, password);
        onSuccess();
      } else {
        if (!accessToken.trim()) {
          setError("Access token is required to create an account");
          setErrorCode("MISSING_ACCESS_TOKEN");
          setLoading(false);
          return;
        }
        if (!tokenValidated) {
          setError("Please validate your access token first");
          setErrorCode("TOKEN_NOT_VALIDATED");
          setLoading(false);
          return;
        }
        await api.signup(email, password, name, accessToken);
        onSuccess();
      }
    } catch (err) {
      const msg = err instanceof AuthError ? err.message : (err.message || "Something went wrong");
      setError(msg);
      setErrorCode(err instanceof AuthError ? err.code : "UNKNOWN");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 14, outline: "none",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
      <div style={{ width: "100%", maxWidth: 400, padding: "32px 36px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <img src={LOGO_SRC} alt="ConsultiX" style={{ height: 48, objectFit: "contain" }} />
        </div>
        <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, margin: "0 0 8px", color: COLORS.text }}>
          {mode === "forgot" ? "Forgot password" : mode === "reset" ? "Reset password" : mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 24 }}>
          {mode === "forgot" ? "Enter your email and we'll send a reset link" : mode === "reset" ? "Enter your new password" : mode === "signin" ? "Enter your email and password" : "Get started with your account"}
        </p>
        {resetSuccess && (
          <div style={{
            padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 16,
            background: COLORS.greenBg, border: `1px solid ${COLORS.green}44`, color: COLORS.green,
          }}>Password reset successfully. Sign in with your new password.</div>
        )}
        {forgotSent ? (
          <div style={{ padding: "24px 0", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
            <p style={{ color: COLORS.text, fontSize: 14, marginBottom: 8 }}>Check your email</p>
            <p style={{ color: COLORS.textMuted, fontSize: 13, marginBottom: 24 }}>If an account exists, we've sent a reset link to {email}</p>
            <button type="button" onClick={() => { setForgotSent(false); setMode("signin"); }} style={{
              background: "none", border: "none", color: COLORS.accent, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", padding: 0,
            }}>Back to sign in</button>
          </div>
        ) : (
        <>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {mode === "signup" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 6, fontFamily: FONT }}>Access Token <span style={{ color: COLORS.danger }}>*</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="password" value={accessToken} onChange={e => { setAccessToken(e.target.value); setTokenValidated(false); setError(""); }} placeholder="Enter your signup access token" style={{ ...inputStyle, flex: 1 }} />
                  <button type="button" onClick={validateToken} disabled={tokenValidating || !accessToken.trim()} style={{
                    padding: "12px 16px", background: tokenValidated ? COLORS.green : COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8,
                    fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: tokenValidating || !accessToken.trim() ? "not-allowed" : "pointer", opacity: tokenValidating || !accessToken.trim() ? 0.6 : 1, whiteSpace: "nowrap",
                  }}>{tokenValidating ? "Validating..." : tokenValidated ? "✓ Valid" : "Validate"}</button>
                </div>
                {tokenValidated && <span style={{ fontSize: 11, color: COLORS.green, marginTop: 4, display: "block" }}>Token validated. You can proceed with signup.</span>}
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 6, fontFamily: FONT }}>Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required autoComplete="name" style={inputStyle} />
              </div>
            </>
          )}
          {(mode === "signin" || mode === "signup" || mode === "forgot") && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 6, fontFamily: FONT }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required={mode !== "reset"} autoComplete="email" style={inputStyle} />
            </div>
          )}
          {(mode === "signin" || mode === "signup") && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 6, fontFamily: FONT }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={mode === "signup" ? 6 : 1} autoComplete={mode === "signin" ? "current-password" : "new-password"} style={inputStyle} />
              {mode === "signup" && <span style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4, display: "block" }}>At least 6 characters</span>}
              {mode === "signin" && (
                <button type="button" onClick={() => { setMode("forgot"); setError(""); setErrorCode(""); }} style={{
                  background: "none", border: "none", color: COLORS.accent, fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer", padding: "6px 0 0", textAlign: "left",
                }}>Forgot password?</button>
              )}
            </div>
          )}
          {mode === "reset" && (
            <>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 6, fontFamily: FONT }}>New password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} autoComplete="new-password" style={inputStyle} />
                <span style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4, display: "block" }}>At least 6 characters</span>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: COLORS.textDim, marginBottom: 6, fontFamily: FONT }}>Confirm password</label>
                <input type="password" value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} placeholder="••••••••" required minLength={6} autoComplete="new-password" style={inputStyle} />
              </div>
            </>
          )}
          {error && (
            <div style={{
              padding: "10px 12px", borderRadius: 8, fontSize: 13,
              background: errorCode === "EMAIL_EXISTS" ? COLORS.warnBg : (["MISSING_FIELDS", "MISSING_ACCESS_TOKEN", "WEAK_PASSWORD", "PASSWORD_MISMATCH", "TOKEN_NOT_VALIDATED"].includes(errorCode) ? COLORS.blueBg : COLORS.dangerBg),
              border: `1px solid ${errorCode === "EMAIL_EXISTS" ? COLORS.warn + "44" : (["MISSING_FIELDS", "MISSING_ACCESS_TOKEN", "WEAK_PASSWORD", "PASSWORD_MISMATCH", "TOKEN_NOT_VALIDATED"].includes(errorCode) ? COLORS.blue + "44" : COLORS.danger + "44")}`,
              color: errorCode === "EMAIL_EXISTS" ? COLORS.warn : (["MISSING_FIELDS", "MISSING_ACCESS_TOKEN", "WEAK_PASSWORD", "PASSWORD_MISMATCH", "TOKEN_NOT_VALIDATED"].includes(errorCode) ? COLORS.blue : COLORS.danger),
            }}>{typeof error === "string" ? error : (error?.message || String(error))}</div>
          )}
          <button type="submit" disabled={loading} style={{
            padding: "12px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8,
            fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          }}>{loading ? "Please wait..." : mode === "forgot" ? "Send reset link" : mode === "reset" ? "Reset password" : mode === "signin" ? "Sign in" : "Sign up"}</button>
        </form>
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${COLORS.border}` }}>
          {mode === "forgot" && (
            <button type="button" onClick={() => { setMode("signin"); setError(""); setErrorCode(""); }} style={{
              background: "none", border: "none", color: COLORS.accent, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", padding: 0,
            }}>Back to sign in</button>
          )}
          {mode === "reset" && (
            <button type="button" onClick={() => { setMode("signin"); setError(""); setErrorCode(""); }} style={{
              background: "none", border: "none", color: COLORS.accent, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", padding: 0,
            }}>Back to sign in</button>
          )}
          {mode === "signin" && (
            <button type="button" onClick={() => { setMode("signup"); setError(""); setErrorCode(""); setTokenValidated(false); setAccessToken(""); }} style={{
              background: "none", border: "none", color: COLORS.accent, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", padding: 0,
            }}>Don't have an account? Sign up</button>
          )}
          {mode === "signup" && (
            <button type="button" onClick={() => { setMode("signin"); setError(""); setErrorCode(""); setTokenValidated(false); setAccessToken(""); }} style={{
              background: "none", border: "none", color: COLORS.accent, fontFamily: FONT_BODY, fontSize: 13, cursor: "pointer", padding: 0,
            }}>Already have an account? Sign in</button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

function AuthGate({ children }) {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const onSessionExpired = () => setIsAuthenticated(false);
    window.addEventListener('sessionexpired', onSessionExpired);
    return () => window.removeEventListener('sessionexpired', onSessionExpired);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const me = await api.me();
        if (cancelled) return;
        if (me?.valid) {
          setIsAuthenticated(true);
          setAuthChecked(true);
          return;
        }
      } catch {
        api.clearToken();
      }
      try {
        await api.getToken();
        if (cancelled) return;
        setIsAuthenticated(true);
      } catch {
        // No apiKey or token exchange failed
      }
      if (!cancelled) setAuthChecked(true);
    }
    check();
    return () => { cancelled = true; };
  }, []);

  if (!authChecked) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, color: COLORS.textMuted }}>
        <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <img src={LOGO_SRC} alt="ConsultiX" style={{ height: 48, objectFit: "contain" }} />
        <span style={{ fontFamily: FONT, fontSize: 14 }}>Loading...</span>
      </div>
    );
  }
  if (!isAuthenticated) {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const resetToken = params.get("reset") === "true" ? params.get("token") || null : null;
    return <AuthScreen onSuccess={() => setIsAuthenticated(true)} resetToken={resetToken} />;
  }
  return children;
}

// --- Main App ---
export { AuthGate };
export default function App() {
  const [step, setStep] = useState(0); // 0=ICP, 1=discovery, 2=enrichment, 3=personalization, 4=outreach
  const [showLeadsImport, setShowLeadsImport] = useState(false);
  const [icpForm, setIcpForm] = useState({ listName: "", industry: "B2B SaaS", keywords: "", employeeRange: "51-200", regions: ["North America", "Europe"], roles: ["VP Growth", "CTO", "Head of Product"], lookalike: "" });
  const [savedPrompts, setSavedPrompts] = useState(SAVED_PROMPTS);
  const [discoveredLeads, setDiscoveredLeads] = useState([]);
  const [selectedLeads, setSelectedLeads] = useState(new Set());
  const [enrichedContacts, setEnrichedContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState(new Set());
  const [personalizedEmails, setPersonalizedEmails] = useState({});
  const [outreachQueue, setOutreachQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLog, setProcessLog] = useState([]);
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [expandedContact, setExpandedContact] = useState(null);
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const [auditProjects, setAuditProjects] = useState([]);
  const [selectedAuditProject, setSelectedAuditProject] = useState(null);
  const [promptText, setPromptText] = useState(FALLBACK_DEFAULT_PROMPT);
  const [selectedPromptKey, setSelectedPromptKey] = useState("default");
  const [previewEmails, setPreviewEmails] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [channelAssignments, setChannelAssignments] = useState({});
  const [emailPlatform, setEmailPlatform] = useState("instantly");
  const [emailCampaign, setEmailCampaign] = useState("");       // display name
  const [emailCampaignId, setEmailCampaignId] = useState("");   // UUID for API calls
  const [linkedinPlatform, setLinkedinPlatform] = useState("heyreach");
  const [linkedinCampaign, setLinkedinCampaign] = useState("");       // display name
  const [linkedinCampaignId, setLinkedinCampaignId] = useState("");   // numeric ID for API calls
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [addProjectCreating, setAddProjectCreating] = useState(false);
  const [discoverCanRun, setDiscoverCanRun] = useState(true); // true until we know otherwise
  const logRef = useRef(null);

  useEffect(() => {
    if (activePage === "leads") {
      api.leadGeneration.getDiscoverStatus()
        .then(r => setDiscoverCanRun(r.canRun ?? true))
        .catch(() => setDiscoverCanRun(false));
    }
  }, [activePage]);

  const addLog = (msg, type = "info") => {
    setProcessLog(prev => [...prev, { msg, type, ts: Date.now() }]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [processLog]);

  useEffect(() => {
    api.icpProfiles.getDefault().then(data => setIcpForm(prev => ({ ...prev, ...data }))).catch(() => {});
    api.prompts.getDefaults().then(defs => {
      api.prompts.list().then(rows => {
        const merged = { ...defs };
        (rows || []).forEach(r => { merged[r.id] = { label: r.label, text: r.text }; });
        setSavedPrompts(merged);
      }).catch(() => setSavedPrompts(defs || SAVED_PROMPTS));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    api.organisations.list()
      .then(projects => {
        const list = Array.isArray(projects) ? projects : [];
        setAuditProjects(list);
        setSelectedAuditProject(prev => (prev == null && list.length > 0 ? String(list[0].id) : prev));
      })
      .catch(() => setAuditProjects([]));
  }, []);

  const runDiscovery = async (payload) => {
    const form = payload ?? icpForm;
    if (!discoverCanRun) {
      addLog("→ Run Discovery cannot run: no lead search integrations configured. Configure at least one in Settings → Integrations.", "info");
      return;
    }
    if (form?.importMode && form?.importedFile) {
      addLog("→ Import mode: CSV/LinkedIn export flow not yet wired", "info");
      addLog("→ Configure Settings > Integrations or use Run Discovery instead", "info");
      return;
    }

    setIsProcessing(true);
    setProcessLog([]);

    addLog("→ Running discovery cascade (DB → Lead Search providers)...", "system");
    addLog(`→ Target: ${form?.maxLeads || 100} leads — DB first, then cascade for remaining`, "info");
    await sleep(200);
    addLog(`→ ICP: ${form?.industry || "—"}, ${(form?.employeeSizes || ["51-200"]).join(", ")} employees`, "info");
    if (form?.keywords) addLog(`→ Keywords: ${form.keywords}`, "info");
    addLog(`→ Target roles: ${(form?.roles || []).join(", ")}`, "info");
    addLog(`→ Regions: ${(form?.regions || []).join(", ")}`, "info");
    if (form?.lookalikeOnly && form?.lookalike) addLog(`→ Lookalike mode: seed domains`, "info");

    try {
      const result = await api.leadGeneration.discover({
        listName: form?.listName,
        industry: form?.industry,
        keywords: form?.keywords,
        employeeSizes: form?.employeeSizes || ["51-200"],
        regions: form?.regions,
        roles: form?.roles,
        maxLeads: form?.maxLeads ? parseInt(form.maxLeads, 10) : null,
        lookalikeOnly: form?.lookalikeOnly || false,
        lookalike: form?.lookalike,
      });

      const companies = result.companies || [];
      const source = result.source || "unknown";
      const sqlQueries = result.sqlQueries || [];
      const waterfallLog = result.waterfallLog || [];

      if (typeof console !== "undefined" && console.log) {
        console.log("[Discovery] API result:", { count: companies.length, source, sqlQueriesCount: sqlQueries?.length ?? 0, sqlQueries, waterfallLog });
      }

      if (Array.isArray(sqlQueries) && sqlQueries.length > 0) {
        addLog(`\n→ Postgres SQL queries run (${sqlQueries.length}):`, "system");
        for (const q of sqlQueries) {
          const paramsStr = (q.params || []).map((p, i) => `$${i + 1}=${JSON.stringify(p)}`).join(", ");
          addLog(`  [${q.label}] → ${q.rowCount ?? "?"} rows`, "info");
          const sqlOneLine = (q.sql || "").replace(/\s+/g, " ").trim();
          addLog(`  SQL: ${sqlOneLine}`, "dim");
          if (paramsStr) addLog(`  Params: ${paramsStr}`, "dim");
        }
      } else if (source === "postgres") {
        addLog(`\n→ Postgres ran but returned no matching companies`, "info");
      }
      if (Array.isArray(waterfallLog) && waterfallLog.length > 0) {
        addLog(`\n→ Cascade (Lead Search order):`, "system");
        for (const w of waterfallLog) {
          const status = w.tried ? (w.count > 0 ? `+${w.count} companies added` : (w.error ? `failed: ${w.error}` : "0 new companies")) : (w.reason || "skipped");
          addLog(`  ${w.key}: ${status}`, w.tried && w.count > 0 ? "data" : "dim");
        }
      }
      addLog(`→ Total: ${companies.length} companies (source: ${source})`, "info");

      if (companies.length === 0) {
        addLog(`⚠ No companies found with current criteria`, "info");
        addLog("→ DB: try broader Industry (e.g. B2B SaaS), fewer employee filters, or North America only", "info");
        addLog("→ Settings > Integrations: connect IcyPeas, AI Ark, or other providers for cascade fallback", "info");
        addLog(`\n→ Run these cURL commands manually (replace YOUR_*_API_KEY):`, "system");
        const industry = form?.industry || "HVAC";
        const keywords = (form?.keywords || "").split(",").map(k => k.trim()).filter(Boolean) || [industry];
        const roles = form?.roles?.length ? form.roles : ["CEO", "CTO", "VP Sales"];
        const regions = form?.regions || ["North America"];
        const locIcyPeas = regions.flatMap(r => {
          const s = String(r || "").toLowerCase();
          if (s.includes("north america")) return ["US", "CA", "MX"];
          if (s.includes("latin america")) return ["BR", "MX", "AR", "CO"];
          if (s.includes("europe")) return ["GB", "DE", "FR", "NL", "ES", "IT"];
          if (s.includes("asia") && s.includes("pacific")) return ["JP", "AU", "SG", "IN", "KR"];
          if (s.includes("mena")) return ["AE", "SA"];
          return [r];
        });
        const locAiArk = regions.flatMap(r => {
          const s = String(r || "").toLowerCase();
          if (s.includes("north america")) return ["United States", "Canada", "Mexico"];
          if (s.includes("latin america")) return ["Brazil", "Mexico", "Argentina", "Colombia"];
          if (s.includes("europe")) return ["United Kingdom", "Germany", "France", "Netherlands", "Spain", "Italy"];
          if (s.includes("asia") && s.includes("pacific")) return ["Japan", "Australia", "Singapore", "India"];
          if (s.includes("mena")) return ["United Arab Emirates", "Saudi Arabia"];
          return [r];
        });
        const kwList = [...new Set([industry, ...keywords])].filter(Boolean);
        addLog(`\nIcyPeas (find people):`, "dim");
        const icypeasBody = JSON.stringify({ query: { currentJobTitle: { include: roles }, location: { include: [...new Set(locIcyPeas)] }, keyword: { include: kwList }, headcount: { ">=": 1 } }, pagination: { size: 100 } });
        addLog(`curl -X POST "https://app.icypeas.com/api/find-people" -H "Content-Type: application/json" -H "Authorization: YOUR_ICYPEAS_API_KEY" -d '${icypeasBody.replace(/'/g, "'\\''")}'`, "dim");
        addLog(`\nAI Ark (company search):`, "dim");
        const aiArkBody = JSON.stringify({ page: 0, size: 100, account: { industry: { any: { include: [industry] } }, keyword: { any: { include: { mode: "SMART", content: kwList } } }, location: { any: { include: [...new Set(locAiArk)] } } } });
        addLog(`curl -X POST "https://api.ai-ark.com/api/developer-portal/v1/companies" -H "Content-Type: application/json" -H "X-TOKEN: YOUR_AI_ARK_API_KEY" -d '${aiArkBody.replace(/'/g, "'\\''")}'`, "dim");
        setDiscoveredLeads([]);
        setSelectedLeads(new Set());
        setIsProcessing(false);
      } else {
        for (const c of companies.slice(0, 10)) {
          addLog(`  + ${c.name} — ${c.industry || "—"} — ICP: ${c.icpScore || 90}%`, "data");
        }
        if (companies.length > 10) addLog(`  ... and ${companies.length - 10} more`, "dim");
        addLog(`\n✓ Discovery complete: ${companies.length} companies matched`, "success");
        setDiscoveredLeads(companies);
        setSelectedLeads(new Set(companies.map(c => c.id)));
        setStep(1);
      }

      setIsProcessing(false);
    } catch (err) {
      addLog(`✗ Discovery failed: ${err.message}`, "error");
      addLog("→ Check Settings > Integrations for configured lead search credentials", "info");
      setDiscoveredLeads([]);
      setSelectedLeads(new Set());
      setIsProcessing(false);
    }
  };

  const runEnrichment = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    const selected = discoveredLeads.filter(c => selectedLeads.has(c.id));
    addLog("→ Checking DB enrichment cache (skip if enriched < 30 days)...", "system");
    addLog("→ Using Lead Search cascade for person finding, Lead Enrichment cascade for email", "info");

    let allContacts = [];
    try {
      const enrichBulkFn = api?.leadGeneration?.enrichBulk;
      if (typeof enrichBulkFn !== "function") {
        addLog(`✗ Enrichment failed: api.leadGeneration.enrichBulk is not available`, "error");
        if (typeof console !== "undefined") console.error("[Enrichment] api.leadGeneration:", api?.leadGeneration);
        setIsProcessing(false);
        return;
      }
      addLog(`→ Calling enrich/bulk for ${selected.length} companies…`, "info");
      const result = await enrichBulkFn({
        companies: selected.map(c => ({
          id: c.id,
          name: c.name,
          domain: c.domain || c.website?.replace?.(/^https?:\/\//, ''),
          industry: c.industry,
          website: c.website,
        })),
        roles: icpForm.roles || ["CEO", "CTO", "VP Sales"],
        listName: icpForm.listName || undefined,
      });
      allContacts = (result.contacts || []).map((c, i) => ({
        ...c,
        id: c.id || `gen-${i + 1}`,
      }));
      const logs = result.enrichmentLog || [];
      for (const entry of logs) {
        const type = entry.type === "error" ? "error" : entry.type === "warn" ? "warning" : "info";
        addLog(entry.msg, type);
      }
      const fromCache = allContacts.filter(c => c.fromCache).length;
      const enriched = allContacts.length - fromCache;
      if (fromCache > 0) addLog(`→ Loaded ${fromCache} contacts from cache (enriched < 30 days)`, "info");
      if (enriched > 0) addLog(`→ Enriched ${enriched} new contacts via waterfall`, "info");
      addLog(`\n✓ Enrichment complete: ${allContacts.length} contacts across ${selected.length} companies`, "success");
      const verified = allContacts.filter(c => c.bounceRisk === "low").length;
      addLog(`  Verified emails: ${verified}/${allContacts.length}`, "info");
    } catch (err) {
      addLog(`✗ Enrichment failed: ${err.message}`, "error");
      if (typeof console !== "undefined") console.error("[Enrichment] Error:", err);
    }

    setEnrichedContacts(allContacts);
    setSelectedContacts(new Set(allContacts.map(c => c.id)));
    setIsProcessing(false);
    setStep(2);
  };

  const skipPersonalization = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    const selected = enrichedContacts.filter(c => selectedContacts.has(c.id));
    addLog("→ Skipping personalization — using placeholder templates", "system");
    await sleep(600);
    const emails = {};
    for (const contact of selected) {
      emails[contact.id] = {
        subject: `Quick question for ${contact.company}`,
        body: `Hi ${contact.name.split(" ")[0]},\n\n[Personalized email body — to be written]\n\nBest,\n[Your name]`,
      };
    }
    addLog(`✓ ${selected.length} placeholder emails created`, "success");
    setPersonalizedEmails(emails);
    setIsProcessing(false);
    setStep(3);
  };

  const generatePreview = async () => {
    setIsPreviewLoading(true);
    const selected = enrichedContacts.filter(c => selectedContacts.has(c.id));
    const previewContacts = selected.slice(0, 3);
    const previews = {};
    const promptTemplate = savedPrompts[selectedPromptKey]?.text || promptText;
    
    try {
      for (const contact of previewContacts) {
        // Try to generate with OpenAI
        try {
          const leadData = {
            firstName: contact.name.split(" ")[0],
            lastName: contact.name.split(" ").slice(1).join(" "),
            fullName: contact.name,
            company: contact.company,
            title: contact.title,
            industry: icpForm.industry,
            linkedinActivity: contact.linkedinData ? `${contact.linkedinData.connections} connections, ${contact.linkedinData.posts} recent posts` : "no LinkedIn data",
          };
          
          const result = await api.leadGeneration.personalize({
            prompt: promptTemplate,
            leadData
          });
          
          const subjectMatch = result.match(/Subject:\s*(.+)/i);
          const bodyMatch = result.match(/Body:\s*([\s\S]+)/i);
          
          const subject = subjectMatch ? subjectMatch[1].trim() : `Connecting with ${contact.company}`;
          const body = bodyMatch ? bodyMatch[1].trim() : result.trim();
          
          previews[contact.id] = { subject, body };
          
        } catch (err) {
          previews[contact.id] = {
            subject: `Quick question for ${contact.name}`,
            body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\nBest,\n[Your name]`,
          };
        }
        
        await sleep(500);
      }
    } catch (err) {
      for (const contact of previewContacts) {
        previews[contact.id] = {
          subject: `Quick question for ${contact.name}`,
          body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\nBest,\n[Your name]`,
        };
      }
    }
    
    setPreviewEmails(previews);
    setIsPreviewLoading(false);
  };

  const approveAndPersonalizeAll = async () => {
    setShowPersonalizeModal(false);
    setIsApproved(true);
    setIsProcessing(true);
    setProcessLog([]);
    const selected = enrichedContacts.filter(c => selectedContacts.has(c.id));
    addLog("→ Connecting to OpenAI API (GPT-4o-mini)...", "system");
    await sleep(600);
    addLog("✓ Model ready", "success");
    addLog(`→ Using prompt: "${savedPrompts[selectedPromptKey]?.label || 'Custom'}"`, "info");
    addLog(`→ Generating for ${selected.length} contacts...\n`, "system");

    const emails = {};
    const promptTemplate = savedPrompts[selectedPromptKey]?.text || promptText;
    
    try {
      for (const contact of selected) {
        addLog(`→ Generating personalized email for ${contact.name} (${contact.company})...`, "system");
        
        try {
          // Prepare lead data for personalization
          const leadData = {
            firstName: contact.name.split(" ")[0],
            lastName: contact.name.split(" ").slice(1).join(" "),
            fullName: contact.name,
            company: contact.company,
            title: contact.title,
            industry: icpForm.industry,
            linkedinActivity: contact.linkedinData ? `${contact.linkedinData.connections} connections, ${contact.linkedinData.posts} recent posts` : "no LinkedIn data",
          };
          
          // Call OpenAI for personalization
          const result = await api.leadGeneration.personalize({
            prompt: promptTemplate,
            leadData
          });
          
          // Parse result (assuming format: "Subject: ...\n\nBody: ...")
          const subjectMatch = result.match(/Subject:\s*(.+)/i);
          const bodyMatch = result.match(/Body:\s*([\s\S]+)/i);
          
          const subject = subjectMatch ? subjectMatch[1].trim() : `Connecting with ${contact.company}`;
          const body = bodyMatch ? bodyMatch[1].trim() : result.trim();
          
          emails[contact.id] = { subject, body };
          addLog(`  ✓ Subject: "${subject}"`, "data");
          
        } catch (err) {
          // Fallback to template if AI fails
          addLog(`  ✗ AI personalization failed, using template`, "dim");
          emails[contact.id] = { 
            subject: `Quick question for ${contact.company}`, 
            body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\nBest,\n[Your name]` 
          };
        }
        
        await sleep(300);
      }
      
      await sleep(400);
      addLog(`\n✓ Personalization complete: ${Object.keys(emails).length} emails generated`, "success");
      
    } catch (err) {
      addLog(`✗ Personalization error: ${err.message}`, "error");
      addLog("→ Using template fallback...", "info");
      for (const contact of selected) {
        emails[contact.id] = { 
          subject: `Quick question for ${contact.company}`, 
          body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\nBest,\n[Your name]` 
        };
      }
    }
    
    setPersonalizedEmails(emails);
    setIsProcessing(false);
    setStep(3);
  };

  const runQueueOutreach = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    const contacts = enrichedContacts.filter(c => selectedContacts.has(c.id));
    const listName = icpForm.listName || "Untitled List";

    addLog(`→ Saving lead list: "${listName}"...`, "system");
    
    // Create lead list in database
    let listId = null;
    try {
      const listResult = await api.leadLists.create({ 
        name: listName,
        icp_profile_data: icpForm 
      });
      listId = listResult.id;
      addLog(`✓ Lead list created (ID: ${listId})`, "success");
    } catch (err) {
      addLog(`⚠ Could not save to database: ${err.message}`, "info");
    }
    
    // Save companies and leads to database
    if (listId) {
      try {
        let savedCount = 0;
        for (const contact of contacts) {
          // Create/find company
          try {
            const companyData = discoveredLeads.find(c => c.name === contact.company);
            await api.companies.create({
              name: contact.company,
              domain: companyData?.website || companyData?.domain || '',
              industry: companyData?.industry || icpForm.industry,
              employees: companyData?.employees || null,
              location: companyData?.location || '',
              icpScore: companyData?.icpScore || null,
            });
          } catch (e) {
            // Company might already exist
          }
          
          // Create lead with personalized email
          try {
            const personalizedEmail = personalizedEmails[contact.id];
            await api.leads.create({
              list_id: listId,
              first_name: contact.name.split(" ")[0],
              last_name: contact.name.split(" ").slice(1).join(" "),
              email: contact.email !== 'Not found' ? contact.email : null,
              title: contact.title,
              linkedin_url: contact.linkedin || null,
              company_name: contact.company,
              company_domain: discoveredLeads.find(c => c.name === contact.company)?.website || null,
              email_bounce_risk: contact.bounceRisk || 'unknown',
              linkedinData: contact.linkedinData || null,
              personalisation_json: personalizedEmail ? {
                subject: personalizedEmail.subject,
                body: personalizedEmail.body,
                channel: channelAssignments[contact.id]?.email ? 'email' : channelAssignments[contact.id]?.linkedin ? 'linkedin' : 'none'
              } : null,
            });
            savedCount++;
          } catch (e) {
            console.error(`Failed to save lead ${contact.name}:`, e);
          }
        }
        addLog(`✓ ${savedCount}/${contacts.length} contacts saved to database`, "success");
      } catch (err) {
        addLog(`⚠ Some contacts could not be saved: ${err.message}`, "info");
      }
    }
    
    await sleep(300);
    addLog(``, "info");

    const emailContacts = contacts.filter(c => channelAssignments[c.id]?.email);
    const linkedinContacts = contacts.filter(c => channelAssignments[c.id]?.linkedin);
    const listOnlyContacts = contacts.filter(c => channelAssignments[c.id]?.listOnly);

    // Email outreach via Instantly.ai
    if (emailContacts.length > 0 && emailPlatform === "instantly") {
      addLog(`→ Connecting to Instantly.ai...`, "system");
      await sleep(600);
      
      try {
        const leadsData = emailContacts.map(contact => ({
          email: contact.email,
          first_name: contact.name.split(" ")[0],
          last_name: contact.name.split(" ").slice(1).join(" "),
          company: contact.company,
          personalization: personalizedEmails[contact.id]?.body || '',
        }));
        
        const result = await api.instantly.leads.bulk(leadsData, emailCampaignId || undefined);
        
        const successful = (result.results || []).filter(r => r.success).length;
        addLog(`✓ ${successful}/${emailContacts.length} leads added to Instantly campaign`, "success");
        
        for (const r of (result.results || [])) {
          if (r.success) {
            addLog(`  ✓ ${r.email}`, "data");
          } else {
            addLog(`  ✗ ${r.email} - failed`, "error");
          }
          await sleep(100);
        }
        
      } catch (err) {
        addLog(`✗ Instantly.ai error: ${err.message}`, "error");
        addLog(`→ ${emailContacts.length} leads saved locally`, "info");
        for (const contact of emailContacts) {
          addLog(`  + ${contact.name} → ${contact.email}`, "data");
          await sleep(100);
        }
      }
      
      await sleep(300);
      addLog(``, "info");
    }

    // LinkedIn outreach via HeyReach
    if (linkedinContacts.length > 0 && linkedinPlatform === "heyreach") {
      addLog(`→ Connecting to HeyReach...`, "system");
      await sleep(600);

      try {
        const leadsData = linkedinContacts.map(contact => ({
          profileUrl: contact.linkedin,
          firstName: contact.name.split(" ")[0],
          lastName: contact.name.split(" ").slice(1).join(" "),
          emailAddress: contact.email,
          companyName: contact.company,
          position: contact.title,
        }));

        await api.heyreach.campaigns.addLeadsDefault(leadsData, linkedinCampaignId || undefined);
        addLog(`✓ ${linkedinContacts.length} leads added to HeyReach campaign`, "success");

        for (const contact of linkedinContacts) {
          addLog(`  ✓ ${contact.name}`, "data");
          await sleep(100);
        }

      } catch (err) {
        addLog(`✗ HeyReach error: ${err.message}`, "error");
        addLog(`→ ${linkedinContacts.length} leads saved locally`, "info");
        for (const contact of linkedinContacts) {
          addLog(`  + ${contact.name} → ${contact.linkedin || "profile found"}`, "data");
          await sleep(100);
        }
      }

      await sleep(300);
      addLog(``, "info");
    }

    // LinkedIn outreach via AimFox
    if (linkedinContacts.length > 0 && linkedinPlatform === "aimfox") {
      addLog(`→ Connecting to AimFox...`, "system");
      await sleep(600);

      try {
        const leadsData = linkedinContacts.map(contact => ({
          profileUrl: contact.linkedin,
          firstName: contact.name.split(" ")[0],
          lastName: contact.name.split(" ").slice(1).join(" "),
          companyName: contact.company,
          position: contact.title,
        }));

        await api.aimfox.campaigns.addLeadsDefault(leadsData, linkedinCampaignId || undefined);
        addLog(`✓ ${linkedinContacts.length} leads added to AimFox campaign`, "success");

        for (const contact of linkedinContacts) {
          addLog(`  ✓ ${contact.name}`, "data");
          await sleep(100);
        }

      } catch (err) {
        addLog(`✗ AimFox error: ${err.message}`, "error");
        addLog(`→ ${linkedinContacts.length} leads saved locally`, "info");
        for (const contact of linkedinContacts) {
          addLog(`  + ${contact.name} → ${contact.linkedin || "profile found"}`, "data");
          await sleep(100);
        }
      }

      await sleep(300);
      addLog(``, "info");
    }

    if (listOnlyContacts.length > 0) {
      addLog(`→ ${listOnlyContacts.length} leads saved to list only (no outreach platform)`, "info");
    }

    await sleep(400);
    addLog(`\n✓ All done! Summary:`, "success");
    if (emailContacts.length > 0) addLog(`  📧 ${emailContacts.length} → Email (${emailPlatform === "instantly" ? "Instantly.ai" : "SmartLead"})`, "info");
    if (linkedinContacts.length > 0) addLog(`  💼 ${linkedinContacts.length} → LinkedIn (${linkedinPlatform === "heyreach" ? "HeyReach" : "AimFox"})`, "info");
    if (listOnlyContacts.length > 0) addLog(`  📋 ${listOnlyContacts.length} → List only`, "info");
    
    if (listId) {
      await sleep(200);
      addLog(`\n✓ Lead list "${listName}" saved to database!`, "success");
      addLog(`  View in "Outbound → Lead Lists"`, "info");
    }
    
    // Reset form for next campaign
    setIcpForm(prev => ({ ...prev, listName: "" }));

    setOutreachQueue(contacts.map(c => ({
      contact: c,
      email: personalizedEmails[c.id],
      channels: channelAssignments[c.id] || {},
      status: "queued",
    })));
    setIsProcessing(false);
    setStep(4);
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const STEPS = [
    { label: "01", name: "Define ICP", icon: "◎" },
    { label: "02", name: "Discover", icon: "⟐" },
    { label: "03", name: "Personalize", icon: "⟡" },
    { label: "04", name: "Campaigns", icon: "✦" },
    { label: "05", name: "Queued", icon: "➤" },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: FONT_BODY, fontSize: 14, display: "flex" }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* Left Sidebar */}
      <div style={{
        width: 220, flexShrink: 0, background: COLORS.surface,
        borderRight: `1px solid ${COLORS.border}`,
        display: "flex", flexDirection: "column", height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src={LOGO_SRC} alt="ConsultiX" style={{ height: 32, objectFit: "contain" }} />
          </div>
        </div>

        {/* Nav Items - All scrollable together */}
        <div style={{ flex: 1, overflow: "auto", paddingBottom: 40 }}>
          <div style={{ padding: "12px 10px", paddingBottom: 40 }}>

          {/* Project Selector — Above everything */}
          <div style={{ padding: "0 6px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, padding: "0 4px" }}>
              <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600 }}>PROJECT</span>
              <button onClick={() => { setNewProjectName(""); setShowAddProjectModal(true); }} style={{ padding: "2px 8px", borderRadius: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.accent, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: "pointer", lineHeight: 1 }} title="Add project">+</button>
            </div>
            {showAddProjectModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => !addProjectCreating && setShowAddProjectModal(false)}>
                <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, maxWidth: 360, width: "90%", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
                  <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>New Project</div>
                  <label style={{ display: "block", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Project name</label>
                  <input value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. Acme Corp AI Audit" style={{ width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 20 }} autoFocus />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <button onClick={() => !addProjectCreating && setShowAddProjectModal(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                    <button onClick={async () => {
                      const name = newProjectName.trim();
                      if (!name) return;
                      setAddProjectCreating(true);
                      try {
                        const project = await api.organisations.create({ name });
                        setAuditProjects(prev => [...prev, project]);
                        setSelectedAuditProject(String(project.id));
                        setShowAddProjectModal(false);
                        setNewProjectName("");
                      } catch (err) {
                        alert(err.message || "Failed to create project");
                      } finally {
                        setAddProjectCreating(false);
                      }
                    }} disabled={addProjectCreating || !newProjectName.trim()} style={{ padding: "10px 24px", background: (addProjectCreating || !newProjectName.trim()) ? COLORS.border : COLORS.accent, color: (addProjectCreating || !newProjectName.trim()) ? COLORS.textDim : COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: (addProjectCreating || !newProjectName.trim()) ? "not-allowed" : "pointer" }}>{addProjectCreating ? "Creating..." : "Create"}</button>
                  </div>
                </div>
              </div>
            )}
            <select value={selectedAuditProject ?? (auditProjects[0]?.id ? String(auditProjects[0].id) : "")} onChange={e => setSelectedAuditProject(e.target.value || null)} style={{
              width: "100%", padding: "8px 10px",
              background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6,
              color: COLORS.text, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, outline: "none", cursor: "pointer",
            }}>
              {auditProjects.length === 0 ? <option value="" disabled>Loading...</option> : auditProjects.map(p => <option key={p.id} value={String(p.id)}>{p.client}</option>)}
            </select>
          </div>

          {[
            { key: "dashboard", label: "Dashboard", icon: "🏠", desc: "Overview & metrics" },
          ].map(page => (
            <button key={page.key} onClick={() => setActivePage(page.key)} style={{ width: "100%", padding: "10px 12px", marginBottom: 2, background: activePage === page.key ? COLORS.accentBg : "transparent", border: activePage === page.key ? `1px solid ${COLORS.accent}22` : "1px solid transparent", borderRadius: 8, color: activePage === page.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
              <span style={{ fontSize: 16 }}>{page.icon}</span>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{page.label}</div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, marginTop: 1 }}>{page.desc}</div></div>
            </button>
          ))}

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, padding: "16px 10px 8px", marginBottom: 4 }}>
            CRM
          </div>
          {[
            { key: "crm", label: "CRM Pipeline", icon: "📊", desc: "Track & manage deals" },
            { key: "appointments", label: "Appointments", icon: "📅", desc: "Calls & calendar" },
            { key: "unibox", label: "Unibox", icon: "📥", desc: "Unified inbox & AI SDR" },
          ].map(page => (
            <button key={page.key} onClick={() => setActivePage(page.key)} style={{ width: "100%", padding: "10px 12px", marginBottom: 2, background: activePage === page.key ? COLORS.accentBg : "transparent", border: activePage === page.key ? `1px solid ${COLORS.accent}22` : "1px solid transparent", borderRadius: 8, color: activePage === page.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
              <span style={{ fontSize: 16 }}>{page.icon}</span>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{page.label}</div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, marginTop: 1 }}>{page.desc}</div></div>
            </button>
          ))}

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, padding: "16px 10px 8px", marginBottom: 4 }}>
            SOLUTIONS
          </div>
          {[
            { key: "audit", label: "Strategy", icon: "🔍", desc: "Client assessments" },
            { key: "implementation", label: "Implementation", icon: "📋", desc: "Project delivery" },
            { key: "workflows", label: "Workflows", icon: "⚙️", desc: "Automation library" },
            { key: "council", label: "AI Council", icon: "🧠", desc: "Strategic advisor" },
            { key: "sol_assistant", label: "AI Assistant", icon: "🤖", desc: "Ask anything" },
          ].map(page => (
            <button key={page.key} onClick={() => setActivePage(page.key)} style={{ width: "100%", padding: "10px 12px", marginBottom: 2, background: activePage === page.key ? COLORS.accentBg : "transparent", border: activePage === page.key ? `1px solid ${COLORS.accent}22` : "1px solid transparent", borderRadius: 8, color: activePage === page.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
              <span style={{ fontSize: 16 }}>{page.icon}</span>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{page.label}</div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, marginTop: 1 }}>{page.desc}</div></div>
            </button>
          ))}

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, padding: "16px 10px 8px", marginBottom: 4 }}>
            CAMPAIGNS
          </div>
          {[
            { key: "niche_researcher", label: "Niche Researcher", icon: "🎯", desc: "Find your ideal niche" },
            { key: "leads", label: "Leads", icon: "⚡", desc: "Build & send campaigns" },
            { key: "leadlists", label: "Lead Lists", icon: "📋", desc: "View scraped data" },
            { key: "campaigns_messaging", label: "Messaging", icon: "📝", desc: "AI copywriting workshop" },
            { key: "campaigns_email", label: "Cold Email", icon: "📧", desc: "Native email automation" },
            { key: "campaigns_linkedin", label: "LinkedIn", icon: "💼", desc: "Native outreach automation" },
          ].map(page => (
            <button key={page.key} onClick={() => setActivePage(page.key)} style={{ width: "100%", padding: "10px 12px", marginBottom: 2, background: activePage === page.key ? COLORS.accentBg : "transparent", border: activePage === page.key ? `1px solid ${COLORS.accent}22` : "1px solid transparent", borderRadius: 8, color: activePage === page.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
              <span style={{ fontSize: 16 }}>{page.icon}</span>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{page.label}</div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, marginTop: 1 }}>{page.desc}</div></div>
            </button>
          ))}

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, padding: "16px 10px 8px", marginBottom: 4 }}>
            SALES
          </div>
          {[
            { key: "sales_scripts", label: "Script Generator", icon: "📞", desc: "Cold call & discovery scripts" },
            { key: "sales_analyser", label: "Call Analyser", icon: "📊", desc: "AI call feedback" },
          ].map(page => (
            <button key={page.key} onClick={() => setActivePage(page.key)} style={{ width: "100%", padding: "10px 12px", marginBottom: 2, background: activePage === page.key ? COLORS.accentBg : "transparent", border: activePage === page.key ? `1px solid ${COLORS.accent}22` : "1px solid transparent", borderRadius: 8, color: activePage === page.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
              <span style={{ fontSize: 16 }}>{page.icon}</span>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{page.label}</div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, marginTop: 1 }}>{page.desc}</div></div>
            </button>
          ))}

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, padding: "16px 10px 8px", marginBottom: 4 }}>
            CONTENT
          </div>
          {[
            { key: "content_linkedin", label: "LinkedIn", icon: "✍️", desc: "Posts, carousels & scheduling" },
            { key: "content_community", label: "Community", icon: "💬", desc: "Engagement & responses" },
            { key: "content_video", label: "Video (Short Form)", icon: "🎬", desc: "Scripts, ideas & repurposing" },
          ].map(page => (
            <button key={page.key} onClick={() => setActivePage(page.key)} style={{ width: "100%", padding: "10px 12px", marginBottom: 2, background: activePage === page.key ? COLORS.accentBg : "transparent", border: activePage === page.key ? `1px solid ${COLORS.accent}22` : "1px solid transparent", borderRadius: 8, color: activePage === page.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}>
              <span style={{ fontSize: 16 }}>{page.icon}</span>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{page.label}</div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, marginTop: 1 }}>{page.desc}</div></div>
            </button>
          ))}
          
          {icpForm.listName && step > 0 && activePage === "leads" && (
            <div style={{ padding: "4px 8px", marginTop: 16, marginBottom: 8, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6 }}>
              <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 2 }}>ACTIVE LIST</div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.accent, wordBreak: "break-word" }}>{icpForm.listName}</div>
            </div>
          )}

          {/* Settings & Account Footer */}
          <div style={{ paddingTop: 16, marginTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
            <button
              onClick={() => setActivePage("settings")}
              style={{
                width: "100%", padding: "10px 12px",
                background: activePage === "settings" ? COLORS.accentBg : "transparent",
                border: activePage === "settings" ? `1px solid ${COLORS.accent}22` : "1px solid transparent",
                borderRadius: 8,
                color: activePage === "settings" ? COLORS.accent : COLORS.textMuted,
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
                cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 10,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 16 }}>⚙️</span>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Settings</div>
            </button>
            <button
              onClick={() => setActivePage("account")}
              style={{
                width: "100%", padding: "10px 12px",
                background: activePage === "account" ? COLORS.accentBg : "transparent",
                border: activePage === "account" ? `1px solid ${COLORS.accent}22` : "1px solid transparent",
                borderRadius: 8,
                color: activePage === "account" ? COLORS.accent : COLORS.textMuted,
                fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500,
                cursor: "pointer", textAlign: "left",
                display: "flex", alignItems: "center", gap: 10,
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: 16 }}>👤</span>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Account</div>
            </button>
          </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>

        {activePage === "dashboard" && <DashboardView setActivePage={setActivePage} projectId={selectedAuditProject} />}

        {activePage === "leads" && (<>
          {/* Step Nav */}
          <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface, flexShrink: 0 }}>
            {STEPS.map((s, i) => (
              <button
                key={i}
                onClick={() => { if (i <= step) setStep(i); }}
                style={{
                  flex: 1, padding: "14px 16px", background: i === step ? COLORS.bg : "transparent",
                  border: "none", borderBottom: i === step ? `2px solid ${COLORS.accent}` : "2px solid transparent",
                  color: i === step ? COLORS.accent : i < step ? COLORS.text : COLORS.textDim,
                  cursor: i <= step ? "pointer" : "default", fontFamily: FONT, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all 0.2s",
                  opacity: i <= step ? 1 : 0.4,
                }}
              >
                <span style={{ fontSize: 14 }}>{i < step ? "✓" : s.icon}</span>
                <span style={{ fontWeight: 600 }}>{s.name}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Main Panel */}
            <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
              {step === 0 && <ICPForm form={icpForm} setForm={setIcpForm} onSubmit={runDiscovery} isProcessing={isProcessing} canRunDiscovery={discoverCanRun} />}
              {step === 1 && <DiscoveryPanel leads={discoveredLeads} selected={selectedLeads} setSelected={setSelectedLeads} onNext={runEnrichment} isProcessing={isProcessing} />}
              {step === 2 && <EnrichmentPanel
                contacts={enrichedContacts} selected={selectedContacts} setSelected={setSelectedContacts}
                expanded={expandedContact} setExpanded={setExpandedContact}
                onPersonalize={() => { setPreviewEmails(null); setIsApproved(false); setShowPersonalizeModal(true); }}
                onSkip={skipPersonalization} isProcessing={isProcessing}
              />}
              {step === 3 && <CampaignSetupPanel
                contacts={enrichedContacts.filter(c => selectedContacts.has(c.id))}
                emails={personalizedEmails}
                channelAssignments={channelAssignments} setChannelAssignments={setChannelAssignments}
                emailPlatform={emailPlatform} setEmailPlatform={setEmailPlatform}
                emailCampaign={emailCampaign} setEmailCampaign={setEmailCampaign}
                setEmailCampaignId={setEmailCampaignId}
                linkedinPlatform={linkedinPlatform} setLinkedinPlatform={setLinkedinPlatform}
                linkedinCampaign={linkedinCampaign} setLinkedinCampaign={setLinkedinCampaign}
                setLinkedinCampaignId={setLinkedinCampaignId}
                showEmailPreview={showEmailPreview} setShowEmailPreview={setShowEmailPreview}
                onQueue={runQueueOutreach} isProcessing={isProcessing}
                listName={icpForm.listName || "Untitled List"}
              />}
              {step === 4 && <QueuedPanel queue={outreachQueue} listName={icpForm.listName || "Untitled List"} emailPlatform={emailPlatform} linkedinPlatform={linkedinPlatform} emailCampaign={emailCampaign} linkedinCampaign={linkedinCampaign} />}
            </div>

            {/* Personalization Modal */}
            {showPersonalizeModal && (
              <PersonalizeModal
                contacts={enrichedContacts.filter(c => selectedContacts.has(c.id))}
                promptText={promptText}
                setPromptText={setPromptText}
                selectedPromptKey={selectedPromptKey}
                setSelectedPromptKey={setSelectedPromptKey}
                savedPrompts={savedPrompts}
                previewEmails={previewEmails}
                isPreviewLoading={isPreviewLoading}
                onPreview={generatePreview}
                onApprove={approveAndPersonalizeAll}
                onClose={() => setShowPersonalizeModal(false)}
                totalContacts={enrichedContacts.filter(c => selectedContacts.has(c.id)).length}
              />
            )}

            {/* Log Panel */}
            <div style={{ width: 360, borderLeft: `1px solid ${COLORS.border}`, background: COLORS.surface, display: "flex", flexDirection: "column", flexShrink: 0 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.08em", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: isProcessing ? COLORS.accent : COLORS.textDim, boxShadow: isProcessing ? `0 0 8px ${COLORS.accent}` : "none", transition: "all 0.3s" }} />
                AGENT LOG
                {isProcessing && <ProgressDots active={true} />}
              </div>
              <div ref={logRef} style={{ flex: 1, overflow: "auto", padding: "12px 16px", fontFamily: FONT, fontSize: 11.5, lineHeight: 1.7 }}>
                {processLog.length === 0 && (
                  <div style={{ color: COLORS.textDim, padding: "40px 0", textAlign: "center" }}>
                    Agent activity will appear here
                  </div>
                )}
                {processLog.map((log, i) => (
                  <div key={i} style={{ color: log.type === "success" ? COLORS.accent : log.type === "data" ? COLORS.blue : log.type === "dim" ? COLORS.textDim : log.type === "system" ? COLORS.textMuted : COLORS.text, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {log.msg}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>)}

        {activePage === "leadlists" && (
          <LeadListsView
            outreachQueue={outreachQueue}
            enrichedContacts={enrichedContacts}
            personalizedEmails={personalizedEmails}
            channelAssignments={channelAssignments}
            listName={icpForm.listName || "Untitled List"}
            emailPlatform={emailPlatform}
            linkedinPlatform={linkedinPlatform}
            emailCampaign={emailCampaign}
            linkedinCampaign={linkedinCampaign}
          />
        )}

        {activePage === "crm" && <CRMPipelineView projectId={selectedAuditProject} />}
        {activePage === "appointments" && <AppointmentsView setActivePage={setActivePage} />}
        {activePage === "unibox" && <UniboxView projectId={selectedAuditProject} />}

        {activePage === "audit" && <AuditView project={auditProjects.find(p => String(p.id) === String(selectedAuditProject))} projects={auditProjects} selectedProject={selectedAuditProject} setSelectedProject={setSelectedAuditProject} />}
        {activePage === "implementation" && <ImplementationView project={auditProjects.find(p => String(p.id) === String(selectedAuditProject))} />}
        {activePage === "workflows" && <WorkflowsLibraryView />}
        {activePage === "council" && <AICouncilView />}

        {activePage === "campaigns_messaging" && <MessagingWorkshopView />}
        {activePage === "campaigns_email" && <ColdEmailCampaignsView setActivePage={setActivePage} />}
        {activePage === "campaigns_linkedin" && <LinkedInCampaignsView setActivePage={setActivePage} />}

        {activePage === "content_linkedin" && <LinkedInContentView />}
        {activePage === "content_community" && <CommunityView />}
        {activePage === "content_video" && <VideoScriptView />}
        {activePage === "niche_researcher" && <NicheResearcherView setActivePage={setActivePage} setIcpForm={setIcpForm} />}
        {activePage === "sales_scripts" && <SalesScriptGeneratorView />}
        {activePage === "sales_analyser" && <SalesCallAnalyserView />}
        {activePage === "sol_assistant" && <SolutionAIAssistantView />}
        {activePage === "settings" && <SettingsView />}
        {activePage === "account" && <AccountView />}
      </div>
    </div>
  );
}

function StatusPill({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 20, background: `${color}11`, border: `1px solid ${color}22`, fontSize: 11, fontFamily: FONT, color: color, fontWeight: 500 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      {label}
    </div>
  );
}

// --- Step Panels ---

function TagSelect({ label, presets, selected, onChange, placeholder, labelStyle, inputStyle }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (item) => {
    onChange(selected.includes(item) ? selected.filter(s => s !== item) : [...selected, item]);
  };

  const addCustom = () => {
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed]);
    }
    setCustomInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); addCustom(); }
    if (e.key === "Backspace" && !customInput && selected.length > 0) {
      onChange(selected.slice(0, -1));
    }
  };

  return (
    <div ref={wrapperRef}>
      <label style={labelStyle}>{label}</label>
      {/* Selected Tags + Input */}
      <div
        onClick={() => setIsOpen(true)}
        style={{
          ...inputStyle,
          display: "flex", flexWrap: "wrap", gap: 6, padding: "8px 12px",
          minHeight: 44, cursor: "text", alignItems: "center",
        }}
      >
        {selected.map(item => (
          <span key={item} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 10px", borderRadius: 6,
            background: COLORS.accentBg, border: `1px solid ${COLORS.accent}33`,
            fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.accent,
            whiteSpace: "nowrap",
          }}>
            {item}
            <span
              onClick={(e) => { e.stopPropagation(); toggle(item); }}
              style={{ cursor: "pointer", fontSize: 13, lineHeight: 1, opacity: 0.6 }}
            >×</span>
          </span>
        ))}
        <input
          value={customInput}
          onChange={e => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={selected.length === 0 ? placeholder : ""}
          style={{
            border: "none", outline: "none", background: "transparent",
            color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13,
            flex: 1, minWidth: 120, padding: "2px 0",
          }}
        />
      </div>
      {/* Dropdown */}
      {isOpen && (
        <div style={{
          marginTop: 4, padding: "8px", background: COLORS.surface,
          border: `1px solid ${COLORS.border}`, borderRadius: 8,
          maxHeight: 200, overflow: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {presets.map(item => {
              const isSelected = selected.includes(item);
              return (
                <div
                  key={item}
                  onClick={() => toggle(item)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                    background: isSelected ? COLORS.accentBg : "transparent",
                    border: `1px solid ${isSelected ? COLORS.accent + "44" : COLORS.border}`,
                    transition: "all 0.12s", userSelect: "none",
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 3,
                    border: `2px solid ${isSelected ? COLORS.accent : COLORS.borderActive}`,
                    background: isSelected ? COLORS.accent : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: COLORS.bg, fontWeight: 700, flexShrink: 0,
                  }}>
                    {isSelected && "✓"}
                  </div>
                  <span style={{
                    fontFamily: FONT, fontSize: 11, fontWeight: 500,
                    color: isSelected ? COLORS.accent : COLORS.textMuted,
                  }}>{item}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ICPForm({ form, setForm, onSubmit, isProcessing, canRunDiscovery = true }) {
  const [lookalikeOnly, setLookalikeOnly] = useState(false);
  const [importMode, setImportMode] = useState(false);
  const [importedFile, setImportedFile] = useState(null);

  const EMPLOYEE_RANGES = [
    "1-10", "11-50", "51-200", "201-500", "501-1,000", "1,001-5,000", "5,000+"
  ];

  const inputStyle = {
    width: "100%", padding: "12px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 14,
    outline: "none", transition: "border 0.2s", boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block", fontFamily: FONT, fontSize: 11, color: COLORS.textMuted,
    marginBottom: 6, letterSpacing: "0.05em", fontWeight: 600,
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {!canRunDiscovery && (
        <div style={{
          padding: "14px 18px", marginBottom: 24, background: COLORS.warnBg, border: `1px solid ${COLORS.warn}44`,
          borderRadius: 10, fontSize: 14, color: COLORS.text,
        }}>
          Run Discovery cannot run because no lead search integrations are configured. Configure at least one integration in <strong>Settings → Integrations</strong>.
        </div>
      )}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          Define Your <span style={{ color: COLORS.accent }}>Ideal Customer</span>
        </h2>
        <p style={{ color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
          {lookalikeOnly
            ? "Paste company domains and AI Ark will find similar companies."
            : "AI Ark will use this profile to find companies with 95%+ ICP match."}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* List Name */}
        <div>
          <label style={labelStyle}>LIST NAME</label>
          <input
            value={form.listName || ""}
            onChange={e => setForm({ ...form, listName: e.target.value })}
            placeholder="e.g. Q1 SaaS VP Growth — North America"
            style={{
              ...inputStyle,
              fontSize: 15,
              fontWeight: 500,
              padding: "14px 16px",
              borderColor: form.listName ? COLORS.accent + "44" : COLORS.border,
              background: form.listName ? COLORS.accentBg : COLORS.surface,
            }}
            onFocus={e => e.target.style.borderColor = COLORS.borderActive}
            onBlur={e => e.target.style.borderColor = form.listName ? COLORS.accent + "44" : COLORS.border}
          />
          <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4, fontFamily: FONT }}>
            This name follows your leads through the entire pipeline
          </div>
        </div>

        {/* Import Toggle */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: importMode ? COLORS.blue + "08" : COLORS.surface,
          border: `1px solid ${importMode ? COLORS.blue + "33" : COLORS.border}`,
          borderRadius: 10, transition: "all 0.25s",
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>I have an existing list</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              Upload a CSV or LinkedIn export instead of searching
            </div>
          </div>
          <div
            onClick={() => { setImportMode(!importMode); if (!importMode) setLookalikeOnly(false); }}
            style={{
              width: 48, height: 26, borderRadius: 13, cursor: "pointer",
              background: importMode ? COLORS.blue : COLORS.borderActive,
              position: "relative", transition: "background 0.25s", flexShrink: 0, marginLeft: 16,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: importMode ? 25 : 3,
              transition: "left 0.25s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
        </div>

        {/* Import Mode — Drag & Drop */}
        {importMode && (
          <>
            <div
              onClick={() => setImportedFile({ name: "linkedin_connections.csv", rows: 247 })}
              style={{ padding: "40px", background: COLORS.surface, border: `2px dashed ${importedFile ? COLORS.accent + "66" : COLORS.border}`, borderRadius: 12, textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "66"}
              onMouseLeave={e => { if (!importedFile) e.currentTarget.style.borderColor = COLORS.border; }}
            >
              {!importedFile ? (
                <>
                  <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.3 }}>⬆️</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 4 }}>Drag & drop your file here</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>or click to browse</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>CSV, XLSX, TXT · Up to 10,000 rows</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.accent }}>{importedFile.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{importedFile.rows} rows detected</div>
                  <div style={{ fontSize: 11, color: COLORS.blue, marginTop: 6, cursor: "pointer" }} onClick={e => { e.stopPropagation(); setImportedFile(null); }}>Remove & upload different file</div>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["LinkedIn Connections", "Sales Nav Export", "CRM Export"].map((src, i) => (
                <div key={i} onClick={() => setImportedFile({ name: `${src.toLowerCase().replace(/ /g, "_")}.csv`, rows: [247, 89, 412][i] })} style={{ flex: 1, padding: "10px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, textAlign: "center", cursor: "pointer", fontSize: 11, color: COLORS.textMuted, fontWeight: 500, transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "44"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
                >{["💼", "🎯", "🏢"][i]} {src}</div>
              ))}
            </div>
          </>
        )}

        {/* Toggle Switch — Lookalike (hidden in import mode) */}
        {!importMode && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: lookalikeOnly ? COLORS.accentBg : COLORS.surface,
          border: `1px solid ${lookalikeOnly ? COLORS.accentDim + "44" : COLORS.border}`,
          borderRadius: 10, transition: "all 0.25s",
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Lookalike Search Only</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              Skip ICP targeting — just find companies similar to ones you provide
            </div>
          </div>
          <div
            onClick={() => setLookalikeOnly(!lookalikeOnly)}
            style={{
              width: 48, height: 26, borderRadius: 13, cursor: "pointer",
              background: lookalikeOnly ? COLORS.accent : COLORS.borderActive,
              position: "relative", transition: "background 0.25s", flexShrink: 0, marginLeft: 16,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: lookalikeOnly ? 25 : 3,
              transition: "left 0.25s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
        </div>
        )}

        {/* ICP Targeting Fields — hidden when lookalike only or import mode */}
        {!lookalikeOnly && !importMode && (
          <>
            {/* Target Industry */}
            <div>
              <label style={labelStyle}>TARGET INDUSTRY</label>
              <input
                value={form.industry}
                onChange={e => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g. B2B SaaS, FinTech, Healthcare"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = COLORS.borderActive}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />
            </div>

            {/* Keywords */}
            <div>
              <label style={labelStyle}>KEYWORDS</label>
              <input
                value={form.keywords || ""}
                onChange={e => setForm({ ...form, keywords: e.target.value })}
                placeholder="e.g. AI automation, cold outreach, lead generation, SaaS tools"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = COLORS.borderActive}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />
              <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4, fontFamily: FONT }}>
                Use keywords to target companies by topic or niche
              </div>
            </div>

            {/* Employee Range Multi-Select */}
            <div>
              <label style={labelStyle}>COMPANY SIZE</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {EMPLOYEE_RANGES.map(range => {
                  const sizes = form.employeeSizes || ["51-200"];
                  const isSelected = sizes.includes(range);
                  return (
                    <div
                      key={range}
                      onClick={() => {
                        const current = form.employeeSizes || ["51-200"];
                        const next = isSelected
                          ? current.filter(r => r !== range)
                          : [...current, range];
                        setForm({ ...form, employeeSizes: next });
                      }}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                        background: isSelected ? COLORS.accentBg : COLORS.surface,
                        border: `1px solid ${isSelected ? COLORS.accentDim + "55" : COLORS.border}`,
                        transition: "all 0.15s", userSelect: "none",
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 3,
                        border: `2px solid ${isSelected ? COLORS.accent : COLORS.borderActive}`,
                        background: isSelected ? COLORS.accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, color: COLORS.bg, fontWeight: 700, flexShrink: 0,
                        transition: "all 0.15s",
                      }}>
                        {isSelected && "✓"}
                      </div>
                      <span style={{
                        fontFamily: FONT, fontSize: 12, fontWeight: 500,
                        color: isSelected ? COLORS.accent : COLORS.textMuted,
                      }}>
                        {range}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Target Regions */}
            <TagSelect
              label="TARGET REGIONS"
              presets={["North America", "Asia Pacific", "Europe", "MENA", "UK & Ireland", "Latin America", "DACH", "Nordics", "Australia & NZ", "Africa"]}
              selected={form.regions || ["North America", "Europe"]}
              onChange={regions => setForm({ ...form, regions })}
              placeholder="Type a custom region and press Enter..."
              labelStyle={labelStyle}
              inputStyle={inputStyle}
            />

            {/* Target Roles */}
            <TagSelect
              label="TARGET ROLES / PERSONAS"
              presets={["CEO", "CTO", "COO", "CFO", "CMO", "CRO", "VP Sales", "VP Growth", "VP Marketing", "VP Engineering", "VP Operations", "Head of Product", "Head of Partnerships", "Director of Sales", "Director of Marketing", "Founder"]}
              selected={form.roles || ["CEO", "CTO", "Founder"]}
              onChange={roles => setForm({ ...form, roles })}
              placeholder="Type a custom role and press Enter..."
              labelStyle={labelStyle}
              inputStyle={inputStyle}
            />

            {/* Max Leads */}
            <div>
              <label style={labelStyle}>MAX LEADS TO DISCOVER</label>
              <input
                value={form.maxLeads || ""}
                onChange={e => setForm({ ...form, maxLeads: e.target.value.replace(/[^0-9]/g, "") })}
                placeholder="Leave blank for all results"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = COLORS.borderActive}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />
              <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4, fontFamily: FONT }}>
                {form.maxLeads ? `Will discover up to ${parseInt(form.maxLeads).toLocaleString()} companies` : "No limit — all matching companies will be returned"}
              </div>
            </div>
          </>
        )}

        {/* Lookalike Companies — only visible in lookalike-only mode */}
        {lookalikeOnly && !importMode && (
          <div>
            <label style={labelStyle}>SEED COMPANIES</label>
            <textarea
              value={form.lookalike}
              onChange={e => setForm({ ...form, lookalike: e.target.value })}
              placeholder={"Paste company domains here, one per line:\nstripe.com\nnotion.so\nfigma.com\nlinear.app"}
              rows={6}
              style={{
                ...inputStyle,
                resize: "vertical",
                minHeight: 140,
                lineHeight: 1.6,
              }}
              onFocus={e => e.target.style.borderColor = COLORS.borderActive}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
            <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4, fontFamily: FONT }}>
              AI Ark will analyze these companies and find similar ones matching the same profile
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => canRunDiscovery && onSubmit({ ...form, lookalikeOnly, importMode, importedFile })}
        disabled={isProcessing || (importMode && !importedFile) || !canRunDiscovery}
        style={{
          marginTop: 28, padding: "14px 32px",
          background: !canRunDiscovery || (importMode && !importedFile) ? COLORS.border : COLORS.accent,
          color: !canRunDiscovery || (importMode && !importedFile) ? COLORS.textDim : COLORS.bg,
          border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600,
          cursor: isProcessing || (importMode && !importedFile) || !canRunDiscovery ? "default" : "pointer",
          opacity: isProcessing ? 0.6 : 1,
          letterSpacing: "0.02em", transition: "all 0.2s",
        }}
      >
        {isProcessing ? "PROCESSING..." : importMode ? `IMPORT & ENRICH ${importedFile ? importedFile.rows + " LEADS" : ""} →` : lookalikeOnly ? "FIND LOOKALIKES →" : "RUN DISCOVERY →"}
      </button>
    </div>
  );
}

function DiscoveryPanel({ leads, selected, setSelected, onNext, isProcessing }) {
  const [showScrapeConfig, setShowScrapeConfig] = useState(false);
  const [scrapeConfig, setScrapeConfig] = useState({
    batchSize: 5000,
    scheduleEnabled: false,
    schedulePreset: "daily",
    customDays: 4,
    dedupEnabled: true,
  });
  const totalMatches = Math.max(leads.length, 37400);

  const getScheduleDays = () => {
    if (scrapeConfig.schedulePreset === "daily") return 1;
    if (scrapeConfig.schedulePreset === "weekly") return 7;
    if (scrapeConfig.schedulePreset === "biweekly") return 14;
    if (scrapeConfig.schedulePreset === "monthly") return 30;
    return scrapeConfig.customDays;
  };

  const handleBatchSlider = (e) => {
    const raw = parseInt(e.target.value);
    const snapped = raw <= 500 ? Math.round(raw / 100) * 100 : Math.round(raw / 500) * 500;
    setScrapeConfig({ ...scrapeConfig, batchSize: Math.max(100, snapped) });
  };

  const handleBatchInput = (e) => {
    const val = parseInt(e.target.value) || 0;
    setScrapeConfig({ ...scrapeConfig, batchSize: Math.min(10000, Math.max(0, val)) });
  };

  const toggleLead = id => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleScrapeConfirm = () => {
    setShowScrapeConfig(false);
    onNext();
  };

  return (
    <div>
      {/* Scrape Config Modal */}
      {showScrapeConfig && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={() => setShowScrapeConfig(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: "90%", maxWidth: 520, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 600 }}>Scrape & <span style={{ color: COLORS.accent }}>Enrich</span></div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>{totalMatches.toLocaleString()} leads match your criteria</div>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* Batch size */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600 }}>BATCH SIZE</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="number" value={scrapeConfig.batchSize} onChange={handleBatchInput} min={100} max={10000} step={100} style={{
                      width: 72, padding: "6px 8px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6,
                      color: COLORS.accent, fontFamily: FONT, fontSize: 14, fontWeight: 700, textAlign: "right", outline: "none",
                    }} />
                    <span style={{ fontSize: 11, color: COLORS.textDim }}>leads</span>
                  </div>
                </div>
                <div style={{ position: "relative", padding: "0 2px" }}>
                  <input type="range" min={100} max={10000} step={100} value={scrapeConfig.batchSize} onChange={handleBatchSlider} style={{
                    width: "100%", height: 6, appearance: "none", WebkitAppearance: "none", background: `linear-gradient(to right, ${COLORS.accent} ${(scrapeConfig.batchSize / 10000) * 100}%, ${COLORS.borderActive} ${(scrapeConfig.batchSize / 10000) * 100}%)`,
                    borderRadius: 3, outline: "none", cursor: "pointer",
                  }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                    <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim }}>100</span>
                    <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim }}>2,500</span>
                    <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim }}>5,000</span>
                    <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim }}>7,500</span>
                    <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim }}>10,000</span>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 8 }}>First batch of {scrapeConfig.batchSize.toLocaleString()} will start immediately</div>
              </div>

              {/* Schedule */}
              <div style={{ padding: "14px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: scrapeConfig.scheduleEnabled ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Schedule Remaining Batches</div>
                    <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>{Math.max(0, totalMatches - scrapeConfig.batchSize).toLocaleString()} leads remaining after first batch</div>
                  </div>
                  <div onClick={() => setScrapeConfig({ ...scrapeConfig, scheduleEnabled: !scrapeConfig.scheduleEnabled })} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: scrapeConfig.scheduleEnabled ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: scrapeConfig.scheduleEnabled ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
                {scrapeConfig.scheduleEnabled && (
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 }}>FREQUENCY</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      {[
                        { key: "daily", label: "Daily" },
                        { key: "weekly", label: "Weekly" },
                        { key: "biweekly", label: "Biweekly" },
                        { key: "monthly", label: "Monthly" },
                        { key: "custom", label: "Custom" },
                      ].map(opt => (
                        <button key={opt.key} onClick={() => setScrapeConfig({ ...scrapeConfig, schedulePreset: opt.key })} style={{
                          flex: 1, padding: "8px 4px", borderRadius: 6, cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 600,
                          border: `1px solid ${scrapeConfig.schedulePreset === opt.key ? COLORS.blue + "55" : COLORS.border}`,
                          background: scrapeConfig.schedulePreset === opt.key ? COLORS.blue + "10" : "transparent",
                          color: scrapeConfig.schedulePreset === opt.key ? COLORS.blue : COLORS.textDim,
                        }}>{opt.label}</button>
                      ))}
                    </div>
                    {scrapeConfig.schedulePreset === "custom" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 10px", background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>Every</span>
                        <input type="number" min={1} max={90} value={scrapeConfig.customDays} onChange={e => setScrapeConfig({ ...scrapeConfig, customDays: Math.max(1, Math.min(90, parseInt(e.target.value) || 1)) })} style={{
                          width: 48, padding: "4px 6px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 4,
                          color: COLORS.blue, fontFamily: FONT, fontSize: 13, fontWeight: 700, textAlign: "center", outline: "none",
                        }} />
                        <span style={{ fontSize: 12, color: COLORS.textMuted }}>days</span>
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: COLORS.blue, padding: "6px 10px", background: COLORS.blue + "08", borderRadius: 4, border: `1px solid ${COLORS.blue}22` }}>
                      ⏱ {Math.ceil((totalMatches - scrapeConfig.batchSize) / scrapeConfig.batchSize)} batches remaining · Completes in ~{Math.ceil(((totalMatches - scrapeConfig.batchSize) / scrapeConfig.batchSize) * getScheduleDays())} days
                    </div>
                  </div>
                )}
              </div>

              {/* Dedup */}
              <div style={{ padding: "14px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Exclude Duplicates</div>
                    <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>Skip contacts already in your workspace (42,000 existing leads)</div>
                  </div>
                  <div onClick={() => setScrapeConfig({ ...scrapeConfig, dedupEnabled: !scrapeConfig.dedupEnabled })} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: scrapeConfig.dedupEnabled ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: scrapeConfig.dedupEnabled ? 23 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
                {scrapeConfig.dedupEnabled && (
                  <div style={{ marginTop: 8, fontSize: 10, color: COLORS.green, padding: "6px 10px", background: COLORS.green + "08", borderRadius: 4, border: `1px solid ${COLORS.green}22` }}>
                    ✓ Estimated ~{Math.round(totalMatches * 0.76).toLocaleString()} unique leads after dedup · {Math.round(totalMatches * 0.24).toLocaleString()} duplicates will be skipped
                  </div>
                )}
              </div>

              {/* Summary */}
              <div style={{ padding: "14px 16px", background: COLORS.accent + "08", border: `1px solid ${COLORS.accent}33`, borderRadius: 10, marginBottom: 20 }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.accent, letterSpacing: "0.06em", marginBottom: 6 }}>SCRAPE SUMMARY</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, flexWrap: "wrap" }}>
                  <div><span style={{ color: COLORS.textDim }}>Total matches:</span> <strong>{totalMatches.toLocaleString()}</strong></div>
                  <div><span style={{ color: COLORS.textDim }}>First batch:</span> <strong>{Math.min(scrapeConfig.batchSize, totalMatches).toLocaleString()}</strong></div>
                  {scrapeConfig.scheduleEnabled && <div><span style={{ color: COLORS.textDim }}>Schedule:</span> <strong>{scrapeConfig.schedulePreset === "custom" ? `Every ${scrapeConfig.customDays}d` : scrapeConfig.schedulePreset.charAt(0).toUpperCase() + scrapeConfig.schedulePreset.slice(1)}</strong></div>}
                  {scrapeConfig.dedupEnabled && <div><span style={{ color: COLORS.textDim }}>Est. unique:</span> <strong style={{ color: COLORS.green }}>~{Math.round(totalMatches * 0.76).toLocaleString()}</strong></div>}
                </div>
                <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 6 }}>~{(Math.min(scrapeConfig.batchSize, totalMatches) * 85).toLocaleString()} credits for first batch · Enrichment settings apply to all batches</div>
              </div>
            </div>

            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowScrapeConfig(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleScrapeConfirm} style={{ padding: "10px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Start Scrape & Enrich →</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            <span style={{ color: COLORS.accent }}>{leads.length}</span> Companies Discovered
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>
            Showing {leads.length} preview results of <strong style={{ color: COLORS.text }}>{totalMatches.toLocaleString()}</strong> total matches. {selected.size} selected.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <button onClick={() => setShowScrapeConfig(true)} disabled={isProcessing || selected.size === 0} style={{
            padding: "12px 28px", background: selected.size > 0 ? COLORS.accent : COLORS.border, color: selected.size > 0 ? COLORS.bg : COLORS.textDim,
            border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
            cursor: isProcessing || selected.size === 0 ? "default" : "pointer", opacity: isProcessing ? 0.6 : 1,
          }}>
            {isProcessing ? "PROCESSING..." : `SCRAPE & ENRICH →`}
          </button>
          {selected.size > 0 && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim }}>
              {totalMatches.toLocaleString()} leads available · ~{(selected.size * 85).toLocaleString()} credits est.
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {leads.map(lead => (
          <div
            key={lead.id}
            onClick={() => toggleLead(lead.id)}
            style={{
              padding: "16px 20px", background: selected.has(lead.id) ? COLORS.accentBg : COLORS.surface,
              border: `1px solid ${selected.has(lead.id) ? COLORS.accentDim + "44" : COLORS.border}`,
              borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 16,
            }}
          >
            <div style={{
              width: 20, height: 20, borderRadius: 4, border: `2px solid ${selected.has(lead.id) ? COLORS.accent : COLORS.borderActive}`,
              background: selected.has(lead.id) ? COLORS.accent : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: COLORS.bg, fontWeight: 700, flexShrink: 0,
            }}>
              {selected.has(lead.id) && "✓"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{lead.name}</span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim }}>{lead.domain}</span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: COLORS.textMuted, flexWrap: "wrap" }}>
                <span>{lead.industry}</span>
                <span>📍 {lead.location}</span>
                <span>👥 {lead.employees}</span>
                <span>💰 {lead.revenue}</span>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 6, fontStyle: "italic" }}>
                📰 {lead.recentNews}
              </div>
            </div>
            <div style={{
              padding: "6px 12px", borderRadius: 20, fontFamily: FONT, fontSize: 12, fontWeight: 600,
              background: lead.icpScore >= 96 ? COLORS.accentBg : COLORS.blueBg,
              color: lead.icpScore >= 96 ? COLORS.accent : COLORS.blue,
              border: `1px solid ${lead.icpScore >= 96 ? COLORS.accent + "33" : COLORS.blue + "33"}`,
              flexShrink: 0,
            }}>
              {lead.icpScore}% ICP
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EnrichmentPanel({ contacts, selected, setSelected, expanded, setExpanded, onPersonalize, onSkip, isProcessing }) {
  const toggleContact = id => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            <span style={{ color: COLORS.accent }}>{contacts.length}</span> Contacts Enriched
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Click a contact to view LinkedIn insights. {selected.size} selected.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onSkip} disabled={isProcessing || selected.size === 0} style={{
              padding: "12px 22px", background: "transparent",
              color: selected.size > 0 ? COLORS.textMuted : COLORS.textDim,
              border: `1px solid ${COLORS.border}`, borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
              cursor: isProcessing || selected.size === 0 ? "default" : "pointer",
              opacity: isProcessing ? 0.6 : 1, transition: "all 0.2s",
            }}>
              SKIP PERSONALIZATION
            </button>
            <button onClick={onPersonalize} disabled={isProcessing || selected.size === 0} style={{
              padding: "12px 22px", background: selected.size > 0 ? COLORS.accent : COLORS.border,
              color: selected.size > 0 ? COLORS.bg : COLORS.textDim,
              border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
              cursor: isProcessing || selected.size === 0 ? "default" : "pointer",
              opacity: isProcessing ? 0.6 : 1, transition: "all 0.2s",
            }}>
              {isProcessing ? "GENERATING..." : `PERSONALIZE ${selected.size} EMAILS →`}
            </button>
          </div>
          {selected.size > 0 && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim }}>
              ~{(selected.size * 12).toLocaleString()} credits estimated
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {contacts.map(contact => (
          <div key={contact.id}>
            <div
              style={{
                padding: "14px 20px", background: selected.has(contact.id) ? COLORS.accentBg : COLORS.surface,
                border: `1px solid ${selected.has(contact.id) ? COLORS.accentDim + "44" : COLORS.border}`,
                borderRadius: expanded === contact.id ? "10px 10px 0 0" : 10,
                display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <div
                onClick={e => { e.stopPropagation(); toggleContact(contact.id); }}
                style={{
                  width: 18, height: 18, borderRadius: 4, border: `2px solid ${selected.has(contact.id) ? COLORS.accent : COLORS.borderActive}`,
                  background: selected.has(contact.id) ? COLORS.accent : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: COLORS.bg, fontWeight: 700, flexShrink: 0,
                }}>
                {selected.has(contact.id) && "✓"}
              </div>
              <div style={{ flex: 1 }} onClick={() => setExpanded(expanded === contact.id ? null : contact.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{contact.name}</span>
                  <span style={{ color: COLORS.textMuted, fontSize: 12 }}>— {contact.title}</span>
                  <span style={{ color: COLORS.textDim, fontSize: 11, fontFamily: FONT }}>@ {contact.company}</span>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12 }}>
                  <span style={{ color: COLORS.blue, fontFamily: FONT }}>{contact.email}</span>
                  <span style={{ color: contact.bounceRisk === "low" ? COLORS.accent : COLORS.warn, fontFamily: FONT, fontSize: 11 }}>
                    {contact.bounceRisk === "low" ? "✓ verified" : "⚠ medium risk"}
                  </span>
                </div>
              </div>
              <span onClick={() => setExpanded(expanded === contact.id ? null : contact.id)} style={{ color: COLORS.textDim, fontSize: 18, cursor: "pointer", transform: expanded === contact.id ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            </div>
            {expanded === contact.id && contact.linkedinData && (
              <div style={{
                padding: "16px 20px", background: COLORS.surface, borderRadius: "0 0 10px 10px",
                border: `1px solid ${COLORS.border}`, borderTop: "none",
              }}>
                <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, letterSpacing: "0.06em", marginBottom: 10, fontWeight: 600 }}>LINKEDIN INSIGHTS</div>
                <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                  <Stat label="Connections" value={contact.linkedinData.connections.toLocaleString()} />
                  <Stat label="Posts" value={contact.linkedinData.posts} />
                </div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 8 }}>{contact.linkedinData.about}</div>
                <div style={{ fontSize: 12, color: COLORS.blue, fontStyle: "italic" }}>Recent: {contact.linkedinData.recentActivity}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: COLORS.text }}>{value}</div>
      <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em" }}>{label.toUpperCase()}</div>
    </div>
  );
}

function CampaignSetupPanel({ contacts, emails, channelAssignments, setChannelAssignments, emailPlatform, setEmailPlatform, emailCampaign, setEmailCampaign, setEmailCampaignId, linkedinPlatform, setLinkedinPlatform, linkedinCampaign, setLinkedinCampaign, setLinkedinCampaignId, showEmailPreview, setShowEmailPreview, onQueue, isProcessing, listName }) {
  const [listOnly, setListOnly] = useState(false);

  const [instantlyCampaignList, setInstantlyCampaignList] = useState([]);
  useEffect(() => {
    api.instantly.campaigns.list().then(data => {
      // Instantly v2 returns { items: [...], next_starting_after: "..." }
      const items = Array.isArray(data) ? data : data.items || data.data || data.campaigns || [];
      setInstantlyCampaignList(items.map(c => ({ id: c.id, name: c.name || `Campaign ${c.id?.slice(0, 8)}` })));
    }).catch(() => {});
  }, []);
  const EMAIL_CAMPAIGNS = {
    instantly: instantlyCampaignList.length > 0
      ? instantlyCampaignList.map(c => c.name)
      : ["Q1 SaaS VP Growth — Cold Intro", "Series B Companies — Feb 2026", "Healthcare Decision Makers", "Product-Led Growth Leaders"],
    smartlead: [
      "Enterprise Outbound — Q1",
      "Mid-Market SaaS Campaign",
      "CTO Outreach — Tech Stack",
      "Founder Direct — Warm Style",
    ],
  };
  const [heyreachCampaignList, setHeyreachCampaignList] = useState([]);
  useEffect(() => {
    api.heyreach.campaigns.list().then(data => {
      const items = Array.isArray(data) ? data : data.items || data.campaigns || [];
      setHeyreachCampaignList(items.map(c => ({ id: c.id, name: c.name || c.campaignName || `Campaign ${c.id}` })));
    }).catch(() => {});
  }, []);
  const [aimfoxCampaignList, setAimfoxCampaignList] = useState([]);
  useEffect(() => {
    api.aimfox.campaigns.list().then(data => {
      const items = Array.isArray(data) ? data : data.campaigns || [];
      setAimfoxCampaignList(items.map(c => ({ id: c.id, name: c.name || `Campaign ${c.id}` })));
    }).catch(() => {});
  }, []);
  const LINKEDIN_CAMPAIGNS = {
    heyreach: heyreachCampaignList.length > 0
      ? heyreachCampaignList.map(c => c.name)
      : ["Connection Request — Warm Intro", "Content Engagement Sequence", "Decision Maker Outreach — Q1"],
    aimfox: aimfoxCampaignList.length > 0
      ? aimfoxCampaignList.map(c => c.name)
      : ["LinkedIn Drip — VP Level", "Founder Connect Campaign", "InMail Sequence — Enterprise"],
  };

  const selectStyle = {
    width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13,
    outline: "none", boxSizing: "border-box",
    appearance: "none",
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7a8e' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    cursor: "pointer",
  };

  const labelStyle = {
    display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim,
    letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6,
  };

  // Auto-assign all leads based on campaign selections
  useEffect(() => {
    const newAssignments = {};
    contacts.forEach(c => {
      newAssignments[c.id] = {
        email: !listOnly && !!emailCampaign,
        linkedin: !listOnly && !!linkedinCampaign,
        listOnly: listOnly,
      };
    });
    setChannelAssignments(newAssignments);
  }, [emailCampaign, linkedinCampaign, listOnly, contacts.length]);

  const canQueue = listOnly || emailCampaign || linkedinCampaign;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          Campaign <span style={{ color: COLORS.accent }}>Setup</span>
        </h2>
        <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>
          Choose where to send {contacts.length} leads from "<span style={{ color: COLORS.accent }}>{listName}</span>"
        </p>
      </div>

      {/* Collapsible Email Preview */}
      <div style={{ marginBottom: 20, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div
          onClick={() => setShowEmailPreview(!showEmailPreview)}
          style={{
            padding: "12px 18px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: COLORS.accent }}>✦</span>
            <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600 }}>
              {Object.keys(emails).length} Personalized Emails Generated
            </span>
            <span style={{ fontSize: 11, color: COLORS.textDim }}>— click to preview</span>
          </div>
          <span style={{ color: COLORS.textDim, fontSize: 16, transform: showEmailPreview ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
        </div>
        {showEmailPreview && (
          <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 18px", display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflow: "auto" }}>
            {contacts.slice(0, 5).map(contact => {
              const email = emails[contact.id];
              if (!email) return null;
              return (
                <div key={contact.id} style={{ padding: "10px 14px", background: COLORS.bg, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>
                    {contact.name} <span style={{ color: COLORS.textDim, fontWeight: 400 }}>— {contact.company}</span>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.blue, fontFamily: FONT }}>{email.subject}</div>
                </div>
              );
            })}
            {contacts.length > 5 && (
              <div style={{ fontSize: 11, color: COLORS.textDim, textAlign: "center", padding: 4 }}>
                + {contacts.length - 5} more emails
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform & Campaign Selection */}
      {!listOnly && (
        <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
          {/* Email Platform */}
          <div style={{
            flex: 1, padding: 20, background: COLORS.surface,
            border: `1px solid ${emailCampaign ? COLORS.accent + "44" : COLORS.border}`,
            borderRadius: 10, transition: "border 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>📧</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600 }}>Cold Email</span>
              {emailCampaign && (
                <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.accent, padding: "2px 8px", background: COLORS.accentBg, borderRadius: 10, marginLeft: "auto" }}>
                  {contacts.length} leads
                </span>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>PLATFORM</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ key: "instantly", label: "Instantly.ai" }, { key: "smartlead", label: "SmartLead" }].map(p => (
                  <button key={p.key} onClick={() => { setEmailPlatform(p.key); setEmailCampaign(""); }} style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${emailPlatform === p.key ? COLORS.accent + "55" : COLORS.border}`,
                    background: emailPlatform === p.key ? COLORS.accentBg : "transparent",
                    color: emailPlatform === p.key ? COLORS.accent : COLORS.textMuted,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>CAMPAIGN</label>
              <select
                value={emailPlatform === 'instantly' ? (instantlyCampaignList.find(c => c.name === emailCampaign)?.id || '') : emailCampaign}
                onChange={e => {
                  if (emailPlatform === 'instantly') {
                    const sel = instantlyCampaignList.find(c => c.id === e.target.value);
                    setEmailCampaign(sel?.name || e.target.value);
                    if (setEmailCampaignId) setEmailCampaignId(e.target.value);
                  } else {
                    setEmailCampaign(e.target.value);
                    if (setEmailCampaignId) setEmailCampaignId('');
                  }
                }}
                style={selectStyle}
              >
                <option value="" style={{ background: COLORS.surface, color: COLORS.textDim }}>Select campaign...</option>
                {emailPlatform === 'instantly' && instantlyCampaignList.length > 0
                  ? instantlyCampaignList.map(c => (
                      <option key={c.id} value={c.id} style={{ background: COLORS.surface, color: COLORS.text }}>{c.name}</option>
                    ))
                  : (EMAIL_CAMPAIGNS[emailPlatform] || []).map(c => (
                      <option key={c} value={c} style={{ background: COLORS.surface, color: COLORS.text }}>{c}</option>
                    ))
                }
              </select>
            </div>
          </div>

          {/* LinkedIn Platform */}
          <div style={{
            flex: 1, padding: 20, background: COLORS.surface,
            border: `1px solid ${linkedinCampaign ? COLORS.blue + "44" : COLORS.border}`,
            borderRadius: 10, transition: "border 0.2s",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 18 }}>💼</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600 }}>LinkedIn</span>
              {linkedinCampaign && (
                <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.blue, padding: "2px 8px", background: COLORS.blueBg, borderRadius: 10, marginLeft: "auto" }}>
                  {contacts.length} leads
                </span>
              )}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>PLATFORM</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[{ key: "heyreach", label: "HeyReach" }, { key: "aimfox", label: "AimFox" }].map(p => (
                  <button key={p.key} onClick={() => { setLinkedinPlatform(p.key); setLinkedinCampaign(""); }} style={{
                    flex: 1, padding: "8px 12px", borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${linkedinPlatform === p.key ? COLORS.blue + "55" : COLORS.border}`,
                    background: linkedinPlatform === p.key ? COLORS.blueBg : "transparent",
                    color: linkedinPlatform === p.key ? COLORS.blue : COLORS.textMuted,
                    cursor: "pointer", transition: "all 0.15s",
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>CAMPAIGN</label>
              <select
                value={
                  linkedinPlatform === 'heyreach'
                    ? (heyreachCampaignList.find(c => c.name === linkedinCampaign)?.id || '')
                    : linkedinPlatform === 'aimfox'
                    ? (aimfoxCampaignList.find(c => c.name === linkedinCampaign)?.id || '')
                    : linkedinCampaign
                }
                onChange={e => {
                  if (linkedinPlatform === 'heyreach') {
                    const sel = heyreachCampaignList.find(c => String(c.id) === e.target.value);
                    setLinkedinCampaign(sel?.name || e.target.value);
                    if (setLinkedinCampaignId) setLinkedinCampaignId(e.target.value);
                  } else if (linkedinPlatform === 'aimfox') {
                    const sel = aimfoxCampaignList.find(c => String(c.id) === e.target.value);
                    setLinkedinCampaign(sel?.name || e.target.value);
                    if (setLinkedinCampaignId) setLinkedinCampaignId(e.target.value);
                  } else {
                    setLinkedinCampaign(e.target.value);
                    if (setLinkedinCampaignId) setLinkedinCampaignId('');
                  }
                }}
                style={selectStyle}
              >
                <option value="" style={{ background: COLORS.surface, color: COLORS.textDim }}>Select campaign...</option>
                {linkedinPlatform === 'heyreach' && heyreachCampaignList.length > 0
                  ? heyreachCampaignList.map(c => <option key={c.id} value={String(c.id)} style={{ background: COLORS.surface, color: COLORS.text }}>{c.name}</option>)
                  : linkedinPlatform === 'aimfox' && aimfoxCampaignList.length > 0
                  ? aimfoxCampaignList.map(c => <option key={c.id} value={String(c.id)} style={{ background: COLORS.surface, color: COLORS.text }}>{c.name}</option>)
                  : (LINKEDIN_CAMPAIGNS[linkedinPlatform] || []).map(c => <option key={c} value={c} style={{ background: COLORS.surface, color: COLORS.text }}>{c}</option>)
                }
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Save to List Only */}
      <div
        onClick={() => { setListOnly(!listOnly); if (!listOnly) { setEmailCampaign(""); setLinkedinCampaign(""); } }}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px",
          background: listOnly ? COLORS.surface : "transparent",
          border: `1px solid ${listOnly ? COLORS.textMuted + "44" : COLORS.border}`,
          borderRadius: 10, cursor: "pointer", transition: "all 0.2s", marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 18 }}>📋</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Save to list only</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              Don't push to any platform yet — just save the enriched & personalized leads
            </div>
          </div>
        </div>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          border: `2px solid ${listOnly ? COLORS.text : COLORS.borderActive}`,
          background: listOnly ? COLORS.text : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, color: COLORS.bg, fontWeight: 700, transition: "all 0.15s",
        }}>
          {listOnly && "✓"}
        </div>
      </div>

      {/* Summary & Queue Button */}
      {canQueue && (
        <div style={{
          padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600 }}>SUMMARY:</div>
          <div style={{ display: "flex", gap: 12, flex: 1, flexWrap: "wrap" }}>
            {emailCampaign && !listOnly && (
              <span style={{ fontSize: 12, color: COLORS.accent }}>
                📧 {contacts.length} leads → {emailPlatform === "instantly" ? "Instantly.ai" : "SmartLead"} / {emailCampaign}
              </span>
            )}
            {linkedinCampaign && !listOnly && (
              <span style={{ fontSize: 12, color: COLORS.blue }}>
                💼 {contacts.length} leads → {linkedinPlatform === "heyreach" ? "HeyReach" : "AimFox"} / {linkedinCampaign}
              </span>
            )}
            {listOnly && (
              <span style={{ fontSize: 12, color: COLORS.textMuted }}>
                📋 {contacts.length} leads → Saved to "{listName}" only
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={onQueue} disabled={isProcessing || !canQueue} style={{
          padding: "14px 32px",
          background: canQueue ? COLORS.accent : COLORS.border,
          color: canQueue ? COLORS.bg : COLORS.textDim,
          border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600,
          cursor: isProcessing || !canQueue ? "default" : "pointer",
          opacity: isProcessing ? 0.6 : 1, transition: "all 0.2s",
        }}>
          {isProcessing ? "QUEUING..." : listOnly ? "SAVE LIST →" : "QUEUE FOR OUTREACH →"}
        </button>
      </div>
    </div>
  );
}

function PersonalizeModal({ contacts, promptText, setPromptText, selectedPromptKey, setSelectedPromptKey, savedPrompts = SAVED_PROMPTS, previewEmails, isPreviewLoading, onPreview, onApprove, onClose, totalContacts }) {
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [promptLabel, setPromptLabel] = useState("");
  const [savingPrompt, setSavingPrompt] = useState(false);
  
  const inputStyle = {
    width: "100%", padding: "10px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
    borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13,
    outline: "none", boxSizing: "border-box",
  };

  const previewContacts = contacts.slice(0, 3);
  
  const savePromptTemplate = async () => {
    if (!promptLabel.trim()) return;
    setSavingPrompt(true);
    try {
      await api.prompts.create({
        label: promptLabel,
        text: promptText,
      });
      setShowSavePrompt(false);
      setPromptLabel("");
      // Optionally reload prompts here
    } catch (err) {
      console.error("Failed to save prompt:", err);
    } finally {
      setSavingPrompt(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "90%", maxWidth: 1100, height: "85vh",
        background: COLORS.bg, border: `1px solid ${COLORS.border}`,
        borderRadius: 16, display: "flex", flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        overflow: "hidden",
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, letterSpacing: "-0.02em" }}>
              Personalization <span style={{ color: COLORS.accent }}>Studio</span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
              Configure your prompt, preview results, then approve for all {totalContacts} contacts
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: `1px solid ${COLORS.border}`,
            background: "transparent", color: COLORS.textMuted, fontSize: 18,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Modal Body — Two Columns */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left Panel — Prompt Editor */}
          <div style={{ flex: 1, borderRight: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
              <label style={{ display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
                SELECT PROMPT TEMPLATE
              </label>
              <select
                value={selectedPromptKey}
                onChange={e => {
                  const key = e.target.value;
                  setSelectedPromptKey(key);
                  setPromptText((savedPrompts[key]?.text) || promptText);
                }}
                style={{
                  ...inputStyle,
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7a8e' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 12px center",
                  cursor: "pointer",
                  fontFamily: FONT,
                  fontSize: 12,
                }}
              >
                {Object.entries(savedPrompts).map(([key, prompt]) => (
                  <option key={key} value={key} style={{ background: COLORS.surface, color: COLORS.text }}>
                    {prompt.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <label style={{ display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>
                PERSONALIZATION PROMPT
              </label>
              <textarea
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                style={{
                  ...inputStyle,
                  flex: 1,
                  resize: "none",
                  fontFamily: FONT,
                  fontSize: 12,
                  lineHeight: 1.7,
                  minHeight: 0,
                }}
                onFocus={e => e.target.style.borderColor = COLORS.borderActive}
                onBlur={e => e.target.style.borderColor = COLORS.border}
              />
            </div>
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${COLORS.border}`, display: "flex", flexDirection: "column", gap: 10 }}>
              <button onClick={onPreview} disabled={isPreviewLoading} style={{
                width: "100%", padding: "12px", background: COLORS.blueBg,
                color: COLORS.blue, border: `1px solid ${COLORS.blue}33`,
                borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
                cursor: isPreviewLoading ? "wait" : "pointer",
                opacity: isPreviewLoading ? 0.7 : 1, transition: "all 0.2s",
              }}>
                {isPreviewLoading ? "GENERATING PREVIEWS..." : `PREVIEW WITH FIRST ${previewContacts.length} LEADS →`}
              </button>
              <button onClick={() => setShowSavePrompt(true)} style={{
                width: "100%", padding: "10px", background: "transparent",
                color: COLORS.textMuted, border: `1px solid ${COLORS.border}`,
                borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s",
              }}>
                💾 SAVE AS TEMPLATE
              </button>
            </div>
          </div>

          {/* Right Panel — Preview */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600 }}>
                EMAIL PREVIEW
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 4 }}>
                {previewEmails ? `Showing ${Object.keys(previewEmails).length} sample emails` : "Click preview to generate sample emails"}
              </div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "12px 20px" }}>
              {!previewEmails && !isPreviewLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textDim }}>
                  <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>✦</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, textAlign: "center" }}>
                    Configure your prompt on the left,<br />then click Preview to see results
                  </div>
                </div>
              )}
              {isPreviewLoading && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textMuted }}>
                  <div style={{ fontSize: 32, marginBottom: 12, animation: "spin 2s linear infinite" }}>✦</div>
                  <div style={{ fontFamily: FONT, fontSize: 12 }}>Generating with Claude API<ProgressDots active={true} /></div>
                  <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              {previewEmails && !isPreviewLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {previewContacts.map(contact => {
                    const email = previewEmails[contact.id];
                    if (!email) return null;
                    return (
                      <div key={contact.id} style={{
                        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, overflow: "hidden",
                      }}>
                        <div style={{
                          padding: "10px 16px", borderBottom: `1px solid ${COLORS.border}`,
                          display: "flex", alignItems: "center", gap: 10,
                        }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%", background: COLORS.accentBg,
                            border: `1px solid ${COLORS.accent}33`, display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 11, flexShrink: 0,
                          }}>✦</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {contact.name} <span style={{ color: COLORS.textDim, fontWeight: 400, fontSize: 11 }}>— {contact.company}</span>
                            </div>
                            <div style={{ fontSize: 11, color: COLORS.blue, fontFamily: FONT }}>{email.subject}</div>
                          </div>
                        </div>
                        <div style={{
                          padding: "12px 16px", whiteSpace: "pre-wrap", lineHeight: 1.6,
                          color: COLORS.text, fontSize: 12, maxHeight: 180, overflow: "auto",
                        }}>
                          {email.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: COLORS.surface,
        }}>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
            {previewEmails
              ? `✓ Preview looks good? Approve to generate for all ${totalContacts} contacts`
              : "Generate a preview first to unlock approval"}
          </div>
          <button
            onClick={onApprove}
            disabled={!previewEmails}
            style={{
              padding: "12px 28px",
              background: previewEmails ? COLORS.accent : COLORS.border,
              color: previewEmails ? COLORS.bg : COLORS.textDim,
              border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
              cursor: previewEmails ? "pointer" : "default",
              transition: "all 0.2s",
            }}
          >
            APPROVE & PERSONALIZE ALL {totalContacts} LEADS →
          </button>
        </div>
      </div>
      
      {/* Save Prompt Template Modal */}
      {showSavePrompt && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSavePrompt(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Save Prompt Template</div>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>Save this prompt to reuse later</div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>TEMPLATE NAME</div>
              <input 
                value={promptLabel} 
                onChange={e => setPromptLabel(e.target.value)} 
                onKeyDown={e => { if (e.key === "Enter" && promptLabel.trim()) savePromptTemplate(); }} 
                placeholder="e.g. SaaS VP Growth Outreach" 
                autoFocus 
                style={{ width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" }} 
              />
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowSavePrompt(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={savePromptTemplate} disabled={!promptLabel.trim() || savingPrompt} style={{ padding: "10px 24px", background: promptLabel.trim() && !savingPrompt ? COLORS.accent : COLORS.border, color: promptLabel.trim() && !savingPrompt ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: promptLabel.trim() && !savingPrompt ? "pointer" : "default" }}>
                {savingPrompt ? "Saving..." : "Save Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QueuedPanel({ queue, listName, emailPlatform, linkedinPlatform, emailCampaign, linkedinCampaign }) {
  const emailLeads = queue.filter(q => q.channels?.email);
  const linkedinLeads = queue.filter(q => q.channels?.linkedin);
  const listOnlyLeads = queue.filter(q => q.channels?.listOnly);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          Outreach <span style={{ color: COLORS.accent }}>Queued</span> ✓
        </h2>
        <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>
          List "<span style={{ color: COLORS.accent }}>{listName}</span>" — {queue.length} leads distributed across channels
        </p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Leads" value={queue.length} accent={COLORS.accent} />
        <StatCard label="Email Outreach" value={emailLeads.length} accent={COLORS.accent} />
        <StatCard label="LinkedIn Outreach" value={linkedinLeads.length} accent={COLORS.blue} />
        <StatCard label="List Only" value={listOnlyLeads.length} accent={COLORS.textMuted} />
      </div>

      {/* Channel Summaries */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {emailLeads.length > 0 && (
          <div style={{ flex: 1, padding: 20, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>📧</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600 }}>
                {emailPlatform === "instantly" ? "Instantly.ai" : "SmartLead"}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.accent, padding: "2px 8px", background: COLORS.accentBg, borderRadius: 10, marginLeft: "auto" }}>
                {emailLeads.length} queued
              </span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
              Campaign: <span style={{ color: COLORS.text }}>{emailCampaign || "Default Campaign"}</span>
            </div>
            {emailLeads.slice(0, 4).map(item => (
              <div key={item.contact.id} style={{ padding: "6px 0", fontSize: 12, borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between" }}>
                <span>{item.contact.name}</span>
                <span style={{ color: COLORS.textDim, fontFamily: FONT, fontSize: 11 }}>{item.contact.email}</span>
              </div>
            ))}
            {emailLeads.length > 4 && <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 6 }}>+ {emailLeads.length - 4} more</div>}
          </div>
        )}
        {linkedinLeads.length > 0 && (
          <div style={{ flex: 1, padding: 20, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18 }}>💼</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600 }}>
                {linkedinPlatform === "heyreach" ? "HeyReach" : "AimFox"}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.blue, padding: "2px 8px", background: COLORS.blueBg, borderRadius: 10, marginLeft: "auto" }}>
                {linkedinLeads.length} queued
              </span>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 8 }}>
              Campaign: <span style={{ color: COLORS.text }}>{linkedinCampaign || "Default Campaign"}</span>
            </div>
            {linkedinLeads.slice(0, 4).map(item => (
              <div key={item.contact.id} style={{ padding: "6px 0", fontSize: 12, borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between" }}>
                <span>{item.contact.name}</span>
                <span style={{ color: COLORS.textDim, fontFamily: FONT, fontSize: 11 }}>{item.contact.title}</span>
              </div>
            ))}
            {linkedinLeads.length > 4 && <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 6 }}>+ {linkedinLeads.length - 4} more</div>}
          </div>
        )}
      </div>

      {listOnlyLeads.length > 0 && (
        <div style={{ padding: 16, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 24 }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>📋 SAVED TO LIST ONLY ({listOnlyLeads.length})</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted }}>
            {listOnlyLeads.map(item => item.contact.name).join(", ")}
          </div>
        </div>
      )}

      <div style={{ padding: 20, background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 10, fontWeight: 600 }}>NEXT STEPS IN PRODUCTION</div>
        <div style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7 }}>
          In the production Claude Code agent, this would push leads directly to the selected platforms via their APIs. Instantly.ai and SmartLead would begin sending emails on their campaign schedules, while HeyReach and AimFox would initiate LinkedIn sequences. The lead list "{listName}" would be saved to your database for tracking and future reference.
        </div>
      </div>
    </div>
  );
}

function LeadListsView({ outreachQueue, enrichedContacts, personalizedEmails, channelAssignments, listName, emailPlatform, linkedinPlatform, emailCampaign, linkedinCampaign }) {
  const [selectedList, setSelectedList] = useState(null);
  const [activeTab, setActiveTab] = useState("lists");
  const [importStep, setImportStep] = useState(0); // 0=upload, 1=map, 2=enrich, 3=processing, 4=done
  const [importFile, setImportFile] = useState(null);
  const [enrichOptions, setEnrichOptions] = useState({ verifyEmail: true, findPhone: true, companyData: true, icpScore: true, personalisation: true });
  const [enrichProgress, setEnrichProgress] = useState(0);
  const [loadedLists, setLoadedLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Load lists from DB
  useEffect(() => {
    async function loadLists() {
      try {
        const lists = await api.leadLists.list();
        setLoadedLists(lists.map(list => {
          // Extract emails and channels from contacts
          const emails = {};
          const channels = {};
          const contacts = (list.contacts || []).map(c => {
            // Parse personalization data
            if (c.personalisation_json) {
              emails[c.id] = {
                subject: c.personalisation_json.subject || '',
                body: c.personalisation_json.body || '',
              };
              channels[c.id] = {
                email: c.personalisation_json.channel === 'email',
                linkedin: c.personalisation_json.channel === 'linkedin',
                listOnly: c.personalisation_json.channel === 'none',
              };
            }
            return c;
          });
          
          return {
            id: list.id,
            name: list.name,
            createdAt: new Date(list.createdAt),
            contacts: contacts,
            emails: emails,
            channels: channels,
            status: list.status || "draft",
            emailPlatform: "instantly",
            linkedinPlatform: "heyreach",
            emailCampaign: "",
            linkedinCampaign: "",
          };
        }));
      } catch (err) {
        console.error("Failed to load lists:", err);
      } finally {
        setLoadingLists(false);
      }
    }
    loadLists();
  }, []);

  // Mock saved lists (current + some historical examples) - used as fallback
  const MOCK_LISTS = [
    {
      id: "demo1", name: "Q4 FinTech CROs — EMEA", createdAt: new Date(Date.now() - 86400000 * 5),
      contacts: [
        { id: "d1", name: "Alex Turner", title: "CRO", company: "PayFlow", email: "alex@payflow.io", bounceRisk: "low", linkedin: "linkedin.com/in/alexturner", linkedinData: { connections: 3200, posts: 14, about: "Revenue leader in payments", recentActivity: "Hiring 3 AEs" } },
        { id: "d2", name: "Maria Santos", title: "VP Revenue", company: "NeoBank", email: "maria@neobank.eu", bounceRisk: "low", linkedin: "linkedin.com/in/mariasantos", linkedinData: { connections: 2800, posts: 22, about: "Scaling B2B fintech", recentActivity: "Posted about PLG metrics" } },
        { id: "d3", name: "Henrik Larsson", title: "CRO", company: "KlarPay", email: "henrik@klarpay.se", bounceRisk: "medium", linkedin: "linkedin.com/in/henriklarsson", linkedinData: { connections: 1900, posts: 7, about: "Nordic fintech veteran", recentActivity: "Shared Series C announcement" } },
      ],
      emails: { d1: { subject: "Scaling PayFlow's rev org" }, d2: { subject: "PLG + outbound — best of both" }, d3: { subject: "Congrats on the Series C" } },
      channels: { d1: { email: true }, d2: { email: true, linkedin: true }, d3: { email: true } },
      status: "sent",
      emailPlatform: "instantly", linkedinPlatform: "heyreach", emailCampaign: "FinTech CROs — Q4", linkedinCampaign: "Decision Maker Outreach — Q1",
    },
    {
      id: "demo2", name: "Series A SaaS — US West Coast", createdAt: new Date(Date.now() - 86400000 * 12),
      contacts: [
        { id: "d4", name: "Jordan Lee", title: "CEO", company: "Stackwise", email: "jordan@stackwise.com", bounceRisk: "low", linkedin: "linkedin.com/in/jordanlee", linkedinData: { connections: 8400, posts: 55, about: "Building dev tools", recentActivity: "Launched new API product" } },
        { id: "d5", name: "Priya Mehta", title: "Head of Growth", company: "DataPulse", email: "priya@datapulse.ai", bounceRisk: "low", linkedin: "linkedin.com/in/priyamehta", linkedinData: { connections: 4100, posts: 30, about: "Growth @ DataPulse", recentActivity: "Spoke at SaaStr" } },
      ],
      emails: { d4: { subject: "Stackwise API launch — congrats" }, d5: { subject: "Post-SaaStr follow-up" } },
      channels: { d4: { email: true, linkedin: true }, d5: { email: true } },
      status: "sent",
      emailPlatform: "smartlead", linkedinPlatform: "aimfox", emailCampaign: "Series A Founders — Jan", linkedinCampaign: "Founder Connect Campaign",
    },
  ];

  // Combine current session list + DB lists + mock lists (if DB is empty)
  const currentSessionList = enrichedContacts.length > 0 ? [{
    id: "current",
    name: listName,
    createdAt: new Date(),
    contacts: enrichedContacts,
    emails: personalizedEmails,
    channels: channelAssignments,
    status: outreachQueue.length > 0 ? "queued" : "draft",
    emailPlatform, linkedinPlatform, emailCampaign, linkedinCampaign,
  }] : [];

  const allLists = [
    ...currentSessionList,
    ...loadedLists,
    ...(loadedLists.length === 0 && !loadingLists ? MOCK_LISTS : []), // Show mock only if DB is empty
  ];

  const activeList = selectedList ? allLists.find(l => l.id === selectedList) : null;

  const COLUMNS = [
    { key: "name", label: "Name", width: 150 },
    { key: "title", label: "Title", width: 140 },
    { key: "company", label: "Company", width: 130 },
    { key: "email", label: "Email", width: 200 },
    { key: "verified", label: "Verified", width: 80 },
    { key: "connections", label: "Connections", width: 100 },
    { key: "recentActivity", label: "Recent Activity", width: 220 },
    { key: "subject", label: "Email Subject", width: 240 },
    { key: "emailCampaign", label: "Email Campaign", width: 200 },
    { key: "linkedinCampaign", label: "LinkedIn Campaign", width: 200 },
  ];

  const getCellValue = (contact, col, list) => {
    const email = list.emails?.[contact.id];
    const ch = list.channels?.[contact.id] || {};
    switch (col.key) {
      case "name": return contact.name;
      case "title": return contact.title;
      case "company": return contact.company;
      case "email": return contact.email;
      case "verified": return contact.bounceRisk === "low" ? "✓ Yes" : "⚠ Medium";
      case "connections": return contact.linkedinData?.connections?.toLocaleString() || "—";
      case "recentActivity": return contact.linkedinData?.recentActivity || "—";
      case "subject": return email?.subject || "—";
      case "emailCampaign": return ch.email ? (list.emailCampaign || "—") : "—";
      case "linkedinCampaign": return ch.linkedin ? (list.linkedinCampaign || "—") : "—";
      default: return "—";
    }
  };

  if (!activeList) {
    return (
      <div style={{ padding: 32, flex: 1, overflow: "auto" }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Lead <span style={{ color: COLORS.accent }}>Lists</span>
          </h2>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
          {[{ key: "lists", label: "📋 Lists" }, { key: "import", label: "⬆️ Import & Enrich" }].map(tab => (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); if (tab.key === "import") setImportStep(0); }} style={{
              padding: "10px 20px", background: "transparent", border: "none",
              borderBottom: activeTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent",
              color: activeTab === tab.key ? COLORS.accent : COLORS.textMuted,
              fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Import & Enrich Tab */}
        {activeTab === "import" && (
          <div>
            {importStep === 0 && (
              <div>
                <p style={{ color: COLORS.textMuted, marginBottom: 20, fontSize: 13 }}>Upload an existing list to enrich with verified emails, phone numbers, company data, ICP scoring, and AI personalisation.</p>
                <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                  {[
                    { label: "Upload CSV", icon: "📄", desc: ".csv, .xlsx, .txt", active: true },
                    { label: "LinkedIn Export", icon: "💼", desc: "Connections CSV", active: true },
                    { label: "Copy & Paste", icon: "📋", desc: "Paste rows directly", active: false },
                    { label: "LinkedIn Sync", icon: "🔗", desc: "Connected ✓", active: false },
                  ].map((opt, i) => (
                    <div key={i} onClick={() => { if (opt.active) { setImportFile({ name: opt.label === "LinkedIn Export" ? "linkedin_connections.csv" : "imported_leads.csv", rows: 247, source: opt.label }); setImportStep(1); } }}
                      style={{ flex: 1, padding: "20px", background: opt.active ? COLORS.surface : COLORS.surface, border: `1px solid ${opt.active ? COLORS.border : COLORS.border}`, borderRadius: 10, textAlign: "center", cursor: opt.active ? "pointer" : "default", opacity: opt.active ? 1 : 0.5, transition: "border-color 0.15s" }}
                      onMouseEnter={e => { if (opt.active) e.currentTarget.style.borderColor = COLORS.accent + "66"; }}
                      onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
                    >
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{opt.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text }}>{opt.label}</div>
                      <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>{opt.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: "40px", background: COLORS.surface, border: `2px dashed ${COLORS.border}`, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>⬆️</div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 4 }}>Drag & drop your file here</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>Supports CSV, XLSX, TXT up to 10,000 rows</div>
                </div>
              </div>
            )}

            {importStep === 1 && importFile && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <button onClick={() => setImportStep(0)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
                  <div><div style={{ fontWeight: 600, fontSize: 15 }}>Map Columns</div><div style={{ fontSize: 11, color: COLORS.textDim }}>{importFile.name} · {importFile.rows} rows detected · Source: {importFile.source}</div></div>
                </div>
                <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, marginBottom: 20 }}>
                  <div style={{ padding: "8px 12px", background: COLORS.accentBg, border: `1px solid ${COLORS.accent}22`, borderRadius: 8, marginBottom: 16, fontSize: 12, color: COLORS.accent }}>✨ AI auto-detected column mapping. Review and adjust if needed.</div>
                  {[
                    { field: "First Name", mapped: "first_name", sample: "Sarah, James, Mike..." },
                    { field: "Last Name", mapped: "last_name", sample: "Mitchell, Richardson, Thompson..." },
                    { field: "Company", mapped: "company", sample: "PayFlow, NeoBank, KlarPay..." },
                    { field: "Job Title", mapped: "position", sample: "CRO, VP Revenue, Head of Sales..." },
                    { field: "Email", mapped: "email_address", sample: "sarah@payflow.io, james@neo..." },
                    { field: "LinkedIn URL", mapped: "linkedin_url", sample: "linkedin.com/in/sarahm..." },
                  ].map((col, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < 5 ? `1px solid ${COLORS.border}` : "none" }}>
                      <div style={{ width: 120, fontSize: 12, fontWeight: 600, color: COLORS.text }}>{col.field}</div>
                      <div style={{ fontSize: 14, color: COLORS.accent }}>→</div>
                      <select style={{ padding: "6px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 12, outline: "none" }} defaultValue={col.mapped}>
                        <option value={col.mapped}>{col.mapped}</option>
                        <option value="skip">Skip this column</option>
                      </select>
                      <div style={{ flex: 1, fontSize: 11, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{col.sample}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setImportStep(2)} style={{ padding: "12px 28px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Confirm Mapping →</button>
              </div>
            )}

            {importStep === 2 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <button onClick={() => setImportStep(1)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
                  <div><div style={{ fontWeight: 600, fontSize: 15 }}>Select Enrichment Steps</div><div style={{ fontSize: 11, color: COLORS.textDim }}>{importFile.rows} rows ready for processing</div></div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
                  {[
                    { key: "verifyEmail", label: "Email Verification", desc: "Verify deliverability, catch-all detection, bounce risk scoring", icon: "✉️", tools: "BetterContact + Wiza" },
                    { key: "findPhone", label: "Phone Number Lookup", desc: "Find direct dials and mobile numbers", icon: "📞", tools: "Icypeas + Apollo" },
                    { key: "companyData", label: "Company Enrichment", desc: "Revenue, headcount, funding, tech stack, recent news", icon: "🏢", tools: "AI Ark + Clearbit" },
                    { key: "icpScore", label: "ICP Scoring", desc: "Score each lead against your Buyer Persona profile (0-100)", icon: "🎯", tools: "AI Engine" },
                    { key: "personalisation", label: "AI Personalisation", desc: "Generate personalised opening lines, email subjects, and LinkedIn messages", icon: "✨", tools: "Claude API" },
                  ].map(opt => (
                    <label key={opt.key} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 20px", background: COLORS.surface, border: `1px solid ${enrichOptions[opt.key] ? COLORS.accent + "33" : COLORS.border}`, borderRadius: 10, cursor: "pointer", transition: "border-color 0.15s" }}>
                      <input type="checkbox" checked={enrichOptions[opt.key]} onChange={e => setEnrichOptions({ ...enrichOptions, [opt.key]: e.target.checked })} style={{ marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{opt.icon}</span>
                          <span style={{ fontWeight: 600, fontSize: 13 }}>{opt.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>{opt.desc}</div>
                      </div>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT, whiteSpace: "nowrap" }}>{opt.tools}</span>
                    </label>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={async () => { setImportStep(3); setEnrichProgress(0); for (let i = 1; i <= 5; i++) { await new Promise(r => setTimeout(r, 1200)); setEnrichProgress(i); } setImportStep(4); }} style={{ padding: "12px 28px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🚀 Start Enrichment</button>
                  <div style={{ fontSize: 11, color: COLORS.textDim, display: "flex", alignItems: "center" }}>{Object.values(enrichOptions).filter(Boolean).length} steps selected · ~{importFile.rows} rows</div>
                </div>
              </div>
            )}

            {importStep === 3 && (
              <div style={{ padding: "40px 0" }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Enriching {importFile.rows} leads...</div>
                  <div style={{ fontSize: 12, color: COLORS.textDim }}>This may take a few minutes</div>
                </div>
                {[
                  { key: "verifyEmail", label: "Email Verification", icon: "✉️" },
                  { key: "findPhone", label: "Phone Number Lookup", icon: "📞" },
                  { key: "companyData", label: "Company Enrichment", icon: "🏢" },
                  { key: "icpScore", label: "ICP Scoring", icon: "🎯" },
                  { key: "personalisation", label: "AI Personalisation", icon: "✨" },
                ].filter(s => enrichOptions[s.key]).map((s, i) => {
                  const status = enrichProgress > i ? "complete" : enrichProgress === i ? "active" : "pending";
                  return (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 16 }}>{s.icon}</span>
                      <div style={{ flex: 1, fontWeight: 600, fontSize: 13, color: status === "complete" ? COLORS.accent : status === "active" ? COLORS.text : COLORS.textDim }}>{s.label}</div>
                      {status === "complete" && <span style={{ color: COLORS.accent, fontSize: 12, fontWeight: 600 }}>✓ Complete</span>}
                      {status === "active" && <ProgressDots active={true} />}
                      {status === "pending" && <span style={{ fontSize: 10, color: COLORS.textDim }}>Pending</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {importStep === 4 && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Enrichment Complete</div>
                <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 8 }}>{importFile.rows} leads processed</div>
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 24 }}>
                  {enrichOptions.verifyEmail && <div style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}><div style={{ fontSize: 20, fontWeight: 700, color: COLORS.accent }}>92%</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Emails Verified</div></div>}
                  {enrichOptions.findPhone && <div style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}><div style={{ fontSize: 20, fontWeight: 700, color: COLORS.blue }}>68%</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Phones Found</div></div>}
                  {enrichOptions.icpScore && <div style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}><div style={{ fontSize: 20, fontWeight: 700, color: COLORS.accent }}>74</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Avg ICP Score</div></div>}
                  {enrichOptions.personalisation && <div style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}><div style={{ fontSize: 20, fontWeight: 700, color: "#7B61FF" }}>{importFile.rows}</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Personalised</div></div>}
                </div>
                <button onClick={() => { setActiveTab("lists"); setImportStep(0); }} style={{ padding: "12px 28px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>View in Lead Lists →</button>
              </div>
            )}
          </div>
        )}

        {/* Lists Tab */}
        {activeTab === "lists" && (<>
          <p style={{ color: COLORS.textMuted, margin: "-8px 0 20px", fontSize: 13 }}>
            {loadingLists ? "Loading lists..." : allLists.length > 0 ? "View and manage your scraped lead lists." : "No lead lists yet. Run a pipeline to create one."}
          </p>

        {!loadingLists && allLists.length === 0 && (
          <div style={{
            padding: "60px 40px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 12, textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📋</div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim }}>
              Lead lists will appear here after you run a pipeline
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {allLists.map(list => (
            <div
              key={list.id}
              onClick={() => setSelectedList(list.id)}
              style={{
                padding: "18px 24px", background: COLORS.surface,
                border: `1px solid ${COLORS.border}`, borderRadius: 10,
                cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.borderActive}
              onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{list.name}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: COLORS.textMuted }}>
                  <span>{list.contacts.length} contacts</span>
                  <span>{list.createdAt.toLocaleDateString()}</span>
                  <span>{Object.keys(list.emails || {}).length} personalized</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  padding: "4px 12px", borderRadius: 20, fontFamily: FONT, fontSize: 11, fontWeight: 500,
                  background: list.status === "sent" ? COLORS.accentBg : list.status === "queued" ? COLORS.warnBg : COLORS.blueBg,
                  color: list.status === "sent" ? COLORS.accent : list.status === "queued" ? COLORS.warn : COLORS.blue,
                  border: `1px solid ${list.status === "sent" ? COLORS.accent + "33" : list.status === "queued" ? COLORS.warn + "33" : COLORS.blue + "33"}`,
                }}>
                  {list.status}
                </span>
                <span style={{ color: COLORS.textDim, fontSize: 18 }}>→</span>
              </div>
            </div>
          ))}
        </div>
        </>)}
      </div>
    );
  }

  // Table view for selected list
  return (
    <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
      {/* List Header */}
      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => setSelectedList(null)}
            style={{
              padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`,
              borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            ← Back
          </button>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{activeList.name}</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted }}>
              {activeList.contacts.length} contacts · Created {activeList.createdAt.toLocaleDateString()}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {activeList.emailCampaign && (
            <span style={{ fontSize: 12, color: COLORS.accent, fontFamily: FONT }}>
              📧 {activeList.emailCampaign}
            </span>
          )}
          {activeList.linkedinCampaign && (
            <span style={{ fontSize: 12, color: COLORS.blue, fontFamily: FONT, marginLeft: 8 }}>
              💼 {activeList.linkedinCampaign}
            </span>
          )}
          <span style={{
            padding: "4px 12px", borderRadius: 20, fontFamily: FONT, fontSize: 11, fontWeight: 500, marginLeft: 8,
            background: activeList.status === "sent" ? COLORS.accentBg : activeList.status === "queued" ? COLORS.warnBg : COLORS.blueBg,
            color: activeList.status === "sent" ? COLORS.accent : activeList.status === "queued" ? COLORS.warn : COLORS.blue,
          }}>
            {activeList.status}
          </span>
          <button
            onClick={() => {
              const headers = COLUMNS.map(c => c.label).join(",");
              const rows = activeList.contacts.map(contact =>
                COLUMNS.map(col => `"${(getCellValue(contact, col, activeList) || "").replace(/"/g, '""')}"`).join(",")
              );
              const csv = [headers, ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${activeList.name.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "_")}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: "8px 16px", marginLeft: 8,
              background: "transparent", border: `1px solid ${COLORS.border}`,
              borderRadius: 8, color: COLORS.text, fontFamily: FONT, fontSize: 12, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.text; }}
          >
            ↓ Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div style={{ minWidth: COLUMNS.reduce((sum, c) => sum + c.width, 0) + 40 }}>
          {/* Table Header */}
          <div style={{
            display: "flex", position: "sticky", top: 0, zIndex: 10,
            background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
            padding: "0 20px",
          }}>
            {COLUMNS.map(col => (
              <div key={col.key} style={{
                width: col.width, flexShrink: 0, padding: "10px 8px",
                fontFamily: FONT, fontSize: 10, color: COLORS.textDim,
                letterSpacing: "0.08em", fontWeight: 600,
              }}>
                {col.label.toUpperCase()}
              </div>
            ))}
          </div>

          {/* Table Rows */}
          {activeList.contacts.map((contact, i) => (
            <div
              key={contact.id}
              style={{
                display: "flex", padding: "0 20px",
                borderBottom: i < activeList.contacts.length - 1 ? `1px solid ${COLORS.border}` : "none",
                transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {COLUMNS.map(col => {
                const val = getCellValue(contact, col, activeList);
                const isEmail = col.key === "email";
                const isVerified = col.key === "verified";
                return (
                  <div key={col.key} style={{
                    width: col.width, flexShrink: 0, padding: "10px 8px",
                    fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: isEmail ? COLORS.blue : isVerified ? (val.includes("Yes") ? COLORS.accent : COLORS.warn) : COLORS.text,
                    fontFamily: isEmail ? FONT : FONT_BODY,
                  }}>
                    {val}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}








function DashboardView({ setActivePage, projectId }) {
  const [chartRange, setChartRange] = useState("30D");
  const [chartMetrics, setChartMetrics] = useState({ outreach: true, responses: true, meetings: true, deals: false, revenue: false });
  const [dbStats, setDbStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await api.stats.dashboard({ projectId: projectId || undefined });
        setDbStats(stats);
      } catch (err) {
        console.error("Failed to load stats:", err);
        setDbStats(null);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, [projectId]);

  useEffect(() => {
    async function loadChart() {
      setLoadingChart(true);
      try {
        const data = await api.stats.chart({ projectId: projectId || undefined, range: chartRange });
        setChartData(data);
      } catch (err) {
        console.error("Failed to load chart:", err);
        setChartData(null);
      } finally {
        setLoadingChart(false);
      }
    }
    loadChart();
  }, [projectId, chartRange]);

  // Chart series from DB (outreach, responses, meetings); deals/revenue remain placeholders
  const CHART_SERIES = {
    outreach: { label: "Outreach Sent", color: "#3B82F6", data: chartData?.outreach || [] },
    responses: { label: "Responses", color: "#8B5CF6", data: chartData?.responses || [] },
    meetings: { label: "Meetings Booked", color: "#C9A84C", data: chartData?.meetings || [] },
    deals: { label: "Deals Closed", color: "#22C55E", data: [] },
    revenue: { label: "Revenue (£K)", color: "#EC4899", data: [] },
  };

  const RANGE_LABELS = { "7D": "7 Days", "30D": "30 Days", "90D": "90 Days", "12M": "12 Months" };

  // Stats from database only (no hardcoded fallback)
  const s = dbStats?.stats || {};
  const n = (v) => typeof v === 'number' ? v.toLocaleString() : String(v ?? 0);
  const STATS = [
    { label: "Total Leads", value: n(s.totalLeads), icon: "🔍", sub: `${n(s.verifiedEmails)} verified` },
    { label: "Companies", value: n(s.totalCompanies), icon: "🏢", sub: null },
    { label: "Lead Lists", value: n(s.totalLists), icon: "📋", sub: null },
    { label: "Outreach Sent", value: n(s.outreachSent), icon: "📤", sub: null },
    { label: "Responses", value: n(s.responses), icon: "💬", sub: (s.outreachSent > 0 && s.responses != null) ? `${((s.responses / s.outreachSent) * 100).toFixed(1)}% reply rate` : null },
    { label: "Meetings Booked", value: n(s.meetings), icon: "📅", sub: null },
  ];

  const ACTIVITY = dbStats?.recentActivity?.length > 0
    ? dbStats.recentActivity.map((a, i) => {
        const timeAgo = Math.round((Date.now() - new Date(a.time).getTime()) / (1000 * 60 * 60));
        const isRecent = timeAgo < 1;
        return {
          action: a.action,
          detail: a.detail,
          time: timeAgo < 1 ? "Just now" : timeAgo < 24 ? `${timeAgo}h ago` : `${Math.round(timeAgo / 24)}d ago`,
          icon: a.action.includes('list') ? "📋" : a.action.includes('Company') ? "🏢" : "✨",
          status: isRecent ? "RUNNING" : "COMPLETE",
        };
      })
    : [];

  const QUICK_ACTIONS = [
    { label: "Run Discovery", icon: "⚡", page: "leads" },
    { label: "Import List", icon: "⬆️", page: "leadlists" },
    { label: "Start AI Audit", icon: "🔍", page: "audit" },
    { label: "Generate Scripts", icon: "📞", page: "sales_scripts" },
    { label: "Research Niche", icon: "🎯", page: "niche_researcher" },
    { label: "View CRM", icon: "📊", page: "crm" },
  ];

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          <span style={{ color: COLORS.accent }}>Dashboard</span>
        </h2>
        <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>Your pipeline at a glance</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 28 }}>
        {STATS.map((stat, i) => (
          <div key={i} style={{ padding: "18px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.04em" }}>{stat.label.toUpperCase()}</span>
              <span style={{ fontSize: 14 }}>{stat.icon}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: FONT, color: COLORS.text, marginBottom: 4 }}>{stat.value}</div>
            {stat.sub && <div style={{ fontSize: 11, color: COLORS.accent, fontWeight: 500 }}>{stat.sub}</div>}
          </div>
        ))}
      </div>

      {/* ROI & Time Saved Banner */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <div style={{ padding: "18px 20px", background: `linear-gradient(135deg, ${COLORS.accent}12, ${COLORS.accent}06)`, border: `1px solid ${COLORS.accent}28`, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>⏱️</span>
            <span style={{ fontSize: 9, fontFamily: FONT, fontWeight: 600, color: COLORS.accent, letterSpacing: "0.06em" }}>HOURS SAVED THIS MONTH</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: FONT, color: COLORS.accent }}>— <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textMuted }}>hrs</span></div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>Lead research · Outreach · Analysis · Content</div>
        </div>
        <div style={{ padding: "18px 20px", background: `linear-gradient(135deg, ${COLORS.green}12, ${COLORS.green}06)`, border: `1px solid ${COLORS.green}28`, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>💵</span>
            <span style={{ fontSize: 9, fontFamily: FONT, fontWeight: 600, color: COLORS.green, letterSpacing: "0.06em" }}>ESTIMATED SAVINGS THIS MONTH</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: FONT, color: COLORS.green }}>— <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textMuted }}>/mo</span></div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>Based on $100/hr rate</div>
        </div>
        <div style={{ padding: "18px 20px", background: `linear-gradient(135deg, ${COLORS.purple}12, ${COLORS.purple}06)`, border: `1px solid ${COLORS.purple}28`, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>📈</span>
            <span style={{ fontSize: 9, fontFamily: FONT, fontWeight: 600, color: COLORS.purple, letterSpacing: "0.06em" }}>ANNUAL PROJECTION</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: FONT, color: COLORS.purple }}>— <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.textMuted }}>/yr</span></div>
          <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>Equivalent hours saved</div>
        </div>
      </div>

      {/* Chart */}
      {(() => {
        const chartW = 820; const chartH = 200;
        const activeMetrics = Object.entries(chartMetrics).filter(([_, v]) => v).map(([k]) => k);
        const allValues = activeMetrics.flatMap(k => CHART_SERIES[k].data || []);
        const maxVal = Math.max(...allValues, 1);

        const dates = chartData?.dates || [];
        const today = new Date();
        const formatDateLabel = (dateStr, i) => {
          if (!dateStr) return '';
          // API returns ISO strings (2025-02-10T00:00:00.000Z) or plain dates (2025-02-10); extract YYYY-MM-DD
          const datePart = String(dateStr).slice(0, 10);
          const [y, m, d] = datePart.split('-').map(Number);
          if (isNaN(y) || isNaN(m) || isNaN(d)) return '';
          const dte = new Date(y, m - 1, d);
          const isToday = dte.getDate() === today.getDate() && dte.getMonth() === today.getMonth() && dte.getFullYear() === today.getFullYear();
          if (chartRange === '7D' || chartRange === '30D') {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const short = days[dte.getDay()];
            return isToday ? 'Today' : (chartRange === '7D' ? short : `${m}/${d}`);
          }
          if (chartRange === '90D') return `W${i + 1}`;
          if (chartRange === '12M') return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dte.getMonth()];
          return '';
        };

        return (
          <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.entries(CHART_SERIES).map(([key, series]) => (
                  <label key={key} onClick={() => setChartMetrics(prev => ({ ...prev, [key]: !prev[key] }))} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", padding: "4px 10px", borderRadius: 6, background: chartMetrics[key] ? series.color + "12" : "transparent", border: `1px solid ${chartMetrics[key] ? series.color + "44" : COLORS.border}`, transition: "all 0.15s" }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: chartMetrics[key] ? series.color : COLORS.border }} />
                    <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: chartMetrics[key] ? series.color : COLORS.textDim }}>{series.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: "flex", gap: 2, background: COLORS.bg, borderRadius: 6, padding: 2, border: `1px solid ${COLORS.border}` }}>
                {["7D", "30D", "90D", "12M"].map(r => (
                  <button key={r} onClick={() => setChartRange(r)} style={{ padding: "4px 10px", borderRadius: 4, border: "none", fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer", background: chartRange === r ? COLORS.accent : "transparent", color: chartRange === r ? COLORS.bg : COLORS.textDim }}>{r}</button>
                ))}
              </div>
            </div>
            <div style={{ position: "relative", height: chartH + 30, width: "100%", minWidth: 400, overflow: "hidden" }}>
              {/* Y-axis labels - full width */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                <div key={i} style={{ position: "absolute", left: 0, right: 0, top: (1 - pct) * chartH, display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, width: 40, flexShrink: 0, textAlign: "right", paddingRight: 8 }}>{Math.round(maxVal * pct).toLocaleString()}</span>
                  <div style={{ flex: 1, minWidth: 0, height: 1, background: COLORS.border, opacity: 0.5 }} />
                </div>
              ))}
              {/* SVG chart - stretches to fill horizontal space (left: 48 for y-axis, right: 0) */}
              <svg style={{ position: "absolute", left: 48, right: 0, top: 0, height: chartH, overflow: "visible" }} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none">
                {!loadingChart && activeMetrics.map(key => {
                  const d = CHART_SERIES[key].data || [];
                  if (d.length === 0) return null;
                  const max = Math.max(...allValues, 1);
                  const step = d.length > 1 ? (chartW / (d.length - 1)) : chartW;
                  const pathPoints = d.map((v, i) => `${step * i},${chartH - (v / max) * (chartH - 10)}`).join(" L ");
                  return <path key={key} d={`M ${pathPoints}`} fill="none" stroke={CHART_SERIES[key].color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />;
                })}
                {!loadingChart && activeMetrics.map(key => {
                  const d = CHART_SERIES[key].data || [];
                  if (d.length === 0) return null;
                  const max = Math.max(...allValues, 1);
                  const step = d.length > 1 ? (chartW / (d.length - 1)) : chartW;
                  const x = step * (d.length - 1);
                  const y = chartH - (d[d.length - 1] / max) * (chartH - 10);
                  return <circle key={key + "_dot"} cx={x} cy={y} r="4" fill={CHART_SERIES[key].color} vectorEffect="non-scaling-stroke" />;
                })}
              </svg>
              {/* X-axis labels - aligned to data points, full width */}
              <div style={{ position: "absolute", left: 48, right: 0, bottom: 0, height: 30 }}>
                {dates.map((dateStr, i) => {
                  const n = dates.length;
                  const pct = n > 1 ? (i / (n - 1)) * 100 : 50;
                  return (
                    <span key={i} style={{ position: "absolute", left: `${pct}%`, transform: "translateX(-50%)", fontSize: 9, color: COLORS.textDim, fontFamily: FONT, whiteSpace: "nowrap" }}>{formatDateLabel(dateStr, i)}</span>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* AI Activity Feed */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}88`, animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.04em" }}>AI AGENTS — LIVE ACTIVITY</span>
          </div>
          {ACTIVITY.length > 0 ? ACTIVITY.map((a, i) => (
            <div key={i} style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <span style={{ fontSize: 14, width: 28, textAlign: "center" }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{a.action}</div>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>{a.detail}</div>
              </div>
              <span style={{ fontSize: 9, fontFamily: FONT, fontWeight: 600, padding: "2px 8px", borderRadius: 6, background: a.status === "RUNNING" ? COLORS.green + "15" : a.status === "ACTION NEEDED" ? COLORS.warn + "15" : COLORS.border, border: `1px solid ${a.status === "RUNNING" ? COLORS.green + "33" : a.status === "ACTION NEEDED" ? COLORS.warn + "33" : COLORS.border}`, color: a.status === "RUNNING" ? COLORS.green : a.status === "ACTION NEEDED" ? COLORS.warn : COLORS.textDim, boxShadow: a.status === "RUNNING" ? `0 0 4px ${COLORS.green}88` : a.status === "ACTION NEEDED" ? `0 0 4px ${COLORS.warn}88` : "none", whiteSpace: "nowrap" }}>{a.status}</span>
              <span style={{ fontSize: 10, color: COLORS.textDim, whiteSpace: "nowrap" }}>{a.time}</span>
            </div>
          )) : (
            <div style={{ padding: "24px 18px", textAlign: "center", color: COLORS.textDim, fontSize: 12 }}>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.green, boxShadow: `0 0 6px ${COLORS.green}88`, animation: "pulse 2s infinite" }} />
                <span>No activity yet</span>
              </div>
              <div style={{ fontSize: 11 }}>AI agents will appear here when active</div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 11, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.04em" }}>QUICK ACTIONS</span>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {QUICK_ACTIONS.map((a, i) => (
              <button key={i} onClick={() => setActivePage(a.page)} style={{ padding: "12px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13, fontWeight: 500, color: COLORS.textMuted, transition: "all 0.15s", textAlign: "left" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent + "44"; e.currentTarget.style.color = COLORS.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
              ><span style={{ fontSize: 14 }}>{a.icon}</span>{a.label}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CRMPipelineView({ projectId }) {
  const STAGES = ["New", "Contacted", "Replied", "Meeting Booked", "Proposal Sent", "Won", "Lost"];
  const STAGE_COLORS = { New: COLORS.blue, Contacted: "#8B5CF6", Replied: COLORS.accent, "Meeting Booked": "#F59E0B", "Proposal Sent": "#EC4899", Won: COLORS.green, Lost: COLORS.danger };

  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [viewMode, setViewMode] = useState("kanban");
  const [note, setNote] = useState("");
  const [dealActivity, setDealActivity] = useState([]);

  const pipelineValue = useMemo(() =>
    deals.filter(d => d.stage !== "Lost").reduce((sum, d) => sum + (d.valueNum || 0), 0),
    [deals]
  );

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await api.crm.pipeline({ projectId: projectId || undefined });
        setDeals(data.deals || []);
      } catch (err) {
        console.error("CRM pipeline load error:", err);
        setDeals([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const updateDealStage = async (dealId, newStage) => {
    try {
      const currentDeal = deals.find(d => d.id === dealId);
      const oldStage = currentDeal?.stage;
      await api.leads.update(dealId, { stage: newStage });
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
      if (selectedDeal?.id === dealId) setSelectedDeal(prev => prev ? { ...prev, stage: newStage } : null);
      api.activity.create({ action: `Stage changed: ${oldStage} → ${newStage}`, resource_type: 'lead', resource_id: dealId, metadata_json: { from: oldStage, to: newStage } })
        .then(entry => setDealActivity(prev => [entry, ...prev]))
        .catch(() => {});
    } catch (err) {
      console.error("Failed to update deal stage:", err);
    }
  };

  const saveNotes = async (dealId, notes) => {
    try {
      await api.leads.update(dealId, { crm_notes: notes });
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, crm_notes: notes } : d));
    } catch (err) {
      console.error("Failed to save notes:", err);
    }
  };

  useEffect(() => {
    if (selectedDeal) setNote(selectedDeal.crm_notes || "");
  }, [selectedDeal?.id]);

  useEffect(() => {
    if (selectedDeal?.id) {
      api.activity.list({ resource_type: 'lead', resource_id: selectedDeal.id, limit: 20 })
        .then(data => setDealActivity(Array.isArray(data) ? data : []))
        .catch(() => setDealActivity([]));
    } else {
      setDealActivity([]);
    }
  }, [selectedDeal?.id]);

  const handleNoteBlur = () => {
    if (selectedDeal && note !== (selectedDeal.crm_notes || "")) saveNotes(selectedDeal.id, note);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "18px 28px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, margin: 0 }}>CRM <span style={{ color: COLORS.accent }}>Pipeline</span></h2>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{loading ? "..." : `${deals.length} deals · £${Math.round(pipelineValue).toLocaleString()} pipeline value`}</div>
        </div>
        <div style={{ display: "flex", gap: 6, background: COLORS.bg, borderRadius: 8, padding: 3, border: `1px solid ${COLORS.border}` }}>
          <button onClick={() => setViewMode("kanban")} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer", background: viewMode === "kanban" ? COLORS.accent : "transparent", color: viewMode === "kanban" ? COLORS.bg : COLORS.textMuted }}>Kanban</button>
          <button onClick={() => setViewMode("table")} style={{ padding: "6px 14px", borderRadius: 6, border: "none", fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer", background: viewMode === "table" ? COLORS.accent : "transparent", color: viewMode === "table" ? COLORS.bg : COLORS.textMuted }}>Table</button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "auto", padding: viewMode === "kanban" ? "16px" : "0" }}>
          {viewMode === "kanban" ? (
            <div style={{ display: "flex", gap: 10, minWidth: "max-content", height: "100%" }}>
              {STAGES.map(stage => {
                const stageDeals = deals.filter(d => d.stage === stage);
                const col = STAGE_COLORS[stage];
                return (
                  <div key={stage} style={{ width: 220, flexShrink: 0, display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: col }} />
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.text }}>{stage}</span>
                      </div>
                      <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, background: COLORS.surface, padding: "2px 8px", borderRadius: 8 }}>{stageDeals.length}</span>
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      {stageDeals.map(deal => (
                        <div key={deal.id} onClick={() => setSelectedDeal(deal)} style={{ padding: "12px 14px", background: COLORS.surface, border: `1px solid ${selectedDeal?.id === deal.id ? COLORS.accent + "55" : COLORS.border}`, borderRadius: 8, cursor: "pointer", borderLeft: `3px solid ${col}`, transition: "border-color 0.15s" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "44"} onMouseLeave={e => { if (selectedDeal?.id !== deal.id) e.currentTarget.style.borderColor = COLORS.border; }}>
                          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{deal.name}</div>
                          <div style={{ fontSize: 10, color: COLORS.textDim }}>{deal.title} · {deal.company}</div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.accent, fontFamily: FONT }}>{deal.value}</span>
                            <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: deal.score != null ? (deal.score >= 90 ? COLORS.green + "15" : COLORS.blue + "15") : "transparent", color: deal.score != null ? (deal.score >= 90 ? COLORS.green : COLORS.blue) : COLORS.textDim }}>{deal.score ?? "—"}</span>
                          </div>
                          <div style={{ fontSize: 9, color: COLORS.textDim, marginTop: 6 }}>{deal.lastActivity}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
                  {["Name", "Company", "Stage", "Value", "ICP Score", "Source", "Last Activity"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, fontWeight: 600, letterSpacing: "0.04em" }}>{h.toUpperCase()}</th>
                  ))}
                </tr></thead>
                <tbody>{deals.map(deal => (
                  <tr key={deal.id} onClick={() => setSelectedDeal(deal)} style={{ borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", background: selectedDeal?.id === deal.id ? COLORS.accentBg : "transparent" }}
                    onMouseEnter={e => e.currentTarget.style.background = COLORS.surface} onMouseLeave={e => e.currentTarget.style.background = selectedDeal?.id === deal.id ? COLORS.accentBg : "transparent"}>
                    <td style={{ padding: "10px 14px" }}><div style={{ fontWeight: 600, fontSize: 12 }}>{deal.name}</div><div style={{ fontSize: 10, color: COLORS.textDim }}>{deal.title}</div></td>
                    <td style={{ padding: "10px 14px", fontSize: 12 }}>{deal.company}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: STAGE_COLORS[deal.stage] + "15", color: STAGE_COLORS[deal.stage] }}>{deal.stage}</span></td>
                    <td style={{ padding: "10px 14px", fontSize: 12, fontWeight: 600, fontFamily: FONT, color: COLORS.accent }}>{deal.value}</td>
                    <td style={{ padding: "10px 14px" }}><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: deal.score != null ? (deal.score >= 90 ? COLORS.green + "15" : COLORS.blue + "15") : "transparent", color: deal.score != null ? (deal.score >= 90 ? COLORS.green : COLORS.blue) : COLORS.textDim }}>{deal.score ?? "—"}</span></td>
                    <td style={{ padding: "10px 14px", fontSize: 11, color: COLORS.textDim }}>{deal.source}</td>
                    <td style={{ padding: "10px 14px", fontSize: 10, color: COLORS.textDim }}>{deal.lastActivity}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedDeal && (
          <div style={{ width: 320, flexShrink: 0, borderLeft: `1px solid ${COLORS.border}`, overflow: "auto", background: COLORS.surface }}>
            <div style={{ padding: "16px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{selectedDeal.name}</span>
              <button onClick={() => setSelectedDeal(null)} style={{ background: "none", border: "none", color: COLORS.textDim, cursor: "pointer", fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>{selectedDeal.title} · {selectedDeal.company}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.accent, fontFamily: FONT, marginTop: 4 }}>{selectedDeal.value}</div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>STAGE</div>
                <select value={selectedDeal.stage} onChange={e => { const ns = e.target.value; updateDealStage(selectedDeal.id, ns); }} style={{ width: "100%", padding: "8px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer" }}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div style={{ padding: "8px 10px", background: COLORS.bg, borderRadius: 6 }}><div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600 }}>ICP SCORE</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT, color: selectedDeal.score != null ? (selectedDeal.score >= 90 ? COLORS.green : COLORS.blue) : COLORS.textDim }}>{selectedDeal.score ?? "—"}</div></div>
                <div style={{ padding: "8px 10px", background: COLORS.bg, borderRadius: 6 }}><div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600 }}>SOURCE</div><div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>{selectedDeal.source}</div></div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>CONTACT</div>
                <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 2 }}>✉️ {selectedDeal.email}</div>
                <div style={{ fontSize: 11, color: COLORS.text }}>💼 linkedin.com/in/{selectedDeal.name.toLowerCase().replace(/ /g, "")}</div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>NOTES</div>
                <textarea value={note} onChange={e => setNote(e.target.value)} onBlur={handleNoteBlur} placeholder="Add notes about this deal..." rows={3} style={{ width: "100%", padding: "8px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em" }}>ACTIVITY</div>
                {dealActivity.length === 0 ? (
                  <div style={{ fontSize: 11, color: COLORS.textDim, padding: "6px 0" }}>No activity recorded yet.</div>
                ) : dealActivity.slice(0, 8).map((a, i) => {
                  const ts = a.created_at ? new Date(a.created_at) : null;
                  const timeLabel = ts ? ts.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <div key={a.id || i} style={{ padding: "6px 0", borderBottom: i < Math.min(dealActivity.length, 8) - 1 ? `1px solid ${COLORS.border}` : "none", display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11, color: COLORS.text }}>{a.action}</span>
                      <span style={{ fontSize: 10, color: COLORS.textDim }}>{timeLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CALENDAR_INTEGRATION_KEYS = ["calendly", "calcom", "google_calendar"];
const CALENDAR_HOURS = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];
const TYPE_COLORS = { Discovery: COLORS.blue, "AI Audit": "#7B61FF", "Follow-up": COLORS.accent, Close: COLORS.green, Proposal: "#EC4899" };
const SOURCE_COLORS = { calcom: "#7B61FF", google_calendar: "#4285F4", calendly: COLORS.accent };

function parseSlotHour(h) {
  const parts = h.trim().split(/\s+/);
  let n = parseInt(parts[0], 10) || 0;
  const period = (parts[1] || "AM").toUpperCase();
  if (period === "PM" && n !== 12) n += 12;
  if (period === "AM" && n === 12) n = 0;
  return n;
}

function AppointmentsView({ setActivePage }) {
  const [activeTab, setActiveTab] = useState("calls");
  const [integrationStatus, setIntegrationStatus] = useState({});
  const [calendarData, setCalendarData] = useState({ events: [], bySource: {}, date: "", hours: CALENDAR_HOURS });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const TODAY = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  useEffect(() => {
    api.integrations.list().then((r) => setIntegrationStatus(r.integrations || {})).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "calendar" || activeTab === "calls") {
      setCalendarLoading(true);
      api.calendar.getEvents(dateStr).then((r) => {
        setCalendarData({ events: r.events || [], bySource: r.bySource || {}, date: r.date || dateStr, hours: r.hours || CALENDAR_HOURS });
      }).catch(() => setCalendarData((prev) => ({ ...prev, events: [] }))).finally(() => setCalendarLoading(false));
    }
  }, [activeTab, dateStr]);

  const calendarBadges = CALENDAR_INTEGRATION_KEYS.map((k) => {
    const s = integrationStatus[k];
    const connected = typeof s === "object" ? !!s?.connected : !!s;
    const signedIn = typeof s === "object" ? s?.signedIn : connected;
    const ok = k === "google_calendar" ? connected && signedIn : connected;
    const label = k === "calendly" ? "Calendly" : k === "calcom" ? "Cal.com" : "Google Calendar";
    return { key: k, label, ok };
  }).filter((b) => b.ok);

  const events = calendarData.events || [];
  const now = Date.now();
  const upcomingEvents = events.filter((e) => new Date(e.start).getTime() >= now);
  const pastEvents = events.filter((e) => new Date(e.start).getTime() < now);

  const getEventsForHour = (hourStr) => {
    const slotH = parseSlotHour(hourStr);
    return events.filter((e) => {
      const d = new Date(e.start);
      return d.getHours() === slotH;
    });
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0 }}>
            <span style={{ color: COLORS.accent }}>Appointments</span>
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>{TODAY} · {events.length} event{events.length !== 1 ? "s" : ""} today</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {calendarBadges.length > 0 ? (
            calendarBadges.map((b) => (
              <div key={b.key} style={{ padding: "6px 12px", borderRadius: 6, background: COLORS.green + "15", border: `1px solid ${COLORS.green}33`, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green }} />
                <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.green }}>{b.label} Connected</span>
              </div>
            ))
          ) : (
            <div style={{ padding: "6px 12px", borderRadius: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim }}>No calendar connected</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {[{ key: "calls", label: "📋 Call List" }, { key: "calendar", label: "📅 Calendar" }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: activeTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: activeTab === tab.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "calls" && (
        <div>
          {calendarLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: COLORS.textDim, fontSize: 13 }}>Loading calendar events…</div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
                {upcomingEvents.length === 0 && !calendarLoading ? (
                  <div style={{ padding: 24, background: COLORS.surface, border: `1px dashed ${COLORS.border}`, borderRadius: 12, color: COLORS.textDim, fontSize: 13, textAlign: "center" }}>No upcoming events from connected calendars. Connect Cal.com or Google Calendar in Settings &gt; Integrations.</div>
                ) : (
                  upcomingEvents.map((ev) => {
                    const color = SOURCE_COLORS[ev.source] || TYPE_COLORS[ev.type] || COLORS.accent;
                    const sourceLabel = ev.source === "calcom" ? "Cal.com" : ev.source === "google_calendar" ? "Google" : ev.source === "calendly" ? "Calendly" : "";
                    return (
                      <div key={ev.id} style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderLeft: `4px solid ${color}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: COLORS.text }}>{ev.time}</div>
                              <div style={{ fontSize: 10, color: COLORS.textDim }}>{ev.duration}</div>
                            </div>
                            <div style={{ width: 1, height: 36, background: COLORS.border }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 15 }}>{ev.name || ev.title}</div>
                              <div style={{ fontSize: 12, color: COLORS.textDim }}>{ev.title} {sourceLabel && `· ${sourceLabel}`}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 600, background: color + "15", color }}>{ev.type || ev.title}</span>
                            {ev.link && <a href={ev.link} target="_blank" rel="noreferrer" style={{ padding: "6px 14px", background: COLORS.accent, color: COLORS.bg, borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>Join Call</a>}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                          <button onClick={() => setActivePage && setActivePage("crm")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>View in CRM</button>
                          <button onClick={() => setActivePage && setActivePage("sales_scripts")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>Prep Script</button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {pastEvents.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.04em", marginBottom: 10 }}>COMPLETED</div>
                  {pastEvents.map((ev) => {
                    const color = SOURCE_COLORS[ev.source] || TYPE_COLORS[ev.type] || COLORS.accent;
                    return (
                      <div key={ev.id} style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7 }}>
                        <div><span style={{ fontWeight: 600, fontSize: 12 }}>{ev.name || ev.title}</span><span style={{ fontSize: 11, color: COLORS.textDim }}> · {ev.title} · {ev.time}</span></div>
                        <span style={{ fontSize: 10, color: COLORS.textDim }}>{ev.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "calendar" && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
          {calendarLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: COLORS.textDim, fontSize: 13 }}>Loading calendar…</div>
          ) : (
            (calendarData.hours || CALENDAR_HOURS).map((hour, hi) => {
              const hourEvents = getEventsForHour(hour);
              const hasEvents = hourEvents.length > 0;
              return (
                <div key={hi} style={{ display: "flex", borderBottom: hi < (calendarData.hours || CALENDAR_HOURS).length - 1 ? `1px solid ${COLORS.border}` : "none", minHeight: 52 }}>
                  <div style={{ width: 70, padding: "10px 12px", borderRight: `1px solid ${COLORS.border}`, fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, flexShrink: 0 }}>{hour}</div>
                  <div style={{ flex: 1, padding: hasEvents ? "8px 12px" : 0, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                    {hourEvents.map((ev) => {
                      const color = SOURCE_COLORS[ev.source] || TYPE_COLORS[ev.type] || COLORS.accent;
                      return (
                        <div key={ev.id} style={{ flex: hourEvents.length > 1 ? "1 1 min(200px, 100%)" : "0 1 auto", minWidth: 160, padding: "8px 14px", background: color + "12", border: `1px solid ${color}33`, borderRadius: 6, borderLeft: `3px solid ${color}` }}>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{ev.name || ev.title} {ev.company ? `— ${ev.company}` : ""}</div>
                          <div style={{ fontSize: 10, color: COLORS.textDim }}>{ev.type || ev.title} · {ev.duration} {ev.source ? `· ${ev.source === "calcom" ? "Cal.com" : ev.source === "google_calendar" ? "Google" : ev.source}` : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

const sampleItem = (text, feedback) => (typeof text === "string" ? { text, feedback: feedback ?? null } : { text: text?.text || "", feedback: text?.feedback ?? null });

const DEFAULT_AI_SDR = {
  active: false,
  training: { sentMessages: true, scripts: true, brandVoice: true, starredThreads: false },
  permissions: { positiveReply: true, answerQuestions: true, bookMeetings: true, followUp: true, handleObjections: false, negotiatePricing: false },
  responseWindow: "5 min",
  workingHours: "9am–6pm Mon–Fri",
  approvalMode: true,
  customGuidelines: "",
  sampleResponses: [
    sampleItem("Hey Sarah, great to hear the team is interested! I've got availability Thursday at 2pm or Friday at 10am — either work for a quick 15-min intro?"),
    sampleItem("Thanks for the kind words! We just wrapped up a similar project with a Series B SaaS company. Happy to walk you through it — do you have 15 min this week?"),
  ],
};

function UniboxView({ projectId }) {
  const [uniboxTab, setUniboxTab] = useState("inbox");
  const [sdrActive, setSdrActive] = useState(DEFAULT_AI_SDR.active);
  const [sdrPerms, setSdrPerms] = useState(DEFAULT_AI_SDR.permissions);
  const [sdrTraining, setSdrTraining] = useState(DEFAULT_AI_SDR.training);
  const [sdrResponseWindow, setSdrResponseWindow] = useState(DEFAULT_AI_SDR.responseWindow);
  const [sdrApprovalMode, setSdrApprovalMode] = useState(DEFAULT_AI_SDR.approvalMode);
  const [sdrCustomGuidelines, setSdrCustomGuidelines] = useState(DEFAULT_AI_SDR.customGuidelines);
  const [sdrSampleResponses, setSdrSampleResponses] = useState([...DEFAULT_AI_SDR.sampleResponses]);
  const [sdrGenerating, setSdrGenerating] = useState(false);
  const [sdrWorkingHours, setSdrWorkingHours] = useState(DEFAULT_AI_SDR.workingHours);
  const [sdrSettingsLoaded, setSdrSettingsLoaded] = useState(false);

  const sdrParams = { projectId: projectId || "" };

  useEffect(() => {
    async function load() {
      try {
        const res = await api.settings.get("ai_sdr", sdrParams);
        if (res?.settings) {
          const s = res.settings;
          setSdrActive(s.active ?? DEFAULT_AI_SDR.active);
          setSdrTraining({ ...DEFAULT_AI_SDR.training, ...s.training });
          setSdrPerms({ ...DEFAULT_AI_SDR.permissions, ...s.permissions });
          setSdrResponseWindow(s.responseWindow ?? DEFAULT_AI_SDR.responseWindow);
          setSdrApprovalMode(s.approvalMode ?? DEFAULT_AI_SDR.approvalMode);
          setSdrCustomGuidelines(s.customGuidelines ?? "");
          setSdrSampleResponses(Array.isArray(s.sampleResponses)
            ? s.sampleResponses.map(x => sampleItem(x))
            : [...DEFAULT_AI_SDR.sampleResponses]);
          setSdrWorkingHours(s.workingHours ?? DEFAULT_AI_SDR.workingHours);
        } else {
          await api.settings.save("ai_sdr", DEFAULT_AI_SDR, sdrParams);
        }
      } catch (err) {
        console.error("AI SDR settings load error:", err);
      } finally {
        setSdrSettingsLoaded(true);
      }
    }
    load();
  }, [projectId]);

  const saveSdrSettings = async (updates) => {
    const payload = {
      active: sdrActive,
      training: sdrTraining,
      permissions: sdrPerms,
      responseWindow: sdrResponseWindow,
      approvalMode: sdrApprovalMode,
      customGuidelines: sdrCustomGuidelines,
      sampleResponses: sdrSampleResponses,
      workingHours: sdrWorkingHours,
      ...updates,
    };
    try {
      await api.settings.save("ai_sdr", payload, sdrParams);
    } catch (err) {
      console.error("AI SDR settings save error:", err);
    }
  };

  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);

  useEffect(() => {
    // Fetch local conversations + external provider inboxes in parallel, then merge
    const normalizeHeyReach = (items) => (Array.isArray(items) ? items : []).map(c => ({
      id: `hr_${c.conversationId || c.id}`,
      name: [c.leadFirstName, c.leadLastName].filter(Boolean).join(' ') || c.leadLinkedInUrl || 'LinkedIn Contact',
      company: c.leadCompanyName || '',
      channel: 'linkedin',
      subject: c.lastMessageText ? c.lastMessageText.slice(0, 60) : '',
      status: 'open',
      unread: c.hasUnreadMessages || false,
      time: c.lastMessageTime || c.updatedAt || null,
      source: 'heyreach',
      preview: c.lastMessageText || '',
    }));
    const normalizeAimFox = (items) => (Array.isArray(items) ? items : []).map(c => ({
      id: `af_${c.id}`,
      name: [c.firstName, c.lastName].filter(Boolean).join(' ') || c.linkedInUrl || 'LinkedIn Contact',
      company: c.company || '',
      channel: 'linkedin',
      subject: c.lastMessage ? c.lastMessage.slice(0, 60) : '',
      status: 'open',
      unread: c.unread || false,
      time: c.lastMessageAt || c.updatedAt || null,
      source: 'aimfox',
      preview: c.lastMessage || '',
    }));
    const normalizeInstantly = (items) => (Array.isArray(items) ? items : []).map(e => ({
      id: `ins_${e.id}`,
      name: e.from_address || e.to_address || 'Email Contact',
      company: '',
      channel: 'email',
      subject: e.subject || '',
      status: e.is_read ? 'read' : 'open',
      unread: !e.is_read,
      time: e.timestamp || e.created_at || null,
      source: 'instantly',
      preview: e.body ? e.body.slice(0, 100) : '',
    }));

    Promise.allSettled([
      api.conversations.list(),
      api.heyreach.conversations({ offset: 0, limit: 50 }),
      api.aimfox.conversations({ inApp: true }),
      api.instantly.emails.list({ limit: 50 }),
    ]).then(([localRes, hrRes, afRes, insRes]) => {
      const local = localRes.status === 'fulfilled' ? (Array.isArray(localRes.value) ? localRes.value : localRes.value?.conversations || []) : [];
      const hr = hrRes.status === 'fulfilled' ? normalizeHeyReach(hrRes.value?.items || hrRes.value?.conversations || hrRes.value || []) : [];
      const af = afRes.status === 'fulfilled' ? normalizeAimFox(afRes.value?.items || afRes.value?.conversations || afRes.value || []) : [];
      const ins = insRes.status === 'fulfilled' ? normalizeInstantly(insRes.value?.items || insRes.value?.emails || insRes.value || []) : [];
      const all = [...local, ...hr, ...af, ...ins].sort((a, b) => (b.time ? new Date(b.time) : 0) - (a.time ? new Date(a.time) : 0));
      setConversations(all);
      if (all.length > 0 && !selectedConvo) setSelectedConvo(all[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedConvo?.id) {
      api.messages.list(selectedConvo.id).then(data => {
        setThreadMessages(Array.isArray(data) ? data : data.messages || []);
      }).catch(() => setThreadMessages([]));
    }
  }, [selectedConvo?.id]);
  const [replyText, setReplyText] = useState("");
  const [aiAssist, setAiAssist] = useState(false);
  const [aiGoal, setAiGoal] = useState("Book a meeting");
  const [aiDrafts, setAiDrafts] = useState(null);
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [filter, setFilter] = useState("all");

  const THREAD = threadMessages.length > 0
    ? threadMessages.map(m => ({ from: m.direction === 'outbound' ? 'You' : (selectedConvo?.name || 'Contact'), time: m.sent_at || m.created_at || '', content: m.body || m.content || '' }))
    : [
        { from: "You", time: "3d ago", content: `Hi ${selectedConvo?.name?.split(" ")[0]},\n\nI noticed ${selectedConvo?.company} has been scaling rapidly — congrats on the recent growth.\n\nWe help companies like yours automate outbound sales using AI, typically adding 15-25 qualified meetings per month without hiring additional SDRs.\n\nWould you be open to a quick 15-min call to see if there's a fit?\n\nBest,\nAndrew` },
        { from: selectedConvo?.name, time: selectedConvo?.time, content: selectedConvo?.preview },
      ];

  const generateAIDrafts = async () => {
    setGeneratingDrafts(true);
    await new Promise(r => setTimeout(r, 1500));
    setAiDrafts([
      { label: "Direct close", text: `Great to hear you're interested, ${selectedConvo?.name?.split(" ")[0]}! I've got a few slots this week — would Thursday at 2pm or Friday at 10am work for a quick 15-min call?\n\nI'll walk you through exactly how we helped ScaleFlow add 22 qualified meetings/month in 6 weeks.` },
      { label: "Value-first", text: `Thanks ${selectedConvo?.name?.split(" ")[0]} — really glad this resonated.\n\nBefore we jump on a call, I put together a quick breakdown of what an AI-powered outbound system could look like specifically for ${selectedConvo?.company}. Want me to send it over?\n\nEither way, happy to chat — I've got time Thursday or Friday this week.` },
      { label: "Social proof", text: `Appreciate the response, ${selectedConvo?.name?.split(" ")[0]}!\n\nWe just wrapped up a similar project with a company your size — they went from 3 to 18 qualified meetings per month within 8 weeks. Happy to share the case study.\n\nWhat does your calendar look like Thursday or Friday?` },
    ]);
    setGeneratingDrafts(false);
  };

  const filteredConvos = filter === "all" ? conversations : conversations.filter(c => filter === "unread" ? c.unread : c.channel === filter);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0, padding: "0 20px", background: COLORS.surface }}>
        {[{ key: "inbox", label: "📥 Inbox" }, { key: "aisdr", label: "🤖 AI SDR" }].map(tab => (
          <button key={tab.key} onClick={() => setUniboxTab(tab.key)} style={{ padding: "12px 20px", background: "transparent", border: "none", borderBottom: uniboxTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: uniboxTab === tab.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {tab.label}
            {tab.key === "aisdr" && <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 8, fontWeight: 700, background: sdrActive ? COLORS.green + "20" : COLORS.textDim + "20", color: sdrActive ? COLORS.green : COLORS.textDim }}>{sdrActive ? "ACTIVE" : "OFF"}</span>}
          </button>
        ))}
      </div>

      {/* AI SDR Tab */}
      {uniboxTab === "aisdr" && (
        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <h2 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, margin: 0 }}>AI <span style={{ color: COLORS.accent }}>SDR</span></h2>
              <p style={{ color: COLORS.textMuted, margin: "4px 0 0", fontSize: 12 }}>Train and activate your AI sales development rep</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: sdrActive ? COLORS.green : COLORS.textDim }}>{sdrActive ? "Active" : "Inactive"}</span>
              <div onClick={() => { const v = !sdrActive; setSdrActive(v); saveSdrSettings({ active: v }); }} style={{ width: 52, height: 28, borderRadius: 12, cursor: "pointer", background: sdrActive ? COLORS.green : COLORS.borderActive, position: "relative", transition: "background 0.25s" }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sdrActive ? 27 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>🎓 Training Sources</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { key: "sentMessages", label: "Learn from my sent messages", desc: "Analyses your writing style, tone, and patterns" },
                  { key: "scripts", label: "Learn from my scripts", desc: "Uses saved sales scripts for objection handling" },
                  { key: "brandVoice", label: "Learn from brand voice", desc: "Uses brand voice profile from Settings" },
                  { key: "starredThreads", label: "Learn from starred threads", desc: "Star successful conversations to teach patterns" },
                ].map(src => (
                  <div key={src.key} style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div><div style={{ fontSize: 12, fontWeight: 600 }}>{src.label}</div><div style={{ fontSize: 10, color: COLORS.textDim }}>{src.desc}</div></div>
                    <div onClick={() => { const next = { ...sdrTraining, [src.key]: !sdrTraining[src.key] }; setSdrTraining(next); saveSdrSettings({ training: next }); }} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: sdrTraining[src.key] ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.25s", flexShrink: 0, marginLeft: 10 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sdrTraining[src.key] ? 21 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>CUSTOM GUIDELINES</div>
                <textarea value={sdrCustomGuidelines} onChange={e => setSdrCustomGuidelines(e.target.value)} onBlur={e => saveSdrSettings({ customGuidelines: e.target.value })} placeholder="e.g. 'Always mention case studies', 'Book meetings Tue/Thu only', 'Never discount on first call'" rows={3} style={{ width: "100%", padding: "10px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }} />
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>SAMPLE RESPONSES</div>
                {sdrSampleResponses.map((sample, si) => (
                  <div key={si} style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.5, marginBottom: 6 }}>{typeof sample === "string" ? sample : sample.text}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={async () => { const next = sdrSampleResponses.map((s, i) => i === si ? sampleItem(typeof s === "string" ? s : s.text, "good") : sampleItem(s)); setSdrSampleResponses(next); saveSdrSettings({ sampleResponses: next }); }} style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${COLORS.green}33`, background: COLORS.green + "10", color: COLORS.green, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>👍 Good</button>
                      <button onClick={async () => {
                        setSdrGenerating(true);
                        try {
                          const t = typeof sample === "string" ? sample : sample.text;
                          const { text } = await api.aiSdr.generateSample({ guidelines: sdrCustomGuidelines, refineText: t });
                          if (text) { const next = sdrSampleResponses.map((s, i) => i === si ? sampleItem(text, "refine") : sampleItem(s)); setSdrSampleResponses(next); saveSdrSettings({ sampleResponses: next }); }
                        } catch (err) { alert(err.message || "Failed to refine. Connect Anthropic in Settings > Integrations."); }
                        setSdrGenerating(false);
                      }} disabled={sdrGenerating} style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${COLORS.danger}33`, background: COLORS.danger + "10", color: COLORS.danger, fontSize: 10, fontWeight: 600, cursor: sdrGenerating ? "not-allowed" : "pointer", fontFamily: FONT }}>{sdrGenerating ? "…" : "👎 Refine"}</button>
                    </div>
                  </div>
                ))}
                <button onClick={async () => {
                  setSdrGenerating(true);
                  try {
                    const { text } = await api.aiSdr.generateSample({ guidelines: sdrCustomGuidelines });
                    if (text) { const next = [...sdrSampleResponses, sampleItem(text)]; setSdrSampleResponses(next); saveSdrSettings({ sampleResponses: next }); }
                  } catch (err) { alert(err.message || "Failed to generate. Connect Anthropic in Settings > Integrations."); }
                  setSdrGenerating(false);
                }} disabled={sdrGenerating} style={{ marginTop: 6, padding: "8px 14px", borderRadius: 6, border: `1px dashed ${COLORS.border}`, background: "transparent", color: COLORS.accent, fontSize: 11, fontWeight: 600, cursor: sdrGenerating ? "not-allowed" : "pointer", fontFamily: FONT }}>{sdrGenerating ? "Generating…" : "+ Generate sample"}</button>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>⚡ Permissions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {[
                  { key: "positiveReply", label: "Reply to positive responses" },
                  { key: "answerQuestions", label: "Answer product/service questions" },
                  { key: "bookMeetings", label: "Book meetings (with calendar link)" },
                  { key: "followUp", label: "Send follow-ups after no response (3 days)" },
                  { key: "handleObjections", label: "Handle objections" },
                  { key: "negotiatePricing", label: "Negotiate pricing" },
                ].map(perm => (
                  <div key={perm.key} style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: COLORS.text }}>{perm.label}</span>
                    <div onClick={() => { const next = { ...sdrPerms, [perm.key]: !sdrPerms[perm.key] }; setSdrPerms(next); saveSdrSettings({ permissions: next }); }} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: sdrPerms[perm.key] ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.25s", flexShrink: 0 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sdrPerms[perm.key] ? 21 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, marginBottom: 6 }}>RESPONSE WINDOW</div><select value={sdrResponseWindow} onChange={e => { const v = e.target.value; setSdrResponseWindow(v); saveSdrSettings({ responseWindow: v }); }} style={{ width: "100%", padding: "8px 10px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: COLORS.text, cursor: "pointer" }}><option>5 min</option><option>30 min</option><option>1 hour</option></select></div>
                <div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, marginBottom: 6 }}>WORKING HOURS</div><div style={{ padding: "8px 10px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12, color: COLORS.text }}>{sdrWorkingHours}</div></div>
              </div>
              <div style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div><div style={{ fontSize: 12, fontWeight: 600 }}>Review before sending</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Drafts go to approval queue</div></div>
                <div onClick={() => { const v = !sdrApprovalMode; setSdrApprovalMode(v); saveSdrSettings({ approvalMode: v }); }} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: sdrApprovalMode ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.25s", flexShrink: 0, marginLeft: 10 }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sdrApprovalMode ? 21 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>📋 Recent AI SDR Activity</div>
              {[
                { action: "Replied to Sarah Chen", detail: "Booked meeting — Thu 2pm", time: "2h ago", color: COLORS.green },
                { action: "Follow-up sent to Tom Bradley", detail: "3 days no response", time: "4h ago", color: COLORS.blue },
                { action: "Flagged for review", detail: "Marcus Webb asked about pricing", time: "6h ago", color: COLORS.warn },
                { action: "Replied to David Kim", detail: "Shared case study", time: "1d ago", color: COLORS.green },
              ].map((a, i) => (
                <div key={i} style={{ padding: "8px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, borderLeft: `3px solid ${a.color}`, marginBottom: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontSize: 11, fontWeight: 600 }}>{a.action}</span><span style={{ fontSize: 9, color: COLORS.textDim }}>{a.time}</span></div>
                  <div style={{ fontSize: 10, color: COLORS.textDim }}>{a.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inbox Tab */}
      {uniboxTab === "inbox" && (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Left — Conversation List */}
      <div style={{ width: 320, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${COLORS.border}` }}>
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>📥 Unibox</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[{ key: "all", label: "All" }, { key: "unread", label: "Unread" }, { key: "email", label: "📧" }, { key: "linkedin", label: "💼" }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${filter === f.key ? COLORS.accent + "44" : COLORS.border}`, background: filter === f.key ? COLORS.accentBg : "transparent", color: filter === f.key ? COLORS.accent : COLORS.textDim, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{f.label}</button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto" }}>
          {filteredConvos.map(c => (
            <div key={c.id} onClick={() => { setSelectedConvo(c); setAiDrafts(null); setReplyText(""); setConversations(prev => prev.map(x => x.id === c.id ? { ...x, unread: false } : x)); }} style={{ padding: "12px 16px", borderBottom: `1px solid ${COLORS.border}`, cursor: "pointer", background: selectedConvo?.id === c.id ? COLORS.accentBg : "transparent" }}
              onMouseEnter={e => { if (selectedConvo?.id !== c.id) e.currentTarget.style.background = COLORS.surface; }} onMouseLeave={e => { if (selectedConvo?.id !== c.id) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {c.unread && <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.accent }} />}
                  <span style={{ fontWeight: c.unread ? 700 : 500, fontSize: 13 }}>{c.name}</span>
                  <span style={{ fontSize: 10 }}>{c.channel === "email" ? "📧" : "💼"}</span>
                </div>
                <span style={{ fontSize: 9, color: COLORS.textDim }}>{c.time}</span>
              </div>
              <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 2 }}>{c.company}</div>
              <div style={{ fontSize: 11, color: COLORS.text, fontWeight: c.unread ? 600 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.preview}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle — Thread */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{selectedConvo?.subject}</div>
            <div style={{ fontSize: 11, color: COLORS.textDim }}>{selectedConvo?.name} · {selectedConvo?.company} · {selectedConvo?.channel === "email" ? "📧 Email" : "💼 LinkedIn"}</div>
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: COLORS.accent + "15", color: COLORS.accent }}>{selectedConvo?.stage}</span>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {THREAD.map((msg, i) => (
            <div key={i} style={{ padding: "14px 18px", background: msg.from === "You" ? COLORS.accent + "08" : COLORS.surface, border: `1px solid ${msg.from === "You" ? COLORS.accent + "22" : COLORS.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 12, color: msg.from === "You" ? COLORS.accent : COLORS.text }}>{msg.from}</span>
                <span style={{ fontSize: 10, color: COLORS.textDim }}>{msg.time}</span>
              </div>
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{msg.content}</div>
            </div>
          ))}
        </div>
        {/* Reply Box */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "12px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.textDim }}>Reply</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {aiAssist && (
                <select value={aiGoal} onChange={e => setAiGoal(e.target.value)} style={{ padding: "4px 8px", borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 10, fontFamily: FONT, color: COLORS.text, background: COLORS.surface, cursor: "pointer" }}>
                  <option>Book a meeting</option><option>Qualify interest</option><option>Handle objection</option><option>Share case study</option>
                </select>
              )}
              <div onClick={() => { setAiAssist(!aiAssist); setAiDrafts(null); }} style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", padding: "4px 10px", borderRadius: 6, background: aiAssist ? COLORS.accent + "15" : "transparent", border: `1px solid ${aiAssist ? COLORS.accent + "44" : COLORS.border}` }}>
                <span style={{ fontSize: 11 }}>✨</span>
                <span style={{ fontSize: 10, fontWeight: 600, fontFamily: FONT, color: aiAssist ? COLORS.accent : COLORS.textDim }}>AI Assist</span>
              </div>
            </div>
          </div>
          {aiAssist && !aiDrafts && (
            <button onClick={generateAIDrafts} disabled={generatingDrafts} style={{ width: "100%", padding: "10px", marginBottom: 8, background: COLORS.accent + "10", border: `1px dashed ${COLORS.accent}44`, borderRadius: 8, color: COLORS.accent, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: generatingDrafts ? "default" : "pointer" }}>{generatingDrafts ? "Generating drafts..." : `✨ Generate AI responses — Goal: ${aiGoal}`}</button>
          )}
          {aiDrafts && (
            <div style={{ marginBottom: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {aiDrafts.map((draft, i) => (
                <div key={i} onClick={() => { setReplyText(draft.text); setAiDrafts(null); }} style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, cursor: "pointer", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "44"} onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                  <div style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.accent, marginBottom: 4 }}>{draft.label.toUpperCase()}</div>
                  <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.5, whiteSpace: "pre-line" }}>{draft.text}</div>
                </div>
              ))}
            </div>
          )}
          <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." rows={3} style={{ width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <button onClick={async () => {
              if (!replyText.trim() || !selectedConvo?.id) return;
              try {
                const msg = await api.messages.create({ conversation_id: selectedConvo.id, direction: 'outbound', body: replyText });
                setThreadMessages(prev => [...prev, msg]);
                setReplyText('');
              } catch (err) {
                console.error('Failed to send reply:', err);
              }
            }} style={{ padding: "8px 20px", background: replyText.trim() ? COLORS.accent : COLORS.border, color: replyText.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: replyText.trim() ? "pointer" : "default" }}>Send Reply</button>
          </div>
        </div>
      </div>

      {/* Right — Lead Context */}
      <div style={{ width: 260, flexShrink: 0, borderLeft: `1px solid ${COLORS.border}`, overflow: "auto", background: COLORS.surface }}>
        <div style={{ padding: "16px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, fontFamily: FONT, color: COLORS.accent }}>{selectedConvo?.name?.split(" ").map(n => n[0]).join("")}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{selectedConvo?.name}</div>
              <div style={{ fontSize: 10, color: COLORS.textDim }}>{selectedConvo?.company}</div>
            </div>
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: COLORS.accent + "15", color: COLORS.accent }}>{selectedConvo?.stage}</span>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>CONTACT</div>
            <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 2 }}>✉️ {selectedConvo?.name?.toLowerCase().replace(/ /g, ".")}@{selectedConvo?.company?.toLowerCase().replace(/ /g, "")}.io</div>
            <div style={{ fontSize: 11, color: COLORS.text }}>💼 LinkedIn profile</div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>CHANNEL</div>
            <div style={{ fontSize: 11, color: COLORS.text }}>{selectedConvo?.channel === "email" ? "📧 Email thread" : "💼 LinkedIn message"}</div>
          </div>
          <button style={{ width: "100%", padding: "10px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", marginBottom: 8 }}>📅 Book Meeting</button>
          <button style={{ width: "100%", padding: "10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", color: COLORS.textMuted }}>Open in CRM</button>
        </div>
      </div>
    </div>
      )}
    </div>
  );
}

function ImplementationView({ project }) {
  const [expandedPhase, setExpandedPhase] = useState(0);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const DEFAULT_PHASES = [
    {
      title: "Phase 1: Foundation", timeline: "Month 1-2", status: "not_started", color: "#eab308", cost: "£35-45K", sort_order: 0,
      tasks: [
        { id: "t1", name: "Lease tracking system — vendor selection", status: "not_started", assignee: "Andrew", dueDate: "Feb 14", priority: "high" },
        { id: "t2", name: "Lease tracking system — implementation", status: "not_started", assignee: "Andrew", dueDate: "Feb 28", priority: "high" },
        { id: "t3", name: "Data consolidation — map existing sources", status: "not_started", assignee: "Sarah Mitchell", dueDate: "Feb 21", priority: "high" },
        { id: "t4", name: "Data consolidation — migration plan", status: "not_started", assignee: "Andrew", dueDate: "Mar 7", priority: "medium" },
        { id: "t5", name: "Core integrations — CRM + accounting sync", status: "not_started", assignee: "TBD", dueDate: "Mar 14", priority: "medium" },
        { id: "t6", name: "Staff training — lease tracking module", status: "not_started", assignee: "Mike Thompson", dueDate: "Mar 21", priority: "low" },
      ],
    },
    {
      title: "Phase 2: Unlock", timeline: "Month 3-4", status: "not_started", color: "#3b82f6", cost: "£40-55K", sort_order: 1,
      tasks: [
        { id: "t7", name: "Director dashboard — requirements gathering", status: "not_started", assignee: "James Richardson", dueDate: "Apr 1", priority: "high" },
        { id: "t8", name: "Director dashboard — build & deploy", status: "not_started", assignee: "Andrew", dueDate: "Apr 21", priority: "high" },
        { id: "t9", name: "Knowledge base — content structure", status: "not_started", assignee: "Mike Thompson", dueDate: "Apr 7", priority: "medium" },
        { id: "t10", name: "Knowledge base — populate initial content", status: "not_started", assignee: "All", dueDate: "Apr 28", priority: "medium" },
        { id: "t11", name: "Process automation — identify top 5 workflows", status: "not_started", assignee: "Andrew", dueDate: "May 1", priority: "medium" },
      ],
    },
    {
      title: "Phase 3: Scale", timeline: "Month 5-6", status: "not_started", color: "#8b5cf6", cost: "£50-70K", sort_order: 2,
      tasks: [
        { id: "t12", name: "AI contract analysis — model training", status: "not_started", assignee: "Andrew", dueDate: "May 15", priority: "high" },
        { id: "t13", name: "AI contract analysis — integration with lease system", status: "not_started", assignee: "Andrew", dueDate: "Jun 1", priority: "high" },
        { id: "t14", name: "Predictive insights — dashboard module", status: "not_started", assignee: "Andrew", dueDate: "Jun 15", priority: "medium" },
        { id: "t15", name: "Portfolio scaling tools — automation suite", status: "not_started", assignee: "TBD", dueDate: "Jun 28", priority: "medium" },
      ],
    },
  ];

  const projectId = project ? String(project.id) : null;

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    api.implementation.list({ project_id: projectId }).then(async (data) => {
      const rows = Array.isArray(data) ? data : [];
      if (rows.length > 0) {
        setPhases(rows.map(r => ({
          ...r,
          tasks: Array.isArray(r.tasks) ? r.tasks : (typeof r.tasks === 'string' ? JSON.parse(r.tasks) : []),
        })));
      } else {
        try {
          const created = await api.implementation.bulkCreate({ project_id: projectId, phases: DEFAULT_PHASES });
          const arr = Array.isArray(created) ? created : [];
          setPhases(arr.map(r => ({
            ...r,
            tasks: Array.isArray(r.tasks) ? r.tasks : (typeof r.tasks === 'string' ? JSON.parse(r.tasks) : []),
          })));
        } catch (seedErr) {
          console.error('Failed to seed default phases:', seedErr);
          setPhases(DEFAULT_PHASES.map((p, i) => ({ ...p, id: `local_${i}`, name: p.title })));
        }
      }
    }).catch(() => {
      setPhases(DEFAULT_PHASES.map((p, i) => ({ ...p, id: `local_${i}`, name: p.title })));
    }).finally(() => setLoading(false));
  }, [projectId]);

  const STATUS_CYCLE = ["not_started", "in_progress", "complete"];

  const cycleTaskStatus = async (phaseIndex, taskIndex) => {
    const phase = phases[phaseIndex];
    if (!phase) return;
    const tasks = [...phase.tasks];
    const current = tasks[taskIndex].status;
    const nextIdx = (STATUS_CYCLE.indexOf(current) + 1) % STATUS_CYCLE.length;
    tasks[taskIndex] = { ...tasks[taskIndex], status: STATUS_CYCLE[nextIdx] };

    const completedCount = tasks.filter(t => t.status === "complete").length;
    const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
    let phaseStatus = "not_started";
    if (completedCount === tasks.length) phaseStatus = "complete";
    else if (completedCount > 0 || inProgressCount > 0) phaseStatus = "in_progress";

    const updated = phases.map((p, i) => i === phaseIndex ? { ...p, tasks, status: phaseStatus } : p);
    setPhases(updated);

    if (phase.id && !String(phase.id).startsWith('local_')) {
      setSaving(true);
      try {
        await api.implementation.update(phase.id, { tasks, status: phaseStatus });
      } catch (err) {
        console.error('Failed to save task status:', err);
      }
      setSaving(false);
    }
  };

  const getProgress = (phase) => {
    const tasks = phase.tasks || [];
    if (tasks.length === 0) return 0;
    return Math.round((tasks.filter(t => t.status === "complete").length / tasks.length) * 100);
  };

  if (!project) return <div style={{ padding: 28, color: COLORS.textDim, fontFamily: FONT_BODY }}>Select a project from the sidebar.</div>;

  const getStatusBadge = (status, onClick) => {
    const styles = {
      complete: { bg: COLORS.accent + "15", color: COLORS.accent, label: "Complete" },
      in_progress: { bg: COLORS.blue + "15", color: COLORS.blue, label: "In Progress" },
      not_started: { bg: COLORS.surface, color: COLORS.textDim, label: "Not Started" },
    };
    const s = styles[status] || styles.not_started;
    return (
      <span onClick={onClick} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.color}22`, cursor: onClick ? "pointer" : "default", userSelect: "none" }}>{s.label}</span>
    );
  };

  const getPriorityDot = (priority) => {
    const colors = { high: COLORS.danger, medium: COLORS.warn, low: COLORS.textDim };
    return <div style={{ width: 6, height: 6, borderRadius: "50%", background: colors[priority] || COLORS.textDim, flexShrink: 0 }} />;
  };

  const totalTasks = phases.reduce((s, p) => s + (p.tasks || []).length, 0);
  const completeTasks = phases.reduce((s, p) => s + (p.tasks || []).filter(t => t.status === "complete").length, 0);
  const inProgressTasks = phases.reduce((s, p) => s + (p.tasks || []).filter(t => t.status === "in_progress").length, 0);
  const totalBudget = phases.map(p => p.cost || '').filter(Boolean).join(' + ') || '—';

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Implementation <span style={{ color: COLORS.accent }}>Roadmap</span>
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>{project.client} — Generated from AI analysis</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {saving && <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT }}>Saving...</span>}
          <span style={{ padding: "4px 10px", background: COLORS.accentBg, color: COLORS.accent, fontSize: 11, borderRadius: 6, fontFamily: FONT, fontWeight: 500, border: `1px solid ${COLORS.accent}22` }}>Auto-generated</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: "center" }}><ProgressDots active={true} /><div style={{ marginTop: 12, fontSize: 12, color: COLORS.textDim }}>Loading roadmap...</div></div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Tasks" value={totalTasks} accent={COLORS.accent} />
            <StatCard label="Complete" value={completeTasks} accent={COLORS.accent} />
            <StatCard label="In Progress" value={inProgressTasks} accent={COLORS.blue} />
            <StatCard label="Total Budget" value={totalBudget} accent={COLORS.warn} />
          </div>

          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            {phases.map((p, i) => (
              <div key={p.id || i} style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 10, color: p.color || COLORS.textDim, fontFamily: FONT, fontWeight: 600 }}>{p.title || p.name}</span>
                  <span style={{ fontSize: 10, color: COLORS.textDim }}>{p.timeline}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: COLORS.surface }}>
                  <div style={{ width: `${getProgress(p)}%`, height: "100%", borderRadius: 3, background: p.color || COLORS.accent, transition: "width 0.3s" }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {phases.map((phase, pi) => {
              const tasks = phase.tasks || [];
              const phaseColor = phase.color || COLORS.textDim;
              return (
                <div key={phase.id || pi} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", borderLeft: `4px solid ${phaseColor}` }}>
                  <div onClick={() => setExpandedPhase(expandedPhase === pi ? -1 : pi)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{phase.title || phase.name}</div>
                      <span style={{ fontSize: 10, color: COLORS.textDim }}>{phase.timeline} · {phase.cost}</span>
                      {getStatusBadge(phase.status)}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 11, color: COLORS.textDim }}>{tasks.filter(t => t.status === "complete").length}/{tasks.length} tasks</span>
                      <span style={{ color: COLORS.textDim, fontSize: 12, transform: expandedPhase === pi ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
                    </div>
                  </div>
                  {expandedPhase === pi && (
                    <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "8px 12px" }}>
                      {tasks.map((task, ti) => (
                        <div key={task.id || ti} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
                          {getPriorityDot(task.priority)}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, color: task.status === "complete" ? COLORS.textDim : COLORS.text, textDecoration: task.status === "complete" ? "line-through" : "none" }}>{task.name}</div>
                          </div>
                          <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, minWidth: 70 }}>{task.assignee}</span>
                          <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, minWidth: 50 }}>{task.dueDate}</span>
                          {getStatusBadge(task.status, (e) => { e.stopPropagation(); cycleTaskStatus(pi, ti); })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function WorkflowsLibraryView() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [WORKFLOWS, setWorkflows] = useState([]);

  useEffect(() => {
    api.workflows.list().then(data => {
      const wfs = Array.isArray(data) ? data : data.workflows || [];
      setWorkflows(wfs.map(w => ({ ...w, tools: w.tools || [], desc: w.description || w.desc || '' })));
    }).catch(() => {});
  }, []);

  const CATEGORIES = [
    { key: "all", label: "All Workflows", count: WORKFLOWS.length },
    { key: "lead_gen", label: "Lead Generation", count: WORKFLOWS.filter(w => w.category === "lead_gen").length },
    { key: "outreach", label: "Outreach", count: WORKFLOWS.filter(w => w.category === "outreach").length },
    { key: "content", label: "Content", count: WORKFLOWS.filter(w => w.category === "content").length },
    { key: "consulting", label: "Consulting", count: WORKFLOWS.filter(w => w.category === "consulting").length },
    { key: "operations", label: "Operations", count: WORKFLOWS.filter(w => w.category === "operations").length },
  ];

  const getCategoryColor = (cat) => {
    const colors = { lead_gen: COLORS.accent, outreach: COLORS.blue, content: COLORS.warn, consulting: "#7B61FF", operations: "#22c55e" };
    return colors[cat] || COLORS.textDim;
  };

  const getCategoryLabel = (cat) => {
    const labels = { lead_gen: "Lead Gen", outreach: "Outreach", content: "Content", consulting: "Consulting", operations: "Operations" };
    return labels[cat] || cat;
  };

  const filtered = selectedCategory === "all" ? WORKFLOWS : WORKFLOWS.filter(w => w.category === selectedCategory);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Workflow <span style={{ color: COLORS.accent }}>Library</span>
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>Pre-built automation workflows — download, customise, and deploy</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {CATEGORIES.map(cat => (
          <button key={cat.key} onClick={() => setSelectedCategory(cat.key)} style={{
            padding: "10px 16px", background: "transparent", border: "none",
            borderBottom: selectedCategory === cat.key ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            color: selectedCategory === cat.key ? COLORS.accent : COLORS.textMuted,
            fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            {cat.label}
            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 8, background: selectedCategory === cat.key ? COLORS.accentBg : COLORS.surface, color: selectedCategory === cat.key ? COLORS.accent : COLORS.textDim }}>{cat.count}</span>
          </button>
        ))}
      </div>

      {/* Workflow Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {filtered.map(wf => (
          <div key={wf.id} style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: getCategoryColor(wf.category) + "15", color: getCategoryColor(wf.category), border: `1px solid ${getCategoryColor(wf.category)}22` }}>{getCategoryLabel(wf.category)}</span>
                <span style={{ fontSize: 10, color: COLORS.textDim }}>⭐ {wf.rating}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{wf.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 12 }}>{wf.desc}</div>
            </div>
            <div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                {(wf.tools || []).map((tool, ti) => {
                  const label = typeof tool === 'object' && tool != null ? (tool.action || tool.label || '') : tool;
                  return <span key={ti} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT }}>{String(label || '')}</span>;
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 12, fontSize: 10, color: COLORS.textDim }}>
                  <span>{(Array.isArray(wf.steps) ? wf.steps.length : (typeof wf.steps === 'number' ? wf.steps : 0))} steps</span>
                  <span>{wf.downloads} downloads</span>
                </div>
                <button style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
                >Download →</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AICouncilView() {
  const [messages, setMessages] = useState([{ role: "agent", text: "Welcome to AI Council. I'm a strategic advisor powered by your project data, audit findings, and market intelligence.\n\nAsk me anything — strategy questions, implementation advice, or have me analyse a decision you're considering." }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [output, setOutput] = useState(null);
  const chatEndRef = React.useRef(null);

  React.useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const nm = [...messages, { role: "user", text: input }]; setMessages(nm); setInput(""); setIsTyping(true);
    try {
      const { agentText, output: out } = await api.aiCouncil.chat({ message: input, messages: messages });
      if (out) setOutput(out);
      setMessages([...nm, { role: "agent", text: agentText }]);
    } catch (err) {
      const errMsg = err?.message || (err?.data?.error) || "Something went wrong. Please try again.";
      setMessages([...nm, { role: "agent", text: errMsg }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden" }}>
      <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${COLORS.border}` }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <div><div style={{ fontWeight: 600, fontSize: 13 }}>AI Council</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Strategic advisor · Embedded external tool</div></div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "88%", padding: "10px 14px", borderRadius: 12, background: msg.role === "user" ? COLORS.accent + "20" : COLORS.surface, border: `1px solid ${msg.role === "user" ? COLORS.accent + "33" : COLORS.border}`, borderBottomRightRadius: msg.role === "user" ? 4 : 12, borderBottomLeftRadius: msg.role === "agent" ? 4 : 12 }}>
                {msg.role === "agent" && <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>AI COUNCIL</div>}
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{msg.text}</div>
              </div>
            </div>
          ))}
          {isTyping && <div style={{ display: "flex" }}><div style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderBottomLeftRadius: 4 }}><ProgressDots active={true} /></div></div>}
          <div ref={chatEndRef} />
        </div>
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isTyping) sendMessage(); }} placeholder="Ask the AI Council..." style={{ flex: 1, padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none" }} disabled={isTyping} />
          <button onClick={sendMessage} disabled={isTyping || !input.trim()} style={{ padding: "10px 18px", background: input.trim() && !isTyping ? COLORS.accent : COLORS.border, color: input.trim() && !isTyping ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: input.trim() && !isTyping ? "pointer" : "default" }}>Send</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {!output ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 360 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>🧠</div>
              <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.textDim, marginBottom: 6 }}>AI Council Output</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>Ask a question and the strategic analysis will appear here. Powered by your project data, audit findings, and market intelligence.</div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 20 }}><h3 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>{output.title}</h3></div>
            {output.sections.map((sec, i) => {
              const sectionColor = [COLORS.accent, COLORS.blue, COLORS.warn, "#7B61FF"][i % 4];
              const heading = (sec.heading || "").toString().toUpperCase();
              return (
                <div key={i} style={{ padding: "16px 20px", background: COLORS.surface, borderWidth: "1px 1px 1px 3px", borderStyle: "solid", borderColor: `${COLORS.border} ${COLORS.border} ${COLORS.border} ${sectionColor}`, borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: sectionColor, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8, display: "block" }}>{heading}</div>
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{sec.content || ""}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditView({ project, projects, selectedProject, setSelectedProject }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [transcripts, setTranscripts] = useState([]);

  useEffect(() => {
    api.audit.transcripts.list().then(data => {
      const ts = Array.isArray(data) ? data : data.transcripts || [];
      setTranscripts(ts.map(t => ({ ...t, tags: t.tags || [], speaker: t.speaker || t.speaker_name || '', role: t.role || t.speaker_role || '' })));
    }).catch(() => {});
  }, []);

  if (!project) return <div style={{ padding: 28, color: COLORS.textDim, fontFamily: FONT_BODY }}>Select a project from the sidebar.</div>;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 28px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{project.name}</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, display: "flex", gap: 12 }}>
            <span>📄 {transcripts.length} transcripts</span>
            <span>📊 2 surveys</span>
            <span>Created {project.created}</span>
          </div>
        </div>
        <span style={{ padding: "4px 10px", background: COLORS.accentBg, color: COLORS.accent, fontSize: 11, borderRadius: 6, fontFamily: FONT, fontWeight: 500, border: `1px solid ${COLORS.accent}22` }}>Review Mode</span>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0, padding: "0 28px" }}>
        {[
          { key: "overview", label: "🏢 Company" },
          { key: "surveys", label: "📊 Surveys", count: 2 },
          { key: "interviews", label: "🎤 Interviews" },
          { key: "transcripts", label: "📄 Transcripts", count: transcripts.length },
          { key: "processmaps", label: "🗺️ Process Maps" },
          { key: "analysis", label: "✨ Analysis" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: "12px 20px", background: "transparent", border: "none",
            borderBottom: activeTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            color: activeTab === tab.key ? COLORS.accent : COLORS.textMuted,
            fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>{tab.label}</span>
            {tab.count !== undefined && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: activeTab === tab.key ? COLORS.accentBg : COLORS.surface, color: activeTab === tab.key ? COLORS.accent : COLORS.textDim }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {activeTab === "overview" && <AuditCompanyTab transcripts={transcripts} />}
        {activeTab === "surveys" && <AuditSurveysTab />}
        {activeTab === "interviews" && <AuditInterviewsTab />}
        {activeTab === "transcripts" && <AuditTranscriptsTab project={project} transcripts={transcripts} setTranscripts={setTranscripts} />}
        {activeTab === "processmaps" && <AuditProcessMapsTab />}
        {activeTab === "analysis" && <AuditAnalysisTab project={project} />}
      </div>
    </div>
  );
}

function AuditCompanyTab({ transcripts }) {
  const [companyUrl, setCompanyUrl] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [researchDone, setResearchDone] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [overview, setOverview] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [customSections, setCustomSections] = useState([]);
  const [transcriptInsights, setTranscriptInsights] = useState([]);

  useEffect(() => {
    api.settings.get('audit_company').then(data => {
      const s = data?.settings || data || {};
      if (s.overview) setOverview(s.overview);
      if (s.metrics?.length) setMetrics(s.metrics);
      if (s.sections?.length) setCustomSections(s.sections);
      if (s.insights?.length) setTranscriptInsights(s.insights);
      if (s.overview || s.metrics?.length) setResearchDone(true);
    }).catch(() => {});
  }, []);

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };

  const doResearch = async () => {
    if (!companyUrl.trim()) return;
    setIsResearching(true);
    setResearchError("");
    try {
      const result = await api.audit.research({ project_id: "default", company_url: companyUrl.trim() });
      const rd = result.research_data || {};
      if (rd.overview) setOverview(rd.overview);
      if (rd.metrics?.length) setMetrics(rd.metrics);
      if (rd.sections?.length) setCustomSections(rd.sections.map(s => ({ title: s.title || "", content: s.content || "" })));
      setResearchDone(true);
      api.settings.save('audit_company', {
        overview: rd.overview || "",
        metrics: rd.metrics || [],
        sections: rd.sections || [],
        company_url: companyUrl.trim(),
      }).catch(() => {});
    } catch (err) {
      setResearchError(err.message || "Research failed");
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>🏢</span>
        <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>Company Research</h2>
      </div>

      {/* URL Input */}
      <div style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <span style={{ fontSize: 14 }}>🔗</span>
        <input value={companyUrl} onChange={e => setCompanyUrl(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && companyUrl.trim() && !isResearching) doResearch(); }} placeholder="Paste company website URL to auto-research..." style={{ ...inputStyle, flex: 1, background: COLORS.bg }} />
        <button onClick={doResearch} disabled={isResearching || !companyUrl.trim()} style={{
          padding: "10px 20px", background: (isResearching || !companyUrl.trim()) ? COLORS.border : COLORS.accent, color: (isResearching || !companyUrl.trim()) ? COLORS.textDim : COLORS.bg,
          border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: (isResearching || !companyUrl.trim()) ? "default" : "pointer", whiteSpace: "nowrap",
        }}>{isResearching ? "Researching..." : "🔍 Research"}</button>
      </div>

      {isResearching && (
        <div style={{ padding: "40px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center", marginBottom: 16 }}>
          <ProgressDots active={true} />
          <div style={{ fontSize: 13, color: COLORS.accent, marginTop: 8 }}>Researching company via Perplexity Sonar Pro...</div>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 4 }}>Searching the web for live company data</div>
        </div>
      )}

      {researchError && (
        <div style={{ padding: "12px 16px", background: "#ff4d4f12", border: "1px solid #ff4d4f33", borderRadius: 8, marginBottom: 16, fontSize: 13, color: "#ff4d4f" }}>
          {typeof researchError === "string" ? researchError : (researchError?.message || String(researchError))}
        </div>
      )}

      {/* Overview — Editable */}
      <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600 }}>OVERVIEW</div>
          {researchDone && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: COLORS.accentBg, color: COLORS.accent, fontFamily: FONT }}>AI-generated</span>}
        </div>
        <textarea value={overview} onChange={e => setOverview(e.target.value)} rows={4} style={{ ...inputStyle, background: COLORS.bg, resize: "vertical", lineHeight: 1.7 }} />
      </div>

      {/* Metrics — Editable */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {metrics.map((m, i) => (
          <div key={m.key} style={{ flex: 1, padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{m.label.toUpperCase()}</div>
            <input value={m.value} onChange={e => { const u = [...metrics]; u[i] = { ...m, value: e.target.value }; setMetrics(u); }}
              style={{ width: "100%", padding: "4px 0", background: "transparent", border: "none", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.text, fontFamily: FONT, fontSize: 18, fontWeight: 600, outline: "none" }}
            />
          </div>
        ))}
      </div>

      {/* Transcript Insights */}
      {transcripts.length > 0 && transcriptInsights.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.warn, letterSpacing: "0.06em", fontWeight: 600 }}>INSIGHTS FROM TRANSCRIPTS</span>
            <span style={{ fontSize: 10, color: COLORS.textDim }}>— Review and accept to add to profile</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {transcriptInsights.filter(ti => !ti.accepted).map(insight => (
              <div key={insight.id} style={{ padding: "12px 16px", background: COLORS.warn + "08", border: `1px solid ${COLORS.warn}22`, borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 4 }}>{insight.text}</div>
                  <div style={{ fontSize: 10, color: COLORS.textDim }}>Source: {insight.source}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setTranscriptInsights(prev => prev.map(ti => ti.id === insight.id ? { ...ti, accepted: true } : ti))}
                    style={{ padding: "4px 10px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 4, fontFamily: FONT, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Accept</button>
                  <button onClick={() => setTranscriptInsights(prev => prev.filter(ti => ti.id !== insight.id))}
                    style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>Dismiss</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Sections */}
      {customSections.map((sec, i) => (
        <div key={i} style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <input value={sec.title} onChange={e => { const u = [...customSections]; u[i] = { ...sec, title: e.target.value }; setCustomSections(u); }}
              placeholder="Section title..." style={{ background: "transparent", border: "none", color: COLORS.textDim, fontFamily: FONT, fontSize: 10, letterSpacing: "0.06em", fontWeight: 600, outline: "none", textTransform: "uppercase" }} />
            <button onClick={() => setCustomSections(prev => prev.filter((_, idx) => idx !== i))} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer" }}>×</button>
          </div>
          <textarea value={sec.content} onChange={e => { const u = [...customSections]; u[i] = { ...sec, content: e.target.value }; setCustomSections(u); }}
            rows={3} placeholder="Add your notes here..." style={{ ...inputStyle, background: COLORS.bg, resize: "vertical", lineHeight: 1.7 }} />
        </div>
      ))}

      <button onClick={() => setCustomSections([...customSections, { title: "", content: "" }])}
        style={{ padding: "10px 20px", background: "transparent", border: `1px dashed ${COLORS.border}`, borderRadius: 8, color: COLORS.textDim, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%" }}>
        + Add Section
      </button>
    </div>
  );
}

function AuditSurveysTab() {
  const [view, setView] = useState("list");
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [responseData, setResponseData] = useState([]);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderDesc, setBuilderDesc] = useState("");
  const [builderQuestions, setBuilderQuestions] = useState([]);
  const [editingSurveyId, setEditingSurveyId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [distEmails, setDistEmails] = useState("");
  const [distMessage, setDistMessage] = useState("");
  const [distLink, setDistLink] = useState("");
  const [saveError, setSaveError] = useState(null);

  const TEMPLATES = [
    { id: "blank", name: "Blank Survey", desc: "Start from scratch", questions: [] },
    { id: "ai_readiness", name: "AI Readiness Assessment", desc: "Evaluate AI adoption preparedness", questions: [
      { id: "q1", type: "rating", question: "How would you rate your organisation's current use of AI?", options: [], required: true },
      { id: "q2", type: "multiple_choice", question: "Which departments currently use AI or automation tools?", options: ["Sales", "Marketing", "Operations", "Finance", "HR", "IT", "None"], required: true },
      { id: "q3", type: "checkboxes", question: "What are the biggest barriers to AI adoption?", options: ["Budget", "Lack of expertise", "Data quality", "Leadership buy-in", "Security concerns", "Unclear ROI"], required: true },
      { id: "q4", type: "long_text", question: "Describe one process that takes too much time and could benefit from automation.", options: [], required: false },
      { id: "q5", type: "multiple_choice", question: "How would you describe the organisation's attitude toward AI?", options: ["Very enthusiastic", "Cautiously optimistic", "Neutral", "Skeptical", "Resistant"], required: true },
    ]},
    { id: "tech_stack", name: "Technology Stack Review", desc: "Map current tools and systems", questions: [
      { id: "q1", type: "long_text", question: "List all software tools you use daily in your role.", options: [], required: true },
      { id: "q2", type: "multiple_choice", question: "How satisfied are you with your current tech stack?", options: ["Very satisfied", "Somewhat satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"], required: true },
      { id: "q3", type: "checkboxes", question: "Which of these frustrations do you experience?", options: ["Too many tools", "Poor integration", "Slow performance", "Hard to learn", "Missing features", "Data silos"], required: true },
      { id: "q4", type: "text", question: "If you could replace one tool, what would it be and why?", options: [], required: false },
    ]},
    { id: "process_efficiency", name: "Process Efficiency Audit", desc: "Identify bottlenecks and waste", questions: [
      { id: "q1", type: "rating", question: "Rate the overall efficiency of your department's processes.", options: [], required: true },
      { id: "q2", type: "long_text", question: "What is your biggest time waster each week?", options: [], required: true },
      { id: "q3", type: "multiple_choice", question: "How much time per week do you spend on manual data entry?", options: ["<1 hour", "1-3 hours", "3-5 hours", "5-10 hours", "10+ hours"], required: true },
    ]},
  ];

  const FIELD_TYPES = [
    { key: "multiple_choice", label: "Multiple Choice", icon: "○" },
    { key: "checkboxes", label: "Checkboxes", icon: "☐" },
    { key: "text", label: "Short Text", icon: "—" },
    { key: "long_text", label: "Long Text", icon: "≡" },
    { key: "rating", label: "Rating Scale", icon: "★" },
    { key: "dropdown", label: "Dropdown", icon: "▾" },
  ];

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 };

  const loadSurveys = () => {
    setLoading(true);
    api.audit.surveys.list().then(data => {
      setSurveys(Array.isArray(data) ? data : []);
    }).catch(() => setSurveys([])).finally(() => setLoading(false));
  };

  useEffect(() => { loadSurveys(); }, []);

  const saveSurvey = async (andDistribute) => {
    setSaving(true);
    setSaveError(null);
    try {
      const payload = {
        title: builderTitle || "Untitled Survey",
        description: builderDesc || null,
        questions_json: builderQuestions,
        status: "active",
      };
      let saved;
      if (editingSurveyId) {
        saved = await api.audit.surveys.update(editingSurveyId, payload);
      } else {
        saved = await api.audit.surveys.create(payload);
      }
      loadSurveys();
      if (andDistribute && saved) {
        const s = { ...saved, questions: saved.questions || saved.questions_json || builderQuestions, responseData: [] };
        setSelectedSurvey(s);
        setDistLink(`${window.location.origin}/survey/${saved.id}`);
        setDistEmails("");
        setDistMessage(`Hi,\n\nYou've been invited to complete the "${s.title}" survey as part of our AI audit. It should take about 5 minutes.\n\nPlease complete it at your earliest convenience.\n\nThank you`);
        setView("distribute");
      } else {
        setView("list");
      }
    } catch (err) {
      console.error("Save survey error:", err);
      setSaveError(err.message || "Failed to save survey. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSurvey = async (id) => {
    try {
      await api.audit.surveys.delete(id);
      setSurveys(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error("Delete survey error:", err);
    }
  };

  const openResponses = async (survey) => {
    setSelectedSurvey(survey);
    setResponsesLoading(true);
    setView("responses");
    try {
      const data = await api.audit.surveys.listResponses(survey.id);
      setResponseData(Array.isArray(data) ? data : []);
    } catch {
      setResponseData([]);
    } finally {
      setResponsesLoading(false);
    }
  };

  const openEdit = (survey) => {
    setEditingSurveyId(survey.id);
    setBuilderTitle(survey.title);
    setBuilderDesc(survey.description || "");
    const q = survey.questions || survey.questions_json || [];
    setBuilderQuestions(Array.isArray(q) ? q : []);
    setSelectedTemplate("editing");
    setView("builder");
  };

  const selectTemplate = (tpl) => {
    setSelectedTemplate(tpl.id);
    setEditingSurveyId(null);
    setBuilderTitle(tpl.id === "blank" ? "" : tpl.name);
    setBuilderDesc(tpl.id === "blank" ? "" : tpl.desc);
    setBuilderQuestions(tpl.questions.map((q, i) => ({ ...q, id: `new_${i}` })));
  };

  const addQuestion = (type) => {
    setBuilderQuestions([...builderQuestions, {
      id: `new_${Date.now()}`, type, question: "", options: type === "multiple_choice" || type === "checkboxes" || type === "dropdown" ? ["Option 1"] : [], required: false,
    }]);
  };

  const updateQuestion = (idx, updates) => {
    const u = [...builderQuestions]; u[idx] = { ...u[idx], ...updates }; setBuilderQuestions(u);
  };

  const removeQuestion = (idx) => { setBuilderQuestions(builderQuestions.filter((_, i) => i !== idx)); };

  const openDistribute = (survey) => {
    setSelectedSurvey(survey);
    setDistLink(`${window.location.origin}/survey/${survey.id}`);
    setDistEmails("");
    setDistMessage(`Hi,\n\nYou've been invited to complete the "${survey.title}" survey as part of our AI audit. It should take about 5 minutes.\n\nPlease complete it at your earliest convenience.\n\nThank you`);
    setView("distribute");
  };

  // LIST VIEW
  if (view === "list") {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>Surveys</h2>
          </div>
          <button onClick={() => { setView("builder"); setSelectedTemplate(null); setEditingSurveyId(null); setBuilderTitle(""); setBuilderDesc(""); setBuilderQuestions([]); }}
            style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ CREATE SURVEY</button>
        </div>
        {loading && <div style={{ textAlign: "center", padding: 40, color: COLORS.textDim, fontSize: 13 }}>Loading surveys...</div>}
        {!loading && surveys.length === 0 && <div style={{ textAlign: "center", padding: 40, color: COLORS.textDim, fontSize: 13 }}>No surveys yet. Create one to get started.</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {surveys.map(survey => {
            const pct = survey.total > 0 ? Math.round((survey.responses / survey.total) * 100) : (survey.responses > 0 ? 100 : 0);
            return (
              <div key={survey.id} style={{ padding: "18px 22px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{survey.title}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{
                      padding: "3px 10px", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 500,
                      background: survey.status === "active" ? COLORS.accentBg : COLORS.surface,
                      color: survey.status === "active" ? COLORS.accent : COLORS.textDim,
                      border: `1px solid ${survey.status === "active" ? COLORS.accent + "33" : COLORS.border}`,
                    }}>{survey.status}</span>
                    <button onClick={() => deleteSurvey(survey.id)} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer", padding: "2px 4px" }}
                      onMouseEnter={e => e.currentTarget.style.color = COLORS.danger} onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim}>×</button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>{survey.responses}{survey.total > 0 ? `/${survey.total}` : ""} responses</div>
                {survey.total > 0 && <div style={{ width: "100%", height: 4, borderRadius: 2, background: COLORS.border, marginBottom: 12 }}>
                  <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: COLORS.accent }} />
                </div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openResponses(survey)}
                    style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>View Responses</button>
                  <button onClick={() => openEdit(survey)}
                    style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                  <button onClick={() => openDistribute(survey)}
                    style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>📨 Distribute</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // RESPONSES VIEW
  if (view === "responses" && selectedSurvey) {
    const questions = selectedSurvey.questions || selectedSurvey.questions_json || [];
    const respCount = responseData.length;
    const compRate = selectedSurvey.total > 0 ? Math.round((respCount / selectedSurvey.total) * 100) : (respCount > 0 ? 100 : 0);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => { setView("list"); loadSurveys(); }} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>{selectedSurvey.title}</h2>
          <span style={{ padding: "3px 10px", background: COLORS.accentBg, color: COLORS.accent, fontSize: 10, borderRadius: 6, fontFamily: FONT, fontWeight: 500, border: `1px solid ${COLORS.accent}22` }}>{respCount} responses</span>
        </div>

        {responsesLoading && <div style={{ textAlign: "center", padding: 40, color: COLORS.textDim, fontSize: 13 }}>Loading responses...</div>}

        {!responsesLoading && <>
          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            <StatCard label="Total Responses" value={respCount} accent={COLORS.accent} />
            <StatCard label="Completion Rate" value={`${compRate}%`} accent={COLORS.blue} />
            <StatCard label="Questions" value={questions.length} accent={COLORS.warn} />
          </div>

          {questions.length > 0 && <>
            <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>QUESTION BREAKDOWN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
              {questions.map((q, qi) => (
                <div key={q.id || qi} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.accent, fontWeight: 600 }}>Q{qi + 1}</span>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT }}>{(q.type || "").replace("_", " ")}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>{q.question}</div>
                  {(q.type === "multiple_choice" || q.type === "checkboxes") && (q.options || []).length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {q.options.map(opt => {
                        const count = responseData.filter(r => { const ans = (r.answers || {})[q.id] || ""; return typeof ans === "string" ? ans.includes(opt) : false; }).length;
                        const pct = respCount > 0 ? Math.round((count / respCount) * 100) : 0;
                        return (
                          <div key={opt} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                <span style={{ fontSize: 12, color: COLORS.text }}>{opt}</span>
                                <span style={{ fontSize: 11, color: COLORS.textDim }}>{count} ({pct}%)</span>
                              </div>
                              <div style={{ width: "100%", height: 4, borderRadius: 2, background: COLORS.border }}>
                                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: COLORS.accent, transition: "width 0.3s" }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {responseData.map((r, ri) => { const ans = (r.answers || {})[q.id]; return ans ? (
                        <div key={ri} style={{ padding: "8px 12px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6 }}>
                          <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 2 }}>{ans}</div>
                          <div style={{ fontSize: 10, color: COLORS.textDim }}>— {r.respondent_name || "Anonymous"}{r.respondent_role ? `, ${r.respondent_role}` : ""}</div>
                        </div>
                      ) : null; })}
                      {responseData.length === 0 && <div style={{ fontSize: 12, color: COLORS.textDim, padding: 8 }}>No responses yet</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>}

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>INDIVIDUAL RESPONSES</div>
          {responseData.length === 0 && <div style={{ fontSize: 12, color: COLORS.textDim, padding: 8 }}>No responses submitted yet</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {responseData.map((r, i) => (
              <div key={r.id || i} style={{ padding: "14px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{r.respondent_name || "Anonymous"}</span>
                    {r.respondent_role && <span style={{ fontSize: 11, color: COLORS.textDim, marginLeft: 8 }}>{r.respondent_role}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: COLORS.textDim }}>{r.completed_at ? new Date(r.completed_at).toLocaleDateString() : ""}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {Object.entries(r.answers || {}).map(([qId, ans]) => (
                    <div key={qId} style={{ padding: "4px 10px", background: COLORS.bg, borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {typeof ans === "string" ? ans : JSON.stringify(ans)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>}
      </div>
    );
  }

  // DISTRIBUTE VIEW
  if (view === "distribute" && selectedSurvey) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => { setView("list"); loadSurveys(); }} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>Distribute: {selectedSurvey.title}</h2>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1, padding: "24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>🔗</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Share Link</div>
            </div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 12 }}>Anyone with this link can complete the survey.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={distLink} readOnly style={{ ...inputStyle, flex: 1, background: COLORS.bg, fontSize: 11 }} />
              <button onClick={() => navigator.clipboard?.writeText(distLink)}
                style={{ padding: "10px 16px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Copy Link</button>
            </div>
          </div>
          <div style={{ flex: 1, padding: "24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>📧</span>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Email Invites</div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>RECIPIENTS</label>
              <textarea value={distEmails} onChange={e => setDistEmails(e.target.value)} placeholder="Enter email addresses, one per line or comma-separated..." rows={3} style={{ ...inputStyle, background: COLORS.bg, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>MESSAGE</label>
              <textarea value={distMessage} onChange={e => setDistMessage(e.target.value)} rows={5} style={{ ...inputStyle, background: COLORS.bg, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 11, color: COLORS.textDim }}>Sends from: <span style={{ color: COLORS.accent }}>connected account email</span></div>
              <button style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📨 Send Invites</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // SURVEY BUILDER
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <button onClick={() => { setView("list"); loadSurveys(); }} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
        <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>{editingSurveyId ? "Edit Survey" : "Create Survey"}</h2>
      </div>

      {!selectedTemplate && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>START FROM A TEMPLATE</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {TEMPLATES.map(tpl => (
              <button key={tpl.id} onClick={() => selectTemplate(tpl)} style={{
                padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10,
                cursor: "pointer", textAlign: "left", width: 200, transition: "border-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "66"}
              onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.text, marginBottom: 4 }}>{tpl.name}</div>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>{tpl.desc}</div>
                {tpl.questions.length > 0 && <div style={{ fontSize: 10, color: COLORS.accent, marginTop: 6 }}>{tpl.questions.length} questions</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>SURVEY TITLE</label>
              <input value={builderTitle} onChange={e => setBuilderTitle(e.target.value)} placeholder="e.g. AI Readiness Assessment" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>DESCRIPTION</label>
              <input value={builderDesc} onChange={e => setBuilderDesc(e.target.value)} placeholder="Brief description of the survey..." style={inputStyle} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
              {builderQuestions.map((q, i) => {
                const fieldType = FIELD_TYPES.find(f => f.key === q.type);
                return (
                  <div key={q.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.accent, fontWeight: 600 }}>Q{i + 1}</span>
                        <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: COLORS.bg, color: COLORS.textDim, fontFamily: FONT, border: `1px solid ${COLORS.border}` }}>{fieldType?.icon} {fieldType?.label}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: COLORS.textDim, cursor: "pointer" }}>
                          <input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, { required: e.target.checked })} />
                          Required
                        </label>
                        <button onClick={() => removeQuestion(i)} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer" }}
                          onMouseEnter={e => e.currentTarget.style.color = COLORS.danger} onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim}>×</button>
                      </div>
                    </div>
                    <input value={q.question} onChange={e => updateQuestion(i, { question: e.target.value })}
                      placeholder="Type your question..." style={{ ...inputStyle, background: COLORS.bg, marginBottom: q.options?.length > 0 ? 10 : 0 }} />
                    {(q.type === "multiple_choice" || q.type === "checkboxes" || q.type === "dropdown") && (
                      <div>
                        {(q.options || []).map((opt, oi) => (
                          <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ color: COLORS.textDim, fontSize: 12 }}>{q.type === "checkboxes" ? "☐" : q.type === "dropdown" ? "▾" : "○"}</span>
                            <input value={opt} onChange={e => { const newOpts = [...q.options]; newOpts[oi] = e.target.value; updateQuestion(i, { options: newOpts }); }}
                              style={{ ...inputStyle, background: COLORS.bg, flex: 1, padding: "6px 10px", fontSize: 12 }} />
                            <button onClick={() => { const newOpts = q.options.filter((_, idx) => idx !== oi); updateQuestion(i, { options: newOpts }); }}
                              style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 12, cursor: "pointer" }}>×</button>
                          </div>
                        ))}
                        <button onClick={() => updateQuestion(i, { options: [...(q.options || []), `Option ${(q.options || []).length + 1}`] })}
                          style={{ padding: "4px 12px", background: "transparent", border: `1px dashed ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 10, cursor: "pointer", marginTop: 4 }}>+ Add Option</button>
                      </div>
                    )}
                    {q.type === "rating" && (
                      <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                        {[1,2,3,4,5].map(n => (
                          <div key={n} style={{ width: 32, height: 32, borderRadius: 6, background: COLORS.bg, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: COLORS.textDim }}>{n}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>ADD QUESTION</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {FIELD_TYPES.map(ft => (
                  <button key={ft.key} onClick={() => addQuestion(ft.key)} style={{
                    padding: "8px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6,
                    color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent + "66"; e.currentTarget.style.color = COLORS.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
                  >{ft.icon} {ft.label}</button>
                ))}
              </div>
            </div>

            {saveError && (
              <div style={{ padding: "10px 14px", background: COLORS.danger + "15", border: `1px solid ${COLORS.danger}33`, borderRadius: 8, marginBottom: 10, fontSize: 12, color: COLORS.danger }}>{typeof saveError === "string" ? saveError : (saveError?.message || String(saveError))}</div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => saveSurvey(false)} disabled={saving} style={{ padding: "12px 24px", background: saving ? COLORS.border : COLORS.accent, color: saving ? COLORS.textDim : COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>{saving ? "Saving..." : "Save Survey"}</button>
              <button onClick={() => saveSurvey(true)} disabled={saving} style={{ padding: "12px 24px", background: saving ? COLORS.border : COLORS.blue, color: saving ? COLORS.textDim : "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>Save & Distribute →</button>
            </div>
          </div>

          <div style={{ width: 340, flexShrink: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>PREVIEW</div>
            <div style={{ padding: "24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, position: "sticky", top: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{builderTitle || "Untitled Survey"}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 20 }}>{builderDesc || "No description"}</div>
              {builderQuestions.length === 0 && <div style={{ fontSize: 12, color: COLORS.textDim, textAlign: "center", padding: "20px 0" }}>No questions yet</div>}
              {builderQuestions.map((q, i) => (
                <div key={q.id} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text, marginBottom: 6 }}>
                    {q.question || `Question ${i + 1}`}
                    {q.required && <span style={{ color: COLORS.danger, marginLeft: 2 }}>*</span>}
                  </div>
                  {q.type === "text" && <div style={{ padding: "8px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 11, color: COLORS.textDim }}>Short answer</div>}
                  {q.type === "long_text" && <div style={{ padding: "8px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 11, color: COLORS.textDim, minHeight: 48 }}>Long answer</div>}
                  {q.type === "rating" && <div style={{ display: "flex", gap: 3 }}>{[1,2,3,4,5].map(n => <div key={n} style={{ width: 24, height: 24, borderRadius: 4, background: COLORS.bg, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: COLORS.textDim }}>{n}</div>)}</div>}
                  {(q.type === "multiple_choice" || q.type === "checkboxes") && (q.options || []).map((opt, oi) => (
                    <div key={oi} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: COLORS.textDim }}>{q.type === "checkboxes" ? "☐" : "○"}</span>
                      <span style={{ fontSize: 11, color: COLORS.textMuted }}>{opt}</span>
                    </div>
                  ))}
                  {q.type === "dropdown" && <div style={{ padding: "6px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 11, color: COLORS.textDim }}>▾ Select an option</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditInterviewsTab() {
  const [interviewees, setInterviewees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", role: "", type: "Stakeholder", department: "", context: "" });
  const [generating, setGenerating] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 };

  const DEFAULT_QUESTIONS = [
    { section: "Opening & Context", questions: ["Can you walk me through your typical day-to-day responsibilities?", "How long have you been in this role and what's changed most since you started?", "What does success look like for your department this year?"] },
    { section: "Pain Points & Challenges", questions: ["What are the biggest bottlenecks or frustrations in your current workflow?", "Where do you feel the most time is wasted in your team's processes?", "If you could fix one thing about how your department operates, what would it be?", "What manual or repetitive tasks take up the most time?"] },
    { section: "Technology & Systems", questions: ["What tools and systems do you currently use? Which do you love and which frustrate you?", "How do you currently handle reporting and data analysis?", "Are there any tasks you wish were automated but aren't?"] },
    { section: "Strategic Alignment", questions: ["How do you see AI fitting into your department's operations?", "What would a successful AI implementation look like from your perspective?", "What concerns, if any, do you have about introducing AI tools?", "How would you measure the ROI of any new system or process?"] },
  ];

  useEffect(() => {
    setLoading(true);
    api.audit.interviews.list().then(data => {
      const interviews = Array.isArray(data) ? data : [];
      setInterviewees(interviews.map(i => {
        const q = i.questions || i.questions_json || DEFAULT_QUESTIONS;
        const qCount = Array.isArray(q) ? q.reduce((s, sec) => s + (sec.questions?.length || 0), 0) : 0;
        return {
          id: i.id,
          name: i.interviewee_name || "",
          role: i.interviewee_role || "",
          type: i.interviewee_type || "Stakeholder",
          department: i.department || "",
          status: i.status || "generated",
          questionCount: qCount,
          questions: q,
        };
      }));
    }).catch(() => setInterviewees([])).finally(() => setLoading(false));
  }, []);

  const handleGenerate = async () => {
    if (!formData.name.trim() || !formData.role.trim()) return;
    setGenerating(true);
    try {
      const saved = await api.audit.interviews.create({
        interviewee_name: formData.name,
        interviewee_role: formData.role,
        interviewee_type: formData.type,
        department: formData.department,
        questions_json: DEFAULT_QUESTIONS,
        status: "generated",
        notes: formData.context || null,
      });
      const q = saved.questions || saved.questions_json || DEFAULT_QUESTIONS;
      const qCount = Array.isArray(q) ? q.reduce((s, sec) => s + (sec.questions?.length || 0), 0) : 0;
      const newEntry = {
        id: saved.id,
        name: saved.interviewee_name || formData.name,
        role: saved.interviewee_role || formData.role,
        type: saved.interviewee_type || formData.type,
        department: saved.department || formData.department,
        status: "generated",
        questionCount: qCount,
        questions: q,
      };
      setInterviewees(prev => [newEntry, ...prev]);
      setSelectedInterview(newEntry);
      setShowForm(false);
      setFormData({ name: "", role: "", type: "Stakeholder", department: "", context: "" });
    } catch (err) {
      console.error("Create interview error:", err);
    } finally {
      setGenerating(false);
    }
  };

  const deleteInterview = async (id) => {
    try {
      await api.audit.interviews.delete(id);
      setInterviewees(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error("Delete interview error:", err);
    }
  };

  const getDisplayQuestions = (interview) => {
    const q = interview?.questions || DEFAULT_QUESTIONS;
    return Array.isArray(q) ? q : DEFAULT_QUESTIONS;
  };

  const copyAllQuestions = (interview) => {
    const sections = getDisplayQuestions(interview);
    const text = sections.map(s => `## ${s.section}\n${s.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`).join("\n\n");
    navigator.clipboard?.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  if (selectedInterview) {
    const sections = getDisplayQuestions(selectedInterview);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setSelectedInterview(null)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedInterview.name}</div>
            <div style={{ fontSize: 11, color: COLORS.textDim }}>{selectedInterview.role} · {selectedInterview.department} · {selectedInterview.type}</div>
          </div>
          <button onClick={() => copyAllQuestions(selectedInterview)} style={{ padding: "8px 16px", background: copySuccess ? COLORS.accentBg : "transparent", border: `1px solid ${copySuccess ? COLORS.accent + "33" : COLORS.border}`, borderRadius: 6, color: copySuccess ? COLORS.accent : COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>{copySuccess ? "Copied!" : "Copy All"}</button>
        </div>
        {sections.map((section, si) => (
          <div key={si} style={{ marginBottom: 16, padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.accent, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>{(section.section || "").toUpperCase()}</div>
            {(section.questions || []).map((q, qi) => (
              <div key={qi} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: qi < section.questions.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, fontWeight: 600, minWidth: 20 }}>{qi + 1}.</span>
                <span style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{q}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Interview Question Generator</div>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>AI-generated questions tailored to each interviewee's role and department</div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "8px 18px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ New Interview</button>
      </div>

      {showForm && (
        <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.accent}33`, borderRadius: 12, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div><label style={labelStyle}>INTERVIEWEE NAME</label><input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Sarah Mitchell" style={inputStyle} /></div>
            <div><label style={labelStyle}>ROLE / TITLE</label><input value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} placeholder="e.g. CFO, Estate Manager" style={inputStyle} /></div>
            <div>
              <label style={labelStyle}>TYPE</label>
              <div style={{ display: "flex", gap: 6 }}>
                {["Stakeholder", "Employee", "Executive", "Department Head"].map(t => (
                  <button key={t} onClick={() => setFormData({ ...formData, type: t })} style={{ flex: 1, padding: "8px", borderRadius: 6, border: `1px solid ${formData.type === t ? COLORS.accent + "55" : COLORS.border}`, background: formData.type === t ? COLORS.accentBg : "transparent", color: formData.type === t ? COLORS.accent : COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{t}</button>
                ))}
              </div>
            </div>
            <div><label style={labelStyle}>DEPARTMENT</label><input value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} placeholder="e.g. Finance, Operations" style={inputStyle} /></div>
          </div>
          <div style={{ marginBottom: 14 }}><label style={labelStyle}>FOCUS AREAS / CONTEXT (OPTIONAL)</label><textarea value={formData.context} onChange={e => setFormData({ ...formData, context: e.target.value })} placeholder="Any specific areas to focus on, known pain points, or context about this person's role..." rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }} /></div>
          <button onClick={handleGenerate} disabled={generating || !formData.name.trim() || !formData.role.trim()} style={{ padding: "10px 24px", background: formData.name.trim() && formData.role.trim() ? COLORS.accent : COLORS.border, color: formData.name.trim() && formData.role.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: formData.name.trim() && formData.role.trim() && !generating ? "pointer" : "default" }}>{generating ? "Saving..." : "🎤 Generate Interview Questions"}</button>
        </div>
      )}

      {loading && <div style={{ textAlign: "center", padding: 40, color: COLORS.textDim, fontSize: 13 }}>Loading interviews...</div>}
      {!loading && interviewees.length === 0 && !showForm && <div style={{ textAlign: "center", padding: 40, color: COLORS.textDim, fontSize: 13 }}>No interviews yet. Click "+ New Interview" to get started.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {interviewees.map(person => (
          <div key={person.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "44"} onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
            <div onClick={() => setSelectedInterview(person)} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎤</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{person.name}</div>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>{person.role} · {person.department} · {person.questionCount} questions</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 9, fontFamily: FONT, fontWeight: 500, background: person.type === "Stakeholder" ? COLORS.accent + "10" : COLORS.blue + "10", color: person.type === "Stakeholder" ? COLORS.accent : COLORS.blue, border: `1px solid ${person.type === "Stakeholder" ? COLORS.accent : COLORS.blue}22` }}>{person.type}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteInterview(person.id); }} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer", padding: "2px 4px" }}
                onMouseEnter={e => e.currentTarget.style.color = COLORS.danger} onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim}>×</button>
              <span onClick={() => setSelectedInterview(person)} style={{ fontSize: 10, color: COLORS.textDim, cursor: "pointer" }}>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTranscriptsTab({ project, transcripts, setTranscripts }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addContent, setAddContent] = useState("");
  const [addName, setAddName] = useState("");
  const [addSpeaker, setAddSpeaker] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };

  const handleAddTranscript = async () => {
    const content = addContent.trim();
    if (!content) {
      setSaveError("Please paste transcript content.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const name = addName.trim() || "Transcript " + new Date().toLocaleDateString();
      const saved = await api.audit.transcripts.create({
        project_id: project?.id,
        name,
        content_text: content,
        speaker_name: addSpeaker.trim() || null,
        source: "manual",
      });
      const newEntry = {
        ...saved,
        tags: saved.tags || [],
        speaker: saved.speaker_name || "",
        role: saved.speaker_role || "",
        duration: saved.duration_minutes ?? null,
      };
      setTranscripts(prev => [newEntry, ...prev]);
      setShowAddModal(false);
      setAddContent("");
      setAddName("");
      setAddSpeaker("");
    } catch (err) {
      console.error("Add transcript error:", err);
      setSaveError(err?.message || "Failed to save transcript");
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setAddContent("");
    setAddName("");
    setAddSpeaker("");
    setSaveError(null);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>📄</span>
          <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>Transcripts</h2>
        </div>
        <button onClick={() => setShowAddModal(true)} style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ ADD TRANSCRIPT</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {transcripts.map(t => (
          <div key={t.id} style={{ padding: "14px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 11, color: COLORS.textDim }}>{t.speaker} · {t.role} · {t.duration ?? "—"} min</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {(t.tags || []).map(tag => (
                  <span key={tag} style={{ padding: "2px 8px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 10, color: COLORS.textDim, fontFamily: FONT }}>{tag}</span>
                ))}
              </div>
            </div>
            <button onClick={() => api.audit.transcripts.delete(t.id).then(() => setTranscripts(prev => prev.filter(tr => tr.id !== t.id))).catch(e => console.error("Delete transcript error:", e))} style={{ padding: "4px 8px", background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.danger}
              onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim}
            >🗑</button>
          </div>
        ))}
      </div>
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={closeModal}>
          <div onClick={e => e.stopPropagation()} style={{ width: 560, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Add Transcript</div>
              <button onClick={closeModal} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              {saveError && <div style={{ marginBottom: 12, padding: 10, background: "rgba(255,80,80,0.1)", border: `1px solid ${COLORS.danger}44`, borderRadius: 8, color: COLORS.danger, fontSize: 12 }}>{typeof saveError === "string" ? saveError : (saveError?.message || String(saveError))}</div>}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>NAME (OPTIONAL)</label>
                <input value={addName} onChange={e => setAddName(e.target.value)} placeholder="e.g. CTO Interview" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>SPEAKER (OPTIONAL)</label>
                <input value={addSpeaker} onChange={e => setAddSpeaker(e.target.value)} placeholder="e.g. John Smith, CEO" style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>TRANSCRIPT CONTENT</label>
                <textarea value={addContent} onChange={e => setAddContent(e.target.value)} placeholder="Paste transcript content here..." rows={10} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={closeModal} disabled={saving} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: saving ? "default" : "pointer" }}>Cancel</button>
              <button onClick={handleAddTranscript} disabled={saving || !addContent.trim()} style={{ padding: "10px 24px", background: (addContent.trim() && !saving) ? COLORS.accent : COLORS.border, color: (addContent.trim() && !saving) ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: (addContent.trim() && !saving) ? "pointer" : "default" }}>{saving ? "Saving..." : "Add Transcript"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function AuditProcessMapsTab() {
  const [mapView, setMapView] = useState("business");
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [messages, setMessages] = useState([{ role: "agent", text: "I've reviewed the transcripts and interview data for this project. I can generate a full business process map across Acquisition, Delivery, and Support.\n\nThe standard framework maps 15 core processes. I'll fill in the specifics — owners, time estimates, tools used, and tag each with AI readiness.\n\nWould you like me to generate the map, or focus on a specific pillar first?" }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mapGenerated, setMapGenerated] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddProcess, setShowAddProcess] = useState(null); // pillar id
  const [newProcessLabel, setNewProcessLabel] = useState("");
  const [newProcessOwner, setNewProcessOwner] = useState("");
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState("");
  const [editingProcess, setEditingProcess] = useState(null); // { pillarId, procId }
  const [editingStep, setEditingStep] = useState(null); // { procId, stepIdx }
  const [editForm, setEditForm] = useState({});
  const [pillars, setPillars] = useState([]);

  useEffect(() => {
    api.audit.processMaps.list().then(data => {
      const maps = Array.isArray(data) ? data : data.process_maps || [];
      if (maps.length > 0) {
        const grouped = {};
        maps.forEach(m => {
          const pillarId = m.pillar_id || m.category || 'other';
          if (!grouped[pillarId]) grouped[pillarId] = { id: pillarId, label: m.pillar_label || pillarId, icon: m.pillar_icon || '📋', desc: m.pillar_desc || '', processes: [] };
          grouped[pillarId].processes.push({ id: m.id, label: m.name || m.label || '', owner: m.owner || '', time: m.time_estimate || m.time || '', tag: m.tag || 'neutral', tools: m.tools || '', aiRec: m.ai_recommendation || m.aiRec || '', savings: m.estimated_savings || m.savings || '' });
        });
        setPillars(Object.values(grouped));
      }
    }).catch(() => {});
  }, []);
  const [processFlows, setProcessFlows] = useState({
    a1: [
      { step: 1, label: "Open LinkedIn Sales Navigator", owner: "SDR", time: "5 min", tag: "timesink", aiOverlay: null },
      { step: 2, label: "Run saved search with ICP filters", owner: "SDR", time: "10 min", tag: "timesink", aiOverlay: null },
      { step: 3, label: "Manually review profiles (50-100)", owner: "SDR", time: "45 min", tag: "timesink", aiOverlay: "AI Ark auto-discovery replaces this entirely" },
      { step: 4, label: "Export to CSV", owner: "SDR", time: "5 min", tag: "timesink", aiOverlay: null },
      { step: 5, label: "Upload to CRM, check for duplicates", owner: "SDR", time: "20 min", tag: "timesink", aiOverlay: "Pipeline auto-deduplication on import" },
      { step: 6, label: "Manually find email addresses", owner: "SDR", time: "60 min", tag: "timesink", aiOverlay: "BetterContact / Icypeas waterfall verification" },
      { step: 7, label: "Write personalised first lines", owner: "SDR", time: "90 min", tag: "timesink", aiOverlay: "AI personalisation agent (2 credits/lead)" },
      { step: 8, label: "Load into outreach tool, launch sequence", owner: "SDR", time: "15 min", tag: "aiready", aiOverlay: "One-click campaign sync from Lead Lists" },
    ],
    a3: [
      { step: 1, label: "Select leads for outreach", owner: "SDR", time: "15 min", tag: "timesink", aiOverlay: "Auto-selected by ICP score" },
      { step: 2, label: "Draft cold email sequence", owner: "SDR", time: "45 min", tag: "timesink", aiOverlay: "AI Messaging Workshop generates sequences" },
      { step: 3, label: "Send LinkedIn connection requests", owner: "SDR", time: "30 min", tag: "timesink", aiOverlay: "HeyReach / AimFox automation" },
      { step: 4, label: "Monitor replies, respond manually", owner: "SDR", time: "30 min", tag: "timesink", aiOverlay: "AI SDR auto-responds within 5 min" },
    ],
  });

  const addProcess = (pillarId) => {
    if (!newProcessLabel.trim()) return;
    setPillars(prev => prev.map(p => p.id === pillarId ? { ...p, processes: [...p.processes, { id: `${pillarId[0]}${Date.now()}`, label: newProcessLabel, owner: newProcessOwner || "TBD", time: "TBD", tag: "qualityrisk", tools: "TBD", aiRec: "", savings: "" }] } : p));
    setNewProcessLabel(""); setNewProcessOwner(""); setShowAddProcess(null);
  };
  const removeProcess = (pillarId, procId) => { setPillars(prev => prev.map(p => p.id === pillarId ? { ...p, processes: p.processes.filter(pr => pr.id !== procId) } : p)); };
  const moveProcess = (pillarId, procIdx, dir) => {
    setPillars(prev => prev.map(p => { if (p.id !== pillarId) return p; const procs = [...p.processes]; const ni = procIdx + dir; if (ni < 0 || ni >= procs.length) return p; [procs[procIdx], procs[ni]] = [procs[ni], procs[procIdx]]; return { ...p, processes: procs }; }));
  };
  const startEditProcess = (pillarId, proc) => { setEditingProcess({ pillarId, procId: proc.id }); setEditForm({ label: proc.label, owner: proc.owner, time: proc.time, tools: proc.tools, tag: proc.tag, aiRec: proc.aiRec || "", savings: proc.savings || "" }); };
  const saveEditProcess = () => {
    if (!editingProcess) return;
    setPillars(prev => prev.map(p => p.id === editingProcess.pillarId ? { ...p, processes: p.processes.map(pr => pr.id === editingProcess.procId ? { ...pr, ...editForm } : pr) } : p));
    setEditingProcess(null); setEditForm({});
  };
  const addStep = (procId) => {
    if (!newStepLabel.trim()) return;
    setProcessFlows(prev => { const steps = prev[procId] || []; return { ...prev, [procId]: [...steps, { step: steps.length + 1, label: newStepLabel, owner: "TBD", time: "TBD", tag: "qualityrisk", aiOverlay: null }] }; });
    setNewStepLabel(""); setShowAddStep(false);
  };
  const removeStep = (procId, stepIdx) => {
    setProcessFlows(prev => { const steps = (prev[procId] || []).filter((_, i) => i !== stepIdx).map((s, i) => ({ ...s, step: i + 1 })); return { ...prev, [procId]: steps }; });
  };
  const moveStep = (procId, stepIdx, dir) => {
    setProcessFlows(prev => { const steps = [...(prev[procId] || [])]; const ni = stepIdx + dir; if (ni < 0 || ni >= steps.length) return prev; [steps[stepIdx], steps[ni]] = [steps[ni], steps[stepIdx]]; return { ...prev, [procId]: steps.map((s, i) => ({ ...s, step: i + 1 })) }; });
  };
  const startEditStep = (procId, stepIdx) => { const step = (processFlows[procId] || [])[stepIdx]; if (!step) return; setEditingStep({ procId, stepIdx }); setEditForm({ label: step.label, owner: step.owner, time: step.time, tag: step.tag, aiOverlay: step.aiOverlay || "" }); };
  const saveEditStep = () => {
    if (!editingStep) return;
    setProcessFlows(prev => { const steps = [...(prev[editingStep.procId] || [])]; steps[editingStep.stepIdx] = { ...steps[editingStep.stepIdx], ...editForm, aiOverlay: editForm.aiOverlay || null }; return { ...prev, [editingStep.procId]: steps }; });
    setEditingStep(null); setEditForm({});
  };

  const chatEndRef = React.useRef(null);
  React.useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const TAG_CONFIG = { timesink: { label: "Time Sink", color: COLORS.danger, icon: "🔴" }, qualityrisk: { label: "Quality Risk", color: COLORS.warn, icon: "🟡" }, aiready: { label: "AI Ready", color: COLORS.green, icon: "🟢" }, optimised: { label: "Optimised", color: COLORS.blue, icon: "🔵" } };
  const PILLAR_COLORS = { acquisition: COLORS.blue, delivery: "#7B61FF", support: COLORS.warn };

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input; const nm = [...messages, { role: "user", text: userMsg }]; setMessages(nm); setInput(""); setIsTyping(true);
    await new Promise(r => setTimeout(r, 2000));
    if (!mapGenerated) {
      setMapGenerated(true);
      setMessages([...nm, { role: "agent", text: "Done. I've generated the full business process map for Hodge Insurance based on the transcripts.\n\n🎯 Acquisition — 5 processes mapped. Lead Capture is the biggest time sink at 3 hrs/day, almost entirely manual LinkedIn work. Closing has quality risk — proposals are done in Word with no templates.\n\n🚀 Delivery — 5 processes. Onboarding and Discovery/Scoping are strong AI candidates. Execution is already fairly optimised.\n\n🛟 Support — 5 processes. Issue Intake and Triage are easy automation wins. Retention has quality risk — check-ins are inconsistent.\n\nClick any process node to drill into the step-by-step flow. What would you like to adjust?" }]);
    } else {
      const responses = [
        "Good call. I've updated the map — that process now reflects the additional step you described. The tag has been adjusted accordingly.",
        "That's a fair point. Looking at the transcripts, the time estimate seems low. I've adjusted it upward based on what the operations manager described in the second interview.",
        "I've added that as a sub-process. It connects between the two stages you mentioned. Based on the context from the interviews, I've tagged it as a quality risk since it's currently undocumented.",
      ];
      setMessages([...nm, { role: "agent", text: responses[messages.length % responses.length] }]);
    }
    setIsTyping(false);
  };

  return (
    <div style={{ display: "flex", gap: 0, height: "calc(100vh - 200px)", margin: "-28px", overflow: "hidden" }}>
      {/* Left: Chat */}
      <div style={{ width: 360, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${COLORS.border}` }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>🗺️</span>
          <div><div style={{ fontWeight: 600, fontSize: 13 }}>Process Map Builder</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Chat to generate, refine & explore</div></div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "88%", padding: "10px 14px", borderRadius: 12, background: msg.role === "user" ? COLORS.accent + "20" : COLORS.surface, border: `1px solid ${msg.role === "user" ? COLORS.accent + "33" : COLORS.border}`, borderBottomRightRadius: msg.role === "user" ? 4 : 12, borderBottomLeftRadius: msg.role === "agent" ? 4 : 12 }}>
                {msg.role === "agent" && <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>AI ANALYST</div>}
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{msg.text}</div>
              </div>
            </div>
          ))}
          {isTyping && <div style={{ display: "flex" }}><div style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderBottomLeftRadius: 4 }}><ProgressDots active={true} /></div></div>}
          <div ref={chatEndRef} />
        </div>
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isTyping) sendMessage(); }} placeholder={mapGenerated ? "Refine the map..." : "e.g. Generate the process map"} style={{ flex: 1, padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none" }} disabled={isTyping} />
          <button onClick={sendMessage} disabled={isTyping || !input.trim()} style={{ padding: "10px 18px", background: input.trim() && !isTyping ? COLORS.accent : COLORS.border, color: input.trim() && !isTyping ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: input.trim() && !isTyping ? "pointer" : "default" }}>Send</button>
        </div>
      </div>

      {/* Right: Map View */}
      <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
        {!mapGenerated ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 420 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>🗺️</div>
              <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, color: COLORS.textDim, marginBottom: 8 }}>Process Maps</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.6, marginBottom: 20 }}>Generate a full business process map from transcripts and interview data. Maps 15 core processes across Acquisition, Delivery, and Support with AI opportunity tags.</div>
              <button onClick={() => { setInput("Generate the full business process map"); setTimeout(() => sendMessage(), 50); }} style={{ padding: "12px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>🗺️ Generate Process Map</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {mapView === "process" && <button onClick={() => { setMapView("business"); setSelectedProcess(null); }} style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>← Business Flow</button>}
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700 }}>{mapView === "business" ? "Business Process Flow" : selectedProcess?.label}</span>
                {mapView === "process" && <span style={{ fontSize: 10, color: COLORS.textDim }}>{selectedProcess?.owner} · {selectedProcess?.time}</span>}
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {Object.entries(TAG_CONFIG).map(([k, v]) => (
                  <span key={k} style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3, color: COLORS.textDim }}>{v.icon} {v.label}</span>
                ))}
                <div style={{ width: 1, height: 16, background: COLORS.border, margin: "0 4px" }} />
                <div style={{ position: "relative" }}>
                  <button onClick={() => setShowExportMenu(!showExportMenu)} style={{ padding: "6px 14px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>📤 Export <span style={{ fontSize: 8 }}>▼</span></button>
                  {showExportMenu && (
                    <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 50, minWidth: 200, overflow: "hidden" }}>
                      {[
                        { label: "Add to Audit Deck", desc: "Append slides to project deck", icon: "📊" },
                        { label: "Download as PPTX", desc: "Standalone presentation", icon: "📑" },
                        { label: "Export as PDF", desc: "Print-ready document", icon: "📄" },
                        { label: "Export as PNG", desc: "Image for Miro / Figma / Docs", icon: "🖼️" },
                      ].map((opt, i) => (
                        <div key={i} onClick={() => setShowExportMenu(false)} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: i < 3 ? `1px solid ${COLORS.border}` : "none", display: "flex", alignItems: "center", gap: 10 }}
                          onMouseEnter={e => e.currentTarget.style.background = COLORS.accentBg} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <span style={{ fontSize: 14 }}>{opt.icon}</span>
                          <div><div style={{ fontSize: 11, fontWeight: 600 }}>{opt.label}</div><div style={{ fontSize: 9, color: COLORS.textDim }}>{opt.desc}</div></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Business Flow — Horizontal Left to Right */}
            {mapView === "business" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {pillars.map(pillar => {
                  const pc = PILLAR_COLORS[pillar.id];
                  return (
                    <div key={pillar.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderLeft: `4px solid ${pc}`, overflow: "hidden" }}>
                      {/* Pillar Header */}
                      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{pillar.icon}</span>
                          <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: pc }}>{pillar.label}</span>
                          <span style={{ fontSize: 10, color: COLORS.textDim, fontStyle: "italic" }}>{pillar.desc}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: COLORS.textDim }}>{pillar.processes.length} processes</span>
                          <button onClick={() => { setShowAddProcess(showAddProcess === pillar.id ? null : pillar.id); setNewProcessLabel(""); setNewProcessOwner(""); }} style={{ padding: "3px 8px", background: "transparent", border: `1px solid ${pc}44`, borderRadius: 4, color: pc, fontFamily: FONT, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>+ Add</button>
                        </div>
                      </div>
                      {/* Add Process Form */}
                      {showAddProcess === pillar.id && (
                        <div style={{ padding: "10px 20px", background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}`, display: "flex", gap: 8, alignItems: "center" }}>
                          <input value={newProcessLabel} onChange={e => setNewProcessLabel(e.target.value)} placeholder="Process name" onKeyDown={e => { if (e.key === "Enter") addProcess(pillar.id); }} style={{ flex: 2, padding: "6px 10px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 11, fontFamily: FONT_BODY, color: COLORS.text, outline: "none" }} autoFocus />
                          <input value={newProcessOwner} onChange={e => setNewProcessOwner(e.target.value)} placeholder="Owner" onKeyDown={e => { if (e.key === "Enter") addProcess(pillar.id); }} style={{ flex: 1, padding: "6px 10px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 11, fontFamily: FONT_BODY, color: COLORS.text, outline: "none" }} />
                          <button onClick={() => addProcess(pillar.id)} disabled={!newProcessLabel.trim()} style={{ padding: "6px 12px", background: newProcessLabel.trim() ? pc : COLORS.border, color: newProcessLabel.trim() ? "#fff" : COLORS.textDim, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: newProcessLabel.trim() ? "pointer" : "default" }}>Add</button>
                          <button onClick={() => setShowAddProcess(null)} style={{ padding: "6px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textDim, fontSize: 10, cursor: "pointer" }}>×</button>
                        </div>
                      )}
                      {/* Horizontal Flow */}
                      <div style={{ padding: "16px 20px", display: "flex", alignItems: "stretch", gap: 0, overflow: "auto" }}>
                        {pillar.processes.map((proc, pi) => (
                          <React.Fragment key={proc.id}>
                            <div style={{ minWidth: 160, maxWidth: 185, padding: "14px 16px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 10, borderTop: `3px solid ${TAG_CONFIG[proc.tag]?.color || COLORS.border}`, transition: "all 0.15s", display: "flex", flexDirection: "column", flexShrink: 0, position: "relative" }}>
                              {/* Controls: move arrows, edit, remove */}
                              <div style={{ position: "absolute", top: 4, right: 4, display: "flex", gap: 1, opacity: 0.35 }} className="proc-controls"
                                onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.35"}>
                                {pi > 0 && <button onClick={(e) => { e.stopPropagation(); moveProcess(pillar.id, pi, -1); }} style={{ width: 18, height: 18, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} title="Move left">◀</button>}
                                {pi < pillar.processes.length - 1 && <button onClick={(e) => { e.stopPropagation(); moveProcess(pillar.id, pi, 1); }} style={{ width: 18, height: 18, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} title="Move right">▶</button>}
                                <button onClick={(e) => { e.stopPropagation(); startEditProcess(pillar.id, proc); }} style={{ width: 18, height: 18, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }} title="Edit">✏️</button>
                                <button onClick={(e) => { e.stopPropagation(); removeProcess(pillar.id, proc.id); }} style={{ width: 18, height: 18, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
                                  onMouseEnter={e => e.currentTarget.style.color = COLORS.danger} onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim} title="Remove">×</button>
                              </div>
                              <div onClick={() => { if (processFlows[proc.id]) { setSelectedProcess(proc); setMapView("process"); } }} style={{ cursor: processFlows[proc.id] ? "pointer" : "default", flex: 1, display: "flex", flexDirection: "column" }}
                                onMouseEnter={e => { if (processFlows[proc.id]) e.currentTarget.parentElement.style.borderColor = pc + "66"; }} onMouseLeave={e => { e.currentTarget.parentElement.style.borderColor = COLORS.border; }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, paddingRight: 20 }}>
                                  <span style={{ fontWeight: 700, fontSize: 12, color: COLORS.text, lineHeight: 1.3 }}>{proc.label}</span>
                                  <span style={{ fontSize: 12, flexShrink: 0, marginLeft: 4 }}>{TAG_CONFIG[proc.tag]?.icon}</span>
                                </div>
                                <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 2 }}>{proc.owner}</div>
                                <div style={{ fontSize: 10, color: COLORS.textDim, marginBottom: 6 }}>{proc.time}</div>
                                <div style={{ fontSize: 9, color: COLORS.textDim, marginBottom: 4 }}>Tools: {proc.tools}</div>
                                {proc.aiRec && <div style={{ fontSize: 9, color: COLORS.accent, padding: "4px 8px", background: COLORS.accent + "08", borderRadius: 4, marginTop: "auto" }}>✨ {proc.aiRec}</div>}
                                {proc.savings && proc.savings !== "—" && <div style={{ fontSize: 9, color: COLORS.green, fontWeight: 600, marginTop: 4 }}>⏱ Saves {proc.savings}</div>}
                                {processFlows[proc.id] && <div style={{ fontSize: 8, color: pc, fontFamily: FONT, fontWeight: 600, marginTop: 6, letterSpacing: "0.04em" }}>CLICK TO EXPAND →</div>}
                              </div>
                            </div>
                            {pi < pillar.processes.length - 1 && (
                              <div style={{ display: "flex", alignItems: "center", flexShrink: 0, padding: "0 2px" }}>
                                <svg width="28" height="20" viewBox="0 0 28 20"><path d="M2 10 L20 10 M16 5 L22 10 L16 15" stroke={pc} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Summary Table */}
                <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "12px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 14 }}>📊</span>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.accent }}>AI OPPORTUNITY SUMMARY</span>
                  </div>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr style={{ background: COLORS.bg }}>
                      {["Process", "Owner", "Current Time", "Status", "AI Recommendation", "Time Saved"].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontFamily: FONT, fontSize: 9, color: COLORS.textDim, fontWeight: 600, letterSpacing: "0.04em", borderBottom: `1px solid ${COLORS.border}` }}>{h.toUpperCase()}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {pillars.flatMap(pil => pil.processes.map((proc, pi) => (
                        <tr key={proc.id} style={{ borderBottom: `1px solid ${COLORS.border}`, background: pi === 0 ? PILLAR_COLORS[pil.id] + "05" : "transparent" }}>
                          <td style={{ padding: "8px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}>{pi === 0 && <span style={{ fontSize: 10 }}>{pil.icon}</span>}<span style={{ fontSize: 11, fontWeight: pi === 0 ? 700 : 500 }}>{proc.label}</span></div></td>
                          <td style={{ padding: "8px 12px", fontSize: 10, color: COLORS.textDim }}>{proc.owner}</td>
                          <td style={{ padding: "8px 12px", fontSize: 10, fontFamily: FONT, fontWeight: 600 }}>{proc.time}</td>
                          <td style={{ padding: "8px 12px" }}><span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}>{TAG_CONFIG[proc.tag]?.icon} <span style={{ color: TAG_CONFIG[proc.tag]?.color, fontWeight: 600, fontFamily: FONT }}>{TAG_CONFIG[proc.tag]?.label}</span></span></td>
                          <td style={{ padding: "8px 12px", fontSize: 10, color: COLORS.accent }}>{proc.aiRec || "—"}</td>
                          <td style={{ padding: "8px 12px", fontSize: 10, fontWeight: 600, color: proc.savings && proc.savings !== "—" ? COLORS.green : COLORS.textDim }}>{proc.savings || "—"}</td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Process Flow — Vertical Top to Bottom */}
            {mapView === "process" && (
              <div>
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {(processFlows[selectedProcess?.id] || processFlows.a1).map((step, si, arr) => {
                    const pid = selectedProcess?.id || "a1";
                    return (
                    <React.Fragment key={si}>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}>
                          {si > 0 && <button onClick={() => moveStep(pid, si, -1)} style={{ width: 20, height: 14, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 8, cursor: "pointer", padding: 0, opacity: 0.4 }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.4"} title="Move up">▲</button>}
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: TAG_CONFIG[step.tag]?.color + "15", border: `2px solid ${TAG_CONFIG[step.tag]?.color || COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 12, fontWeight: 700, color: TAG_CONFIG[step.tag]?.color }}>{step.step}</div>
                          {si < arr.length - 1 && <button onClick={() => moveStep(pid, si, 1)} style={{ width: 20, height: 14, background: "transparent", border: "none", color: COLORS.textDim, fontSize: 8, cursor: "pointer", padding: 0, opacity: 0.4 }} onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.4"} title="Move down">▼</button>}
                        </div>
                        <div style={{ flex: 1, padding: "14px 18px", background: COLORS.surface, border: `1px solid ${step.aiOverlay ? COLORS.accent + "55" : COLORS.border}`, borderRadius: 10, borderLeft: step.aiOverlay ? `4px solid ${COLORS.accent}` : `4px solid ${TAG_CONFIG[step.tag]?.color || COLORS.border}`, position: "relative" }}>
                          <div style={{ position: "absolute", top: 6, right: 8, display: "flex", gap: 2, opacity: 0.35 }}
                            onMouseEnter={e => e.currentTarget.style.opacity = "1"} onMouseLeave={e => e.currentTarget.style.opacity = "0.35"}>
                            <button onClick={() => startEditStep(pid, si)} style={{ background: "none", border: "none", color: COLORS.textDim, fontSize: 10, cursor: "pointer", padding: "0 3px" }} title="Edit">✏️</button>
                            <button onClick={() => removeStep(pid, si)} style={{ background: "none", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer", padding: "0 3px" }}
                              onMouseEnter={e => e.currentTarget.style.color = COLORS.danger} onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim} title="Remove">×</button>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingRight: 40 }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{step.label}</div>
                              <div style={{ fontSize: 10, color: COLORS.textDim }}>{step.owner} · {step.time}</div>
                            </div>
                            <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: TAG_CONFIG[step.tag]?.color + "12", color: TAG_CONFIG[step.tag]?.color }}>{TAG_CONFIG[step.tag]?.label}</span>
                          </div>
                          {step.aiOverlay && (
                            <div style={{ marginTop: 10, padding: "10px 14px", background: COLORS.accent + "08", border: `1px solid ${COLORS.accent}22`, borderRadius: 8 }}>
                              <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 3 }}>✨ AI REPLACEMENT</div>
                              <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5 }}>{step.aiOverlay}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      {si < arr.length - 1 && (
                        <div style={{ display: "flex", paddingLeft: 26 }}>
                          <svg width="2" height="20"><line x1="1" y1="0" x2="1" y2="20" stroke={COLORS.border} strokeWidth="2" /></svg>
                        </div>
                      )}
                    </React.Fragment>
                  );})}
                </div>

                {/* Add Step */}
                {!showAddStep ? (
                  <button onClick={() => setShowAddStep(true)} style={{ marginTop: 12, padding: "8px 16px", background: "transparent", border: `1px dashed ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", width: "100%", marginLeft: 48 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}>+ Add Step</button>
                ) : (
                  <div style={{ marginTop: 12, marginLeft: 48, display: "flex", gap: 8 }}>
                    <input value={newStepLabel} onChange={e => setNewStepLabel(e.target.value)} placeholder="Step description" onKeyDown={e => { if (e.key === "Enter") addStep(selectedProcess?.id || "a1"); }} style={{ flex: 1, padding: "8px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: COLORS.text, outline: "none" }} autoFocus />
                    <button onClick={() => addStep(selectedProcess?.id || "a1")} disabled={!newStepLabel.trim()} style={{ padding: "8px 14px", background: newStepLabel.trim() ? COLORS.accent : COLORS.border, color: newStepLabel.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: newStepLabel.trim() ? "pointer" : "default" }}>Add</button>
                    <button onClick={() => { setShowAddStep(false); setNewStepLabel(""); }} style={{ padding: "8px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textDim, fontSize: 10, cursor: "pointer" }}>×</button>
                  </div>
                )}
                <div style={{ marginTop: 20, padding: "16px 20px", background: COLORS.accent + "08", border: `1px solid ${COLORS.accent}22`, borderRadius: 10 }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 8 }}>PROCESS SUMMARY — {(selectedProcess?.label || "Lead Capture").toUpperCase()}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                    {[
                      { label: "Current Time", value: selectedProcess?.time || "3 hrs/day", color: COLORS.text },
                      { label: "AI Automatable", value: selectedProcess?.id === "a3" ? "1.5 hrs (75%)" : "2.5 hrs (83%)", color: COLORS.accent },
                      { label: "Weekly Savings", value: selectedProcess?.id === "a3" ? "7.5 hrs/week" : "12.5 hrs/week", color: COLORS.green },
                      { label: "Cost Equivalent", value: selectedProcess?.id === "a3" ? "~£750/month" : "~£1,250/month", color: COLORS.green },
                    ].map((s, i) => (
                      <div key={i} style={{ padding: "10px 12px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                        <div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.04em", marginBottom: 4 }}>{s.label.toUpperCase()}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT, color: s.color }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Process Modal */}
      {editingProcess && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setEditingProcess(null); setEditForm({}); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Edit Process</div>
            </div>
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "label", label: "PROCESS NAME", ph: "e.g. Lead Capture" },
                { key: "owner", label: "OWNER", ph: "e.g. SDR" },
                { key: "time", label: "TIME ESTIMATE", ph: "e.g. 3 hrs/day" },
                { key: "tools", label: "CURRENT TOOLS", ph: "e.g. LinkedIn, manual search" },
                { key: "aiRec", label: "AI RECOMMENDATION", ph: "e.g. Automate with AI Ark" },
                { key: "savings", label: "ESTIMATED SAVINGS", ph: "e.g. 2.5 hrs/day" },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 9, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 4 }}>{f.label}</div>
                  <input value={editForm[f.key] || ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} placeholder={f.ph} style={{ width: "100%", padding: "8px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: COLORS.text, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 9, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 6 }}>STATUS TAG</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.entries(TAG_CONFIG).map(([k, v]) => (
                    <button key={k} onClick={() => setEditForm({ ...editForm, tag: k })} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${editForm.tag === k ? v.color + "55" : COLORS.border}`, background: editForm.tag === k ? v.color + "12" : "transparent", color: editForm.tag === k ? v.color : COLORS.textDim, fontFamily: FONT, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>{v.icon} {v.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => { setEditingProcess(null); setEditForm({}); }} style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveEditProcess} style={{ padding: "8px 18px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Step Modal */}
      {editingStep && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setEditingStep(null); setEditForm({}); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Edit Step</div>
            </div>
            <div style={{ padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { key: "label", label: "STEP DESCRIPTION", ph: "e.g. Upload to CRM" },
                { key: "owner", label: "OWNER", ph: "e.g. SDR" },
                { key: "time", label: "TIME ESTIMATE", ph: "e.g. 20 min" },
                { key: "aiOverlay", label: "AI REPLACEMENT (optional)", ph: "e.g. Pipeline auto-deduplication on import" },
              ].map(f => (
                <div key={f.key}>
                  <div style={{ fontSize: 9, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 4 }}>{f.label}</div>
                  <input value={editForm[f.key] || ""} onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} placeholder={f.ph} style={{ width: "100%", padding: "8px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: COLORS.text, outline: "none", boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 9, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 6 }}>STATUS TAG</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {Object.entries(TAG_CONFIG).map(([k, v]) => (
                    <button key={k} onClick={() => setEditForm({ ...editForm, tag: k })} style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${editForm.tag === k ? v.color + "55" : COLORS.border}`, background: editForm.tag === k ? v.color + "12" : "transparent", color: editForm.tag === k ? v.color : COLORS.textDim, fontFamily: FONT, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>{v.icon} {v.label}</button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => { setEditingStep(null); setEditForm({}); }} style={{ padding: "8px 18px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={saveEditStep} style={{ padding: "8px 18px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditAnalysisTab({ project }) {
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [analysisRun, setAnalysisRun] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [reasoningLogs, setReasoningLogs] = useState([]);
  const [isReasoning, setIsReasoning] = useState(false);
  const [deckGenerated, setDeckGenerated] = useState(false);
  const [showGenerateBtn, setShowGenerateBtn] = useState(false);
  const [showFullDeck, setShowFullDeck] = useState(false);
  const [sourceSummary, setSourceSummary] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const chatEndRef = React.useRef(null);

  React.useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, reasoningLogs, isTyping]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.audit.transcripts.list().catch(() => []),
      api.audit.surveys.list().catch(() => []),
      api.audit.interviews.list().catch(() => []),
    ]).then(([transcripts, surveys, interviews]) => {
      if (cancelled) return;
      const tCount = Array.isArray(transcripts) ? transcripts.length : 0;
      const sCount = Array.isArray(surveys) ? surveys.length : 0;
      const iCount = Array.isArray(interviews) ? interviews.length : 0;
      setSourceSummary({ transcripts: tCount, surveys: sCount, interviews: iCount });
      const parts = [];
      if (tCount > 0) parts.push(`${tCount} transcript${tCount > 1 ? "s" : ""}`);
      if (sCount > 0) parts.push(`${sCount} survey${sCount > 1 ? "s" : ""}`);
      if (iCount > 0) parts.push(`${iCount} interview set${iCount > 1 ? "s" : ""}`);
      const dataDesc = parts.length > 0 ? parts.join(", ") : "no data sources";
      setChatMessages([{
        role: "agent",
        text: `Welcome to the Analysis workspace. I've found ${dataDesc} for this project.\n\n${parts.length > 0 ? "You can ask me questions about the data, or when you're ready, tell me to run the full analysis and I'll work through everything — extracting themes, mapping opportunities, and building a strategic roadmap." : "Add some transcripts, surveys, or interviews first, then come back to run the analysis."}\n\nWhat would you like to do?`,
      }]);
    });
    api.audit.analyses.list().then(data => {
      if (cancelled) return;
      const analyses = Array.isArray(data) ? data : [];
      if (analyses.length > 0 && analyses[0].analysis_json) {
        const latest = analyses[0];
        const analysis = latest.analysis_json || latest.analysis || {};
        setAnalysisData(analysis);
        setAnalysisRun(true);
        setShowGenerateBtn(true);
        if (Array.isArray(analysis.reasoning_steps)) {
          setReasoningLogs(analysis.reasoning_steps);
        }
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const getTagColor = (tag) => {
    if (!tag) return COLORS.accent;
    const t = tag.toUpperCase();
    if (t === "CRITICAL RISK") return COLORS.danger;
    if (t === "BUDGET" || t === "STRATEGIC") return COLORS.blue;
    if (t === "COMPLIANCE") return COLORS.warn;
    if (t === "SURVEY") return "#7B61FF";
    if (t === "OPPORTUNITY") return "#7B61FF";
    return COLORS.accent;
  };

  const getLogStyle = (log) => {
    const base = { padding: "6px 10px", borderRadius: 6, marginBottom: 3, fontSize: 12, lineHeight: 1.5 };
    switch (log.type) {
      case "thinking": return { ...base, color: COLORS.textMuted, fontStyle: "italic" };
      case "reading": return { ...base, color: COLORS.blue };
      case "insight": return { ...base, color: COLORS.text, background: COLORS.bg, border: `1px solid ${COLORS.border}` };
      case "theme": return { ...base, color: COLORS.accent, background: COLORS.accentBg, border: `1px solid ${COLORS.accent}22` };
      case "matrix": return { ...base, color: "#7B61FF", background: "#7B61FF08" };
      case "roadmap": return { ...base, color: COLORS.warn, background: COLORS.warn + "08" };
      case "value": return { ...base, color: COLORS.accent, fontWeight: 600 };
      case "complete": return { ...base, color: COLORS.accent, fontWeight: 600 };
      default: return base;
    }
  };

  const runAnalysis = async () => {
    setIsReasoning(true);
    setAnalysisRun(true);
    setReasoningLogs([]);
    setAnalysisError(null);

    setReasoningLogs([{ type: "thinking", text: "Starting analysis — fetching all audit data from database..." }]);

    try {
      const result = await api.audit.analyse({ project_id: project?.id || null });
      const analysis = result.analysis || result.analysis_json || {};
      setAnalysisData(analysis);

      const steps = Array.isArray(analysis.reasoning_steps) ? analysis.reasoning_steps : [];
      if (steps.length > 0) {
        setReasoningLogs([]);
        for (let i = 0; i < steps.length; i++) {
          await new Promise(r => setTimeout(r, 200));
          setReasoningLogs(prev => [...prev, steps[i]]);
        }
      } else {
        setReasoningLogs(prev => [...prev, { type: "complete", text: "Analysis completed." }]);
      }

      setIsReasoning(false);
      setShowGenerateBtn(true);

      const themeCount = Array.isArray(analysis.themes) ? analysis.themes.length : 0;
      const oppCount = Array.isArray(analysis.opportunities) ? analysis.opportunities.length : 0;
      const phaseCount = Array.isArray(analysis.roadmap) ? analysis.roadmap.length : 0;

      let summaryText = `Analysis complete.`;
      if (themeCount > 0) summaryText += ` I've identified ${themeCount} key theme${themeCount > 1 ? "s" : ""}`;
      if (oppCount > 0) summaryText += `, ${oppCount} opportunit${oppCount > 1 ? "ies" : "y"}`;
      if (phaseCount > 0) summaryText += `, and mapped a ${phaseCount}-phase implementation roadmap`;
      summaryText += ".\n\nYou can ask me questions about any of the findings, or hit Generate Deck to create your presentation.";
      if (analysis.executive_summary) {
        summaryText += `\n\nExecutive Summary:\n${analysis.executive_summary}`;
      }

      setChatMessages(prev => [...prev, { role: "agent", text: summaryText }]);
    } catch (err) {
      setIsReasoning(false);
      setAnalysisError(err.message || "Analysis failed");
      setReasoningLogs(prev => [...prev, { type: "complete", text: `Analysis failed: ${err.message || "Unknown error"}` }]);
      setChatMessages(prev => [...prev, { role: "agent", text: `I encountered an error running the analysis: ${err.message || "Unknown error"}\n\nPlease check that your Anthropic API key is configured in Settings > Integrations, and that you have some data (transcripts, surveys, or interviews) available.` }]);
    }
  };

  const generateDeck = async () => {
    setShowGenerateBtn(false);
    setIsTyping(true);
    setChatMessages(prev => [...prev, { role: "agent", text: "Generating your presentation deck — 10 McKinsey-style slides..." }]);
    await new Promise(r => setTimeout(r, 2500));
    setDeckGenerated(true);
    setIsTyping(false);
    setChatMessages(prev => [...prev, { role: "agent", text: "Your deck is ready! 10 slides covering the full analysis — from current state through to next steps.\n\nClick any slide thumbnail on the right to preview it, or click Open Editor for the full-screen editor where you can click to edit any text.\n\nYou can also ask me to revise specific slides." }]);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || isTyping || isReasoning) return;
    const msg = userInput.trim().toLowerCase();
    const newMessages = [...chatMessages, { role: "user", text: userInput }];
    setChatMessages(newMessages);
    setUserInput("");
    setIsTyping(true);

    if (!analysisRun && (msg.includes("run") || msg.includes("start") || msg.includes("analyse") || msg.includes("analyze") || msg.includes("go ahead") || msg.includes("full analysis"))) {
      setChatMessages([...newMessages, { role: "agent", text: "Starting the full analysis now. I'll work through all transcripts and surveys, identify themes, map opportunities, and build a roadmap. Watch the reasoning panel..." }]);
      setIsTyping(false);
      await new Promise(r => setTimeout(r, 400));
      runAnalysis();
      return;
    }

    try {
      const resp = await api.audit.analyseChat({
        message: userInput,
        analysis_context: analysisData || null,
        history: newMessages.slice(-10),
      });
      setChatMessages(prev => [...prev, { role: "agent", text: resp.text || "I was unable to generate a response." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: "agent", text: `Error: ${err.message || "Could not connect to the AI analyst. Check your API key configuration."}` }]);
    }
    setIsTyping(false);
  };

  if (showFullDeck) return <AuditFullDeckViewer project={project} onClose={() => setShowFullDeck(false)} />;

  const SLIDE_LABELS = ["Title", "Agenda", "Current State", "Key Finding", "Survey Results", "Opportunity Matrix", "Roadmap", "Investment Case", "Value Projection", "Next Steps"];

  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden", margin: -28, marginTop: -28 }}>
      <div style={{ width: 440, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${COLORS.border}` }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🧠</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>AI Analyst</div>
              <div style={{ fontSize: 10, color: COLORS.textDim }}>
                {isReasoning ? "Running analysis..." : deckGenerated ? "Deck ready — ask for revisions" : analysisRun ? "Analysis complete" : "Ask questions or start analysis"}
              </div>
            </div>
          </div>
          {showGenerateBtn && (
            <button onClick={generateDeck} style={{ padding: "8px 16px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", animation: "pulse 2s infinite" }}>Generate Deck</button>
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "88%", padding: "10px 14px", borderRadius: 12,
                background: msg.role === "user" ? COLORS.accent + "20" : COLORS.surface,
                border: `1px solid ${msg.role === "user" ? COLORS.accent + "33" : COLORS.border}`,
                borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                borderBottomLeftRadius: msg.role === "agent" ? 4 : 12,
              }}>
                {msg.role === "agent" && <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>AI ANALYST</div>}
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{(msg.text || "").replace(/\*\*(.*?)\*\*/g, "$1")}</div>
              </div>
            </div>
          ))}

          {(isReasoning || (analysisRun && reasoningLogs.length > 0)) && (
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden", borderBottomLeftRadius: 4 }}>
              <div style={{ padding: "8px 12px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10 }}>🧠</span>
                <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600 }}>REASONING</span>
                {isReasoning && <ProgressDots active={true} />}
              </div>
              <div style={{ padding: "8px 10px", maxHeight: 280, overflow: "auto" }}>
                {reasoningLogs.map((log, i) => (
                  <div key={i} style={getLogStyle(log)}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <div>{log.text}</div>
                        {log.detail && <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 1 }}>{log.detail}</div>}
                      </div>
                      {log.tag && (
                        <span style={{ fontSize: 7, padding: "1px 5px", borderRadius: 3, background: getTagColor(log.tag) + "20", color: getTagColor(log.tag), fontFamily: FONT, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>{log.tag}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderBottomLeftRadius: 4 }}>
                <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>AI ANALYST</div>
                <ProgressDots active={true} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div style={{ padding: "10px 14px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
          <input value={userInput} onChange={e => setUserInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !isTyping && !isReasoning) sendMessage(); }}
            placeholder={deckGenerated ? "Ask for revisions..." : analysisRun ? "Ask about findings..." : "Ask questions or say 'run the analysis'..."}
            style={{ flex: 1, padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none" }}
            disabled={isTyping || isReasoning} />
          <button onClick={sendMessage} disabled={isTyping || isReasoning || !userInput.trim()} style={{
            padding: "10px 18px", background: userInput.trim() && !isTyping && !isReasoning ? COLORS.accent : COLORS.border,
            color: userInput.trim() && !isTyping && !isReasoning ? COLORS.bg : COLORS.textDim,
            border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
            cursor: userInput.trim() && !isTyping && !isReasoning ? "pointer" : "default",
          }}>Send</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 24, display: "flex", flexDirection: "column" }}>
        {!deckGenerated ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 360 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>📊</div>
              <div style={{ fontFamily: FONT, fontSize: 15, color: COLORS.textDim, marginBottom: 8 }}>Your deck will appear here</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>
                {analysisRun
                  ? "Analysis complete — click Generate Deck in the chat panel to build your presentation."
                  : "Chat with the AI Analyst on the left. Ask questions about the data, then run the full analysis to generate your consulting deck."}
              </div>
              {sourceSummary && (
                <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 12 }}>
                  {sourceSummary.transcripts > 0 && <span style={{ fontSize: 11, color: COLORS.textDim }}>📄 {sourceSummary.transcripts} transcript{sourceSummary.transcripts > 1 ? "s" : ""}</span>}
                  {sourceSummary.surveys > 0 && <span style={{ fontSize: 11, color: COLORS.textDim }}>📊 {sourceSummary.surveys} survey{sourceSummary.surveys > 1 ? "s" : ""}</span>}
                  {sourceSummary.interviews > 0 && <span style={{ fontSize: 11, color: COLORS.textDim }}>🎤 {sourceSummary.interviews} interview{sourceSummary.interviews > 1 ? "s" : ""}</span>}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, margin: 0 }}>Presentation <span style={{ color: COLORS.accent }}>Deck</span></h3>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>{SLIDE_LABELS.length} slides · Click to preview · Ask for revisions in chat</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Export PPTX</button>
                <button onClick={() => setShowFullDeck(true)} style={{ padding: "6px 14px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Open Editor →</button>
              </div>
            </div>

            <div onClick={() => setShowFullDeck(true)} style={{ cursor: "pointer", marginBottom: 16 }}>
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}`, background: "linear-gradient(135deg, #1e293b, #0f172a)", position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "#eab308" }} />
                <div style={{ padding: "0 40px" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Strategic Analysis</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Operations Assessment & Strategic Recommendations</div>
                  <div style={{ fontSize: 8, color: "#eab308", fontWeight: 600, marginBottom: 2, letterSpacing: "0.04em" }}>AI-POWERED AUDIT ANALYSIS</div>
                  <div style={{ fontSize: 8, color: "#64748b" }}>{new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              {SLIDE_LABELS.map((label, i) => (
                <div key={i} onClick={() => setShowFullDeck(true)} style={{
                  border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: 6, cursor: "pointer",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "66"}
                onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
                >
                  <div style={{ aspectRatio: "16/9", background: i === 0 ? "linear-gradient(135deg, #1e293b, #0f172a)" : "#fff", borderRadius: 4, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4, overflow: "hidden" }}>
                    <span style={{ fontSize: 7, color: i === 0 ? "#94a3b8" : "#334155", fontWeight: 600, textAlign: "center", padding: 4 }}>{label}</span>
                  </div>
                  <div style={{ fontSize: 9, color: COLORS.textDim, textAlign: "center", fontFamily: FONT }}>{i + 1}. {label}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuditFullDeckViewer({ project, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideData, setSlideData] = useState({
    0: { title: "Hodge Insurance\nAgency", subtitle: "Operations Assessment &\nStrategic Recommendations", preparedFor: "PREPARED FOR PERRY SALVAGNE IV, PRESIDENT/CEO", date: "October 2024" },
    1: { title: "AGENDA", items: ["Current State Assessment", "Key Findings & Pain Points", "Survey Results Analysis", "Strategic Recommendations", "Implementation Roadmap", "Investment Case & ROI", "Supported Impact Analysis", "Next Steps & Timeline"] },
    2: { title: "CURRENT STATE ASSESSMENT", summary: "Hodge has strong fundamentals constrained by manual processes — targeted automation can unlock 200-300+ hours per month and enable £75-100K+ annual growth.", bullets: [
      "Manual operations across 150 properties creating £100K+ annual revenue risk through missed lease renewals and delayed reconciliation",
      "Key-person dependency: estate manager is single point of failure with no documentation or knowledge transfer system in place",
      "Finance team spending 3 days per month on board reporting due to data scattered across 6+ disconnected systems",
      "Growth target of 300 properties by 2028 fundamentally blocked by current operational infrastructure",
    ], stats: [{ label: "200-300+ Hours/Mo", sublabel: "Manual work" }, { label: "67% Staff Readiness", sublabel: "Gap identified" }, { label: "£100K+ Risk/Year", sublabel: "Revenue leakage" }]},
    3: { title: "KEY FINDING: MANUAL LEASE TRACKING CREATES £100K+ REVENUE RISK", body: "Hastingwood Securities lacks centralized lease renewal tracking, resulting in missed opportunities and revenue leakage across 150 properties.", stats: [{ label: "2023-2024 TRACKING", value: "MANUAL" }, { label: "MISSED RENEWALS", value: "£124K" }, { label: "PROPERTIES AT RISK", value: "12 / 150" }] },
    4: { title: "SURVEY RESULTS: AI READINESS & TECHNOLOGY ASSESSMENT", headline: "Five interviews across all organisational levels provided comprehensive understanding of pain points, priorities, and readiness.", topStat: "274", topStatLabel: "combined data points analysed across interviews and surveys", findings: [
      { label: "AI Readiness", value: "67% rated adoption 2/5 or below" },
      { label: "Tech Satisfaction", value: "75% dissatisfied with current stack" },
      { label: "Top Barrier", value: "Budget concerns (58% of respondents)" },
      { label: "Biggest Need", value: "Integrated systems replacing data silos" },
    ]},
    5: { title: "INVESTMENT DECISION MATRIX", quickWins: [{ name: "Automated Lease Tracking", impact: "£100K+ revenue protection" }, { name: "Director Dashboard", impact: "20hr/month time saved" }], bigSwings: [{ name: "Knowledge Management System", impact: "De-risk key-person dependency" }, { name: "AI Contract Analysis", impact: "Unlock operational efficiency" }] },
    6: { title: "IMPLEMENTATION ROADMAP", phases: [
      { name: "Phase 1: Foundation", timeline: "Month 1-2", cost: "£35-45K", items: ["Lease tracking automation", "Data consolidation", "Core integrations"] },
      { name: "Phase 2: Unlock", timeline: "Month 3-4", cost: "£40-55K", items: ["Director dashboard", "Knowledge base", "Process automation"] },
      { name: "Phase 3: Scale", timeline: "Month 5-6", cost: "£50-70K", items: ["AI contract analysis", "Predictive insights", "Portfolio scaling tools"] },
    ]},
    7: { title: "INVESTMENT CASE", totalInvestment: "£125-170K", timeline: "6 months", annualValue: "£280-350K", roi: "2.1x ROI in Year 1" },
    8: { title: "PROJECTED VALUE & IMPACT", year1: "£280-350K", year2: "£400-500K", year3: "£600-750K", description: "Compound value increases as AI systems learn, processes optimise, and the portfolio scales toward 300 properties." },
    9: { title: "NEXT STEPS", steps: ["Schedule technical deep-dive with IT team (Week 1)", "Finalise Phase 1 scope and vendor selection (Week 2)", "Begin lease tracking implementation (Week 3-4)", "Monthly progress reviews with leadership team"] },
  });

  const updateSlideField = (si, field, value) => {
    setSlideData(prev => ({ ...prev, [si]: { ...prev[si], [field]: value } }));
  };

  const EditableText = ({ value, onChange, style, multiline }) => {
    const safeVal = (v) => (v != null && typeof v === 'object') ? (v.action || v.label || v.name || '') : v;
    const displayValue = safeVal(value);
    const [editing, setEditing] = useState(false);
    const [tempVal, setTempVal] = useState(displayValue);
    if (editing) {
      const El = multiline ? "textarea" : "input";
      return React.createElement(El, {
        value: String(tempVal ?? ''), onChange: e => setTempVal(e.target.value),
        onBlur: () => { onChange(tempVal); setEditing(false); },
        onKeyDown: !multiline ? e => { if (e.key === "Enter") { onChange(tempVal); setEditing(false); } } : undefined,
        autoFocus: true,
        style: { ...style, background: "rgba(234,179,8,0.08)", border: "2px solid #eab308", borderRadius: 4, outline: "none", resize: multiline ? "none" : undefined, padding: "4px 8px", width: "100%", boxSizing: "border-box" },
      });
    }
    return (
      <div onClick={() => { setEditing(true); setTempVal(displayValue); }} style={{ ...style, cursor: "text", borderRadius: 4, transition: "background 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(234,179,8,0.05)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >{displayValue}</div>
    );
  };

  const headingStyle = { fontSize: 22, fontWeight: 700, color: "#0f172a", borderBottom: "4px solid #eab308", paddingBottom: 12, marginBottom: 20 };

  const renderSlide = (idx) => {
    const d = slideData[idx];
    if (!d) return null;
    switch (idx) {
      case 0:
        return (
          <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #1e293b, #0f172a)", display: "flex", alignItems: "center", position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "#eab308" }} />
            <div style={{ padding: "0 60px" }}>
              <EditableText value={d.title} onChange={v => updateSlideField(0, "title", v)} multiline style={{ fontSize: 40, fontWeight: 700, color: "#fff", marginBottom: 16, whiteSpace: "pre-line", lineHeight: 1.2 }} />
              <EditableText value={d.subtitle} onChange={v => updateSlideField(0, "subtitle", v)} multiline style={{ fontSize: 16, color: "#94a3b8", marginBottom: 36, whiteSpace: "pre-line" }} />
              <EditableText value={d.preparedFor} onChange={v => updateSlideField(0, "preparedFor", v)} style={{ fontSize: 11, color: "#eab308", fontWeight: 600, marginBottom: 4, letterSpacing: "0.04em" }} />
              <EditableText value={d.date} onChange={v => updateSlideField(0, "date", v)} style={{ fontSize: 11, color: "#64748b" }} />
            </div>
          </div>
        );
      case 1:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: 60 }}>
            <EditableText value={d.title} onChange={v => updateSlideField(1, "title", v)} style={headingStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 40px" }}>
              {d.items.map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#eab308", flexShrink: 0 }} />
                  <EditableText value={item} onChange={v => { const u = [...d.items]; u[i] = v; updateSlideField(1, "items", u); }} style={{ fontSize: 14, color: "#334155" }} />
                </div>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: "40px 50px", display: "flex", flexDirection: "column" }}>
            <EditableText value={d.title} onChange={v => updateSlideField(2, "title", v)} style={{ ...headingStyle, fontSize: 18 }} />
            <EditableText value={d.summary} onChange={v => updateSlideField(2, "summary", v)} multiline style={{ fontSize: 11, color: "#334155", lineHeight: 1.6, marginBottom: 14, fontWeight: 600, fontStyle: "italic" }} />
            <div style={{ flex: 1 }}>
              {d.bullets.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#eab308", flexShrink: 0, marginTop: 6 }} />
                  <EditableText value={b} onChange={v => { const u = [...d.bullets]; u[i] = v; updateSlideField(2, "bullets", u); }} multiline style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              {d.stats.map((s, i) => (
                <div key={i} style={{ flex: 1, padding: 12, background: "#f8fafc", borderRadius: 6, borderLeft: "3px solid #eab308" }}>
                  <EditableText value={s.label} onChange={v => { const u = [...d.stats]; u[i] = { ...s, label: v }; updateSlideField(2, "stats", u); }} style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }} />
                  <div style={{ fontSize: 10, color: "#64748b" }}>{s.sublabel}</div>
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: 60 }}>
            <EditableText value={d.title} onChange={v => updateSlideField(3, "title", v)} style={{ ...headingStyle, fontSize: 18 }} />
            <EditableText value={d.body} onChange={v => updateSlideField(3, "body", v)} multiline style={{ fontSize: 13, color: "#475569", lineHeight: 1.7, marginBottom: 28 }} />
            <div style={{ display: "flex", gap: 16 }}>
              {d.stats.map((s, i) => (
                <div key={i} style={{ flex: 1, padding: 16, background: "#f1f5f9", borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{s.label}</div>
                  <EditableText value={s.value} onChange={v => { const u = [...d.stats]; u[i] = { ...s, value: v }; updateSlideField(3, "stats", u); }} style={{ fontSize: 22, fontWeight: 700, color: "#0f172a" }} />
                </div>
              ))}
            </div>
          </div>
        );
      case 4:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: "40px 50px" }}>
            <EditableText value={d.title} onChange={v => updateSlideField(4, "title", v)} style={{ ...headingStyle, fontSize: 16 }} />
            <EditableText value={d.headline} onChange={v => updateSlideField(4, "headline", v)} multiline style={{ fontSize: 11, color: "#475569", lineHeight: 1.5, marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ padding: 20, background: "#f0fdf4", borderRadius: 8, textAlign: "center", width: 100 }}>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#166534" }}>{d.topStat}</div>
                <div style={{ fontSize: 9, color: "#166534", lineHeight: 1.3, marginTop: 4 }}>{d.topStatLabel}</div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                {d.findings.map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, padding: "8px 12px", background: "#f8fafc", borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: "#64748b", fontWeight: 600, minWidth: 100 }}>{f.label}</div>
                    <EditableText value={f.value} onChange={v => { const u = [...d.findings]; u[i] = { ...f, value: v }; updateSlideField(4, "findings", u); }} style={{ fontSize: 12, color: "#0f172a", fontWeight: 500 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 5:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: 60 }}>
            <EditableText value={d.title} onChange={v => updateSlideField(5, "title", v)} style={headingStyle} />
            <div style={{ display: "flex", gap: 20, flex: 1 }}>
              <div style={{ flex: 1, border: "2px solid #22c55e", borderRadius: 8, padding: 20, background: "#f0fdf4" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#166534", marginBottom: 14 }}>QUICK WINS</div>
                {d.quickWins.map((w, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 6, padding: 10, marginBottom: 6 }}>
                    <EditableText value={w.name} onChange={v => { const u = [...d.quickWins]; u[i] = { ...w, name: v }; updateSlideField(5, "quickWins", u); }} style={{ fontWeight: 600, fontSize: 12 }} />
                    <EditableText value={w.impact} onChange={v => { const u = [...d.quickWins]; u[i] = { ...w, impact: v }; updateSlideField(5, "quickWins", u); }} style={{ fontSize: 10, color: "#6b7280" }} />
                  </div>
                ))}
              </div>
              <div style={{ flex: 1, border: "2px solid #3b82f6", borderRadius: 8, padding: 20, background: "#eff6ff" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#1e40af", marginBottom: 14 }}>BIG SWINGS</div>
                {d.bigSwings.map((w, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 6, padding: 10, marginBottom: 6 }}>
                    <EditableText value={w.name} onChange={v => { const u = [...d.bigSwings]; u[i] = { ...w, name: v }; updateSlideField(5, "bigSwings", u); }} style={{ fontWeight: 600, fontSize: 12 }} />
                    <EditableText value={w.impact} onChange={v => { const u = [...d.bigSwings]; u[i] = { ...w, impact: v }; updateSlideField(5, "bigSwings", u); }} style={{ fontSize: 10, color: "#6b7280" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 6:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: "40px 50px" }}>
            <EditableText value={d.title} onChange={v => updateSlideField(6, "title", v)} style={{ ...headingStyle, fontSize: 18 }} />
            <div style={{ display: "flex", gap: 16 }}>
              {d.phases.map((p, i) => (
                <div key={i} style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px", background: ["#eab308", "#3b82f6", "#8b5cf6"][i], color: "#fff" }}>
                    <EditableText value={p.name} onChange={v => { const u = [...d.phases]; u[i] = { ...p, name: v }; updateSlideField(6, "phases", u); }} style={{ fontWeight: 700, fontSize: 12, color: "#fff" }} />
                    <div style={{ fontSize: 10, opacity: 0.9 }}>{p.timeline} · {p.cost}</div>
                  </div>
                  <div style={{ padding: 12 }}>
                    {p.items.map((item, j) => (
                      <div key={j} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                        <span style={{ color: "#eab308", fontSize: 11 }}>→</span>
                        <EditableText value={item} onChange={v => { const u = [...d.phases]; const items = [...p.items]; items[j] = v; u[i] = { ...p, items }; updateSlideField(6, "phases", u); }} style={{ fontSize: 11, color: "#475569" }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: 60 }}>
            <EditableText value={d.title} onChange={v => updateSlideField(7, "title", v)} style={headingStyle} />
            <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
              {[
                { label: "Total Investment", value: d.totalInvestment, field: "totalInvestment", color: "#0f172a" },
                { label: "Timeline", value: d.timeline, field: "timeline", color: "#3b82f6" },
                { label: "Annual Value", value: d.annualValue, field: "annualValue", color: "#22c55e" },
                { label: "Return", value: d.roi, field: "roi", color: "#eab308" },
              ].map((item, i) => (
                <div key={i} style={{ flex: 1, padding: 20, background: "#f8fafc", borderRadius: 8, textAlign: "center", borderTop: `4px solid ${item.color}` }}>
                  <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6, fontWeight: 600 }}>{item.label}</div>
                  <EditableText value={item.value} onChange={v => updateSlideField(7, item.field, v)} style={{ fontSize: 22, fontWeight: 700, color: item.color }} />
                </div>
              ))}
            </div>
          </div>
        );
      case 8:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: 60 }}>
            <EditableText value={d.title} onChange={v => updateSlideField(8, "title", v)} style={headingStyle} />
            <div style={{ display: "flex", gap: 20, marginTop: 20, marginBottom: 20, alignItems: "flex-end" }}>
              {[{ label: "Year 1", value: d.year1, field: "year1", color: "#22c55e", h: 120 }, { label: "Year 2", value: d.year2, field: "year2", color: "#3b82f6", h: 180 }, { label: "Year 3", value: d.year3, field: "year3", color: "#8b5cf6", h: 240 }].map((y, i) => (
                <div key={i} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: y.h, background: `${y.color}15`, border: `2px solid ${y.color}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <EditableText value={y.value} onChange={v => updateSlideField(8, y.field, v)} style={{ fontSize: 24, fontWeight: 700, color: y.color }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#334155" }}>{y.label}</div>
                </div>
              ))}
            </div>
            <EditableText value={d.description} onChange={v => updateSlideField(8, "description", v)} multiline style={{ fontSize: 12, color: "#64748b", lineHeight: 1.6, textAlign: "center" }} />
          </div>
        );
      case 9:
        return (
          <div style={{ width: "100%", height: "100%", background: "#fff", padding: 60 }}>
            <EditableText value={d.title} onChange={v => updateSlideField(9, "title", v)} style={headingStyle} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              {d.steps.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: "#f8fafc", borderRadius: 8, borderLeft: "4px solid #eab308" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#eab308", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
                  <EditableText value={step} onChange={v => { const u = [...d.steps]; u[i] = v; updateSlideField(9, "steps", u); }} style={{ fontSize: 14, color: "#334155" }} />
                </div>
              ))}
            </div>
          </div>
        );
      default: return null;
    }
  };

  const SLIDE_LABELS = ["Title", "Agenda", "Current State", "Key Finding", "Survey Results", "Opportunity Matrix", "Roadmap", "Investment Case", "Value Projection", "Next Steps"];

  return (
    <div style={{ position: "fixed", inset: 0, background: COLORS.bg, zIndex: 50, display: "flex" }}>
      {/* Left — Slide Panel */}
      <div style={{ width: 160, borderRight: `1px solid ${COLORS.border}`, overflow: "auto", padding: "12px 8px", flexShrink: 0 }}>
        {SLIDE_LABELS.map((label, idx) => (
          <div key={idx} onClick={() => setCurrentSlide(idx)} style={{
            padding: 6, marginBottom: 8, borderRadius: 6, cursor: "pointer",
            border: currentSlide === idx ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            background: currentSlide === idx ? COLORS.accentBg : "transparent",
          }}>
            <div style={{ aspectRatio: "16/9", background: idx === 0 ? "linear-gradient(135deg, #1e293b, #0f172a)" : "#fff", borderRadius: 4, border: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 7, color: idx === 0 ? "#94a3b8" : "#334155", fontWeight: 600, textAlign: "center", padding: 4 }}>{label}</span>
            </div>
            <div style={{ fontSize: 9, color: currentSlide === idx ? COLORS.accent : COLORS.textDim, textAlign: "center", fontFamily: FONT }}>{idx + 1}. {label}</div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ height: 50, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: COLORS.textMuted, fontSize: 18, cursor: "pointer" }}>×</button>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Hodge Insurance Agency - Operations Assessment</span>
            <span style={{ fontSize: 10, color: COLORS.textDim }}>Click any text to edit</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: COLORS.textDim }}>{currentSlide + 1} / {SLIDE_LABELS.length}</span>
            <button style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Export PPTX</button>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 900, aspectRatio: "16/9", background: "#fff", borderRadius: 6, boxShadow: "0 8px 40px rgba(0,0,0,0.3)", overflow: "hidden" }}>
            {renderSlide(currentSlide)}
          </div>
        </div>
        <div style={{ height: 50, background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))} disabled={currentSlide === 0} style={{ padding: "6px 14px", background: "transparent", border: "none", color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, cursor: "pointer", opacity: currentSlide === 0 ? 0.3 : 1 }}>← Previous</button>
          <span style={{ fontSize: 11, color: COLORS.textDim }}>{SLIDE_LABELS[currentSlide]}</span>
          <button onClick={() => setCurrentSlide(Math.min(SLIDE_LABELS.length - 1, currentSlide + 1))} disabled={currentSlide === SLIDE_LABELS.length - 1} style={{ padding: "6px 14px", background: "transparent", border: "none", color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, cursor: "pointer", opacity: currentSlide === SLIDE_LABELS.length - 1 ? 0.3 : 1 }}>Next →</button>
        </div>
      </div>
    </div>
  );
}
function MessagingWorkshopView() {
  const [view, setView] = useState("list");
  const [listTab, setListTab] = useState("all"); // "all", "emails", "linkedin", "subjects"
  const [chatMessages, setChatMessages] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [workshopStep, setWorkshopStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [messagingSuite, setMessagingSuite] = useState(null);
  const [revisingItem, setRevisingItem] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [playbookName, setPlaybookName] = useState("");
  const [saveSelections, setSaveSelections] = useState({});

  const [MOCK_PLAYBOOKS, setPlaybooks] = useState([]);

  useEffect(() => {
    api.messagingCopies.list().then(data => {
      const copies = Array.isArray(data) ? data : data.messaging_copies || [];
      setPlaybooks(copies.map(c => ({
        id: c.id, name: c.name || c.title || 'Untitled',
        audience: c.audience || '', created: c.created_at ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
        emails: c.emails || c.content?.emails || [],
        linkedin: c.linkedin || c.content?.linkedin || [],
        subjects: c.subjects || c.content?.subjects || [],
      })));
    }).catch(() => {});
  }, []);

  const AGENT_QUESTIONS = [
    { message: "Hey! Let's build your outbound messaging. First — who are you targeting with this campaign? You can describe them or pick from one of your existing ICP lists.", field: "audience" },
    { message: "Got it. Now, what's the core offer or outcome you want to lead with? What would make them stop scrolling and actually read?", field: "offer" },
    { message: "Nice. What's the #1 pain point you're solving for them? The thing that keeps them up at night.", field: "pain" },
    { message: "What proof do you have that you can deliver? Think case studies, numbers, client names, testimonials — anything that builds instant credibility.", field: "proof" },
    { message: "What's the CTA? What do you want them to actually do — book a call, reply, click a link, something else?", field: "cta" },
    { message: "Last one — what tone fits this audience best? Formal and corporate? Casual and direct? Provocative? Consultative? Or something else?", field: "tone" },
  ];

  const MOCK_SUITE = {
    emails: [
      { id: "e1", label: "Initial Email — Variant A (Pain-Led)", subject: "{{first_name}}, quick question about {{company_name}}'s outbound", body: "Hi {{first_name}},\n\nI noticed {{company_name}} has been scaling the sales team — congrats on the growth.\n\nQuick question: how much time are your reps spending on lead research vs. actually selling?\n\nMost teams I work with find their reps waste 3+ hours a day manually researching prospects. We built an AI-powered system that automates the entire discovery-to-personalisation pipeline — one client went from 12 meetings/month to 47 in 6 weeks.\n\nWorth a 15-min chat to see if it'd work for {{company_name}}?\n\nBest,\n[Your name]" },
      { id: "e2", label: "Initial Email — Variant B (Result-Led)", subject: "47 meetings in 6 weeks (here's how)", body: "Hi {{first_name}},\n\nA quick stat: one of our clients went from 12 booked meetings per month to 47 — in 6 weeks.\n\nThe difference? They stopped relying on manual prospecting and switched to an AI-powered pipeline that finds, verifies, and personalises outreach at scale.\n\nI help companies like {{company_name}} implement the same system. No fluff, no bloated tech stack — just more qualified meetings on your calendar.\n\nHappy to show you the exact workflow. 15 minutes — you'll know if it's a fit.\n\n[Your name]" },
      { id: "e3", label: "Follow-up #1 (2 days later)", subject: "re: {{first_name}}, quick question about {{company_name}}'s outbound", body: "Hi {{first_name}},\n\nJust bumping this up — I know inboxes get buried.\n\nThe short version: we help sales teams automate lead research so your reps spend time selling, not Googling.\n\nHappy to share a 2-min Loom showing exactly how it works if that's easier?\n\n[Your name]" },
      { id: "e4", label: "Follow-up #2 (4 days later)", subject: "one last thing, {{first_name}}", body: "Hi {{first_name}},\n\nLast note from me — I get that timing matters.\n\nIf scaling outbound is on the roadmap for {{company_name}} this quarter, I'd love to show you how we've helped similar teams 3-4x their pipeline without adding headcount.\n\nIf not, no worries at all — happy to reconnect when it makes sense.\n\n[Your name]" },
    ],
    linkedin: [
      { id: "l1", label: "Connection Request — Variant A", body: "Hi {{first_name}} — saw {{company_name}} is scaling the sales team. I work with similar companies on automating outbound with AI. Would love to connect and share ideas." },
      { id: "l2", label: "Connection Request — Variant B", body: "{{first_name}}, your work at {{company_name}} caught my eye. I help growth-stage teams 3-4x their pipeline with AI-powered prospecting. Happy to share what's working if useful." },
      { id: "l3", label: "Follow-up Message (after acceptance)", body: "Thanks for connecting {{first_name}}!\n\nQuick question — how are you currently handling lead research and outbound personalisation at {{company_name}}?\n\nI recently helped a similar company go from 12 to 47 booked meetings/month by automating their prospecting pipeline. Happy to share the approach if you're interested.\n\nNo pitch — genuinely curious how you're tackling it." },
    ],
    subjects: [
      "{{first_name}}, quick question about {{company_name}}'s outbound",
      "47 meetings in 6 weeks (here's how)",
      "{{company_name}}'s sales team is leaving money on the table",
      "saw {{company_name}} is hiring SDRs — what if you didn't need to?",
      "the AI outbound playbook (steal this)",
      "re: scaling pipeline at {{company_name}}",
      "{{first_name}}, are your reps still researching leads manually?",
      "we helped [similar company] 4x their pipeline",
      "quick idea for {{company_name}}'s outbound",
      "{{first_name}} — 15 mins to save your team 15 hours/week?",
      "your competitors are automating outbound (here's how)",
      "the cold email mistake 90% of sales teams make",
      "{{first_name}}, this might save {{company_name}} £50K/year",
      "I'd love your take on this, {{first_name}}",
      "what if {{company_name}} never had to manually prospect again?",
      "{{first_name}}, one question about your sales process",
      "3 mins — I'll show you what your pipeline could look like",
      "{{company_name}} + AI outbound = ?",
      "most sales teams hate prospecting. here's the fix.",
      "{{first_name}}, saw something interesting about {{company_name}}",
    ],
  };

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 };

  const allEmails = MOCK_PLAYBOOKS.flatMap(pb => pb.emails.map(e => ({ ...e, playbook: pb.name })));
  const allLinkedin = MOCK_PLAYBOOKS.flatMap(pb => pb.linkedin.map(l => ({ ...l, playbook: pb.name })));
  const allSubjects = MOCK_PLAYBOOKS.flatMap(pb => pb.subjects.map(s => ({ text: s, playbook: pb.name })));

  const startWorkshop = () => {
    setView("workshop");
    setChatMessages([{ role: "agent", text: AGENT_QUESTIONS[0].message }]);
    setWorkshopStep(0);
    setMessagingSuite(null);
    setRevisingItem(null);
    setPlaybookName("");
    setSaveSelections({});
  };

  const openSaveModal = () => {
    const sel = {};
    messagingSuite.emails.forEach(e => sel[e.id] = true);
    messagingSuite.linkedin.forEach(l => sel[l.id] = true);
    messagingSuite.subjects.forEach((_, i) => sel[`s${i}`] = true);
    setSaveSelections(sel);
    setShowSaveModal(true);
  };

  const toggleSelection = (key) => {
    setSaveSelections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const selectAllInGroup = (group) => {
    const newSel = { ...saveSelections };
    if (group === "emails") messagingSuite.emails.forEach(e => newSel[e.id] = true);
    if (group === "linkedin") messagingSuite.linkedin.forEach(l => newSel[l.id] = true);
    if (group === "subjects") messagingSuite.subjects.forEach((_, i) => newSel[`s${i}`] = true);
    setSaveSelections(newSel);
  };

  const deselectAllInGroup = (group) => {
    const newSel = { ...saveSelections };
    if (group === "emails") messagingSuite.emails.forEach(e => newSel[e.id] = false);
    if (group === "linkedin") messagingSuite.linkedin.forEach(l => newSel[l.id] = false);
    if (group === "subjects") messagingSuite.subjects.forEach((_, i) => newSel[`s${i}`] = false);
    setSaveSelections(newSel);
  };

  const getSelectedCount = (group) => {
    if (group === "emails") return messagingSuite.emails.filter(e => saveSelections[e.id]).length;
    if (group === "linkedin") return messagingSuite.linkedin.filter(l => saveSelections[l.id]).length;
    if (group === "subjects") return messagingSuite.subjects.filter((_, i) => saveSelections[`s${i}`]).length;
    return 0;
  };

  const requestRevise = (item) => {
    setRevisingItem(item);
    setChatMessages(prev => [
      ...prev,
      { role: "user", text: `I'd like to revise: ${item.label}` },
      { role: "agent", text: `Sure — what would you like to change about "${item.label}"? Tell me what to adjust and I'll update it.` },
    ]);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    const newMessages = [...chatMessages, { role: "user", text: userInput }];
    setChatMessages(newMessages);
    setUserInput("");
    setIsTyping(true);
    try {
      const payload = { messages: newMessages };
      if (messagingSuite && revisingItem) {
        payload.reviseRequest = { itemLabel: revisingItem.label, userFeedback: userInput.trim() };
        payload.currentSuite = messagingSuite;
      }
      const { agentText, suite: newSuite } = await api.messagingCopies.copywriterChat(payload);
      setChatMessages(prev => [...prev, { role: "agent", text: agentText || "Done." }]);
      if (newSuite) {
        setMessagingSuite(newSuite);
        setRevisingItem(null);
        if (!messagingSuite) setWorkshopStep(AGENT_QUESTIONS.length);
      } else if (!messagingSuite) {
        setWorkshopStep(prev => Math.min(prev + 1, AGENT_QUESTIONS.length));
      }
    } catch (err) {
      console.error("Copywriter chat error:", err);
      setChatMessages(prev => [...prev, { role: "agent", text: "Sorry, I couldn't process that. " + (err?.message || "Please try again.") }]);
    } finally {
      setIsTyping(false);
    }
  };

  const CheckBox = ({ checked, onChange, accentColor }) => (
    <div onClick={onChange} style={{
      width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? (accentColor || COLORS.accent) : COLORS.border}`,
      background: checked ? (accentColor || COLORS.accent) : "transparent",
      display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", flexShrink: 0,
    }}>
      {checked && <span style={{ color: COLORS.bg, fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
    </div>
  );

  // LIST VIEW
  if (view === "list") {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
              Messaging <span style={{ color: COLORS.accent }}>Workshop</span>
            </h2>
            <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Build your outbound messaging with an AI copywriting strategist</p>
          </div>
          <button onClick={startWorkshop} style={{ padding: "12px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ NEW MESSAGING</button>
        </div>

        {/* Category Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
          {[
            { key: "all", label: "All Playbooks", count: MOCK_PLAYBOOKS.length },
            { key: "emails", label: "Emails", count: allEmails.length },
            { key: "linkedin", label: "LinkedIn", count: allLinkedin.length },
            { key: "subjects", label: "Subject Lines", count: allSubjects.length },
          ].map(tab => (
            <button key={tab.key} onClick={() => setListTab(tab.key)} style={{
              padding: "10px 20px", background: "transparent", border: "none",
              borderBottom: listTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent",
              color: listTab === tab.key ? COLORS.accent : COLORS.textMuted,
              fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}>
              {tab.label}
              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: listTab === tab.key ? COLORS.accentBg : COLORS.surface, color: listTab === tab.key ? COLORS.accent : COLORS.textDim }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* All Playbooks */}
        {listTab === "all" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {MOCK_PLAYBOOKS.map(pb => (
              <div key={pb.id} style={{ padding: "18px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{pb.name}</div>
                  <div style={{ fontSize: 12, color: COLORS.textMuted }}>{pb.audience}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[
                      { label: "Emails", value: pb.emails.length, color: COLORS.blue },
                      { label: "LinkedIn", value: pb.linkedin.length, color: COLORS.warn },
                      { label: "Subjects", value: pb.subjects.length, color: "#7B61FF" },
                    ].map(stat => (
                      <div key={stat.label} style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: stat.color }}>{stat.value}</div>
                        <div style={{ fontFamily: FONT, fontSize: 8, color: COLORS.textDim, letterSpacing: "0.06em", marginTop: 1 }}>{stat.label.toUpperCase()}</div>
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: COLORS.textDim }}>{pb.created}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Emails */}
        {listTab === "emails" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allEmails.map((email, i) => (
              <div key={i} style={{ padding: "14px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.blue }}>{email.label}</span>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT }}>{email.playbook}</span>
                  </div>
                  <button onClick={() => navigator.clipboard?.writeText(`Subject: ${email.subject}\n\n${email.body}`)} style={{ padding: "3px 8px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>Copy</button>
                </div>
                <div style={{ fontSize: 12, color: COLORS.accent, marginBottom: 4 }}>{email.subject}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5, maxHeight: 40, overflow: "hidden" }}>{email.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* LinkedIn */}
        {listTab === "linkedin" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {allLinkedin.map((msg, i) => (
              <div key={i} style={{ padding: "14px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.warn }}>{msg.label}</span>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT }}>{msg.playbook}</span>
                  </div>
                  <button onClick={() => navigator.clipboard?.writeText(msg.body)} style={{ padding: "3px 8px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>Copy</button>
                </div>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5, maxHeight: 40, overflow: "hidden" }}>{msg.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Subject Lines */}
        {listTab === "subjects" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {allSubjects.map((s, i) => (
              <div key={i} style={{ padding: "8px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 12, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.text}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT }}>{s.playbook}</span>
                  <button onClick={() => navigator.clipboard?.writeText(s.text)} style={{ padding: "2px 8px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>Copy</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // WORKSHOP VIEW
  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Save Playbook Modal */}
      {showSaveModal && messagingSuite && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSaveModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, maxHeight: "80vh", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Save Messaging Playbook</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Select which pieces to include in this playbook</div>
            </div>
            <div style={{ padding: "16px 24px", borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
              <label style={labelStyle}>PLAYBOOK NAME</label>
              <input value={playbookName} onChange={e => setPlaybookName(e.target.value)} placeholder="e.g. Q1 SaaS VP Growth — Cold Intro" style={inputStyle} autoFocus />
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
              {/* Emails */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>📧</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.blue, letterSpacing: "0.06em", fontWeight: 600 }}>EMAILS</span>
                    <span style={{ fontSize: 10, color: COLORS.textDim }}>({getSelectedCount("emails")}/{messagingSuite.emails.length})</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => selectAllInGroup("emails")} style={{ padding: "2px 8px", background: "transparent", border: "none", color: COLORS.blue, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>All</button>
                    <button onClick={() => deselectAllInGroup("emails")} style={{ padding: "2px 8px", background: "transparent", border: "none", color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>None</button>
                  </div>
                </div>
                {messagingSuite.emails.map(email => (
                  <div key={email.id} onClick={() => toggleSelection(email.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: saveSelections[email.id] ? COLORS.blue + "08" : "transparent", border: `1px solid ${saveSelections[email.id] ? COLORS.blue + "22" : COLORS.border}`, borderRadius: 6, marginBottom: 4, cursor: "pointer" }}>
                    <CheckBox checked={saveSelections[email.id]} accentColor={COLORS.blue} onChange={() => {}} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: saveSelections[email.id] ? COLORS.text : COLORS.textDim }}>{email.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{email.subject}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* LinkedIn */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>💼</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.warn, letterSpacing: "0.06em", fontWeight: 600 }}>LINKEDIN</span>
                    <span style={{ fontSize: 10, color: COLORS.textDim }}>({getSelectedCount("linkedin")}/{messagingSuite.linkedin.length})</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => selectAllInGroup("linkedin")} style={{ padding: "2px 8px", background: "transparent", border: "none", color: COLORS.warn, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>All</button>
                    <button onClick={() => deselectAllInGroup("linkedin")} style={{ padding: "2px 8px", background: "transparent", border: "none", color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>None</button>
                  </div>
                </div>
                {messagingSuite.linkedin.map(msg => (
                  <div key={msg.id} onClick={() => toggleSelection(msg.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: saveSelections[msg.id] ? COLORS.warn + "08" : "transparent", border: `1px solid ${saveSelections[msg.id] ? COLORS.warn + "22" : COLORS.border}`, borderRadius: 6, marginBottom: 4, cursor: "pointer" }}>
                    <CheckBox checked={saveSelections[msg.id]} accentColor={COLORS.warn} onChange={() => {}} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: saveSelections[msg.id] ? COLORS.text : COLORS.textDim }}>{msg.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.body}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subject Lines */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12 }}>✉️</span>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: "#7B61FF", letterSpacing: "0.06em", fontWeight: 600 }}>SUBJECT LINES</span>
                    <span style={{ fontSize: 10, color: COLORS.textDim }}>({getSelectedCount("subjects")}/{messagingSuite.subjects.length})</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => selectAllInGroup("subjects")} style={{ padding: "2px 8px", background: "transparent", border: "none", color: "#7B61FF", fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>All</button>
                    <button onClick={() => deselectAllInGroup("subjects")} style={{ padding: "2px 8px", background: "transparent", border: "none", color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>None</button>
                  </div>
                </div>
                {messagingSuite.subjects.map((subj, i) => (
                  <div key={i} onClick={() => toggleSelection(`s${i}`)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px", background: saveSelections[`s${i}`] ? "#7B61FF08" : "transparent", border: `1px solid ${saveSelections[`s${i}`] ? "#7B61FF22" : COLORS.border}`, borderRadius: 6, marginBottom: 3, cursor: "pointer" }}>
                    <CheckBox checked={saveSelections[`s${i}`]} accentColor="#7B61FF" onChange={() => {}} />
                    <div style={{ fontSize: 12, color: saveSelections[`s${i}`] ? COLORS.text : COLORS.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subj}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: COLORS.textDim }}>
                {getSelectedCount("emails")} emails · {getSelectedCount("linkedin")} LinkedIn · {getSelectedCount("subjects")} subjects selected
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setShowSaveModal(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { setShowSaveModal(false); setView("list"); }} disabled={!playbookName.trim()} style={{
                  padding: "10px 24px", background: playbookName.trim() ? COLORS.accent : COLORS.border,
                  color: playbookName.trim() ? COLORS.bg : COLORS.textDim,
                  border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
                  cursor: playbookName.trim() ? "pointer" : "default",
                }}>Save Playbook</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Left — Chat */}
      <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${COLORS.border}` }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setView("list")} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>←</button>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>AI Copywriter</div>
              <div style={{ fontSize: 10, color: COLORS.textDim }}>{messagingSuite ? "Revise mode — click ✏️ on any piece" : `Step ${Math.min(workshopStep + 1, AGENT_QUESTIONS.length)} of ${AGENT_QUESTIONS.length}`}</div>
            </div>
          </div>
          <div style={{ width: 100, height: 4, borderRadius: 2, background: COLORS.surface }}>
            <div style={{ width: `${messagingSuite ? 100 : Math.min((workshopStep + 1) / AGENT_QUESTIONS.length * 100, 100)}%`, height: "100%", borderRadius: 2, background: COLORS.accent, transition: "width 0.3s" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "85%", padding: "10px 14px", borderRadius: 12,
                background: msg.role === "user" ? COLORS.accent + "20" : COLORS.surface,
                border: `1px solid ${msg.role === "user" ? COLORS.accent + "33" : COLORS.border}`,
                borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                borderBottomLeftRadius: msg.role === "agent" ? 4 : 12,
              }}>
                {msg.role === "agent" && <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>AI COPYWRITER</div>}
                <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{msg.text}</div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderBottomLeftRadius: 4 }}>
                <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>AI COPYWRITER</div>
                <ProgressDots active={true} />
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
          <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isTyping) sendMessage(); }} placeholder={messagingSuite ? "Ask for revisions..." : "Type your answer..."} style={{ ...inputStyle, flex: 1 }} disabled={isTyping} />
          <button onClick={sendMessage} disabled={isTyping || !userInput.trim()} style={{
            padding: "10px 18px", background: userInput.trim() && !isTyping ? COLORS.accent : COLORS.border,
            color: userInput.trim() && !isTyping ? COLORS.bg : COLORS.textDim,
            border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
            cursor: userInput.trim() && !isTyping ? "pointer" : "default",
          }}>Send</button>
        </div>
      </div>

      {/* Right — Messaging Preview */}
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {!messagingSuite ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 360 }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>📝</div>
              <div style={{ fontFamily: FONT, fontSize: 15, color: COLORS.textDim, marginBottom: 8 }}>Your messaging suite will appear here</div>
              <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>Answer the questions on the left and the AI will generate your complete cold email sequence, LinkedIn messages, and subject lines.</div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>Messaging <span style={{ color: COLORS.accent }}>Suite</span></h3>
                <div style={{ fontSize: 12, color: COLORS.textDim, marginTop: 2 }}>{messagingSuite.emails.length} emails · {messagingSuite.linkedin.length} LinkedIn · {messagingSuite.subjects.length} subject lines</div>
              </div>
              <button onClick={openSaveModal} style={{ padding: "8px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Save Playbook</button>
            </div>

            {/* Emails */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>📧</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.blue, letterSpacing: "0.08em", fontWeight: 600 }}>COLD EMAIL SEQUENCE</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {messagingSuite.emails.map(email => (
                  <div key={email.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.blue }}>{email.label}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => requestRevise(email)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textMuted, fontFamily: FONT, fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.blue; e.currentTarget.style.color = COLORS.blue; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
                        >✏️ Revise</button>
                        <button onClick={() => navigator.clipboard?.writeText(`Subject: ${email.subject}\n\n${email.body}`)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>Copy</button>
                      </div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 3 }}>SUBJECT</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.accent }}>{email.subject}</div>
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 3 }}>BODY</div>
                      <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-line", padding: "10px 14px", background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>{email.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LinkedIn */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>💼</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.warn, letterSpacing: "0.08em", fontWeight: 600 }}>LINKEDIN MESSAGES</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {messagingSuite.linkedin.map(msg => (
                  <div key={msg.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.warn }}>{msg.label}</span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => requestRevise(msg)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textMuted, fontFamily: FONT, fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.warn; e.currentTarget.style.color = COLORS.warn; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
                        >✏️ Revise</button>
                        <button onClick={() => navigator.clipboard?.writeText(msg.body)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>Copy</button>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-line", padding: "10px 14px", background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>{msg.body}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subject Lines */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 14 }}>✉️</span>
                <span style={{ fontFamily: FONT, fontSize: 10, color: "#7B61FF", letterSpacing: "0.08em", fontWeight: 600 }}>SUBJECT LINES ({messagingSuite.subjects.length})</span>
              </div>
              <div style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {messagingSuite.subjects.map((subj, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 12px", background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <span style={{ fontFamily: FONT, fontSize: 10, color: "#7B61FF", fontWeight: 600, flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                        <span style={{ fontSize: 12, color: COLORS.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subj}</span>
                      </div>
                      <button onClick={() => navigator.clipboard?.writeText(subj)} style={{ padding: "2px 8px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>Copy</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function AddLeadsModal({ campaign, onClose, accentColor, availableLists = [] }) {
  const [selectedList, setSelectedList] = useState(null);
  const [loadedLists, setLoadedLists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function loadLists() {
      try {
        const lists = await api.leadLists.list();
        setLoadedLists(lists.map(list => ({
          id: list.id,
          name: list.name,
          contacts: (list.contacts || []).length,
          date: new Date(list.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        })));
      } catch (err) {
        console.error("Failed to load lists:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLists();
  }, []);
  
  const MOCK_LISTS = [
    { id: "l1", name: "Q1 SaaS VP Growth — North America", contacts: 13, date: "Feb 11, 2026" },
    { id: "l2", name: "Q4 FinTech CROs — EMEA", contacts: 3, date: "Feb 6, 2026" },
    { id: "l3", name: "Series A SaaS — US West Coast", contacts: 2, date: "Jan 30, 2026" },
  ];
  
  const lists = loadedLists.length > 0 ? loadedLists : MOCK_LISTS;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 500, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Add Leads to Campaign</div>
            <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{campaign.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ padding: "16px 24px" }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>SELECT LEAD LIST</div>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center", color: COLORS.textMuted }}>Loading lists...</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {lists.map(list => (
                <div key={list.id} onClick={() => setSelectedList(list.id)} style={{
                  padding: "12px 16px", borderRadius: 8, cursor: "pointer",
                  background: selectedList === list.id ? (accentColor || COLORS.accent) + "15" : COLORS.surface,
                  border: `1px solid ${selectedList === list.id ? (accentColor || COLORS.accent) + "44" : COLORS.border}`,
                  transition: "all 0.15s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{list.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>{list.contacts} contacts · {list.date}</div>
                    </div>
                    <div style={{
                      width: 18, height: 18, borderRadius: "50%",
                      border: `2px solid ${selectedList === list.id ? (accentColor || COLORS.accent) : COLORS.borderActive}`,
                      background: selectedList === list.id ? (accentColor || COLORS.accent) : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.bg, fontWeight: 700,
                    }}>{selectedList === list.id && "✓"}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={onClose} disabled={!selectedList} style={{
            padding: "10px 24px", background: selectedList ? (accentColor || COLORS.accent) : COLORS.border,
            color: selectedList ? COLORS.bg : COLORS.textDim,
            border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: selectedList ? "pointer" : "default",
          }}>Add {selectedList ? lists.find(l => l.id === selectedList)?.contacts : 0} Leads →</button>
        </div>
      </div>
    </div>
  );
}

function ColdEmailCampaignsView({ setActivePage }) {
  const [view, setView] = useState("list");
  const [addLeadsCampaign, setAddLeadsCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "", senderAccounts: [], subjects: [{ id: 1, value: "", mode: "manual" }], bodies: [{ id: 1, value: "", mode: "manual" }],
    followups: [{ id: 1, delay: 1, subjectLine: false, bodies: [{ id: 1, value: "", mode: "manual" }] }, { id: 2, delay: 2, subjectLine: false, bodies: [{ id: 1, value: "", mode: "manual" }] }],
    dailyLimit: 50, startDate: "", endDate: "", openTracking: true, timezone: "Europe/London", sendStart: "09:00", sendEnd: "17:00", sendDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  });
  const [MOCK_CAMPAIGNS, setEmailCampaigns] = useState([]);
  const [senderAccounts, setSenderAccounts] = useState([]);

  useEffect(() => {
    const STATUS_MAP = { 0: 'draft', 1: 'active', 2: 'paused', 3: 'completed' };
    api.instantly.campaigns.list().then(data => {
      // Instantly v2 returns { items: [...], next_starting_after: "..." }
      const items = Array.isArray(data) ? data : data.items || data.data || data.campaigns || [];
      const campIds = items.map(c => c.id).filter(Boolean);
      setEmailCampaigns(items.map(c => ({
        id: c.id,
        name: c.name || `Campaign ${c.id?.slice(0, 8)}`,
        status: STATUS_MAP[c.status] || (typeof c.status === 'string' ? c.status.toLowerCase() : 'draft'),
        leads: c.leads_count ?? 0,
        sent: 0, opened: 0, replied: 0, bounced: 0,
        dailyLimit: c.daily_limit || 50,
        startDate: c.campaign_schedule?.start_date || '',
      })));
      if (campIds.length) {
        // Fetch analytics for all campaigns (pass ids array for multiple, id for single)
        const analyticsParam = campIds.length === 1 ? { id: campIds[0] } : { ids: campIds };
        api.instantly.analytics(analyticsParam).then(analytics => {
          const arr = Array.isArray(analytics) ? analytics : [];
          setEmailCampaigns(prev => prev.map(camp => {
            const a = arr.find(x => x.campaign_id === camp.id);
            if (!a) return camp;
            return { ...camp, leads: a.leads_count ?? camp.leads, sent: a.emails_sent_count ?? 0, opened: a.open_count_unique ?? 0, replied: a.reply_count_unique ?? 0, bounced: a.bounced_count ?? 0 };
          }));
        }).catch(() => {});
      }
    }).catch(() => {
      api.campaigns.list().then(data => {
        const camps = (Array.isArray(data) ? data : data.campaigns || []).filter(c => c.channel === 'email' || !c.channel);
        setEmailCampaigns(camps.map(c => ({ ...c, leads: c.lead_count || c.leads || 0, sent: c.sent_count || c.sent || 0, opened: c.opened_count || c.opened || 0, replied: c.replied_count || c.replied || 0, bounced: c.bounced_count || c.bounced || 0, dailyLimit: c.daily_limit || c.dailyLimit || 50, startDate: c.start_date || c.startDate || '' })));
      }).catch(() => {});
    });

    api.instantly.accounts().then(data => {
      // Instantly v2 returns { items: [...] }
      const items = Array.isArray(data) ? data : data.items || data.data || data.accounts || [];
      setSenderAccounts(items.map(a => ({ email: a.email, status: a.status === 1 || a.status === 'active' ? 'active' : 'inactive' })));
    }).catch(() => {});
  }, []);
  const MOCK_SENDERS = senderAccounts.length > 0 ? senderAccounts : [
    { email: "andrew@dunnco.co.uk", status: "inactive" }, { email: "andrewdunn@gbiw.co.uk", status: "active" },
    { email: "adunn@gbiw.co.uk", status: "active" }, { email: "andrew@gbiw.co.uk", status: "active" }, { email: "a.dunn@outreach.io", status: "active" },
  ];
  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 };
  const selectStyle = { ...inputStyle, appearance: "none", cursor: "pointer", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%237a7a8e' stroke-width='1.5' fill='none'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };
  const sectionStyle = { padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 16 };
  const sectionTitle = { fontFamily: FONT_BODY, fontSize: 16, fontWeight: 600, marginBottom: 16 };
  const toggleSender = (email) => setCampaignForm(p => ({ ...p, senderAccounts: p.senderAccounts.includes(email) ? p.senderAccounts.filter(e => e !== email) : [...p.senderAccounts, email] }));
  const toggleDay = (day) => setCampaignForm(p => ({ ...p, sendDays: p.sendDays.includes(day) ? p.sendDays.filter(d => d !== day) : [...p.sendDays, day] }));

  const addLeadsBtn = (c) => (
    <button onClick={() => setAddLeadsCampaign(c)} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
    >+ Add Leads</button>
  );

  if (view === "list") {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        {addLeadsCampaign && <AddLeadsModal campaign={addLeadsCampaign} onClose={() => setAddLeadsCampaign(null)} accentColor={COLORS.accent} />}
        <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Cold Email <span style={{ color: COLORS.accent }}>Campaigns</span></h2>
            <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Manage your Instantly.ai campaigns</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setActivePage && setActivePage("settings")} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", color: COLORS.textMuted }}>🔑 Connect Accounts</button>
            <button onClick={() => setView("create")} style={{ padding: "12px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ CREATE CAMPAIGN</button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
          <StatCard label="Active Campaigns" value={MOCK_CAMPAIGNS.filter(c => c.status === "active").length} accent={COLORS.accent} />
          <StatCard label="Total Sent" value={MOCK_CAMPAIGNS.reduce((s, c) => s + c.sent, 0)} accent={COLORS.blue} />
          <StatCard label="Avg Open Rate" value={`${Math.round(MOCK_CAMPAIGNS.filter(c=>c.sent>0).reduce((s,c)=>s+(c.opened/c.sent)*100,0)/Math.max(MOCK_CAMPAIGNS.filter(c=>c.sent>0).length,1))}%`} accent={COLORS.accent} />
          <StatCard label="Avg Reply Rate" value={`${Math.round(MOCK_CAMPAIGNS.filter(c=>c.sent>0).reduce((s,c)=>s+(c.replied/c.sent)*100,0)/Math.max(MOCK_CAMPAIGNS.filter(c=>c.sent>0).length,1))}%`} accent={COLORS.warn} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {MOCK_CAMPAIGNS.map(c => (
            <div key={c.id} style={{ padding: "18px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 2 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>{c.leads} leads · Daily limit: {c.dailyLimit}{c.startDate ? ` · Started ${c.startDate}` : ""}</div>
              </div>
              <div style={{ flex: 2, display: "flex", gap: 20, justifyContent: "center" }}>
                {[{ label: "Sent", value: c.sent, color: COLORS.text }, { label: "Opened", value: c.opened, color: COLORS.blue }, { label: "Replied", value: c.replied, color: COLORS.accent }, { label: "Bounced", value: c.bounced, color: COLORS.danger }].map(stat => (
                  <div key={stat.label} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", marginTop: 2 }}>{stat.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {addLeadsBtn(c)}
                <span style={{ padding: "4px 12px", borderRadius: 20, fontFamily: FONT, fontSize: 11, fontWeight: 500, background: c.status === "active" ? COLORS.accentBg : c.status === "paused" ? COLORS.warnBg : COLORS.blueBg, color: c.status === "active" ? COLORS.accent : c.status === "paused" ? COLORS.warn : COLORS.blue, border: `1px solid ${c.status === "active" ? COLORS.accent+"33" : c.status === "paused" ? COLORS.warn+"33" : COLORS.blue+"33"}` }}>{c.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // CREATE CAMPAIGN FORM
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setView("list")} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, cursor: "pointer" }}>← Back</button>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Create New <span style={{ color: COLORS.accent }}>Campaign</span></h2>
        </div>
        <div style={{ display: "flex", gap: 6, fontSize: 11, fontFamily: FONT }}>
          <span style={{ color: COLORS.danger }}>●</span><span style={{ color: COLORS.textDim }}>Required</span>
          <span style={{ color: COLORS.textDim, marginLeft: 8 }}>●</span><span style={{ color: COLORS.textDim }}>Optional</span>
        </div>
      </div>
      {/* Campaign Basics */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Campaign Basics</div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}><span style={{ color: COLORS.danger }}>●</span> CAMPAIGN NAME</label>
            <input value={campaignForm.name} onChange={e => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="My Cold Email Campaign" style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}><span style={{ color: COLORS.danger }}>●</span> SENDER EMAIL ACCOUNTS</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 140, overflow: "auto" }}>
              {MOCK_SENDERS.map(sender => (
                <div key={sender.email} onClick={() => toggleSender(sender.email)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, cursor: "pointer", background: campaignForm.senderAccounts.includes(sender.email) ? COLORS.accentBg : "transparent" }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${campaignForm.senderAccounts.includes(sender.email) ? COLORS.accent : COLORS.borderActive}`, background: campaignForm.senderAccounts.includes(sender.email) ? COLORS.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: COLORS.bg, fontWeight: 700, flexShrink: 0 }}>{campaignForm.senderAccounts.includes(sender.email) && "✓"}</div>
                  <span style={{ fontSize: 12, color: COLORS.text, fontFamily: FONT }}>{sender.email}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 10, background: sender.status === "active" ? COLORS.accentBg : COLORS.dangerBg, color: sender.status === "active" ? COLORS.accent : COLORS.danger, fontFamily: FONT, fontWeight: 500 }}>{sender.status}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setActivePage && setActivePage("settings")} style={{ marginTop: 8, padding: "6px 12px", background: COLORS.accent + "12", color: COLORS.accent, border: `1px solid ${COLORS.accent}33`, borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add More Accounts</button>
          </div>
        </div>
      </div>
      {/* Initial Email */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Initial Email</div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}><span style={{ color: COLORS.danger }}>●</span> SUBJECT LINES</label>
          {campaignForm.subjects.map((subj, i) => (
            <div key={subj.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT }}>Variant {i + 1}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 4, background: COLORS.blueBg, color: COLORS.blue, fontFamily: FONT, fontWeight: 500 }}>Manual Input</span>
              </div>
              <input value={subj.value} onChange={e => { const next = [...campaignForm.subjects]; next[i] = { ...subj, value: e.target.value }; setCampaignForm({ ...campaignForm, subjects: next }); }} placeholder="Enter subject line..." style={inputStyle} />
            </div>
          ))}
          <button onClick={() => setCampaignForm(p => ({ ...p, subjects: [...p.subjects, { id: Date.now(), value: "", mode: "manual" }] }))} style={{ padding: "8px 14px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Add Subject Variant</button>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 6, fontFamily: FONT }}>Use {"{{first_name}}"}, {"{{last_name}}"}, {"{{company_name}}"} for personalization. Multiple variants will be A/B tested.</div>
        </div>
        <div>
          <label style={labelStyle}><span style={{ color: COLORS.danger }}>●</span> BODY</label>
          {campaignForm.bodies.map((body, i) => (
            <div key={body.id} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT }}>Variant {i + 1}</span>
                <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 4, background: COLORS.blueBg, color: COLORS.blue, fontFamily: FONT, fontWeight: 500 }}>Manual Input</span>
              </div>
              <textarea value={body.value} onChange={e => { const next = [...campaignForm.bodies]; next[i] = { ...body, value: e.target.value }; setCampaignForm({ ...campaignForm, bodies: next }); }} placeholder="Write your email body..." rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>
          ))}
          <button onClick={() => setCampaignForm(p => ({ ...p, bodies: [...p.bodies, { id: Date.now(), value: "", mode: "manual" }] }))} style={{ padding: "8px 14px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Add Body Variant</button>
          <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 6, fontFamily: FONT }}>Use {"{{first_name}}"}, {"{{last_name}}"}, {"{{company_name}}"} for personalization.</div>
        </div>
      </div>
      {/* Follow-ups */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Follow-up Emails (Optional)</div>
        {campaignForm.followups.map((followup, fi) => (
          <div key={followup.id} style={{ padding: "16px 20px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Follow-up #{fi + 1}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>Delay (days):</span>
                  <input value={followup.delay} onChange={e => { const next = [...campaignForm.followups]; next[fi] = { ...followup, delay: parseInt(e.target.value) || 0 }; setCampaignForm({ ...campaignForm, followups: next }); }} type="number" min="1" style={{ ...inputStyle, width: 60, textAlign: "center", padding: "6px 8px" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: COLORS.textMuted }}>Subject Line:</span>
                  <div onClick={() => { const next = [...campaignForm.followups]; next[fi] = { ...followup, subjectLine: !followup.subjectLine }; setCampaignForm({ ...campaignForm, followups: next }); }} style={{ width: 36, height: 20, borderRadius: 10, cursor: "pointer", background: followup.subjectLine ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.2s" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: followup.subjectLine ? 18 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
              </div>
            </div>
            <label style={labelStyle}>BODY</label>
            {followup.bodies.map((body, bi) => (
              <div key={body.id} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT }}>Variant {bi + 1}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, padding: "2px 8px", borderRadius: 4, background: COLORS.blueBg, color: COLORS.blue, fontFamily: FONT, fontWeight: 500 }}>Manual</span>
                </div>
                <textarea value={body.value} onChange={e => { const next = [...campaignForm.followups]; const nextBodies = [...next[fi].bodies]; nextBodies[bi] = { ...body, value: e.target.value }; next[fi] = { ...next[fi], bodies: nextBodies }; setCampaignForm({ ...campaignForm, followups: next }); }} placeholder="Write follow-up body..." rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
              </div>
            ))}
            <button onClick={() => { const next = [...campaignForm.followups]; next[fi] = { ...next[fi], bodies: [...next[fi].bodies, { id: Date.now(), value: "", mode: "manual" }] }; setCampaignForm({ ...campaignForm, followups: next }); }} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textDim, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Add Body Variant</button>
          </div>
        ))}
        <button onClick={() => setCampaignForm(p => ({ ...p, followups: [...p.followups, { id: Date.now(), delay: p.followups.length + 1, subjectLine: false, bodies: [{ id: 1, value: "", mode: "manual" }] }] }))} style={{ width: "100%", padding: "12px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Add Follow-up Email</button>
      </div>
      {/* Settings */}
      <div style={sectionStyle}>
        <div style={sectionTitle}>Campaign Settings</div>
        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>DAILY LIMIT</label><input value={campaignForm.dailyLimit} onChange={e => setCampaignForm({ ...campaignForm, dailyLimit: e.target.value })} type="number" style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>START DATE</label><input value={campaignForm.startDate} onChange={e => setCampaignForm({ ...campaignForm, startDate: e.target.value })} type="date" style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>END DATE</label><input value={campaignForm.endDate} onChange={e => setCampaignForm({ ...campaignForm, endDate: e.target.value })} type="date" style={inputStyle} /></div>
        </div>
        <div onClick={() => setCampaignForm({ ...campaignForm, openTracking: !campaignForm.openTracking })} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", cursor: "pointer", marginBottom: 16 }}>
          <div style={{ width: 16, height: 16, borderRadius: 3, border: `2px solid ${campaignForm.openTracking ? COLORS.accent : COLORS.borderActive}`, background: campaignForm.openTracking ? COLORS.accent : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: COLORS.bg, fontWeight: 700 }}>{campaignForm.openTracking && "✓"}</div>
          <span style={{ fontSize: 13 }}>Enable Open Tracking</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Sending Schedule</div>
        <div style={{ marginBottom: 12 }}><label style={labelStyle}>TIMEZONE</label>
          <select value={campaignForm.timezone} onChange={e => setCampaignForm({ ...campaignForm, timezone: e.target.value })} style={selectStyle}>
            {["Europe/London", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "Asia/Dubai", "Asia/Singapore", "Australia/Sydney"].map(tz => (<option key={tz} value={tz} style={{ background: COLORS.surface, color: COLORS.text }}>{tz}</option>))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
          <div style={{ flex: 1 }}><label style={labelStyle}>START TIME</label><input value={campaignForm.sendStart} onChange={e => setCampaignForm({ ...campaignForm, sendStart: e.target.value })} type="time" style={inputStyle} /></div>
          <div style={{ flex: 1 }}><label style={labelStyle}>END TIME</label><input value={campaignForm.sendEnd} onChange={e => setCampaignForm({ ...campaignForm, sendEnd: e.target.value })} type="time" style={inputStyle} /></div>
        </div>
        <div><label style={labelStyle}>DAYS TO SEND</label>
          <div style={{ display: "flex", gap: 6 }}>
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => { const active = campaignForm.sendDays.includes(day); return (<button key={day} onClick={() => toggleDay(day)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, border: `1px solid ${active ? COLORS.accent+"55" : COLORS.border}`, background: active ? COLORS.accentBg : "transparent", color: active ? COLORS.accent : COLORS.textDim, cursor: "pointer", transition: "all 0.15s" }}>{day}</button>); })}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingBottom: 32 }}>
        <button onClick={() => setView("list")} style={{ padding: "12px 24px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        <button onClick={async () => {
          if (!campaignForm.name.trim()) { alert('Campaign name is required'); return; }
          try {
            const created = await api.campaigns.create({ campaign_name: campaignForm.name, platform: 'email' });
            setEmailCampaigns(prev => [{ id: created.id, name: created.name || created.campaign_name || campaignForm.name, status: created.status || 'draft', leads: 0, sent: 0, opened: 0, replied: 0, bounced: 0, dailyLimit: campaignForm.dailyLimit, startDate: campaignForm.startDate }, ...prev]);
            setView("list");
          } catch (err) {
            alert(err.message || 'Failed to create campaign');
          }
        }} style={{ padding: "12px 28px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Create Campaign</button>
      </div>
    </div>
  );
}

function LinkedInCampaignsView({ setActivePage }) {
  const [addLeadsCampaign, setAddLeadsCampaign] = useState(null);
  const [MOCK_CAMPAIGNS, setLiCampaigns] = useState([]);
  const [heyreachStats, setHeyreachStats] = useState(null);
  const [integrationStatus, setIntegrationStatus] = useState({});

  useEffect(() => {
    api.heyreach.campaigns.list().then(data => {
      const items = Array.isArray(data) ? data : data.items || data.campaigns || [];
      setLiCampaigns(items.map(c => ({
        id: c.id,
        name: c.name || c.campaignName || `Campaign ${c.id}`,
        status: (c.status || c.campaignStatus || '').toLowerCase() === 'active' ? 'active' : (c.status || 'paused').toLowerCase(),
        // HeyReach API: progressStats has lead counts; connection-level stats only available via GetOverallStats (aggregate)
        leads: c.progressStats?.totalUsers ?? c.leadCount ?? c.leads ?? 0,
        sent: c.progressStats?.totalUsersFinished ?? c.sentCount ?? c.sent ?? 0,
        accepted: c.acceptedCount ?? c.accepted ?? 0,
        replied: c.repliedCount ?? c.replied ?? 0,
        platform: 'HeyReach',
      })));
      const ids = items.map(c => c.id).filter(Boolean);
      if (ids.length) {
        api.heyreach.stats({ campaignIds: ids }).then(s => setHeyreachStats(s)).catch(() => {});
      }
    }).catch(() => {
      api.campaigns.list().then(data => {
        const camps = (Array.isArray(data) ? data : data.campaigns || []).filter(c => c.channel === 'linkedin');
        setLiCampaigns(camps.map(c => ({ ...c, leads: c.lead_count || c.leads || 0, sent: c.sent_count || c.sent || 0, accepted: c.accepted_count || c.accepted || 0, replied: c.replied_count || c.replied || 0, platform: c.platform || 'HeyReach' })));
      }).catch(() => {});
    });
  }, []);

  useEffect(() => {
    api.integrations.list().then(res => setIntegrationStatus(res.integrations || {})).catch(() => {});
  }, []);

  const accountConnected = !!integrationStatus.heyreach;

  const addLeadsBtn = (c) => (
    <button onClick={() => setAddLeadsCampaign(c)} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.blue; e.currentTarget.style.color = COLORS.blue; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
    >+ Add Leads</button>
  );

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      {addLeadsCampaign && <AddLeadsModal campaign={addLeadsCampaign} onClose={() => setAddLeadsCampaign(null)} accentColor={COLORS.blue} />}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>LinkedIn <span style={{ color: COLORS.blue }}>Campaigns</span></h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Manage your HeyReach & AimFox campaigns</p>
        </div>
        <button onClick={() => setActivePage && setActivePage("settings")} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", color: COLORS.textMuted }}>🔑 Connect Accounts</button>
      </div>
      <div style={{ padding: "12px 18px", background: COLORS.surface, border: `1px solid ${accountConnected ? COLORS.green + "33" : COLORS.warn + "33"}`, borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: accountConnected ? COLORS.green : COLORS.warn, boxShadow: `0 0 6px ${accountConnected ? COLORS.green : COLORS.warn}66` }} />
          <div>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: accountConnected ? COLORS.green : COLORS.warn }}>{accountConnected ? "LinkedIn Connected" : "Not Connected"}</div>
            <div style={{ fontSize: 10, color: COLORS.textDim }}>Connect HeyReach in Settings to run campaigns</div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatCard label="Active Campaigns" value={MOCK_CAMPAIGNS.filter(c => c.status === "active").length} accent={COLORS.blue} />
        <StatCard label="Connections Sent" value={heyreachStats?.overallStats?.connectionsSent ?? MOCK_CAMPAIGNS.reduce((s, c) => s + c.sent, 0)} accent={COLORS.blue} />
        <StatCard label="Acceptance Rate" value={`${Math.round((heyreachStats?.overallStats?.connectionAcceptanceRate ?? (MOCK_CAMPAIGNS.reduce((s,c)=>s+c.accepted,0)/Math.max(MOCK_CAMPAIGNS.reduce((s,c)=>s+c.sent,0),1)*100)))}%`} accent={COLORS.accent} />
        <StatCard label="Reply Rate" value={`${heyreachStats?.overallStats?.messageReplyRate ?? Math.round(MOCK_CAMPAIGNS.reduce((s,c)=>s+c.replied,0)/Math.max(MOCK_CAMPAIGNS.reduce((s,c)=>s+c.sent,0),1)*100)}%`} accent={COLORS.warn} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {MOCK_CAMPAIGNS.map(c => (
          <div key={c.id} style={{ padding: "18px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted }}>{c.leads} leads · {c.platform}</div>
            </div>
            <div style={{ flex: 2, display: "flex", gap: 20, justifyContent: "center" }}>
              {[{ label: "Sent", value: c.sent, color: COLORS.text }, { label: "Accepted", value: c.accepted, color: COLORS.blue }, { label: "Replied", value: c.replied, color: COLORS.accent }].map(stat => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, color: stat.color }}>{stat.value}</div>
                  <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", marginTop: 2 }}>{stat.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {addLeadsBtn(c)}
              <span style={{ padding: "4px 12px", borderRadius: 20, fontFamily: FONT, fontSize: 11, fontWeight: 500, background: c.status === "active" ? COLORS.blueBg : COLORS.warnBg, color: c.status === "active" ? COLORS.blue : COLORS.warn, border: `1px solid ${c.status === "active" ? COLORS.blue+"33" : COLORS.warn+"33"}` }}>{c.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




// Integration metadata: key, label, icon, desc, category, credential fields for the config modal

function IntegrationConfigModal({ intg, existingCredentials, onSave, onClose }) {
  const [form, setForm] = useState(existingCredentials);
  const [saving, setSaving] = useState(false);
  useEffect(() => setForm(existingCredentials), [intg?.key, existingCredentials]);
  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT_BODY, fontSize: 13, color: COLORS.text, fontWeight: 500, marginBottom: 6 };
  if (!intg || typeof intg !== "object") return null;
  const credentialFields = Array.isArray(intg.credentialFields) ? intg.credentialFields : [];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, maxWidth: 420, width: "90%", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 28 }}>{typeof intg.icon === "string" ? intg.icon : "⚙️"}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Configure {typeof intg.label === "string" ? intg.label : intg.key || "Integration"}</div>
            <div style={{ fontSize: 12, color: COLORS.textDim }}>{typeof intg.desc === "string" ? intg.desc : ""}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {credentialFields.map(f => (
            <div key={f.name}>
              <label style={labelStyle}>{f.label}</label>
              <input type={f.type || "text"} value={form[f.name] || ""} onChange={e => setForm({ ...form, [f.name]: e.target.value })} placeholder={f.placeholder || f.label} style={inputStyle} autoComplete="off" />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
          <button onClick={async () => { setSaving(true); await onSave(form); setSaving(false); }} disabled={saving} style={{ padding: "10px 24px", background: saving ? COLORS.border : COLORS.accent, color: saving ? COLORS.textDim : COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>{saving ? "Saving..." : "Save & Connect"}</button>
        </div>
      </div>
    </div>
  );
}

// orderType: lead_search = find leads, lead_enrichment = verify/enrich. costTier 1=cheapest, 5=most expensive
const INTEGRATIONS_META = [
  { key: "fathom", label: "Fathom", icon: "🎙️", desc: "AI meeting assistant — import call transcripts", category: "call_recording", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/fathom/connect" },
  { key: "fireflies", label: "Fireflies.ai", icon: "🔥", desc: "Meeting transcription & analysis", category: "call_recording", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/fireflies/connect" },
  { key: "zoom", label: "Zoom", icon: "📹", desc: "Import recordings & transcripts", category: "call_recording", credentialFields: [{ name: "client_id", label: "Client ID", type: "text" }, { name: "client_secret", label: "Client Secret", type: "password" }] },
  { key: "unipile", label: "Unipile", icon: "💼", desc: "LinkedIn campaigns & actions — execute outreach on LinkedIn (not used in lead enrichment waterfall)", category: "enrichment", orderTypes: [], credentialFields: [{ name: "account_id", label: "Account ID", type: "text" }, { name: "access_token", label: "Access Token", type: "password" }, { name: "dsn", label: "DSN", type: "text", placeholder: "e.g. api12.unipile.com:14291" }], connectEndpoint: "/unipile/connect" },
  { key: "instantly", label: "Instantly", icon: "📧", desc: "Cold email campaigns", category: "outreach", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "campaign_id", label: "Campaign ID", type: "text" }], connectEndpoint: "/instantly/connect" },
  { key: "smartlead", label: "SmartLead", icon: "📬", desc: "Cold email campaigns", category: "outreach", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "workspace_id", label: "Workspace ID", type: "text" }], connectEndpoint: "/smartlead/connect" },
  { key: "heyreach", label: "HeyReach", icon: "🤝", desc: "LinkedIn outreach automation", category: "outreach", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "campaign_id", label: "Campaign ID", type: "text" }], connectEndpoint: "/heyreach/connect" },
  { key: "aimfox", label: "AimFox", icon: "🦊", desc: "LinkedIn outreach automation", category: "outreach", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "campaign_id", label: "Campaign ID", type: "text" }], connectEndpoint: "/aimfox/connect" },
  { key: "icypeas", label: "IcyPeas", icon: "🧊", desc: "Find people & email search", category: "enrichment", orderTypes: ["lead_search", "lead_enrichment"], costLabel: "~$0.02/lead", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/icypeas/connect" },
  { key: "bettercontact", label: "BetterContact", icon: "✉️", desc: "Email verification & list cleaning", category: "enrichment", orderTypes: ["lead_enrichment"], costLabel: "~$0.01/verify", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/bettercontact/connect" },
  { key: "zerobounce", label: "ZeroBounce", icon: "🛡️", desc: "Email verification & validation", category: "enrichment", orderTypes: ["lead_enrichment"], costLabel: "~$0.008/verify", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/zerobounce/connect" },
  { key: "neverbounce", label: "NeverBounce", icon: "✉️", desc: "Email verification & deliverability", category: "enrichment", orderTypes: ["lead_enrichment"], costLabel: "~$0.008/verify", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/neverbounce/connect" },
  { key: "ai_ark", label: "AI Ark", icon: "🦅", desc: "B2B data enrichment — people & company lookup", category: "enrichment", orderTypes: ["lead_search", "lead_enrichment"], costLabel: "~$0.02/lead", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/ai-ark/connect" },
  { key: "findy", label: "Findy", icon: "🔍", desc: "Lead discovery & enrichment — FindyMail IntelliMatch + employee search", category: "enrichment", orderTypes: ["lead_search", "lead_enrichment"], costLabel: "~$0.03/lead", costTier: 2, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/findy/connect" },
  { key: "findymail", label: "FindyMail", icon: "✉️", desc: "Email finder & verification — find by name+domain, verify address (same key as Findy)", category: "enrichment", orderTypes: ["lead_enrichment"], costLabel: "~$0.01/lead", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/findy/connect" },
  { key: "cleanlist", label: "Cleanlist", icon: "🧹", desc: "List cleaning & verification", category: "enrichment", orderTypes: ["lead_enrichment"], costLabel: "~$0.012/verify", costTier: 2, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/cleanlist/connect" },
  { key: "wiza", label: "Wiza", icon: "📊", desc: "Sales intelligence & lead data", category: "enrichment", orderTypes: ["lead_search"], costLabel: "~$0.04/lead", costTier: 4, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/wiza/connect" },
  { key: "leadsmagix", label: "Leads Magix", icon: "✨", desc: "B2B lead generation platform", category: "enrichment", orderTypes: ["lead_search"], costLabel: "~$0.025/lead", costTier: 3, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "workspace_id", label: "Workspace ID", type: "text" }], connectEndpoint: "/leadsmagix/connect" },
  { key: "anthropic", label: "Anthropic", icon: "🧠", desc: "Claude — AI SDR & AI Council", category: "llm", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/anthropic/connect" },
  { key: "openai", label: "OpenAI", icon: "🤖", desc: "GPT — Chat completions & embeddings", category: "llm", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/openai/connect" },
  { key: "openrouter", label: "OpenRouter", icon: "🔀", desc: "Unified LLM gateway — access multiple models", category: "llm", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/openrouter/connect" },
  { key: "gemini", label: "Gemini", icon: "✨", desc: "Google Gemini — Multimodal AI", category: "llm", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/gemini/connect" },
  { key: "grok", label: "Grok", icon: "🪐", desc: "xAI Grok — Reasoning & chat", category: "llm", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/grok/connect" },
  { key: "calendly", label: "Calendly", icon: "📅", desc: "Scheduling & meetings", category: "calendar", credentialFields: [{ name: "client_id", label: "Client ID", type: "text" }, { name: "client_secret", label: "Client Secret", type: "password" }, { name: "webhook_signing_key", label: "Webhook Signing Key", type: "password" }], connectEndpoint: "/calendly/connect" },
  { key: "calcom", label: "Cal.com", icon: "📆", desc: "Open-source scheduling", category: "calendar", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }], connectEndpoint: "/calcom/connect" },
  { key: "google_calendar", label: "Google Calendar", icon: "📆", desc: "Google Calendar sync", category: "calendar", credentialFields: [{ name: "client_id", label: "Client ID", type: "text" }, { name: "client_secret", label: "Client Secret", type: "password" }], connectEndpoint: "/google-calendar/connect" },
];

const ENRICHMENT_INTEGRATIONS = INTEGRATIONS_META.filter(i => i.category === "enrichment");
const LEAD_SEARCH_KEYS = ENRICHMENT_INTEGRATIONS.filter(i => (i.orderTypes || []).includes("lead_search")).map(i => i.key);
const LEAD_ENRICHMENT_KEYS = ENRICHMENT_INTEGRATIONS.filter(i => (i.orderTypes || []).includes("lead_enrichment")).map(i => i.key);

function SettingsView() {
  const [activeTab, setActiveTab] = useState("brand_voice");
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [buyerPersonaAnswers, setBuyerPersonaAnswers] = useState({});
  const [buyerPersonaSubmitted, setBuyerPersonaSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState({});
  const [configModal, setConfigModal] = useState(null);
  const [leadSearchOrder, setLeadSearchOrder] = useState({ leadSearch: LEAD_SEARCH_KEYS, leadEnrichment: LEAD_ENRICHMENT_KEYS });
  const [leadOrderSaving, setLeadOrderSaving] = useState(false);
  const [integrationCosts, setIntegrationCosts] = useState({});
  const [brandVoiceSchema, setBrandVoiceSchema] = useState([]); // from Postgres form_schemas

  useEffect(() => {
    async function loadSettings() {
      try {
        const [brandRes, buyerRes, schemaRes] = await Promise.all([
          api.settings.get('brand_voice'),
          api.settings.get('buyer_persona').catch(() => ({ settings: null })),
          api.settings.getFormSchema('brand_voice').catch(() => ({ schema: [] })),
        ]);
        if (brandRes?.settings) {
          setAnswers(brandRes.settings);
          setSubmitted(true);
        }
        if (buyerRes?.settings) {
          setBuyerPersonaAnswers(buyerRes.settings);
          setBuyerPersonaSubmitted(true);
        }
        if (schemaRes?.schema?.length) {
          setBrandVoiceSchema(schemaRes.schema);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);
  
  async function loadIntegrationStatus() {
    try {
      const res = await api.integrations.list();
      setIntegrationStatus(res.integrations || {});
    } catch (err) {
      console.error("Failed to load integrations:", err);
    }
  }
  
  useEffect(() => {
    if (activeTab === "integrations") loadIntegrationStatus();
  }, [activeTab]);
  
  async function loadLeadSearchOrder() {
    try {
      const res = await api.integrations.getLeadSearchOrder();
      if (res.leadSearch?.length || res.leadEnrichment?.length) {
        setLeadSearchOrder({ leadSearch: res.leadSearch || LEAD_SEARCH_KEYS, leadEnrichment: res.leadEnrichment || LEAD_ENRICHMENT_KEYS });
      }
    } catch (err) {
      console.error("Failed to load lead search order:", err);
    }
  }
  
  useEffect(() => {
    if (activeTab === "lead_search_order") {
      loadIntegrationStatus();
      loadLeadSearchOrder();
      api.integrations.getCosts().then(r => setIntegrationCosts(r.costs || {})).catch(() => {});
    }
  }, [activeTab]);
  
  async function saveBrandVoice() {
    setSaving(true);
    try {
      await api.settings.save('brand_voice', answers);
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to save brand voice:", err);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const DEFAULT_BRAND_VOICE = [{ section: "About You", items: [{ key: "name", label: "What's your full name?", placeholder: "Andrew Dunn", type: "input" }] }];
  const brandVoiceQuestions = brandVoiceSchema?.length ? brandVoiceSchema : DEFAULT_BRAND_VOICE;

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT_BODY, fontSize: 13, color: COLORS.text, fontWeight: 500, marginBottom: 6 };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          <span style={{ color: COLORS.accent }}>Settings</span>
        </h2>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {[
          { key: "brand_voice", label: "🎯 Brand Voice" },
          { key: "buyer_persona", label: "👤 Buyer Persona" },
          { key: "integrations", label: "🔌 Integrations" },
          { key: "lead_search_order", label: "📋 Lead Search Order" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: activeTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            color: activeTab === tab.key ? COLORS.accent : COLORS.textMuted,
            fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Buyer Persona Tab */}
      {activeTab === "buyer_persona" && (
        <div>
          <p style={{ color: COLORS.textMuted, marginBottom: 20, fontSize: 13 }}>Define your ideal buyer's background, pain points, and decision-making process. This feeds into messaging personalisation, content targeting, and sales scripts.</p>
          {[
            { section: "Professional Background", items: [
              { key: "bp_title", label: "What is their typical job title?", placeholder: "e.g. VP of Sales, Head of Growth, CTO, Founder/CEO", type: "input" },
              { key: "bp_seniority", label: "What seniority level are they?", placeholder: "e.g. C-suite, VP/Director, Manager, Individual contributor", type: "input" },
              { key: "bp_industry", label: "What industry/industries do they work in?", placeholder: "e.g. B2B SaaS, FinTech, Professional Services, Healthcare Tech", type: "input" },
              { key: "bp_company_size", label: "What size company do they work at?", placeholder: "e.g. 50-500 employees, Series A-C, £5-50M revenue", type: "input" },
              { key: "bp_experience", label: "How many years of experience do they typically have?", placeholder: "e.g. 8-15 years in their field, 3-5 years in current role", type: "input" },
            ]},
            { section: "Day-to-Day Reality", items: [
              { key: "bp_responsibilities", label: "What are their core responsibilities?", placeholder: "e.g. Revenue targets, team management, pipeline generation, board reporting", type: "textarea" },
              { key: "bp_tools", label: "What tools do they use daily?", placeholder: "e.g. Salesforce, HubSpot, LinkedIn, Slack, spreadsheets for reporting", type: "textarea" },
              { key: "bp_reports_to", label: "Who do they report to and who reports to them?", placeholder: "e.g. Reports to CEO/CRO, manages team of 5-15 SDRs/AEs", type: "input" },
              { key: "bp_kpis", label: "What KPIs are they measured on?", placeholder: "e.g. Pipeline generated, meetings booked, revenue closed, CAC, conversion rates", type: "textarea" },
            ]},
            { section: "Pain Points & Frustrations", items: [
              { key: "bp_pain_primary", label: "What is their #1 pain point right now?", placeholder: "e.g. Outbound pipeline is drying up, reply rates below 2%, team spending too much time on manual prospecting", type: "textarea" },
              { key: "bp_pain_secondary", label: "What other frustrations do they deal with?", placeholder: "e.g. Too many tools, poor data quality, can't personalise at scale, expensive tech stack", type: "textarea" },
              { key: "bp_tried", label: "What have they already tried that didn't work?", placeholder: "e.g. Hired more SDRs, bought Clay/Apollo, outsourced to agencies, used generic email templates", type: "textarea" },
            ]},
            { section: "Decision Making", items: [
              { key: "bp_buying_triggers", label: "What triggers them to look for a solution?", placeholder: "e.g. Missed quarterly target, board pressure, competitor doing better, team burnout", type: "textarea" },
              { key: "bp_objections", label: "What are their common objections?", placeholder: "e.g. 'We've tried AI before', 'Budget is tight', 'Need to check with team', 'Timing isn't right'", type: "textarea" },
              { key: "bp_budget", label: "What's their typical budget authority?", placeholder: "e.g. Can approve up to £10K without sign-off, needs board approval above £50K", type: "input" },
              { key: "bp_timeline", label: "How quickly do they typically make decisions?", placeholder: "e.g. 2-4 weeks for <£10K, 2-3 months for larger investments", type: "input" },
            ]},
            { section: "Information & Trust", items: [
              { key: "bp_content", label: "Where do they consume content?", placeholder: "e.g. LinkedIn, industry podcasts, peer communities (Pavilion, SaaStr), newsletters", type: "textarea" },
              { key: "bp_trust", label: "What builds trust with them?", placeholder: "e.g. Case studies with specific numbers, peer recommendations, seeing the tool in action, ROI projections", type: "textarea" },
              { key: "bp_communication", label: "How do they prefer to be communicated with?", placeholder: "e.g. Direct and concise, data-driven, no fluff, respect their time, visual proof over written claims", type: "textarea" },
              { key: "bp_turnoff", label: "What turns them off immediately?", placeholder: "e.g. Generic outreach, pushy sales tactics, no social proof, overpromising, too much jargon", type: "textarea" },
            ]},
          ].map(section => (
            <div key={section.section} style={{ marginBottom: 28 }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.accent, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 3, height: 14, background: COLORS.accent, borderRadius: 2 }} />
                {section.section.toUpperCase()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {section.items.map(q => (
                  <div key={q.key}>
                    <label style={labelStyle}>{q.label}</label>
                    {q.type === "textarea" ? (
                      <textarea value={buyerPersonaAnswers[q.key] || ""} onChange={e => setBuyerPersonaAnswers({ ...buyerPersonaAnswers, [q.key]: e.target.value })} placeholder={q.placeholder} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                    ) : (
                      <input value={buyerPersonaAnswers[q.key] || ""} onChange={e => setBuyerPersonaAnswers({ ...buyerPersonaAnswers, [q.key]: e.target.value })} placeholder={q.placeholder} style={inputStyle} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={async () => {
            setSaving(true);
            try {
              await api.settings.save('buyer_persona', buyerPersonaAnswers);
              setBuyerPersonaSubmitted(true);
            } catch (err) {
              console.error("Failed to save buyer persona:", err);
              alert("Failed to save. Please try again.");
            } finally {
              setSaving(false);
            }
          }} disabled={saving} style={{ padding: "14px 28px", background: saving ? COLORS.border : COLORS.accent, color: saving ? COLORS.textDim : COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving..." : buyerPersonaSubmitted ? "✓ Buyer Persona Saved" : "Save Buyer Persona"}
          </button>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div>
          {configModal && (
            <IntegrationConfigModal
              intg={configModal}
              existingCredentials={configModal.existingCredentials || {}}
              onSave={async (credentials) => {
                try {
                  if (configModal.connectEndpoint) {
                    await api.integrations.connect(configModal.connectEndpoint, credentials);
                  } else {
                    await api.integrations.save(configModal.key, credentials);
                  }
                  await loadIntegrationStatus();
                  setConfigModal(null);
                } catch (err) {
                  console.error("Failed to save integration:", err);
                  alert(err.message || "Failed to save credentials. Please try again.");
                }
              }}
              onClose={() => setConfigModal(null)}
            />
          )}
          <p style={{ color: COLORS.textMuted, marginBottom: 20, fontSize: 13 }}>Connect your tools to power the platform. Call recording tools feed into content generation, outreach tools sync with campaigns.</p>

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>LLM</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {INTEGRATIONS_META.filter(i => i.category === "llm").map(intg => {
              const connected = !!integrationStatus[intg.key];
              return (
                <div key={intg.key} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{intg.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{intg.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim }}>{intg.desc}</div>
                    </div>
                  </div>
                  <button onClick={async () => { const data = await api.integrations.get(intg.key).catch(() => ({})); setConfigModal({ ...intg, existingCredentials: data.credentials_json || {} }); }} style={{
                    padding: "8px 18px", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: connected ? "transparent" : COLORS.accent,
                    color: connected ? COLORS.accent : COLORS.bg,
                    border: connected ? `1px solid ${COLORS.accent}44` : "none",
                  }}>{connected ? "Connected ✓" : "Connect"}</button>
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>CALL RECORDING</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {INTEGRATIONS_META.filter(i => i.category === "call_recording").map(intg => {
              const connected = !!integrationStatus[intg.key];
              return (
                <div key={intg.key} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{intg.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{intg.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim }}>{intg.desc}</div>
                    </div>
                  </div>
                  <button onClick={async () => { const data = await api.integrations.get(intg.key).catch(() => ({})); setConfigModal({ ...intg, existingCredentials: data.credentials_json || {} }); }} style={{
                    padding: "8px 18px", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: connected ? "transparent" : COLORS.accent,
                    color: connected ? COLORS.accent : COLORS.bg,
                    border: connected ? `1px solid ${COLORS.accent}44` : "none",
                  }}>{connected ? "Connected ✓" : "Connect"}</button>
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>OUTREACH & CAMPAIGNS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {INTEGRATIONS_META.filter(i => i.category === "outreach").map(intg => {
              const connected = !!integrationStatus[intg.key];
              return (
                <div key={intg.key} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{intg.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{intg.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim }}>{intg.desc}</div>
                    </div>
                  </div>
                  <button onClick={async () => { const data = await api.integrations.get(intg.key).catch(() => ({})); setConfigModal({ ...intg, existingCredentials: data.credentials_json || {} }); }} style={{
                    padding: "8px 18px", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: connected ? "transparent" : COLORS.accent,
                    color: connected ? COLORS.accent : COLORS.bg,
                    border: connected ? `1px solid ${COLORS.accent}44` : "none",
                  }}>{connected ? "Connected ✓" : "Connect"}</button>
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>ENRICHMENT & LEAD DATA</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {INTEGRATIONS_META.filter(i => i.category === "enrichment").map(intg => {
              const connected = !!integrationStatus[intg.key];
              return (
                <div key={intg.key} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{intg.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{intg.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim }}>{intg.desc}</div>
                    </div>
                  </div>
                  <button onClick={async () => { const data = await api.integrations.get(intg.key).catch(() => ({})); setConfigModal({ ...intg, existingCredentials: data.credentials_json || {} }); }} style={{
                    padding: "8px 18px", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    background: connected ? "transparent" : COLORS.accent,
                    color: connected ? COLORS.accent : COLORS.bg,
                    border: connected ? `1px solid ${COLORS.accent}44` : "none",
                  }}>{connected ? "Connected ✓" : "Connect"}</button>
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>CALENDAR</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {INTEGRATIONS_META.filter(i => i.category === "calendar").map(intg => {
              const status = integrationStatus[intg.key];
              const connected = typeof status === "object" ? !!status?.connected : !!status;
              const signedIn = typeof status === "object" ? status?.signedIn : connected;
              const isGoogle = intg.key === "google_calendar";
              const showSignIn = isGoogle && connected && !signedIn;
              return (
                <div key={intg.key} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{intg.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{intg.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim }}>{intg.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {showSignIn && (
                      <button onClick={async () => { try { const { redirectUrl } = await api.integrations.getGoogleCalendarAuthUrl(); if (redirectUrl) window.location.href = redirectUrl; } catch (e) { alert(e.message || "Failed to get Google sign-in URL"); } }} style={{ padding: "8px 16px", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "#4285F4", color: "#fff", border: "none" }}>Sign in with Google</button>
                    )}
                    <button onClick={async () => { const data = await api.integrations.get(intg.key).catch(() => ({})); setConfigModal({ ...intg, existingCredentials: data.credentials_json || {} }); }} style={{
                      padding: "8px 18px", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer",
                      background: (connected && (isGoogle ? signedIn : true)) ? "transparent" : COLORS.accent,
                      color: (connected && (isGoogle ? signedIn : true)) ? COLORS.accent : COLORS.bg,
                      border: (connected && (isGoogle ? signedIn : true)) ? `1px solid ${COLORS.accent}44` : "none",
                    }}>{(connected && (isGoogle ? signedIn : true)) ? "Connected ✓" : connected && showSignIn ? "Configure" : "Connect"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lead Search Order Tab */}
      {activeTab === "lead_search_order" && (
        <div>
          <p style={{ color: COLORS.textMuted, marginBottom: 20, fontSize: 13 }}>Order your connected enrichment services. The first service in each list is used first; others are fallbacks. Put cheaper services first — expensive ones are best as last fallbacks.</p>
          
          {(() => {
            const connectedKeys = Object.keys(integrationStatus).filter(k => integrationStatus[k]);
            const metaByKey = Object.fromEntries(ENRICHMENT_INTEGRATIONS.map(i => [i.key, i]));
            const mergeWithConnected = (savedOrder, keysForType) => {
              const inOrder = savedOrder.filter(k => connectedKeys.includes(k) && keysForType.includes(k));
              const newConnected = keysForType.filter(k => connectedKeys.includes(k) && !inOrder.includes(k));
              return [...inOrder, ...newConnected];
            };
            const leadSearchList = mergeWithConnected(leadSearchOrder.leadSearch, LEAD_SEARCH_KEYS);
            const leadEnrichList = mergeWithConnected(leadSearchOrder.leadEnrichment, LEAD_ENRICHMENT_KEYS);
            const moveInList = (list, fromIdx, direction) => {
              const arr = [...list];
              const toIdx = fromIdx + direction;
              if (toIdx < 0 || toIdx >= arr.length) return arr;
              [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
              return arr;
            };
            const setLeadSearch = (arr) => setLeadSearchOrder(o => ({ ...o, leadSearch: arr }));
            const setLeadEnrich = (arr) => setLeadSearchOrder(o => ({ ...o, leadEnrichment: arr }));
            const getCost = (key) => integrationCosts[key] || { cost_label: metaByKey[key]?.costLabel, cost_tier: metaByKey[key]?.costTier || 1 };
            const costBadge = (costLabel, costTier) => costLabel ? (
              <span style={{ padding: "4px 10px", borderRadius: 6, background: costTier >= 4 ? "rgba(255,100,100,0.15)" : costTier >= 3 ? "rgba(255,180,80,0.15)" : "rgba(100,200,100,0.15)", color: costTier >= 4 ? "#ff6b6b" : costTier >= 3 ? "#e6a23c" : "#67c23a", fontFamily: FONT, fontSize: 11, fontWeight: 600 }}>{costLabel}</span>
            ) : null;
            return (
              <>
                <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>LEAD SEARCH (find leads — first is primary, others fallback)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                  {leadSearchList.length === 0 ? (
                    <div style={{ padding: 16, background: COLORS.surface, border: `1px dashed ${COLORS.border}`, borderRadius: 10, color: COLORS.textDim, fontSize: 13 }}>No lead search integrations connected. Connect IcyPeas, Findy, Wiza, or Leads Magix in Integrations.</div>
                  ) : leadSearchList.map((key, idx) => {
                    const meta = metaByKey[key];
                    if (!meta) return null;
                    return (
                      <div key={key} style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{meta.icon}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{meta.label} <span style={{ color: COLORS.textDim, fontWeight: 400, fontSize: 11 }}>— {idx === 0 ? "Primary" : `Fallback ${idx}`}</span></div>
                            <div style={{ fontSize: 11, color: COLORS.textDim }}>{meta.desc}</div>
                          </div>
                          {costBadge(getCost(key).cost_label, getCost(key).cost_tier)}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setLeadSearch(moveInList(leadSearchList, idx, -1))} disabled={idx === 0} style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.5 : 1 }}>↑</button>
                          <button onClick={() => setLeadSearch(moveInList(leadSearchList, idx, 1))} disabled={idx === leadSearchList.length - 1} style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, cursor: idx === leadSearchList.length - 1 ? "not-allowed" : "pointer", opacity: idx === leadSearchList.length - 1 ? 0.5 : 1 }}>↓</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 10 }}>LEAD ENRICHMENT (verify & enrich — first is primary, others fallback)</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                  {leadEnrichList.length === 0 ? (
                    <div style={{ padding: 16, background: COLORS.surface, border: `1px dashed ${COLORS.border}`, borderRadius: 10, color: COLORS.textDim, fontSize: 13 }}>No lead enrichment integrations connected. Connect BetterContact, ZeroBounce, Unipile, Cleanlist, or IcyPeas in Integrations.</div>
                  ) : leadEnrichList.map((key, idx) => {
                    const meta = metaByKey[key];
                    if (!meta) return null;
                    return (
                      <div key={key} style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 18 }}>{meta.icon}</span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{meta.label} <span style={{ color: COLORS.textDim, fontWeight: 400, fontSize: 11 }}>— {idx === 0 ? "Primary" : `Fallback ${idx}`}</span></div>
                            <div style={{ fontSize: 11, color: COLORS.textDim }}>{meta.desc}</div>
                          </div>
                          {costBadge(getCost(key).cost_label, getCost(key).cost_tier)}
                        </div>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => setLeadEnrich(moveInList(leadEnrichList, idx, -1))} disabled={idx === 0} style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, cursor: idx === 0 ? "not-allowed" : "pointer", opacity: idx === 0 ? 0.5 : 1 }}>↑</button>
                          <button onClick={() => setLeadEnrich(moveInList(leadEnrichList, idx, 1))} disabled={idx === leadEnrichList.length - 1} style={{ padding: "6px 10px", borderRadius: 6, background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, cursor: idx === leadEnrichList.length - 1 ? "not-allowed" : "pointer", opacity: idx === leadEnrichList.length - 1 ? 0.5 : 1 }}>↓</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <button onClick={async () => {
                  setLeadOrderSaving(true);
                  try {
                    await api.integrations.saveLeadSearchOrder({ leadSearch: leadSearchList, leadEnrichment: leadEnrichList });
                    setLeadSearchOrder({ leadSearch: leadSearchList, leadEnrichment: leadEnrichList });
                  } catch (err) {
                    console.error("Failed to save order:", err);
                    alert("Failed to save. Please try again.");
                  } finally {
                    setLeadOrderSaving(false);
                  }
                }} disabled={leadOrderSaving} style={{ padding: "12px 28px", background: leadOrderSaving ? COLORS.border : COLORS.accent, color: leadOrderSaving ? COLORS.textDim : COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: leadOrderSaving ? "not-allowed" : "pointer" }}>
                  {leadOrderSaving ? "Saving..." : "Save Order"}
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Brand Voice Tab */}
      {activeTab === "brand_voice" && !submitted && (
        <div>
          <p style={{ color: COLORS.textMuted, marginBottom: 24, fontSize: 13 }}>Answer these questions once to train the AI on your persona, tone, and style. This feeds into all content generation across the platform.</p>
          {brandVoiceQuestions.map(section => (
            <div key={section.section} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.accent, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12, padding: "8px 16px", background: COLORS.accentBg, borderRadius: 6, display: "inline-block" }}>{section.section.toUpperCase()}</div>
              <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
                {section.items.map((q, i) => (
                  <div key={q.key} style={{ marginBottom: i < section.items.length - 1 ? 18 : 0 }}>
                    <label style={labelStyle}>{q.label}</label>
                    {q.type === "input" ? (
                      <input value={answers[q.key] || ""} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder={q.placeholder} style={inputStyle} />
                    ) : (
                      <textarea value={answers[q.key] || ""} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder={q.placeholder} rows={q.type === "textarea_lg" ? 6 : 3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingBottom: 32 }}>
            <button onClick={saveBrandVoice} disabled={saving} style={{ padding: "14px 32px", background: saving ? COLORS.border : COLORS.accent, color: saving ? COLORS.textDim : COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
              {saving ? "Saving..." : "Save Brand Voice →"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "brand_voice" && submitted && (
        <div>
          <div style={{ padding: "20px 24px", background: COLORS.accent + "08", border: `1px solid ${COLORS.accent}22`, borderRadius: 12, marginBottom: 20, display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 28 }}>✅</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Brand Voice Active</div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>Your persona is being used across LinkedIn Content, Community Monitor, and Video Scripts.</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <StatCard label="Questions Answered" value={`${Object.values(answers).filter(v => v && v.trim()).length}/${brandVoiceQuestions.reduce((s, sec) => s + sec.items.length, 0)}`} accent={COLORS.accent} />
            <StatCard label="Profile Strength" value={Object.values(answers).filter(v => v && v.trim()).length >= 15 ? "Strong" : "Good"} accent={COLORS.accent} />
            <StatCard label="Active Modules" value="3" accent={COLORS.blue} />
          </div>
          {brandVoiceQuestions.map(section => (
            <div key={section.section} style={{ marginBottom: 16 }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 8 }}>{section.section.toUpperCase()}</div>
              <div style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                {section.items.map((q, qi) => (
                  <div key={q.key} style={{ marginBottom: qi < section.items.length - 1 ? 12 : 0 }}>
                    <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 2 }}>{q.label}</div>
                    <div style={{ fontSize: 13, color: answers[q.key] ? COLORS.text : COLORS.textDim }}>{answers[q.key] || "\u2014"}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={() => setSubmitted(false)} style={{ padding: "12px 24px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 32 }}>Edit Brand Voice</button>
        </div>
      )}
    </div>
  );
}




function NicheResearcherView({ setActivePage, setIcpForm }) {
  const [view, setView] = useState("library"); // library, chat, detail
  const [selectedNiche, setSelectedNiche] = useState(null);
  const [savedNiches, setSavedNiches] = useState([]);

  useEffect(() => {
    api.niches.list().then(data => {
      const niches = Array.isArray(data) ? data : data.niches || [];
      setSavedNiches(niches.map(n => ({ ...n, avgDeal: n.avg_deal || n.avgDeal || '', savedDate: n.created_at ? new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '' })));
    }).catch(() => {});
  }, []);
  const parseNicheToIcpForm = (niche) => {
    const text = `${niche.name || ''} ${niche.audience || ''} ${niche.positioning || ''} ${niche.advantage || ''}`.toLowerCase();

    const INDUSTRY_PATTERNS = [
      { pattern: /\bb2b\s*saas\b/i, value: "B2B SaaS" },
      { pattern: /\bsaas\b/i, value: "SaaS" },
      { pattern: /\bfintech\b/i, value: "FinTech" },
      { pattern: /\binsurance\b/i, value: "Insurance" },
      { pattern: /\bproperty\s*management\b/i, value: "Property Management" },
      { pattern: /\breal\s*estate\b/i, value: "Real Estate" },
      { pattern: /\bhealthcare\b/i, value: "Healthcare" },
      { pattern: /\be-?commerce\b/i, value: "E-Commerce" },
      { pattern: /\bagenc(?:y|ies)\b/i, value: "Agencies" },
      { pattern: /\bconsultan(?:t|ts|cy|cies)\b/i, value: "Consulting" },
      { pattern: /\bmanufacturing\b/i, value: "Manufacturing" },
      { pattern: /\blogistics\b/i, value: "Logistics" },
      { pattern: /\beducation\b/i, value: "Education" },
      { pattern: /\blegal\b/i, value: "Legal" },
    ];
    let industry = "";
    for (const { pattern, value } of INDUSTRY_PATTERNS) {
      if (pattern.test(niche.name || '') || pattern.test(niche.audience || '')) { industry = value; break; }
    }

    const roles = [];
    const aud = niche.audience || '';
    const ROLE_PATTERNS = [
      /\bVPs?\s+of\s+(\w[\w\s&]*)/gi,
      /\bCROs?\b/gi, /\bCEOs?\b/gi, /\bCTOs?\b/gi, /\bCOOs?\b/gi, /\bCFOs?\b/gi, /\bCMOs?\b/gi,
      /\bManaging\s+Directors?\b/gi, /\bDirectors?\s+of\s+(\w[\w\s&]*)/gi,
      /\bHead\s+of\s+(\w[\w\s&]*)/gi,
      /\bAgency\s+(?:founders?|principals?|owners?)\b/gi,
      /\bFounders?\b/gi, /\bOwners?\b/gi,
    ];
    for (const rx of ROLE_PATTERNS) {
      const m = aud.matchAll(rx);
      for (const match of m) {
        let role = match[0].replace(/\s+/g, ' ').trim();
        if (role.length > 30) role = role.slice(0, 30).trim();
        if (!roles.some(r => r.toLowerCase() === role.toLowerCase())) roles.push(role);
      }
    }
    if (roles.length === 0) roles.push("CEO", "CTO", "VP Sales");

    const SIZE_BUCKETS = [
      { min: 1, max: 10, label: "1-10" },
      { min: 11, max: 50, label: "11-50" },
      { min: 51, max: 200, label: "51-200" },
      { min: 201, max: 500, label: "201-500" },
      { min: 501, max: 1000, label: "501-1,000" },
      { min: 1001, max: 5000, label: "1,001-5,000" },
      { min: 5001, max: Infinity, label: "5,000+" },
    ];
    const employeeSizes = [];
    const sizeMatch = aud.match(/(\d[\d,]*)\s*[-–to]+\s*(\d[\d,]*)\s*(?:employees?|staff|people)/i);
    if (sizeMatch) {
      const lo = parseInt(sizeMatch[1].replace(/,/g, ''), 10);
      const hi = parseInt(sizeMatch[2].replace(/,/g, ''), 10);
      for (const b of SIZE_BUCKETS) {
        if (b.max >= lo && b.min <= hi) employeeSizes.push(b.label);
      }
    }
    if (employeeSizes.length === 0) employeeSizes.push("51-200");

    const STOP = new Set(["the", "for", "and", "a", "an", "of", "in", "at", "to", "is", "by", "on", "or", "with", "your", "that", "this", "from"]);
    const keywords = (niche.name || '').split(/[\s,—–-]+/)
      .map(w => w.replace(/[^a-zA-Z0-9]/g, '').trim())
      .filter(w => w.length > 2 && !STOP.has(w.toLowerCase()))
      .slice(0, 6)
      .join(', ');

    return {
      listName: niche.name || '',
      industry,
      keywords,
      employeeSizes,
      roles,
      maxLeads: '',
    };
  };

  const [chatMessages, setChatMessages] = useState([{ role: "agent", text: "Let's research a new niche. What are your core skills and expertise?" }]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [nichesGenerated, setNichesGenerated] = useState(false);
  const [discoveredNiches, setDiscoveredNiches] = useState([]);
  const [chatError, setChatError] = useState(null);
  const chatEndRef = React.useRef(null);

  React.useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, isTyping]);

  const sendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    const msg = userInput.trim();
    const nm = [...chatMessages, { role: "user", text: msg }];
    setChatMessages(nm); setUserInput(""); setIsTyping(true); setChatError(null);
    try {
      const res = await api.niches.chat({ message: msg, messages: chatMessages });
      const agentText = res.agentText || "I couldn't generate a response. Please try again.";
      setChatMessages([...nm, { role: "agent", text: agentText }]);
      if (res.niches && Array.isArray(res.niches) && res.niches.length > 0) {
        setDiscoveredNiches(res.niches.map((n, i) => ({ ...n, id: `gen_${Date.now()}_${i}` })));
        setNichesGenerated(true);
      }
    } catch (err) {
      const errMsg = err?.message || err?.error || "Failed to reach AI. Check your Anthropic API key in Settings → Integrations.";
      setChatError(errMsg);
      setChatMessages([...nm, { role: "agent", text: `⚠️ ${errMsg}` }]);
    }
    setIsTyping(false);
  };

  const saveNiche = async (niche) => {
    if (savedNiches.find(sn => sn.name === niche.name)) return;
    const optimistic = { ...niche, id: `sn_${Date.now()}`, savedDate: "Just now" };
    setSavedNiches(prev => [optimistic, ...prev]);
    try {
      const saved = await api.niches.create({
        name: niche.name,
        audience: niche.audience || null,
        market_size: niche.size || niche.market_size || null,
        competition: niche.competition || null,
        demand: niche.demand || null,
        avg_deal: niche.avgDeal || niche.avg_deal || null,
        positioning: niche.positioning || null,
        score: typeof niche.score === 'number' ? niche.score : null,
        monetisation: niche.monetisation || null,
        advantage: niche.advantage || null,
        channels: niche.channels || null,
        why_niche: niche.why || niche.why_niche || null,
      });
      setSavedNiches(prev => prev.map(sn => sn.id === optimistic.id ? { ...saved, avgDeal: saved.avg_deal, savedDate: "Just now" } : sn));
    } catch (err) {
      console.error('Failed to save niche:', err);
    }
  };

  const getScoreColor = (s) => s >= 90 ? COLORS.accent : s >= 80 ? COLORS.blue : COLORS.warn;
  const getCompColor = (c) => c === "Very Low" || c === "Low" ? COLORS.accent : c === "Medium" ? COLORS.warn : COLORS.danger;

  // DETAIL VIEW
  if (view === "detail" && selectedNiche) {
    const isSaved = savedNiches.some(sn => sn.name === selectedNiche.name);
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setView(nichesGenerated ? "chat" : "library")} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          <h2 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, margin: 0, flex: 1 }}>{selectedNiche.name}</h2>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: getScoreColor(selectedNiche.score) + "15", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 18, fontWeight: 700, color: getScoreColor(selectedNiche.score) }}>{selectedNiche.score}</div>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <StatCard label="Market Size" value={selectedNiche.size} accent={COLORS.accent} />
          <StatCard label="Competition" value={selectedNiche.competition} accent={getCompColor(selectedNiche.competition)} />
          <StatCard label="Demand" value={selectedNiche.demand} accent={COLORS.blue} />
          <StatCard label="Avg Deal" value={selectedNiche.avgDeal} accent={COLORS.accent} />
        </div>
        <div style={{ padding: "16px 20px", background: COLORS.accent + "08", border: `1px solid ${COLORS.accent}22`, borderRadius: 10, marginBottom: 20 }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.accent, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>WHY THIS NICHE</div>
          <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{selectedNiche.why}</div>
        </div>
        {[{ label: "TARGET AUDIENCE", value: selectedNiche.audience, color: COLORS.blue }, { label: "POSITIONING", value: selectedNiche.positioning, color: COLORS.accent }, { label: "MONETISATION", value: selectedNiche.monetisation, color: "#7B61FF" }, { label: "UNFAIR ADVANTAGE", value: selectedNiche.advantage, color: COLORS.accent }, { label: "CHANNELS", value: selectedNiche.channels, color: COLORS.blue }].map((f, i) => (
          <div key={i} style={{ padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 8, borderLeft: `3px solid ${f.color}` }}>
            <div style={{ fontFamily: FONT, fontSize: 9, color: f.color, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.5 }}>{f.value}</div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {!isSaved && <button onClick={() => saveNiche(selectedNiche)} style={{ padding: "12px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>💾 Save Niche</button>}
          {isSaved && <span style={{ padding: "12px 24px", background: COLORS.accentBg, color: COLORS.accent, borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, border: `1px solid ${COLORS.accent}22` }}>✓ Saved</span>}
          <button onClick={() => {
            const parsed = parseNicheToIcpForm(selectedNiche);
            setIcpForm(prev => ({ ...prev, ...parsed }));
            setActivePage("leads");
          }} style={{ padding: "12px 24px", background: COLORS.blue, color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⚡ Generate Lead List →</button>
        </div>
      </div>
    );
  }

  // LIBRARY VIEW
  if (view === "library") {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div><h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0 }}>Saved <span style={{ color: COLORS.accent }}>Niches</span></h2><p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>Your researched and saved niche profiles</p></div>
          <button onClick={() => { setView("chat"); setNichesGenerated(false); setDiscoveredNiches([]); setChatError(null); setChatMessages([{ role: "agent", text: "Let's research a new niche. What are your core skills and expertise?" }]); }}
            style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Research New Niche</button>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <StatCard label="Saved Niches" value={savedNiches.length} accent={COLORS.accent} />
          <StatCard label="Avg Score" value={savedNiches.length ? Math.round(savedNiches.reduce((s, n) => s + n.score, 0) / savedNiches.length) : 0} accent={COLORS.accent} />
          <StatCard label="Top Niche" value={savedNiches.length ? savedNiches.sort((a, b) => b.score - a.score)[0].score + "/100" : "—"} accent={COLORS.accent} />
        </div>
        {savedNiches.length === 0 ? (
          <div style={{ padding: "60px 40px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.2 }}>🎯</div>
            <div style={{ fontSize: 13, color: COLORS.textDim }}>No saved niches yet. Click "+ Research New Niche" to get started.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {savedNiches.map(niche => (
              <div key={niche.id} onClick={() => { setSelectedNiche(niche); setView("detail"); }} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "44"} onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: getScoreColor(niche.score) + "15", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 16, fontWeight: 700, color: getScoreColor(niche.score), flexShrink: 0 }}>{niche.score}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{niche.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.textDim }}>{niche.audience} · {niche.size} · Avg deal: {niche.avgDeal}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 500, background: getCompColor(niche.competition) + "10", color: getCompColor(niche.competition), border: `1px solid ${getCompColor(niche.competition)}22` }}>{niche.competition}</span>
                  <span style={{ fontSize: 10, color: COLORS.textDim }}>{niche.savedDate}</span>
                  <span style={{ fontSize: 10, color: COLORS.textDim }}>→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // CHAT + DASHBOARD VIEW
  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden" }}>
      <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${COLORS.border}` }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setView("library")} style={{ padding: "2px 6px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textMuted, fontSize: 10, cursor: "pointer" }}>←</button>
            <span style={{ fontSize: 14 }}>🎯</span>
            <div><div style={{ fontWeight: 600, fontSize: 13 }}>Niche Researcher</div><div style={{ fontSize: 10, color: COLORS.textDim }}>{nichesGenerated ? `${discoveredNiches.length} niches found` : "AI-powered discovery"}</div></div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "88%", padding: "10px 14px", borderRadius: 12, background: msg.role === "user" ? COLORS.accent + "20" : COLORS.surface, border: `1px solid ${msg.role === "user" ? COLORS.accent + "33" : COLORS.border}`, borderBottomRightRadius: msg.role === "user" ? 4 : 12, borderBottomLeftRadius: msg.role === "agent" ? 4 : 12 }}>
                {msg.role === "agent" && <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>NICHE RESEARCHER</div>}
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{msg.text}</div>
              </div>
            </div>
          ))}
          {isTyping && <div style={{ display: "flex" }}><div style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderBottomLeftRadius: 4 }}><ProgressDots active={true} /></div></div>}
          <div ref={chatEndRef} />
        </div>
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
          <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isTyping) sendMessage(); }} placeholder={nichesGenerated ? "Refine niches..." : "Type your answer..."} style={{ flex: 1, padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none" }} disabled={isTyping} />
          <button onClick={sendMessage} disabled={isTyping || !userInput.trim()} style={{ padding: "10px 18px", background: userInput.trim() && !isTyping ? COLORS.accent : COLORS.border, color: userInput.trim() && !isTyping ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: userInput.trim() && !isTyping ? "pointer" : "default" }}>Send</button>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {!nichesGenerated ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center", maxWidth: 360 }}><div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>🎯</div><div style={{ fontFamily: FONT, fontSize: 15, color: COLORS.textDim }}>Niches will appear here</div></div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>Discovered <span style={{ color: COLORS.accent }}>Niches</span></h3>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {discoveredNiches.map(niche => {
                const isSaved = savedNiches.some(sn => sn.name === niche.name);
                return (
                  <div key={niche.id} style={{ padding: "20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, flex: 1, marginRight: 8 }}>{niche.name}</div>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: getScoreColor(niche.score) + "15", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 18, fontWeight: 700, color: getScoreColor(niche.score), flexShrink: 0 }}>{niche.score}</div>
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginBottom: 10 }}>{niche.audience}</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textDim }}>{niche.size}</span>
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, background: getCompColor(niche.competition) + "10", color: getCompColor(niche.competition) }}>{niche.competition}</span>
                      <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textDim }}>{niche.avgDeal}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setSelectedNiche(niche); setView("detail"); }} style={{ flex: 1, padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>View Details</button>
                      {!isSaved ? (
                        <button onClick={() => saveNiche(niche)} style={{ padding: "6px 12px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>💾 Save</button>
                      ) : (
                        <span style={{ padding: "6px 12px", background: COLORS.accentBg, color: COLORS.accent, borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, border: `1px solid ${COLORS.accent}22` }}>✓ Saved</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SalesScriptGeneratorView() {
  const [view, setView] = useState("library");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [chatMessages, setChatMessages] = useState([{ role: "agent", text: "Let's build your sales script. What type do you need?" }]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [scriptType, setScriptType] = useState(null);
  const [step, setStep] = useState(0);
  const [generatedScript, setGeneratedScript] = useState(null);
  const chatEndRef = React.useRef(null);
  const [savedScripts, setSavedScripts] = useState([]);

  useEffect(() => {
    api.salesScripts.list().then(data => {
      const scripts = Array.isArray(data) ? data : data.sales_scripts || [];
      setSavedScripts(scripts.map(s => ({ ...s, type: s.script_type || s.type || '', created: s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '', sections: s.section_count || s.sections || 0, uses: s.use_count || s.uses || 0 })));
    }).catch(() => {});
  }, []);

  React.useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, isTyping]);

  const SCRIPT_TYPES = ["Cold Call", "Discovery Call", "Sales Call", "Follow-up Call", "Objection Handling"];
  const QUESTIONS = ["Who are you calling? Role, company type, what they care about.", "What are you selling? One-liner outcome.", "Top 2-3 objections?", "Desired outcome? Book meeting, close, referral?", "Tone — assertive, consultative, casual?"];

  const MOCK_SCRIPT = {
    opener: "Hi {{first_name}}, this is [Your Name] from [Company]. I know I'm calling out of the blue — do you have 30 seconds?\n\n[If yes] Great. I work with VPs of Sales at SaaS companies struggling to scale outbound without hiring a huge team. Noticed {{company_name}} growing fast.\n\n[If no] Totally understand. Better time to call back?",
    qualifying: "Quick questions:\n\n• How are you handling outbound? Manual or automated?\n• How many meetings is your team booking per month?\n• What would your ideal pipeline look like?",
    valueProps: "We've built an AI system that automates the entire outbound pipeline. One client went from 12 meetings/month to 47 in 6 weeks.\n\nTheir reps stopped spending 3+ hours/day researching leads. Our system handles discovery, enrichment, and personalisation automatically.",
    objections: "**\"We already have tools\"**\n→ Most have 3-5 tools cobbled together. We replace the duct tape with one integrated pipeline.\n\n**\"No budget\"**\n→ Pays for itself in 30 days. Want to see the ROI model?\n\n**\"Send an email\"**\n→ Emails don't do it justice — 2-min screen share instead?",
    close: "Let's book 15 minutes where I show you the exact system for {{company_name}}. If not a fit, I'll tell you.\n\nDoes [day] at [time] work?",
  };

  const selectType = (type) => { setScriptType(type); setChatMessages(prev => [...prev, { role: "user", text: type }, { role: "agent", text: `${type} — got it. ${QUESTIONS[0]}` }]); setStep(1); };

  const sendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    const nm = [...chatMessages, { role: "user", text: userInput }]; setChatMessages(nm); setUserInput(""); setIsTyping(true);
    await new Promise(r => setTimeout(r, 1200));
    if (step < QUESTIONS.length) { setChatMessages([...nm, { role: "agent", text: QUESTIONS[step] }]); setStep(step + 1); }
    else if (!generatedScript) { setGeneratedScript(MOCK_SCRIPT); setChatMessages([...nm, { role: "agent", text: "Script ready! Preview on the right. Revise via chat or hit 💾 Save to name it and add to your library." }]); }
    else { setChatMessages([...nm, { role: "agent", text: "Updated! Check the revised section." }]); }
    setIsTyping(false);
  };

  const handleSave = () => {
    if (!saveName.trim()) return;
    setSavedScripts(prev => [{ id: `ss_${Date.now()}`, name: saveName, type: scriptType, created: "Just now", sections: 5, uses: 0, audience: "—" }, ...prev]);
    setShowSaveModal(false); setSaveName(""); setView("library");
  };

  // LIBRARY
  if (view === "library") {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div><h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0 }}>Sales <span style={{ color: COLORS.accent }}>Scripts</span></h2><p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>Your saved scripts library</p></div>
          <button onClick={() => { setView("generator"); setScriptType(null); setStep(0); setGeneratedScript(null); setChatMessages([{ role: "agent", text: "Let's build your sales script. What type do you need?" }]); }} style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ New Script</button>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Scripts" value={savedScripts.length} accent={COLORS.accent} />
          <StatCard label="Total Uses" value={savedScripts.reduce((s, sc) => s + sc.uses, 0)} accent={COLORS.blue} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {savedScripts.map(sc => (
            <div key={sc.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{sc.name}</span>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: COLORS.blue + "15", color: COLORS.blue }}>{sc.type}</span>
                </div>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>{sc.audience} · {sc.sections} sections · {sc.uses} uses · {sc.created}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}><button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>View</button><button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>Copy</button></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // GENERATOR
  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden" }}>
      <div style={{ width: 420, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${COLORS.border}` }}>
        <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setView("library")} style={{ padding: "2px 6px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textMuted, fontSize: 10, cursor: "pointer" }}>←</button>
          <span style={{ fontSize: 14 }}>📞</span>
          <div><div style={{ fontWeight: 600, fontSize: 13 }}>Script Generator</div><div style={{ fontSize: 10, color: COLORS.textDim }}>{generatedScript ? "Revise mode" : scriptType || "Select type"}</div></div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {chatMessages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{ maxWidth: "88%", padding: "10px 14px", borderRadius: 12, background: msg.role === "user" ? COLORS.accent + "20" : COLORS.surface, border: `1px solid ${msg.role === "user" ? COLORS.accent + "33" : COLORS.border}`, borderBottomRightRadius: msg.role === "user" ? 4 : 12, borderBottomLeftRadius: msg.role === "agent" ? 4 : 12 }}>
                {msg.role === "agent" && <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>SCRIPT GENERATOR</div>}
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{msg.text}</div>
              </div>
            </div>
          ))}
          {!scriptType && <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{SCRIPT_TYPES.map(t => <button key={t} onClick={() => selectType(t)} style={{ padding: "8px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, cursor: "pointer" }} onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent; e.currentTarget.style.color = COLORS.accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}>{t}</button>)}</div>}
          {isTyping && <div style={{ display: "flex" }}><div style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderBottomLeftRadius: 4 }}><ProgressDots active={true} /></div></div>}
          <div ref={chatEndRef} />
        </div>
        {scriptType && <div style={{ padding: "10px 14px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 8 }}>
          <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isTyping) sendMessage(); }} placeholder={generatedScript ? "Ask for revisions..." : "Answer..."} style={{ flex: 1, padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none" }} disabled={isTyping} />
          <button onClick={sendMessage} disabled={isTyping || !userInput.trim()} style={{ padding: "10px 18px", background: userInput.trim() && !isTyping ? COLORS.accent : COLORS.border, color: userInput.trim() && !isTyping ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: userInput.trim() && !isTyping ? "pointer" : "default" }}>Send</button>
        </div>}
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
        {!generatedScript ? (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 16, opacity: 0.2 }}>📞</div><div style={{ fontFamily: FONT, fontSize: 15, color: COLORS.textDim }}>Script preview here</div></div></div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div><h3 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>{scriptType} <span style={{ color: COLORS.accent }}>Script</span></h3></div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { const f = Object.values(generatedScript).join("\n\n---\n\n"); navigator.clipboard?.writeText(f); }} style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Copy All</button>
                <button onClick={() => { setShowSaveModal(true); setSaveName(""); }} style={{ padding: "8px 14px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>💾 Save Script</button>
              </div>
            </div>
            {[{ key: "opener", label: "OPENER", icon: "👋", color: COLORS.accent }, { key: "qualifying", label: "QUALIFYING", icon: "❓", color: COLORS.blue }, { key: "valueProps", label: "VALUE PROP", icon: "💎", color: COLORS.accent }, { key: "objections", label: "OBJECTIONS", icon: "🛡️", color: COLORS.warn }, { key: "close", label: "CLOSE", icon: "🎯", color: "#7B61FF" }].map(sec => (
              <div key={sec.key} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 12 }}>{sec.icon}</span><span style={{ fontFamily: FONT, fontSize: 10, color: sec.color, letterSpacing: "0.06em", fontWeight: 600 }}>{sec.label}</span></div>
                  <button onClick={() => navigator.clipboard?.writeText(generatedScript[sec.key])} style={{ padding: "3px 8px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textDim, fontFamily: FONT, fontSize: 9, cursor: "pointer" }}>Copy</button>
                </div>
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-line", padding: "10px 14px", background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>{generatedScript[sec.key]}</div>
              </div>
            ))}
          </div>
        )}
        {/* Save Modal */}
        {showSaveModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSaveModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: 420, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
              <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Save Script</div>
                <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 2 }}>Give your script a name to save it to your library</div>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>SCRIPT NAME</div>
                <input value={saveName} onChange={e => setSaveName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") handleSave(); }} placeholder={`e.g. ${scriptType} — B2B SaaS VPs`} autoFocus style={{ width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 14px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                  <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: COLORS.blue + "15", color: COLORS.blue }}>{scriptType}</span>
                  <span style={{ fontSize: 11, color: COLORS.textDim }}>5 sections</span>
                </div>
              </div>
              <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowSaveModal(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleSave} disabled={!saveName.trim()} style={{ padding: "10px 24px", background: saveName.trim() ? COLORS.accent : COLORS.border, color: saveName.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: saveName.trim() ? "pointer" : "default" }}>Save to Library</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoScriptView() {
  const [activeTab, setActiveTab] = useState("create");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("educational");
  const [duration, setDuration] = useState("30");
  const [sourceContent, setSourceContent] = useState("");
  const [scripts, setScripts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveScriptName, setSaveScriptName] = useState("");
  const [selectedScripts, setSelectedScripts] = useState({});
  const [savedVideoScripts, setSavedVideoScripts] = useState([]);

  useEffect(() => {
    api.contentPosts.list({ format: 'video_script' }).then(data => {
      const scripts = Array.isArray(data) ? data : data.content_posts || [];
      setSavedVideoScripts(scripts.map(s => ({ id: s.id, name: s.title || s.name || 'Untitled', scripts: s.script_count || 1, created: s.created_at ? new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '', style: s.style || '', topic: s.topic || '' })));
    }).catch(() => {});
  }, []);
  const [useHookTemplate, setUseHookTemplate] = useState(false);
  const [selectedHookStyle, setSelectedHookStyle] = useState(null);
  const [selectedHook, setSelectedHook] = useState(null);
  const [hookFilter, setHookFilter] = useState("all");
  const [compFilter, setCompFilter] = useState("all");

  const HOOK_STYLES = ["Pattern Interrupt", "Question", "Bold Claim", "Story", "Controversy", "Tutorial", "Before/After", "POV"];

  const HOOK_TEMPLATES = [
    { id: "h1", text: "Stop scrolling if you [pain point]...", style: "Pattern Interrupt", source: "Custom", platform: "TikTok", example: "Stop scrolling if you're still doing outreach manually..." },
    { id: "h2", text: "I [impressive result] in [timeframe]. Here's how.", style: "Bold Claim", source: "Alex Hormozi", platform: "YouTube Shorts", example: "I replaced a £200K employee with AI in 6 weeks. Here's how." },
    { id: "h3", text: "What if I told you [counterintuitive truth]?", style: "Question", source: "Custom", platform: "TikTok", example: "What if I told you your cold emails are failing because they're too short?" },
    { id: "h4", text: "6 months ago I [starting point]. Today I [result].", style: "Before/After", source: "Saved from @codyschneiderxx", platform: "TikTok", example: "6 months ago I had 0 clients. Today I run a £300K consultancy." },
    { id: "h5", text: "Nobody talks about this, but [insight]...", style: "Controversy", source: "Custom", platform: "LinkedIn", example: "Nobody talks about this, but AI consultants are charging too little." },
    { id: "h6", text: "Here's the exact [system/process] I use to [outcome]", style: "Tutorial", source: "Saved from @thesalestechnologies", platform: "YouTube Shorts", example: "Here's the exact 5-step system I use to book 20 meetings per week." },
    { id: "h7", text: "POV: You're a [role] who just discovered [thing]", style: "POV", source: "Custom", platform: "TikTok", example: "POV: You're a sales manager who just discovered your entire SDR process can be automated." },
    { id: "h8", text: "[Famous person/company] does this one thing differently", style: "Story", source: "Saved from @garyvee", platform: "TikTok", example: "Clay.com does this one thing that makes them 10x better than every other enrichment tool." },
    { id: "h9", text: "The [industry] is about to change forever. Here's why.", style: "Bold Claim", source: "Custom", platform: "YouTube Shorts", example: "The consulting industry is about to change forever. Here's why." },
    { id: "h10", text: "If you're still [old way], you're already behind.", style: "Pattern Interrupt", source: "Saved from @alexbanayan", platform: "TikTok", example: "If you're still cold calling without AI research, you're already behind." },
    { id: "h11", text: "I asked 100 [people] what [question]. The answer shocked me.", style: "Story", source: "Custom", platform: "YouTube Shorts", example: "I asked 100 B2B buyers what makes them reply to cold emails. The answer shocked me." },
    { id: "h12", text: "Most [role]s get this wrong about [topic]", style: "Controversy", source: "Saved from @justinwelsh", platform: "LinkedIn", example: "Most consultants get this wrong about pricing." },
  ];

  const TRACKED_ACCOUNTS = [
    { id: "a1", name: "Alex Hormozi", handle: "@hormozi", platform: "YouTube Shorts", followers: "2.8M", avgEng: "4.2%", frequency: "Daily" },
    { id: "a2", name: "Justin Welsh", handle: "@justinwelsh", platform: "LinkedIn", followers: "850K", avgEng: "3.8%", frequency: "2x daily" },
    { id: "a3", name: "Cody Schneider", handle: "@codyschneiderxx", platform: "TikTok", followers: "245K", avgEng: "5.1%", frequency: "3x week" },
    { id: "a4", name: "The Sales Technologies", handle: "@thesalestechnologies", platform: "TikTok", followers: "180K", avgEng: "6.3%", frequency: "Daily" },
  ];

  const COMPETITOR_POSTS = [
    { id: "cp1", account: "Alex Hormozi", platform: "YouTube Shorts", date: "Feb 11", hook: "I fired my $300K sales team. Revenue went UP.", content: "I fired my $300K sales team and replaced them with 2 AI agents and 1 human. Revenue went up 40% in 3 months. Here's the framework...", views: "2.4M", likes: "89K", comments: "3.2K", topPerformer: true },
    { id: "cp2", account: "Justin Welsh", platform: "LinkedIn", date: "Feb 10", hook: "The biggest lie in consulting: you need a team to scale.", content: "The biggest lie in consulting: you need a team to scale. I hit $5M solo. No employees. No office. Here's my operating system...", views: "450K", likes: "12K", comments: "890", topPerformer: true },
    { id: "cp3", account: "Cody Schneider", platform: "TikTok", date: "Feb 10", hook: "This AI tool finds you 1,000 leads in 5 minutes", content: "This AI tool finds you 1,000 leads in 5 minutes and costs $0. Open LinkedIn Sales Nav, export your search, run it through this free enrichment pipeline...", views: "890K", likes: "42K", comments: "1.8K", topPerformer: true },
    { id: "cp4", account: "The Sales Technologies", platform: "TikTok", date: "Feb 9", hook: "3 cold email mistakes killing your reply rate", content: "3 cold email mistakes killing your reply rate: 1. Your subject line is too long 2. You're talking about yourself 3. No clear CTA...", views: "120K", likes: "5.4K", comments: "340", topPerformer: false },
    { id: "cp5", account: "Alex Hormozi", platform: "YouTube Shorts", date: "Feb 8", hook: "Why nobody replies to your emails (fix this today)", content: "Why nobody replies to your emails. It's not your offer. It's not your list. It's your first line. The first 8 words decide everything...", views: "1.1M", likes: "52K", comments: "2.1K", topPerformer: false },
    { id: "cp6", account: "Justin Welsh", platform: "LinkedIn", date: "Feb 8", hook: "I've tested 47 different hooks. These 5 outperform everything.", content: "I've tested 47 different hooks. These 5 outperform everything else by 3x: Pattern Interrupt, Before/After, Bold Claim, Direct Question, POV...", views: "320K", likes: "9.8K", comments: "720", topPerformer: true },
  ];

  const STYLES = [
    { key: "educational", label: "Educational", desc: "Teach something valuable" },
    { key: "storytelling", label: "Storytelling", desc: "Hook with a narrative" },
    { key: "controversial", label: "Hot Take", desc: "Bold opinion" },
    { key: "tutorial", label: "Tutorial", desc: "Step-by-step" },
    { key: "listicle", label: "Listicle", desc: "\"3 things...\"" },
  ];

  const MOCK_SCRIPTS = [
    { id: 1, hook: "Stop using AI like it's Google. Here's what the top 1% do instead.", body: "Most people type a question into ChatGPT and accept the first answer. But the people getting 10x results? They're doing something completely different.\n\nThey start with context. They tell the AI who they are, what they're working on, and what good looks like.\n\nThen they iterate. First draft is never the final draft.\n\nFinally — they use AI as a thinking partner, not an answer machine.", cta: "Follow for more AI strategies that actually work.", duration: "45s", style: "educational" },
    { id: 2, hook: "I replaced a £200K employee with an AI agent. Here's what happened.", body: "Six months ago I built an AI agent that does the work of a full-time data analyst.\n\nThe first month? Rough. Lots of errors.\n\nBy month three, it was outperforming benchmarks. Not because it was smarter — because it never got tired.\n\nBut here's what nobody talks about: I didn't fire anyone. I redeployed that person to strategic work AI can't do.", cta: "Save this for when your boss asks about AI.", duration: "60s", style: "storytelling" },
  ];

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 };

  const generateScripts = async () => { setIsGenerating(true); await new Promise(r => setTimeout(r, 2000)); setScripts(MOCK_SCRIPTS); setIsGenerating(false); };

  const openSaveModal = () => { setSaveScriptName(""); setSelectedScripts(scripts.reduce((a, s) => ({ ...a, [s.id]: true }), {})); setShowSaveModal(true); };

  const handleSave = () => {
    const count = Object.values(selectedScripts).filter(Boolean).length;
    setSavedVideoScripts(prev => [{ id: `vs_${Date.now()}`, name: saveScriptName, scripts: count, created: "Just now", style, topic }, ...prev]);
    setShowSaveModal(false);
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0 }}>Short Form <span style={{ color: COLORS.warn }}>Scripts</span></h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>Generate & save scripts for TikTok, Reels & YouTube Shorts</p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {[{ key: "create", label: "🎬 Create" }, { key: "saved", label: `📚 Library (${savedVideoScripts.length})` }, { key: "hooks", label: "🪝 Hook Templates" }, { key: "competitors", label: "🔎 Top Performers" }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: activeTab === tab.key ? `2px solid ${COLORS.warn}` : "2px solid transparent", color: activeTab === tab.key ? COLORS.warn : COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "saved" && (
        <div>
          {savedVideoScripts.length === 0 ? (
            <div style={{ padding: "60px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center" }}><div style={{ fontSize: 13, color: COLORS.textDim }}>No saved scripts yet</div></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {savedVideoScripts.map(vs => (
                <div key={vs.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{vs.name}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: COLORS.warn + "15", color: COLORS.warn }}>{vs.style}</span>
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.textDim }}>{vs.topic} · {vs.scripts} scripts · {vs.created}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}><button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>View</button><button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>Copy</button></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && (
        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ padding: "24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
              {/* Hook Template Toggle */}
              <div style={{ padding: "12px 16px", background: useHookTemplate ? COLORS.warn + "08" : COLORS.bg, border: `1px solid ${useHookTemplate ? COLORS.warn + "33" : COLORS.border}`, borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div><div style={{ fontSize: 12, fontWeight: 600 }}>🪝 Use Hook Template</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Start with a proven hook structure</div></div>
                <div onClick={() => { setUseHookTemplate(!useHookTemplate); setSelectedHookStyle(null); setSelectedHook(null); }} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: useHookTemplate ? COLORS.warn : COLORS.borderActive, position: "relative", transition: "background 0.25s" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: useHookTemplate ? 21 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
              {useHookTemplate && (
                <div style={{ marginBottom: 20, padding: "14px 16px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 8 }}>CHOOSE HOOK STYLE</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: selectedHookStyle ? 12 : 0 }}>
                    {HOOK_STYLES.map(hs => (
                      <button key={hs} onClick={() => setSelectedHookStyle(hs === selectedHookStyle ? null : hs)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${selectedHookStyle === hs ? COLORS.warn + "55" : COLORS.border}`, background: selectedHookStyle === hs ? COLORS.warn + "12" : "transparent", color: selectedHookStyle === hs ? COLORS.warn : COLORS.textDim, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{hs}</button>
                    ))}
                  </div>
                  {selectedHookStyle && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {HOOK_TEMPLATES.filter(h => h.style === selectedHookStyle).map(h => (
                        <div key={h.id} onClick={() => setSelectedHook(h)} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${selectedHook?.id === h.id ? COLORS.warn + "55" : COLORS.border}`, background: selectedHook?.id === h.id ? COLORS.warn + "10" : "transparent", cursor: "pointer" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: selectedHook?.id === h.id ? COLORS.warn : COLORS.text }}>{h.text}</div>
                          <div style={{ fontSize: 9, color: COLORS.textDim, marginTop: 2 }}>{h.source} · {h.platform}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedHook && <div style={{ marginTop: 8, padding: "8px 12px", background: COLORS.warn + "08", border: `1px solid ${COLORS.warn}22`, borderRadius: 6 }}><div style={{ fontSize: 9, color: COLORS.warn, fontFamily: FONT, fontWeight: 600, marginBottom: 2 }}>EXAMPLE</div><div style={{ fontSize: 11, color: COLORS.text, fontStyle: "italic" }}>{selectedHook.example}</div></div>}
                </div>
              )}
              <div style={{ marginBottom: 20 }}><label style={labelStyle}>TOPIC / IDEA</label><input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Why most people use AI wrong..." style={inputStyle} /></div>
              <div style={{ marginBottom: 20 }}><label style={labelStyle}>STYLE</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{STYLES.map(s => (<div key={s.key} onClick={() => setStyle(s.key)} style={{ padding: "8px 14px", borderRadius: 8, cursor: "pointer", background: style === s.key ? COLORS.warn + "15" : "transparent", border: `1px solid ${style === s.key ? COLORS.warn + "44" : COLORS.border}`, color: style === s.key ? COLORS.warn : COLORS.textMuted }}><div style={{ fontWeight: 600, fontSize: 12 }}>{s.label}</div><div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>{s.desc}</div></div>))}</div></div>
              <div style={{ marginBottom: 20 }}><label style={labelStyle}>DURATION</label><div style={{ display: "flex", gap: 8 }}>{["15", "30", "45", "60", "90"].map(d => (<button key={d} onClick={() => setDuration(d)} style={{ flex: 1, padding: "8px 0", borderRadius: 6, fontFamily: FONT, fontSize: 12, fontWeight: 600, border: `1px solid ${duration === d ? COLORS.warn + "55" : COLORS.border}`, background: duration === d ? COLORS.warn + "15" : "transparent", color: duration === d ? COLORS.warn : COLORS.textDim, cursor: "pointer" }}>{d}s</button>))}</div></div>
              <div style={{ marginBottom: 20 }}><label style={labelStyle}>SOURCE CONTENT (OPTIONAL)</label><textarea value={sourceContent} onChange={e => setSourceContent(e.target.value)} placeholder="Paste content to repurpose..." rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} /></div>
              <button onClick={generateScripts} disabled={isGenerating || !topic.trim()} style={{ width: "100%", padding: "14px", background: topic.trim() ? COLORS.warn : COLORS.border, color: topic.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: topic.trim() && !isGenerating ? "pointer" : "default" }}>{isGenerating ? "GENERATING..." : "🎬 GENERATE SCRIPTS"}</button>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            {scripts.length === 0 && !isGenerating && <div style={{ padding: "60px 40px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🎬</div><div style={{ fontSize: 13, color: COLORS.textDim }}>Scripts will appear here</div></div>}
            {isGenerating && <div style={{ padding: "60px 40px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div><ProgressDots active={true} /></div>}
            {scripts.length > 0 && !isGenerating && (
              <div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}><button onClick={openSaveModal} style={{ padding: "8px 16px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>💾 Save Scripts</button></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {scripts.map((sc, i) => (
                    <div key={sc.id} style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.warn, fontWeight: 600 }}>SCRIPT {i + 1}</span>
                          <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: COLORS.warn + "15", color: COLORS.warn, fontFamily: FONT }}>{sc.duration}</span>
                        </div>
                        <button onClick={() => navigator.clipboard?.writeText(`${sc.hook}\n\n${sc.body}\n\n${sc.cta}`)} style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Copy</button>
                      </div>
                      <div style={{ marginBottom: 12 }}><div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>HOOK</div><div style={{ fontSize: 15, fontWeight: 600, color: COLORS.warn, lineHeight: 1.4 }}>{sc.hook}</div></div>
                      <div style={{ marginBottom: 12 }}><div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>BODY</div><div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-line" }}>{sc.body}</div></div>
                      <div><div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>CTA</div><div style={{ fontSize: 13, color: COLORS.accent, fontWeight: 500 }}>{sc.cta}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hook Templates Tab */}
      {activeTab === "hooks" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button onClick={() => setHookFilter("all")} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${hookFilter === "all" ? COLORS.warn + "55" : COLORS.border}`, background: hookFilter === "all" ? COLORS.warn + "12" : "transparent", color: hookFilter === "all" ? COLORS.warn : COLORS.textDim, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>All</button>
              {HOOK_STYLES.map(hs => (
                <button key={hs} onClick={() => setHookFilter(hs)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${hookFilter === hs ? COLORS.warn + "55" : COLORS.border}`, background: hookFilter === hs ? COLORS.warn + "12" : "transparent", color: hookFilter === hs ? COLORS.warn : COLORS.textDim, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{hs}</button>
              ))}
            </div>
            <button style={{ padding: "8px 14px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Add Custom Hook</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {HOOK_TEMPLATES.filter(h => hookFilter === "all" || h.style === hookFilter).map(h => (
              <div key={h.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ padding: "3px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: COLORS.warn + "15", color: COLORS.warn }}>{h.style}</span>
                  <span style={{ fontSize: 9, color: COLORS.textDim }}>{h.platform}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 6, lineHeight: 1.4 }}>{h.text}</div>
                <div style={{ fontSize: 11, color: COLORS.textDim, fontStyle: "italic", marginBottom: 8, lineHeight: 1.4 }}>"{h.example}"</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: COLORS.textDim }}>{h.source}</span>
                  <button onClick={() => { setActiveTab("create"); setUseHookTemplate(true); setSelectedHookStyle(h.style); setSelectedHook(h); }} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.warn}44`, borderRadius: 4, color: COLORS.warn, fontFamily: FONT, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Use This →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Performers Tab */}
      {activeTab === "competitors" && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600 }}>Tracked Accounts</span>
              <button style={{ padding: "6px 14px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Track Account</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {TRACKED_ACCOUNTS.map(acc => (
                <div key={acc.id} style={{ padding: "14px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: COLORS.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, fontFamily: FONT, color: COLORS.accent }}>{acc.name.split(" ").map(n => n[0]).join("")}</div>
                    <div><div style={{ fontWeight: 600, fontSize: 12 }}>{acc.name}</div><div style={{ fontSize: 9, color: COLORS.textDim }}>{acc.handle}</div></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: COLORS.textDim }}>
                    <span>{acc.followers}</span><span>{acc.avgEng} eng</span>
                  </div>
                  <div style={{ fontSize: 9, color: COLORS.textDim, marginTop: 4 }}>{acc.platform} · {acc.frequency}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {[{ key: "all", label: "All" }, { key: "top", label: "🔥 Top Performers" }, ...TRACKED_ACCOUNTS.map(a => ({ key: a.name, label: a.name.split(" ")[0] }))].map(f => (
              <button key={f.key} onClick={() => setCompFilter(f.key)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${compFilter === f.key ? COLORS.warn + "55" : COLORS.border}`, background: compFilter === f.key ? COLORS.warn + "12" : "transparent", color: compFilter === f.key ? COLORS.warn : COLORS.textDim, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{f.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {COMPETITOR_POSTS.filter(p => compFilter === "all" ? true : compFilter === "top" ? p.topPerformer : p.account === compFilter).map(post => (
              <div key={post.id} style={{ padding: "18px 22px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, borderLeft: post.topPerformer ? `4px solid ${COLORS.warn}` : "4px solid transparent" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{post.account}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, background: COLORS.blue + "12", color: COLORS.blue }}>{post.platform}</span>
                    {post.topPerformer && <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: COLORS.warn + "15", color: COLORS.warn }}>🔥 Top Performer</span>}
                  </div>
                  <span style={{ fontSize: 10, color: COLORS.textDim }}>{post.date}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: COLORS.warn, marginBottom: 6, lineHeight: 1.3 }}>{post.hook}</div>
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5, marginBottom: 12, maxHeight: 60, overflow: "hidden" }}>{post.content}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 14, fontSize: 10, color: COLORS.textDim }}>
                    <span>👁 {post.views}</span><span>❤️ {post.likes}</span><span>💬 {post.comments}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 4, color: COLORS.textMuted, fontFamily: FONT, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Save to Library</button>
                    <button style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.warn}44`, borderRadius: 4, color: COLORS.warn, fontFamily: FONT, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Save Hook</button>
                    <button onClick={() => { setActiveTab("create"); setTopic(post.hook); }} style={{ padding: "4px 10px", background: COLORS.warn + "12", border: `1px solid ${COLORS.warn}44`, borderRadius: 4, color: COLORS.warn, fontFamily: FONT, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Remix →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Script Modal */}
      {showSaveModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSaveModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Save Video Scripts</div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>COLLECTION NAME</div>
              <input value={saveScriptName} onChange={e => setSaveScriptName(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && saveScriptName.trim()) handleSave(); }} placeholder="e.g. AI Usage Hot Takes" autoFocus style={{ width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 8 }}>SELECT SCRIPTS TO SAVE</div>
              {scripts.map((sc, i) => (
                <label key={sc.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!selectedScripts[sc.id]} onChange={e => setSelectedScripts({ ...selectedScripts, [sc.id]: e.target.checked })} style={{ marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.warn }}>{sc.hook}</div>
                    <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>{sc.duration} · {sc.style}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowSaveModal(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleSave} disabled={!saveScriptName.trim()} style={{ padding: "10px 24px", background: saveScriptName.trim() ? COLORS.accent : COLORS.border, color: saveScriptName.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: saveScriptName.trim() ? "pointer" : "default" }}>Save to Library</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SalesCallAnalyserView() {
  const [view, setView] = useState("dashboard"); // dashboard, upload, analysis
  const [transcript, setTranscript] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const [CALL_HISTORY, setCallHistory] = useState([]);

  useEffect(() => {
    api.callAnalyses.list().then(data => {
      const calls = Array.isArray(data) ? data : data.call_analyses || [];
      setCallHistory(calls.map(c => ({ ...c, name: c.call_name || c.name || '', date: c.call_date || c.date || '', duration: c.duration || '', score: c.overall_score || c.score || 0, outcome: c.outcome || '', source: c.source || 'Manual' })));
    }).catch(() => {});
  }, []);

  const COMMON_OBJECTIONS = [
    { objection: "We already have tools for that", count: 8, winRate: 62, bestResponse: "Reframe around integration vs individual tools" },
    { objection: "We don't have the budget", count: 6, winRate: 50, bestResponse: "ROI model — pays for itself in 30 days" },
    { objection: "Need to talk to my team first", count: 5, winRate: 80, bestResponse: "Offer to present to the team directly" },
    { objection: "Send me an email", count: 4, winRate: 25, bestResponse: "Offer 2-min screen share instead" },
    { objection: "We're locked into a contract", count: 3, winRate: 33, bestResponse: "Offer parallel pilot to compare results" },
  ];

  const totalCalls = CALL_HISTORY.length;
  const avgScore = (CALL_HISTORY.reduce((s, c) => s + c.score, 0) / totalCalls).toFixed(1);
  const closedWon = CALL_HISTORY.filter(c => c.outcome === "Closed won").length;
  const meetingsBooked = CALL_HISTORY.filter(c => ["Meeting booked", "Demo scheduled"].includes(c.outcome)).length;

  const MOCK_ANALYSIS = {
    overallScore: 7.2, talkListenRatio: { talk: 62, listen: 38 }, fillerWords: 14, callDuration: "22 min",
    metrics: [
      { label: "Question Quality", score: 8, detail: "Strong open-ended questions. Good 'tell me more' format." },
      { label: "Discovery Depth", score: 6, detail: "Surface-level on budget/timeline. Missed decision process." },
      { label: "Objection Handling", score: 7, detail: "Pricing objection handled well. Stumbled on competitor comparison." },
      { label: "Closing Technique", score: 8, detail: "Clear next step proposed. Good assumptive close." },
      { label: "Rapport Building", score: 7, detail: "Solid opening. Could reference prospect's LinkedIn activity." },
      { label: "Active Listening", score: 6, detail: "Interrupted twice. Missed verbal buying signals at 8:42." },
    ],
    highlights: [
      { time: "2:15", type: "positive", text: "Excellent opener — referenced prospect's recent funding round." },
      { time: "5:30", type: "positive", text: "Strong discovery: 'Walk me through what happens when a new lead comes in.'" },
      { time: "8:42", type: "negative", text: "Missed buying signal — prospect said 'that's exactly what we need' but you moved on." },
      { time: "12:15", type: "positive", text: "Great pricing reframe — shifted from cost to ROI with client example." },
      { time: "14:30", type: "negative", text: "Interrupted prospect mid-sentence during budget discussion." },
      { time: "18:00", type: "positive", text: "Clean close: 'Let's book 15 minutes Thursday for the implementation plan.'" },
      { time: "19:45", type: "negative", text: "Filler word spike — 'um' and 'like' 6 times in 30 seconds." },
    ],
    recommendations: [
      "Let prospects finish — you interrupted twice during key information reveals.",
      "Go deeper on budget and timeline in discovery. Get the urgency signals.",
      "When they say 'that's exactly what we need', ask: 'Tell me more — what's driving the urgency?'",
      "Prepare a competitor comparison one-pager for competitive questions.",
      "Practice demo walkthrough to reduce filler words.",
    ],
  };

  const runAnalysis = async () => { setAnalysing(true); await new Promise(r => setTimeout(r, 3000)); setAnalysis(MOCK_ANALYSIS); setAnalysing(false); setView("analysis"); };
  const getScoreColor = (s) => s >= 8 ? COLORS.accent : s >= 6 ? COLORS.warn : COLORS.danger;

  // ANALYSIS VIEW
  if (view === "analysis" && analysis) {
    return (
      <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden" }}>
        <div style={{ width: 380, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: `1px solid ${COLORS.border}` }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 14 }}>📊</span><div><div style={{ fontWeight: 600, fontSize: 13 }}>Key Moments</div><div style={{ fontSize: 10, color: COLORS.textDim }}>{analysis.highlights.length} flagged</div></div></div>
            <button onClick={() => setView("dashboard")} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "14px 16px" }}>
            {analysis.highlights.map((h, i) => (
              <div key={i} style={{ padding: "10px 14px", marginBottom: 6, borderRadius: 8, background: h.type === "positive" ? COLORS.accent + "08" : COLORS.danger + "08", border: `1px solid ${h.type === "positive" ? COLORS.accent + "22" : COLORS.danger + "22"}`, borderLeft: `3px solid ${h.type === "positive" ? COLORS.accent : COLORS.danger}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontFamily: FONT, fontSize: 10, color: h.type === "positive" ? COLORS.accent : COLORS.danger, fontWeight: 600 }}>{h.time}</span>
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: h.type === "positive" ? COLORS.accent + "20" : COLORS.danger + "20", color: h.type === "positive" ? COLORS.accent : COLORS.danger, fontFamily: FONT, fontWeight: 600 }}>{h.type === "positive" ? "STRENGTH" : "IMPROVE"}</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5 }}>{h.text}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 28 }}>
          <h3 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: "0 0 20px" }}>Call <span style={{ color: COLORS.accent }}>Analysis</span></h3>
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ width: 100, padding: "20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: getScoreColor(analysis.overallScore) }}>{analysis.overallScore}</div>
              <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT }}>OVERALL</div>
            </div>
            <div style={{ flex: 1, display: "flex", gap: 10 }}>
              <StatCard label="Duration" value={analysis.callDuration} accent={COLORS.blue} />
              <StatCard label="Talk/Listen" value={`${analysis.talkListenRatio.talk}/${analysis.talkListenRatio.listen}`} accent={analysis.talkListenRatio.talk > 60 ? COLORS.warn : COLORS.accent} />
              <StatCard label="Filler Words" value={analysis.fillerWords} accent={analysis.fillerWords > 10 ? COLORS.warn : COLORS.accent} />
            </div>
          </div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>SKILL BREAKDOWN</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
            {analysis.metrics.map((m, i) => (
              <div key={i} style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: getScoreColor(m.score) + "15", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 14, fontWeight: 700, color: getScoreColor(m.score), flexShrink: 0 }}>{m.score}</div>
                <div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{m.label}</div><div style={{ fontSize: 11, color: COLORS.textDim }}>{m.detail}</div></div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.accent, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>RECOMMENDATIONS</div>
          <div style={{ padding: "16px 20px", background: COLORS.accentBg, border: `1px solid ${COLORS.accent}22`, borderRadius: 12 }}>
            {analysis.recommendations.map((rec, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: i < analysis.recommendations.length - 1 ? 10 : 0, fontSize: 12, color: COLORS.text, lineHeight: 1.5 }}>
                <span style={{ color: COLORS.accent, fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span><div>{rec}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // UPLOAD VIEW
  if (view === "upload") {
    return (
      <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <button onClick={() => setView("dashboard")} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0 }}>Analyse <span style={{ color: COLORS.accent }}>Call</span></h2>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          {[{ label: "Paste Transcript", icon: "📋", desc: "Paste text directly", active: true }, { label: "Import from Fathom", icon: "🎙️", desc: "Connected ✓", active: false }, { label: "Import from Fireflies", icon: "🔥", desc: "Not connected", active: false }, { label: "Upload File", icon: "📄", desc: ".txt, .docx, .pdf", active: false }].map((opt, i) => (
            <div key={i} style={{ flex: 1, padding: "16px", background: opt.active ? COLORS.accentBg : COLORS.surface, border: `1px solid ${opt.active ? COLORS.accent + "33" : COLORS.border}`, borderRadius: 10, textAlign: "center", cursor: "pointer" }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{opt.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: opt.active ? COLORS.accent : COLORS.text }}>{opt.label}</div>
              <div style={{ fontSize: 10, color: COLORS.textDim }}>{opt.desc}</div>
            </div>
          ))}
        </div>
        <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Paste your sales call transcript here..." rows={12} style={{ width: "100%", padding: "16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", resize: "vertical", lineHeight: 1.7, boxSizing: "border-box", marginBottom: 16 }} />
        {analysing ? (
          <div style={{ padding: "40px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center" }}>
            <ProgressDots active={true} />
            <div style={{ fontSize: 13, color: COLORS.accent, marginTop: 8 }}>Analysing call transcript...</div>
          </div>
        ) : (
          <button onClick={runAnalysis} disabled={!transcript.trim()} style={{ width: "100%", padding: "14px", background: transcript.trim() ? COLORS.accent : COLORS.border, color: transcript.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: transcript.trim() ? "pointer" : "default" }}>🧠 Analyse Call</button>
        )}
      </div>
    );
  }

  // DASHBOARD VIEW
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>Sales Call <span style={{ color: COLORS.accent }}>Analyser</span></h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>Track call performance, close rates, and common objections</p>
        </div>
        <button onClick={() => setView("upload")} style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Analyse Call</button>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Calls" value={totalCalls} accent={COLORS.accent} />
        <StatCard label="Avg Score" value={`${avgScore}/10`} accent={parseFloat(avgScore) >= 7 ? COLORS.accent : COLORS.warn} />
        <StatCard label="Closed Won" value={closedWon} accent={COLORS.accent} />
        <StatCard label="Meetings Booked" value={meetingsBooked} accent={COLORS.blue} />
        <StatCard label="Close Rate" value={`${Math.round((closedWon / totalCalls) * 100)}%`} accent={COLORS.accent} />
      </div>

      {/* Call History */}
      <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>RECENT CALLS</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
        {CALL_HISTORY.map(call => (
          <div key={call.id} onClick={() => { setAnalysis(MOCK_ANALYSIS); setView("analysis"); }} style={{ padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "44"}
            onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: getScoreColor(call.score) + "15", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 14, fontWeight: 700, color: getScoreColor(call.score), flexShrink: 0 }}>{call.score}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{call.name}</div>
                <div style={{ fontSize: 10, color: COLORS.textDim }}>{call.date} · {call.duration} · {call.source}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 500,
                background: call.outcome === "Closed won" ? COLORS.accent + "15" : call.outcome === "No interest" ? COLORS.danger + "10" : COLORS.blue + "10",
                color: call.outcome === "Closed won" ? COLORS.accent : call.outcome === "No interest" ? COLORS.danger : COLORS.blue,
                border: `1px solid ${call.outcome === "Closed won" ? COLORS.accent + "22" : call.outcome === "No interest" ? COLORS.danger + "22" : COLORS.blue + "22"}`,
              }}>{call.outcome}</span>
              <span style={{ fontSize: 10, color: COLORS.textDim }}>→</span>
            </div>
          </div>
        ))}
      </div>

      {/* Common Objections */}
      <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>COMMON OBJECTIONS TRACKER</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {COMMON_OBJECTIONS.map((obj, i) => (
          <div key={i} style={{ padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>"{obj.objection}"</div>
              <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                <span style={{ color: COLORS.textDim }}>{obj.count} times</span>
                <span style={{ color: obj.winRate >= 60 ? COLORS.accent : obj.winRate >= 40 ? COLORS.warn : COLORS.danger, fontWeight: 600 }}>{obj.winRate}% win rate</span>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: COLORS.accent, fontFamily: FONT, fontWeight: 600 }}>BEST RESPONSE:</span>
              <span style={{ fontSize: 11, color: COLORS.textMuted }}>{obj.bestResponse}</span>
            </div>
            <div style={{ width: "100%", height: 3, borderRadius: 2, background: COLORS.border, marginTop: 8 }}>
              <div style={{ width: `${obj.winRate}%`, height: "100%", borderRadius: 2, background: obj.winRate >= 60 ? COLORS.accent : obj.winRate >= 40 ? COLORS.warn : COLORS.danger }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkedInContentView() {
  const [activeTab, setActiveTab] = useState("create");
  const [topic, setTopic] = useState("");
  const [format, setFormat] = useState("text");
  const [generatedPosts, setGeneratedPosts] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [schedulePost, setSchedulePost] = useState(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  const CONTENT_IDEAS = [
    { id: "i1", title: "Why AI won't replace consultants (but will replace their methods)", source: "trending", tag: "Trending in your industry", tagColor: COLORS.warn },
    { id: "i2", title: "The real cost of bad lead data — and how to fix it", source: "competitor", tag: "Your competitor posted about this", tagColor: COLORS.blue },
    { id: "i3", title: "How I went from 0 to 100 client testimonials in 12 months", source: "profile", tag: "Follow-up to your Feb 8 post", tagColor: COLORS.accent },
    { id: "i4", title: "The one-person agency model is the future of consulting", source: "pillar", tag: "Core content pillar", tagColor: "#7B61FF" },
    { id: "i5", title: "3 AI tools most people don't know exist (but should)", source: "engagement", tag: "High engagement topic", tagColor: COLORS.accent },
  ];

  const [callInsights, setCallInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState(null);

  useEffect(() => {
    setInsightsLoading(true);
    api.contentPosts.extractInsights().then(data => {
      const ins = Array.isArray(data?.insights) ? data.insights : [];
      setCallInsights(ins.map((item, i) => ({ id: `ci_${i}`, title: item.title || '', quote: item.quote || '', source: item.source || '', callDate: item.callDate || '' })));
    }).catch(err => {
      setInsightsError(err?.message || 'Could not extract insights');
    }).finally(() => setInsightsLoading(false));
  }, []);

  const [MOCK_COMPETITORS, setCompetitors] = useState([]);

  useEffect(() => {
    api.trackedCompetitors.list().then(data => {
      const comps = Array.isArray(data) ? data : data.tracked_competitors || [];
      setCompetitors(comps.map(c => ({ ...c, handle: c.handle || '', followers: c.followers || '', recentPost: c.recent_post || c.recentPost || '', engagement: c.engagement || '', tracked: true })));
    }).catch(() => {});
  }, []);

  const [MOCK_SCHEDULED, setScheduledPosts] = useState([]);
  const [MOCK_PUBLISHED, setPublishedPosts] = useState([]);

  useEffect(() => {
    api.contentPosts.list({ status: 'scheduled', platform: 'linkedin' }).then(data => {
      const posts = Array.isArray(data) ? data : data.content_posts || [];
      setScheduledPosts(posts.map(p => ({ ...p, date: p.scheduled_date || p.date || '', time: p.scheduled_time || p.time || '' })));
    }).catch(() => {});
    api.contentPosts.list({ status: 'published', platform: 'linkedin' }).then(data => {
      const posts = Array.isArray(data) ? data : data.content_posts || [];
      setPublishedPosts(posts.map(p => ({ ...p, date: p.published_date || p.date || '', impressions: p.impressions || 0, likes: p.likes || 0, comments: p.comments || 0, reposts: p.reposts || 0 })));
    }).catch(() => {});
  }, []);

  const [generateError, setGenerateError] = useState(null);

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 };

  const selectIdea = (title) => { setTopic(title); };

  const generate = async () => {
    if (!topic.trim() || isGenerating) return;
    setIsGenerating(true); setGenerateError(null); setGeneratedPosts([]);
    try {
      const res = await api.contentPosts.generate({ topic: topic.trim(), format });
      const posts = Array.isArray(res?.posts) ? res.posts : [];
      setGeneratedPosts(posts);
      if (posts.length === 0) setGenerateError('No content was generated. Try a different topic.');
    } catch (err) {
      setGenerateError(err?.message || 'Failed to generate content. Check your Anthropic API key.');
    }
    setIsGenerating(false);
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          LinkedIn <span style={{ color: COLORS.blue }}>Content</span>
        </h2>
        <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Create, schedule, and publish LinkedIn posts</p>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {[
          { key: "create", label: "Create" },
          { key: "competitors", label: "Competitors", count: MOCK_COMPETITORS.length },
          { key: "calendar", label: "Scheduled", count: MOCK_SCHEDULED.length },
          { key: "published", label: "Published", count: MOCK_PUBLISHED.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: activeTab === tab.key ? `2px solid ${COLORS.blue}` : "2px solid transparent",
            color: activeTab === tab.key ? COLORS.blue : COLORS.textMuted,
            fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
          }}>
            {tab.label}
            {tab.count !== undefined && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: activeTab === tab.key ? COLORS.blueBg : COLORS.surface, color: activeTab === tab.key ? COLORS.blue : COLORS.textDim }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Create Tab */}
      {activeTab === "create" && (
        <div>
          {/* Idea Sections */}
          <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
            {/* Content Ideas */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>💡</span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600 }}>CONTENT IDEAS</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {CONTENT_IDEAS.map(idea => (
                  <div key={idea.id} onClick={() => selectIdea(idea.title)} style={{
                    padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.blue + "66"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 6, lineHeight: 1.4 }}>{idea.title}</div>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: idea.tagColor + "15", color: idea.tagColor, fontFamily: FONT, fontWeight: 500 }}>{idea.tag}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* From Calls */}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>🎙️</span>
                <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600 }}>FROM YOUR CALLS</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {insightsLoading ? (
                  <div style={{ padding: "30px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, textAlign: "center" }}>
                    <ProgressDots active={true} />
                    <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 8 }}>Extracting insights from your calls...</div>
                  </div>
                ) : callInsights.length === 0 ? (
                  <div style={{ padding: "30px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 6, opacity: 0.2 }}>🎙️</div>
                    <div style={{ fontSize: 11, color: COLORS.textDim }}>{insightsError || 'No call transcripts yet. Add transcripts in Strategy → Transcripts to see insights here.'}</div>
                  </div>
                ) : callInsights.map(idea => (
                  <div key={idea.id} onClick={() => selectIdea(idea.title.replace(/[""]/g, ""))} style={{
                    padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.warn + "66"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.warn, marginBottom: 4, lineHeight: 1.4 }}>{idea.title}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 6 }}>{idea.quote}</div>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT }}>{idea.source}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generator */}
          <div style={{ padding: "24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>TOPIC / IDEA</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="Pick an idea above or write your own — what do you want to talk about?" rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>FORMAT</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[
                    { key: "text", label: "✍️ Text Post" },
                    { key: "image", label: "🖼️ Image Post" },
                    { key: "carousel", label: "📑 Carousel" },
                  ].map(f => (
                    <button key={f.key} onClick={() => setFormat(f.key)} style={{
                      flex: 1, padding: "10px", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
                      background: format === f.key ? COLORS.blue + "15" : "transparent",
                      border: `1px solid ${format === f.key ? COLORS.blue + "44" : COLORS.border}`,
                      color: format === f.key ? COLORS.blue : COLORS.textMuted, cursor: "pointer",
                    }}>{f.label}</button>
                  ))}
                </div>
              </div>
              <button onClick={generate} disabled={isGenerating || !topic.trim()} style={{
                padding: "14px 28px", background: topic.trim() ? COLORS.blue : COLORS.border,
                color: topic.trim() ? "#fff" : COLORS.textDim,
                border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600,
                cursor: topic.trim() && !isGenerating ? "pointer" : "default", whiteSpace: "nowrap", height: 46,
              }}>
                {isGenerating ? "Generating..." : "✍️ Generate"}
              </button>
            </div>
          </div>

          {/* Generated Results */}
          {generateError && !isGenerating && (
            <div style={{ padding: "16px 20px", background: COLORS.danger + "10", border: `1px solid ${COLORS.danger}33`, borderRadius: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: COLORS.danger }}>{typeof generateError === "string" ? generateError : (generateError?.message || String(generateError))}</div>
            </div>
          )}
          {isGenerating && (
            <div style={{ padding: "50px 40px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✍️</div>
              <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.blue }}>Writing your content...</div>
              <ProgressDots active={true} />
            </div>
          )}

          {generatedPosts.length > 0 && !isGenerating && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {generatedPosts.map((post, i) => (
                <div key={post.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.blue, fontWeight: 600 }}>OPTION {i + 1}</span>
                      <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: COLORS.blueBg, color: COLORS.blue, fontFamily: FONT }}>{post.format === "carousel" ? "carousel" : post.format === "image" ? "image post" : "text post"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => navigator.clipboard?.writeText(post.content || "")} style={{ padding: "5px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Copy</button>
                      <button onClick={() => setSchedulePost(post)} style={{ padding: "5px 12px", background: COLORS.blue, color: "#fff", border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Schedule →</button>
                    </div>
                  </div>
                  <div style={{ padding: "16px 20px" }}>
                    {post.format === "carousel" ? (
                      <div>
                        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 8 }}>
                          {post.slides.map(slide => (
                            <div key={slide.slide} style={{ width: 160, height: 200, flexShrink: 0, borderRadius: 10, background: slide.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center" }}>
                              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.5, whiteSpace: "pre-line" }}>{slide.text}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.textDim, marginTop: 8 }}>{post.slides.length} slides</div>
                      </div>
                    ) : (
                      <div>
                        {post.format === "image" && (
                          <div style={{ width: "100%", height: 200, borderRadius: 10, marginBottom: 12, background: `linear-gradient(135deg, ${COLORS.blue}33, ${COLORS.accent}33)`, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.border}` }}>
                            <div style={{ textAlign: "center" }}><div style={{ fontSize: 32, marginBottom: 6 }}>🖼️</div><div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim }}>AI-generated image</div></div>
                          </div>
                        )}
                        <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-line" }}>{post.content}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Schedule Modal */}
      {schedulePost && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSchedulePost(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Schedule Post</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>Will publish directly to LinkedIn via API</div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ padding: "12px 16px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16, maxHeight: 100, overflow: "auto" }}>
                <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.5 }}>{schedulePost.content ? schedulePost.content.substring(0, 150) + "..." : `${schedulePost.slides?.length || 0} slide carousel`}</div>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}><label style={labelStyle}>DATE</label><input value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} type="date" style={inputStyle} /></div>
                <div style={{ flex: 1 }}><label style={labelStyle}>TIME</label><input value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} type="time" style={inputStyle} /></div>
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setSchedulePost(null)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => setSchedulePost(null)} style={{ padding: "10px 24px", background: COLORS.blue, color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Schedule →</button>
            </div>
          </div>
        </div>
      )}

      {/* Competitors Tab */}
      {activeTab === "competitors" && (
        <div>
          <p style={{ color: COLORS.textMuted, marginBottom: 20, fontSize: 13 }}>Track LinkedIn creators and competitors. Their content signals feed into your topic ideas.</p>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button style={{ padding: "10px 20px", background: COLORS.blue, color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ ADD PROFILE</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {MOCK_COMPETITORS.map(comp => (
              <div key={comp.id} style={{ padding: "18px 22px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: COLORS.blue + "25", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: 16, color: COLORS.blue }}>{comp.name.charAt(0)}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{comp.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim }}>{comp.handle} · {comp.followers} followers</div>
                    </div>
                  </div>
                  <span style={{ padding: "4px 12px", borderRadius: 20, fontFamily: FONT, fontSize: 11, fontWeight: 500, background: COLORS.blueBg, color: COLORS.blue, border: `1px solid ${COLORS.blue}33` }}>tracking</span>
                </div>
                <div style={{ padding: "10px 14px", background: COLORS.bg, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 4 }}>LATEST POST</div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 4 }}>{comp.recentPost}</div>
                  <div style={{ fontSize: 11, color: COLORS.blue }}>{comp.engagement}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === "calendar" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MOCK_SCHEDULED.map(post => (
            <div key={post.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 48, textAlign: "center" }}>
                  <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, color: COLORS.blue }}>{post.date.split(" ")[1]}</div>
                  <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textDim }}>{post.date.split(" ")[0]}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 4, maxWidth: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{post.content}</div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: COLORS.blueBg, color: COLORS.blue, fontFamily: FONT }}>{post.format}</span>
                    <span style={{ fontSize: 11, color: COLORS.textDim }}>{post.time}</span>
                  </div>
                </div>
              </div>
              <span style={{ padding: "4px 12px", borderRadius: 20, fontFamily: FONT, fontSize: 11, fontWeight: 500, background: COLORS.blueBg, color: COLORS.blue, border: `1px solid ${COLORS.blue}33` }}>{post.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Published Tab */}
      {activeTab === "published" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MOCK_PUBLISHED.map(post => (
            <div key={post.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, marginRight: 20 }}>
                  <div style={{ fontSize: 13, color: COLORS.text, marginBottom: 6, lineHeight: 1.5 }}>{post.content.substring(0, 150)}...</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: COLORS.blueBg, color: COLORS.blue, fontFamily: FONT }}>{post.format}</span>
                    <span style={{ fontSize: 11, color: COLORS.textDim }}>{post.date}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[
                    { label: "Impressions", value: post.impressions.toLocaleString(), color: COLORS.text },
                    { label: "Likes", value: post.likes, color: COLORS.blue },
                    { label: "Comments", value: post.comments, color: COLORS.accent },
                    { label: "Reposts", value: post.reposts, color: COLORS.warn },
                  ].map(stat => (
                    <div key={stat.label} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontFamily: FONT, fontSize: 8, color: COLORS.textDim, letterSpacing: "0.06em", marginTop: 2 }}>{stat.label.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


function CommunityView() {
  const [activeTab, setActiveTab] = useState("feed");
  const [mode, setMode] = useState("review");
  const [accounts, setAccounts] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountPlatform, setNewAccountPlatform] = useState("skool");
  const [newAccountName, setNewAccountName] = useState("");
  const [voiceSamples, setVoiceSamples] = useState([]);

  useEffect(() => {
    api.community.accounts.list().then(data => setAccounts(Array.isArray(data) ? data : data.accounts || [])).catch(() => {});
    api.community.keywords.list().then(data => {
      const kws = Array.isArray(data) ? data : data.keywords || [];
      setKeywords(kws.map(k => typeof k === 'string' ? k : k.keyword || k.text || ''));
    }).catch(() => {});
    api.community.voiceSamples.list().then(data => setVoiceSamples(Array.isArray(data) ? data : data.voice_samples || [])).catch(() => {});
  }, []);
  const [newSampleText, setNewSampleText] = useState("");
  const [newSampleType, setNewSampleType] = useState("linkedin_post");
  const [showAgentWarning, setShowAgentWarning] = useState(false);

  const PLATFORMS = [
    { key: "skool", label: "Skool", icon: "🎓", color: "#4CAF50" },
    { key: "linkedin", label: "LinkedIn", icon: "💼", color: COLORS.blue },
    { key: "facebook", label: "Facebook", icon: "👥", color: "#1877F2" },
    { key: "instagram", label: "Instagram", icon: "📸", color: "#E1306C" },
    { key: "discord", label: "Discord", icon: "🎮", color: "#5865F2" },
    { key: "reddit", label: "Reddit", icon: "🔴", color: "#FF4500" },
    { key: "circle", label: "Circle", icon: "⭕", color: "#7B61FF" },
  ];

  const SAMPLE_TYPES = [
    { key: "linkedin_post", label: "LinkedIn Post" },
    { key: "blog", label: "Blog / Article" },
    { key: "comment", label: "Comment / Reply" },
    { key: "email", label: "Email" },
    { key: "tweet", label: "Tweet / X Post" },
    { key: "video_script", label: "Video Script" },
  ];

  const [MOCK_FEED, setFeedPosts] = useState([]);

  useEffect(() => {
    api.community.feed.list().then(data => {
      const posts = Array.isArray(data) ? data : data.feed || [];
      setFeedPosts(posts.map(p => ({ ...p, matchedKeywords: p.matched_keywords || p.matchedKeywords || [], draftReply: p.draft_reply || p.draftReply || '' })));
    }).catch(() => {});
  }, []);

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 };
  const getPlatform = (key) => PLATFORMS.find(p => p.key === key) || PLATFORMS[0];

  const handleModeSwitch = (newMode) => {
    if (newMode === "agent" && mode !== "agent") {
      setShowAgentWarning(true);
    } else {
      setMode(newMode);
    }
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      {/* Agent Warning Modal */}
      {showAgentWarning && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAgentWarning(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 480, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>🤖</span>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Enable Agent Mode</div>
              </div>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <div style={{ padding: "16px", background: COLORS.warn + "10", border: `1px solid ${COLORS.warn}33`, borderRadius: 8, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.warn, marginBottom: 6 }}>⚠️ Important</div>
                <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>
                  When Agent Mode is enabled, the AI agent will automatically post responses to community posts on your behalf. The agent will use your connected account credentials to log in and comment directly.
                </div>
              </div>
              <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 6 }}>
                The agent will:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {[
                  "Monitor your connected communities for keyword matches",
                  "Draft responses using your trained voice profile",
                  "Automatically post comments using your credentials",
                  "Log all actions in the agent activity feed",
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: COLORS.text }}>
                    <span style={{ color: COLORS.accent, flexShrink: 0, marginTop: 2 }}>✓</span>
                    {item}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>
                You can switch back to Review Mode at any time to pause automatic posting.
              </div>
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAgentWarning(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => { setMode("agent"); setShowAgentWarning(false); }} style={{ padding: "10px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Enable Agent Mode</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Community <span style={{ color: COLORS.accent }}>Monitor</span>
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Track keywords across communities and engage with AI-drafted responses</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: FONT, fontSize: 11, color: mode === "review" ? COLORS.text : COLORS.textDim }}>Review</span>
          <div onClick={() => handleModeSwitch(mode === "review" ? "agent" : "review")} style={{
            width: 44, height: 24, borderRadius: 12, cursor: "pointer",
            background: mode === "agent" ? COLORS.accent : COLORS.borderActive,
            position: "relative", transition: "background 0.2s",
          }}>
            <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: mode === "agent" ? 22 : 2, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
          </div>
          <span style={{ fontFamily: FONT, fontSize: 11, color: mode === "agent" ? COLORS.accent : COLORS.textDim }}>Agent</span>
        </div>
      </div>

      {/* Agent Mode Banner */}
      {mode === "agent" && (
        <div style={{ padding: "12px 18px", background: COLORS.accent + "10", border: `1px solid ${COLORS.accent}33`, borderRadius: 8, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <div style={{ fontSize: 12, color: COLORS.accent, fontWeight: 500 }}>Agent Mode is active — the AI will automatically respond to matching posts on your behalf</div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {[
          { key: "feed", label: "Feed", count: MOCK_FEED.length },
          { key: "activity", label: "Activity" },
          { key: "accounts", label: "Connected Accounts", count: accounts.length },
          { key: "keywords", label: "Keywords", count: keywords.length },
          { key: "voice", label: "Voice Training", count: voiceSamples.length },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: activeTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            color: activeTab === tab.key ? COLORS.accent : COLORS.textMuted,
            fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            {tab.label}
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: activeTab === tab.key ? COLORS.accentBg : COLORS.surface, color: activeTab === tab.key ? COLORS.accent : COLORS.textDim }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Accounts Tab */}
      {activeTab === "accounts" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={() => setShowAddAccount(!showAddAccount)} style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ CONNECT ACCOUNT</button>
          </div>

          {showAddAccount && (
            <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.accent}33`, borderRadius: 12, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Connect New Account</div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>PLATFORM</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {PLATFORMS.map(p => (
                    <div key={p.key} onClick={() => setNewAccountPlatform(p.key)} style={{
                      padding: "8px 14px", borderRadius: 8, cursor: "pointer",
                      background: newAccountPlatform === p.key ? p.color + "20" : "transparent",
                      border: `1px solid ${newAccountPlatform === p.key ? p.color + "55" : COLORS.border}`,
                      display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s",
                    }}>
                      <span>{p.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: newAccountPlatform === p.key ? p.color : COLORS.textMuted }}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>COMMUNITY / GROUP NAME</label>
                <input value={newAccountName} onChange={e => setNewAccountName(e.target.value)} placeholder="e.g. AI Automation Community" style={inputStyle} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={() => setShowAddAccount(false)} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { if (newAccountName.trim()) { setAccounts([...accounts, { id: Date.now(), platform: newAccountPlatform, name: newAccountName.trim(), connected: true }]); setNewAccountName(""); setShowAddAccount(false); } }} style={{ padding: "8px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Connect</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {accounts.map(acc => {
              const plat = getPlatform(acc.platform);
              return (
                <div key={acc.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: plat.color + "20", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{plat.icon}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{acc.name}</div>
                      <div style={{ fontSize: 11, color: COLORS.textDim }}>{plat.label}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ padding: "4px 12px", borderRadius: 20, fontFamily: FONT, fontSize: 11, fontWeight: 500, background: acc.connected ? COLORS.accentBg : COLORS.dangerBg, color: acc.connected ? COLORS.accent : COLORS.danger, border: `1px solid ${acc.connected ? COLORS.accent + "33" : COLORS.danger + "33"}` }}>
                      {acc.connected ? "connected" : "disconnected"}
                    </span>
                    <button onClick={() => setAccounts(accounts.filter(a => a.id !== acc.id))} style={{ padding: "4px 8px", background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer" }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keywords Tab */}
      {activeTab === "keywords" && (
        <div>
          <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, marginBottom: 16 }}>
            <label style={labelStyle}>ADD KEYWORD TO TRACK</label>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={newKeyword} onChange={e => setNewKeyword(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && newKeyword.trim()) { setKeywords([...keywords, newKeyword.trim()]); setNewKeyword(""); } }} placeholder="Type a keyword and press Enter..." style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => { if (newKeyword.trim()) { setKeywords([...keywords, newKeyword.trim()]); setNewKeyword(""); } }} style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Add</button>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {keywords.map((kw, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: COLORS.accentBg, border: `1px solid ${COLORS.accent}33`, borderRadius: 20, fontSize: 13, color: COLORS.accent }}>
                {kw}
                <span onClick={() => setKeywords(keywords.filter((_, j) => j !== i))} style={{ cursor: "pointer", fontSize: 14, color: COLORS.textDim, marginLeft: 2 }}>×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Voice Training Tab */}
      {activeTab === "voice" && (
        <div>
          <div style={{ padding: "16px 20px", background: COLORS.blue + "10", border: `1px solid ${COLORS.blue}22`, borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span style={{ fontSize: 20, marginTop: 2 }}>🧠</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.blue, marginBottom: 4 }}>Voice Training</div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, lineHeight: 1.6 }}>
                Add examples of your writing — LinkedIn posts, blog articles, comments, emails — so the AI learns your tone, vocabulary, and style. The more samples you provide, the more accurately it mirrors your voice in drafted responses.
              </div>
            </div>
          </div>

          {/* Add Sample */}
          <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Add Writing Sample</div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>CONTENT TYPE</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {SAMPLE_TYPES.map(t => (
                  <button key={t.key} onClick={() => setNewSampleType(t.key)} style={{
                    padding: "6px 12px", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600,
                    border: `1px solid ${newSampleType === t.key ? COLORS.accent + "55" : COLORS.border}`,
                    background: newSampleType === t.key ? COLORS.accentBg : "transparent",
                    color: newSampleType === t.key ? COLORS.accent : COLORS.textDim, cursor: "pointer",
                  }}>{t.label}</button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>PASTE YOUR CONTENT</label>
              <textarea value={newSampleText} onChange={e => setNewSampleText(e.target.value)}
                placeholder="Paste a LinkedIn post, blog excerpt, email, comment, or any writing that represents your voice..."
                rows={6} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => { if (newSampleText.trim()) { setVoiceSamples([{ id: Date.now(), type: newSampleType, title: SAMPLE_TYPES.find(t => t.key === newSampleType)?.label + " — " + new Date().toLocaleDateString(), preview: newSampleText.trim().substring(0, 150) + "...", date: new Date().toLocaleDateString() }, ...voiceSamples]); setNewSampleText(""); } }} disabled={!newSampleText.trim()} style={{
                padding: "10px 24px", background: newSampleText.trim() ? COLORS.accent : COLORS.border,
                color: newSampleText.trim() ? COLORS.bg : COLORS.textDim,
                border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
                cursor: newSampleText.trim() ? "pointer" : "default",
              }}>+ Add Sample</button>
            </div>
          </div>

          {/* Voice Profile Stats */}
          <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
            <div style={{ flex: 1, padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 600, color: COLORS.accent }}>{voiceSamples.length}</div>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", marginTop: 2 }}>TOTAL SAMPLES</div>
            </div>
            <div style={{ flex: 1, padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 600, color: voiceSamples.length >= 10 ? COLORS.accent : voiceSamples.length >= 5 ? COLORS.warn : COLORS.danger }}>
                {voiceSamples.length >= 10 ? "Strong" : voiceSamples.length >= 5 ? "Good" : "Building"}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", marginTop: 2 }}>VOICE ACCURACY</div>
            </div>
            <div style={{ flex: 1, padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 600, color: COLORS.blue }}>
                {[...new Set(voiceSamples.map(s => s.type))].length}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", marginTop: 2 }}>CONTENT TYPES</div>
            </div>
          </div>

          {/* Samples List */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {voiceSamples.map(sample => (
              <div key={sample.id} style={{ padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, marginRight: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: COLORS.blueBg, color: COLORS.blue, fontFamily: FONT, fontWeight: 500 }}>{SAMPLE_TYPES.find(t => t.key === sample.type)?.label || sample.type}</span>
                    <span style={{ fontSize: 11, color: COLORS.textDim }}>{sample.date}</span>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5 }}>{sample.preview}</div>
                </div>
                <button onClick={() => setVoiceSamples(voiceSamples.filter(s => s.id !== sample.id))} style={{ padding: "4px 8px", background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer", flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === "activity" && (() => {
        const MOCK_ACTIVITY = [
          { id: "a1", type: "agent", platform: "skool", community: "AI Automation Community", author: "Jake Morrison", postPreview: "Has anyone successfully set up an AI agent for lead generation?", reply: "Great question Jake! I've been running AI-powered lead gen for a while now. The key is layering tools...", timestamp: "2 hours ago", date: "Feb 11" },
          { id: "a2", type: "manual", platform: "linkedin", community: "SaaS Growth Leaders", author: "Sarah Chen", postPreview: "Hot take: Most companies are using AI wrong...", reply: "Couldn't agree more Sarah. The companies I work with that see the biggest results are the ones using AI for the high-leverage stuff...", timestamp: "4 hours ago", date: "Feb 11" },
          { id: "a3", type: "agent", platform: "skool", community: "AI Automation Community", author: "Marcus Williams", postPreview: "Just discovered vibe coding with Claude and it's completely changed how I build...", reply: "Love hearing this Marcus! You've nailed the key insight — the conversation-first approach is everything...", timestamp: "6 hours ago", date: "Feb 11" },
          { id: "a4", type: "manual", platform: "facebook", community: "Entrepreneurs Hub", author: "Lisa Park", postPreview: "Looking for recommendations on AI tools for lead generation...", reply: "Hey Lisa! I was in the exact same boat with Apollo. Switched to a stacked approach — AI Ark for smarter company discovery...", timestamp: "8 hours ago", date: "Feb 11" },
          { id: "a5", type: "agent", platform: "skool", community: "AI Automation Community", author: "Tom Richards", postPreview: "What's the best cold outreach tool in 2026?", reply: "Depends on your stack Tom, but I'd say Instantly for email and HeyReach for LinkedIn. The key is the data layer underneath...", timestamp: "Yesterday", date: "Feb 10" },
          { id: "a6", type: "manual", platform: "linkedin", community: "B2B Growth Hacks", author: "Nina Patel", postPreview: "Unpopular opinion: personalization at scale is a myth...", reply: "I'd push back on this Nina — it's not a myth, it's just that most tools do it poorly. When you feed AI real context about the prospect...", timestamp: "Yesterday", date: "Feb 10" },
          { id: "a7", type: "agent", platform: "facebook", community: "Entrepreneurs Hub", author: "David Kim", postPreview: "Anyone tried building an AI agent for customer onboarding?", reply: "This is a brilliant use case David. We've built exactly this for a client — cut onboarding time by 60%. The trick is...", timestamp: "2 days ago", date: "Feb 9" },
          { id: "a8", type: "manual", platform: "skool", community: "AI Automation Community", author: "Emma Lawson", postPreview: "Struggling to get my AI-generated emails past spam filters...", reply: "Emma, this is almost always a domain warm-up issue, not an AI issue. Here's what I'd check first...", timestamp: "2 days ago", date: "Feb 9" },
        ];

        const totalResponses = MOCK_ACTIVITY.length;
        const agentResponses = MOCK_ACTIVITY.filter(a => a.type === "agent").length;
        const manualResponses = MOCK_ACTIVITY.filter(a => a.type === "manual").length;
        const platforms = [...new Set(MOCK_ACTIVITY.map(a => a.platform))].length;

        return (
          <div>
            {/* Stats */}
            <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
              <StatCard label="Total Responses" value={totalResponses} accent={COLORS.accent} />
              <StatCard label="Agent Responses" value={agentResponses} accent={COLORS.blue} />
              <StatCard label="Manual Responses" value={manualResponses} accent={COLORS.warn} />
              <StatCard label="Platforms Active" value={platforms} accent="#7B61FF" />
            </div>

            {/* Timeline */}
            <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>RESPONSE TIMELINE</div>
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 15, top: 0, bottom: 0, width: 2, background: COLORS.border }} />

              {MOCK_ACTIVITY.map((item, i) => {
                const plat = getPlatform(item.platform);
                const showDateHeader = i === 0 || MOCK_ACTIVITY[i - 1].date !== item.date;
                return (
                  <div key={item.id}>
                    {showDateHeader && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, marginTop: i > 0 ? 16 : 0 }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.surface, border: `2px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                          <span style={{ fontSize: 12 }}>📅</span>
                        </div>
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.text }}>{item.date}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, marginBottom: 10, paddingLeft: 2 }}>
                      {/* Dot */}
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: item.type === "agent" ? COLORS.blue + "25" : COLORS.warn + "25", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1, marginTop: 4 }}>
                        <span style={{ fontSize: 12 }}>{item.type === "agent" ? "🤖" : "✍️"}</span>
                      </div>
                      {/* Card */}
                      <div style={{ flex: 1, padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12 }}>{plat.icon}</span>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{item.author}</span>
                            <span style={{ fontSize: 11, color: COLORS.textDim }}>{item.community}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: item.type === "agent" ? COLORS.blue + "15" : COLORS.warn + "15", color: item.type === "agent" ? COLORS.blue : COLORS.warn, fontFamily: FONT, fontWeight: 500 }}>
                              {item.type === "agent" ? "agent" : "manual"}
                            </span>
                            <span style={{ fontSize: 10, color: COLORS.textDim }}>{item.timestamp}</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 6, fontStyle: "italic" }}>"{item.postPreview}"</div>
                        <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.5, padding: "8px 12px", background: COLORS.bg, borderRadius: 6, border: `1px solid ${COLORS.border}` }}>
                          {item.reply}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Feed Tab */}
      {activeTab === "feed" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {MOCK_FEED.map(post => {
            const plat = getPlatform(post.platform);
            return (
              <div key={post.id} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: plat.color + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{plat.icon}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{post.author}</div>
                        <div style={{ fontSize: 11, color: COLORS.textDim }}>{post.community} · {post.timestamp}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {post.matchedKeywords.map(kw => (
                        <span key={kw} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: COLORS.accent + "15", color: COLORS.accent, fontFamily: FONT, fontWeight: 500 }}>{kw}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6 }}>{post.content}</div>
                  <div style={{ display: "flex", gap: 14, marginTop: 10, fontSize: 11, color: COLORS.textDim }}>
                    <span>❤️ {post.likes}</span>
                    <span>💬 {post.comments}</span>
                  </div>
                </div>
                <div style={{ padding: "16px 20px", background: COLORS.bg }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.accent, letterSpacing: "0.06em", fontWeight: 600 }}>AI DRAFT REPLY</span>
                    {voiceSamples.length > 0 && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: COLORS.blueBg, color: COLORS.blue, fontFamily: FONT }}>Voice-matched</span>}
                    {mode === "agent" && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: COLORS.accent + "15", color: COLORS.accent, fontFamily: FONT }}>Auto-posting</span>}
                  </div>
                  <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6, marginBottom: 12, padding: "12px 16px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                    {post.draftReply}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: COLORS.blue, textDecoration: "none", fontFamily: FONT }}>↗ View original post</a>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => navigator.clipboard?.writeText(post.draftReply)} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.textMuted; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; }}
                      >Copy Reply</button>
                      {mode === "agent" ? (
                        <button style={{ padding: "7px 14px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>🤖 Send via Agent</button>
                      ) : (
                        <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                          <button style={{ padding: "7px 14px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Open & Post →</button>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function ContentPlaceholder({ title, accent, icon, description, features }) {
  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          {title} <span style={{ color: accent }}>Content</span>
        </h2>
        <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>{description}</p>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Published", value: "—" },
          { label: "Scheduled", value: "—" },
          { label: "Drafts", value: "—" },
          { label: "Engagement", value: "—" },
        ].map(s => <StatCard key={s.label} label={s.label} value={s.value} accent={accent} />)}
      </div>

      <div style={{ padding: "32px 28px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{icon}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Coming Soon</div>
            <div style={{ fontSize: 12, color: COLORS.textDim }}>This module is under development</div>
          </div>
        </div>

        <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>PLANNED FEATURES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {features.map((feature, i) => (
            <div key={i} style={{
              padding: "12px 16px", background: COLORS.bg, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, background: accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: accent, fontFamily: FONT, fontWeight: 600, flexShrink: 0 }}>{i + 1}</div>
              <span style={{ fontSize: 13, color: COLORS.text }}>{feature}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px", background: accent + "08", border: `1px solid ${accent}22`, borderRadius: 10 }}>
        <div style={{ fontSize: 13, color: COLORS.textMuted, lineHeight: 1.6 }}>
          Want to shape this feature? We're building based on user feedback. The {title.toLowerCase()} module will integrate directly with your lead gen pipeline for a unified workflow.
        </div>
      </div>
    </div>
  );
}

function SolutionAIAssistantView() {
  const [messages, setMessages] = useState([
    { role: "agent", text: "Hi! 👋 I'm your AI Assistant with full context on your Pipeline account.\n\nI can see your leads, CRM deals, campaigns, and more. Think of me as a team member who's read every document and knows every number.\n\nTry asking me things like:\n• \"How many leads did we discover today?\"\n• \"What's our email campaign performance?\"\n• \"Show me leads that need follow-up\"\n• \"Draft a follow-up email for a prospect\"\n\nWhat would you like to know?" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  
  useEffect(() => { 
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, isTyping]);

  const CONTEXT_SOURCES = [
    { label: "CRM", count: "23 deals", icon: "📊", color: COLORS.accent },
    { label: "Leads", count: "—", icon: "⚡", color: COLORS.blue },
    { label: "Campaigns", count: "—", icon: "📧", color: COLORS.warn },
    { label: "Tasks", count: "—", icon: "📋", color: COLORS.green },
  ];

  const SUGGESTED = [
    "What leads should I prioritise today?",
    "Show me campaign performance",
    "What tasks are pending?",
    "Draft a follow-up email",
  ];

  const sendMessage = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input;
    const nm = [...messages, { role: "user", text: userMsg }];
    setMessages(nm); setInput(""); setIsTyping(true);
    try {
      const data = await api.assistant.chat({ message: userMsg });
      const reply = data.reply || data.message || data.text || "I couldn't generate a response. Please try again.";
      setMessages([...nm, { role: "agent", text: reply }]);
    } catch (err) {
      setMessages([...nm, { role: "agent", text: "Sorry, I encountered an error: " + (err.message || "Unknown error") + ". Please try again." }]);
    }
    setIsTyping(false);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
      <div style={{ padding: "16px 32px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700 }}>AI Assistant</div>
            <div style={{ fontSize: 11, color: COLORS.textDim }}>Personal AI with full org context</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CONTEXT_SOURCES.map(src => (
            <span key={src.label} style={{ display: "flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 4, fontSize: 8, background: src.color + "10", border: `1px solid ${src.color}22`, color: src.color, fontFamily: FONT, fontWeight: 600 }}>{src.icon} {src.label}: {src.count}</span>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "20px 32px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "70%", padding: "14px 18px", borderRadius: 14, background: msg.role === "user" ? COLORS.accent + "18" : COLORS.surface, border: `1px solid ${msg.role === "user" ? COLORS.accent + "33" : COLORS.border}`, borderBottomRightRadius: msg.role === "user" ? 4 : 14, borderBottomLeftRadius: msg.role === "agent" ? 4 : 14 }}>
              {msg.role === "agent" && <div style={{ fontSize: 9, color: COLORS.accent, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 4 }}>AI ASSISTANT</div>}
              <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.7, whiteSpace: "pre-line" }}>{msg.text}</div>
            </div>
          </div>
        ))}
        {isTyping && <div style={{ display: "flex" }}><div style={{ padding: "14px 18px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 14, borderBottomLeftRadius: 4 }}><div style={{ fontSize: 11, color: COLORS.textMuted }}>AI is thinking...</div></div></div>}
        <div ref={chatEndRef} />
      </div>

      {messages.length < 3 && (
        <div style={{ padding: "0 32px 10px", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {SUGGESTED.map((s, i) => (
            <button key={i} onClick={() => { setInput(s); }} style={{ padding: "6px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, fontSize: 11, color: COLORS.textMuted, fontFamily: FONT_BODY, cursor: "pointer" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.accent + "55"; e.currentTarget.style.color = COLORS.accent; }} onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ padding: "14px 32px", borderTop: `1px solid ${COLORS.border}`, display: "flex", gap: 10 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isTyping) sendMessage(); }} placeholder="Ask me anything about your business..." style={{ flex: 1, padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none" }} disabled={isTyping} />
        <button onClick={sendMessage} disabled={isTyping || !input.trim()} style={{ padding: "12px 24px", background: input.trim() && !isTyping ? COLORS.accent : COLORS.border, color: input.trim() && !isTyping ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 10, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: input.trim() && !isTyping ? "pointer" : "default" }}>Send</button>
      </div>
    </div>
  );
}

const CATEGORY_META = {
  "Lead Discovery": { icon: "🔍", color: COLORS.accent },
  "Enrichment": { icon: "✉️", color: COLORS.blue },
  "AI Analysis": { icon: "✨", color: "#7B61FF" },
  "Content & Scripts": { icon: "📝", color: COLORS.warn },
  "Other": { icon: "📊", color: COLORS.textMuted },
};

function AccountView() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", company: "", timezone: "Europe/London", photoUrl: "" });
  const [originalProfile, setOriginalProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [currentPlan, setCurrentPlan] = useState("growth");
  const [planName, setPlanName] = useState("Growth");
  const [planPrice, setPlanPrice] = useState("£247");
  const [creditsUsed, setCreditsUsed] = useState(0);
  const [creditsTotal, setCreditsTotal] = useState(2000);
  const [billingLoading, setBillingLoading] = useState(false);
  const [usageBreakdown, setUsageBreakdown] = useState([]);
  const [plans, setPlans] = useState([]);
  const [creditCosts, setCreditCosts] = useState([]);
  const [usageHistory, setUsageHistory] = useState([]);
  const [notifications, setNotifications] = useState({ weeklyDigest: true, creditAlert80: true, creditAlert100: true, campaignComplete: true, surveyResponses: false });
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [managingSubscription, setManagingSubscription] = useState(false);
  const [updatingPlan, setUpdatingPlan] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const result = await api.me();
        if (result && result.user) {
          const user = result.user;
          const nameParts = (user.name || "").split(" ");
          const profileData = {
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: user.email || "",
            company: user.company || "",
            timezone: user.timezone || "Europe/London",
            photoUrl: user.profile_photo_url || "",
          };
          setProfile(profileData);
          setOriginalProfile(profileData);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  useEffect(() => {
    async function loadBilling() {
      setBillingLoading(true);
      try {
        const [planRes, creditsRes, usageRes, plansRes, costsRes, historyRes, subRes] = await Promise.all([
          api.billing.plan().catch(() => null),
          api.billing.credits().catch(() => null),
          api.billing.usageByAction().catch(() => null),
          api.billing.plans().catch(() => []),
          api.billing.creditCosts().catch(() => []),
          api.billing.creditHistory().catch(() => []),
          api.billing.subscription().catch(() => null),
        ]);
        if (planRes) {
          const key = (planRes.plan || planRes.name || "starter").toLowerCase();
          setCurrentPlan(key);
          setPlanName(planRes.name || "Starter");
          const p = planRes.price_monthly ?? planRes.price;
          setPlanPrice(typeof p === "number" ? `£${p}` : (p || "£97"));
        }
        if (creditsRes) {
          const used = creditsRes.credits_used_this_month ?? 0;
          const total = creditsRes.credits_allocated ?? creditsRes.credits ?? 2000;
          setCreditsUsed(used);
          setCreditsTotal(total);
        }
        if (usageRes?.byCategory) {
          const cats = Object.entries(usageRes.byCategory).map(([category, credits]) => ({
            category,
            credits,
            icon: (CATEGORY_META[category] || CATEGORY_META.Other).icon,
            color: (CATEGORY_META[category] || CATEGORY_META.Other).color,
          }));
          setUsageBreakdown(cats);
        }
        if (Array.isArray(plansRes) && plansRes.length) {
          setPlans(plansRes.map(p => ({
            key: p.key || (p.name || "").toLowerCase(),
            name: p.name || p.key || "Plan",
            price: typeof p.price === "number" ? `£${p.price}` : (p.price || "£0"),
            credits: p.credits ?? 0,
            features: Array.isArray(p.features_json) ? p.features_json : (typeof p.features_json === "string" ? (() => { try { return JSON.parse(p.features_json); } catch { return []; } })() : []),
          })));
        }
        if (Array.isArray(costsRes) && costsRes.length) {
          setCreditCosts(costsRes.map(c => ({
            action: c.action_label || c.action_key || "",
            cost: c.costDisplay || `${c.credits} credit${c.credits !== 1 ? "s" : ""}${c.unit ? "/" + (c.unit.replace(/^per /, "") || c.unit) : ""}`,
          })));
        }
        if (Array.isArray(historyRes) && historyRes.length) {
          setUsageHistory(historyRes.filter(h => (h.amount || 0) < 0).map(h => {
            const d = h.created_at ? new Date(h.created_at) : new Date();
            const dateStr = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
            return {
              date: dateStr,
              action: h.description || (h.action ? `${h.action.replace(/_/g, " ")}` : "Credit usage"),
              credits: Math.abs(Number(h.amount || 0)),
              balance: h.balance_after ?? 0,
            };
          }));
        }
        if (subRes && typeof subRes === "object") {
          setSubscriptionInfo(subRes);
        }
      } catch (err) {
        console.error("Failed to load billing:", err);
      } finally {
        setBillingLoading(false);
      }
    }
    if (activeTab === "billing") loadBilling();
  }, [activeTab]);

  useEffect(() => {
    async function loadPlanForProfile() {
      if (activeTab !== "profile") return;
      try {
        const planRes = await api.billing.plan().catch(() => null);
        if (planRes) {
          setCurrentPlan((planRes.plan || planRes.name || "starter").toLowerCase());
          setPlanName(planRes.name || "Starter");
        }
      } catch (_) {}
    }
    loadPlanForProfile();
  }, [activeTab]);

  async function handleSaveProfile() {
    setSaving(true);
    setSaveMessage("");
    try {
      const name = `${profile.firstName} ${profile.lastName}`.trim();
      await api.updateProfile({
        name,
        company: profile.company,
        timezone: profile.timezone,
      });
      setOriginalProfile(profile);
      setSaveMessage("Profile updated successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setSaveMessage("Failed to save profile. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSaveMessage("Please select an image file");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage("Image size must be less than 5MB");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }
    
    setUploadingPhoto(true);
    setSaveMessage("");
    try {
      const result = await api.uploadProfilePhoto(file);
      setProfile({ ...profile, photoUrl: result.photoUrl });
      setSaveMessage("Profile photo uploaded successfully!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Failed to upload photo:", err);
      setSaveMessage("Failed to upload photo. Please try again.");
      setTimeout(() => setSaveMessage(""), 3000);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 };

  const PLANS = [
    { key: "starter", name: "Starter", price: "£97", credits: 500, features: ["500 credits/mo", "Lead discovery + enrichment", "1 AI audit/mo", "Script generator", "Email support", "1 user"] },
    { key: "growth", name: "Growth", price: "£247", credits: 2000, features: ["2,000 credits/mo", "Unlimited AI audits", "Full enrichment pipeline", "Messaging workshop", "Call analyser", "Priority support", "3 users"] },
    { key: "scale", name: "Scale", price: "£497", credits: 5000, features: ["5,000 credits/mo", "Everything in Growth", "AI Council access", "Custom integrations", "Dedicated support", "White-label reports", "10 users"] },
  ];

  const USAGE_BREAKDOWN = [
    { category: "Lead Discovery", credits: 412, icon: "🔍", color: COLORS.accent },
    { category: "Enrichment", credits: 536, icon: "✉️", color: COLORS.blue },
    { category: "AI Analysis", credits: 175, icon: "✨", color: "#7B61FF" },
    { category: "Content & Scripts", credits: 124, icon: "📝", color: COLORS.warn },
  ];

  const USAGE_HISTORY = [
    { date: "Feb 11", action: "Lead enrichment — Q1 SaaS VP Growth", credits: 84, balance: 753 },
    { date: "Feb 10", action: "AI Audit analysis — Hodge Insurance", credits: 25, balance: 837 },
    { date: "Feb 10", action: "Script generation — Insurance Cold Call", credits: 5, balance: 862 },
    { date: "Feb 9", action: "Niche research — Property Management", credits: 10, balance: 867 },
    { date: "Feb 8", action: "Lead discovery — 150 leads", credits: 150, balance: 877 },
    { date: "Feb 8", action: "Email verification — 150 leads", credits: 150, balance: 1027 },
    { date: "Feb 7", action: "AI personalisation — 89 leads", credits: 178, balance: 1177 },
    { date: "Feb 6", action: "Deck generation — Hodge Insurance", credits: 15, balance: 1355 },
  ];

  const creditPct = Math.round((creditsUsed / creditsTotal) * 100);
  const creditColor = creditPct > 90 ? COLORS.danger : creditPct > 70 ? COLORS.warn : COLORS.accent;

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0 }}>
          <span style={{ color: COLORS.accent }}>Account</span>
        </h2>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {[{ key: "profile", label: "👤 Profile" }, { key: "billing", label: "💳 Billing" }, { key: "notifications", label: "🔔 Notifications" }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: "10px 20px", background: "transparent", border: "none",
            borderBottom: activeTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent",
            color: activeTab === tab.key ? COLORS.accent : COLORS.textMuted,
            fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* PROFILE TAB */}
      {activeTab === "profile" && (
        <div style={{ maxWidth: 560 }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: COLORS.textMuted }}>Loading profile...</div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28, padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
                <div style={{ 
                  width: 64, 
                  height: 64, 
                  borderRadius: 12, 
                  background: profile.photoUrl ? COLORS.accent + "15" : COLORS.accent + "15", 
                  display: "flex", 
                  alignItems: "center", 
                  justifyContent: "center", 
                  fontSize: 28, 
                  flexShrink: 0,
                  position: "relative",
                  overflow: "hidden"
                }}>
                  {profile.photoUrl ? (
                    <img 
                      src={profile.photoUrl} 
                      alt="Profile" 
                      style={{ 
                        width: "100%", 
                        height: "100%", 
                        objectFit: "cover",
                        objectPosition: "center"
                      }} 
                    />
                  ) : (
                    "👤"
                  )}
                  {uploadingPhoto && (
                    <div style={{ 
                      position: "absolute", 
                      inset: 0, 
                      background: "rgba(0,0,0,0.7)", 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      color: "white",
                      fontSize: 12
                    }}>...</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{profile.firstName || "Your Name"}</div>
                  <div style={{ fontSize: 12, color: COLORS.textDim }}>{profile.email}</div>
                  <div style={{ fontSize: 11, color: COLORS.accent, marginTop: 2 }}>{planName} Plan</div>
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload}
                  style={{ display: "none" }}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  style={{ 
                    padding: "6px 14px", 
                    background: "transparent", 
                    border: `1px solid ${COLORS.border}`, 
                    borderRadius: 6, 
                    color: COLORS.textMuted, 
                    fontFamily: FONT, 
                    fontSize: 10, 
                    fontWeight: 600, 
                    cursor: uploadingPhoto ? "not-allowed" : "pointer",
                    opacity: uploadingPhoto ? 0.6 : 1
                  }}
                >
                  {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div><label style={labelStyle}>FIRST NAME</label><input value={profile.firstName} onChange={e => setProfile({ ...profile, firstName: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>LAST NAME</label><input value={profile.lastName} onChange={e => setProfile({ ...profile, lastName: e.target.value })} placeholder="Enter last name" style={inputStyle} /></div>
                </div>
                <div><label style={labelStyle}>EMAIL ADDRESS</label><div style={{ display: "flex", gap: 8 }}><input value={profile.email} disabled style={{ ...inputStyle, flex: 1, opacity: 0.6 }} /><button disabled style={{ padding: "10px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "not-allowed", whiteSpace: "nowrap", opacity: 0.5 }}>Change Email</button></div></div>
                <div><label style={labelStyle}>COMPANY NAME</label><input value={profile.company} onChange={e => setProfile({ ...profile, company: e.target.value })} placeholder="Enter company name" style={inputStyle} /></div>
                <div><label style={labelStyle}>TIMEZONE</label><select value={profile.timezone} onChange={e => setProfile({ ...profile, timezone: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}><option value="Europe/London">Europe/London (GMT)</option><option value="America/New_York">America/New_York (EST)</option><option value="America/Los_Angeles">America/Los_Angeles (PST)</option><option value="Asia/Dubai">Asia/Dubai (GST)</option></select></div>
                <div><label style={labelStyle}>PASSWORD</label><button style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>🔒 Send Password Reset Link</button></div>
              </div>
              
              {saveMessage && (
                <div style={{ 
                  marginTop: 16, 
                  padding: "12px 16px", 
                  background: saveMessage.includes("success") ? COLORS.accent + "15" : COLORS.danger + "15",
                  border: `1px solid ${saveMessage.includes("success") ? COLORS.accent + "33" : COLORS.danger + "33"}`,
                  borderRadius: 8,
                  color: saveMessage.includes("success") ? COLORS.accent : COLORS.danger,
                  fontSize: 13,
                  fontFamily: FONT_BODY
                }}>
                  {saveMessage}
                </div>
              )}
              
              <button 
                onClick={handleSaveProfile} 
                disabled={saving}
                style={{ 
                  marginTop: 24, 
                  padding: "12px 28px", 
                  background: saving ? COLORS.textMuted : COLORS.accent, 
                  color: COLORS.bg, 
                  border: "none", 
                  borderRadius: 8, 
                  fontFamily: FONT, 
                  fontSize: 12, 
                  fontWeight: 600, 
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      )}

      {/* BILLING TAB */}
      {activeTab === "billing" && (
        <div>
          {/* Current Plan */}
          <div style={{ padding: "24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 20 }}>{planName}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 600, background: COLORS.accent + "15", color: COLORS.accent }}>{planPrice}/mo</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.textDim }}>
                  {subscriptionInfo ? (
                    <>
                      Renews {subscriptionInfo.renewal_date ? new Date(subscriptionInfo.renewal_date).toLocaleDateString("en-GB", { month: "long", day: "numeric", year: "numeric" }) : (subscriptionInfo.renews_at ? new Date(subscriptionInfo.renews_at).toLocaleDateString("en-GB", { month: "long", day: "numeric", year: "numeric" }) : "—")}
                      {subscriptionInfo.has_payment_method && subscriptionInfo.payment_method_last4 ? ` · Paid via ${subscriptionInfo.payment_method_brand || "Card"} ****${subscriptionInfo.payment_method_last4}` : subscriptionInfo.has_payment_method === false ? " · No payment method" : ""}
                    </>
                  ) : "Renews — · Payment method —"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={async () => {
                    setManagingSubscription(true);
                    try {
                      const data = await api.billing.manageSubscription();
                      if (data?.url) window.location.href = data.url;
                    } catch (e) {
                      console.error(e);
                      alert(e?.message || "Could not open subscription management.");
                    } finally {
                      setManagingSubscription(false);
                    }
                  }}
                  disabled={managingSubscription}
                  style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: managingSubscription ? "default" : "pointer", opacity: managingSubscription ? 0.6 : 1 }}
                >{managingSubscription ? "Opening..." : "Manage Subscription"}</button>
              </div>
            </div>
            <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textDim }}>CREDITS USED THIS MONTH</span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: creditColor }}>{creditsUsed.toLocaleString()} / {creditsTotal.toLocaleString()}</span>
            </div>
            <div style={{ width: "100%", height: 8, background: COLORS.bg, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${creditPct}%`, height: "100%", background: creditColor, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 10, color: COLORS.textDim }}>{creditPct}% used</span>
              <span style={{ fontSize: 10, color: COLORS.textDim }}>{(creditsTotal - creditsUsed).toLocaleString()} remaining</span>
            </div>
          </div>

          {/* Credit Usage Breakdown */}
          <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
            {(usageBreakdown.length ? usageBreakdown : USAGE_BREAKDOWN).map((cat, i) => (
              <div key={i} style={{ flex: 1, padding: "16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600 }}>{cat.category.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 700, color: cat.color, fontFamily: FONT }}>{cat.credits}</div>
                <div style={{ fontSize: 10, color: COLORS.textDim }}>credits used</div>
              </div>
            ))}
          </div>

          {/* Plan Comparison */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Plans</div>
            <div style={{ display: "flex", gap: 12 }}>
              {(plans.length ? plans : PLANS).map(plan => {
                const allPlans = plans.length ? plans : PLANS;
                const currentPlanCredits = allPlans.find(p => p.key === currentPlan)?.credits ?? creditsTotal;
                return (
                <div key={plan.key} style={{ flex: 1, padding: "20px", background: COLORS.surface, border: `1px solid ${plan.key === currentPlan ? COLORS.accent + "55" : COLORS.border}`, borderRadius: 12, position: "relative" }}>
                  {plan.key === currentPlan && <div style={{ position: "absolute", top: -1, left: 20, right: 20, height: 3, background: COLORS.accent, borderRadius: "0 0 2px 2px" }} />}
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{plan.name}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.accent, marginBottom: 4 }}>{plan.price}<span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textDim }}>/mo</span></div>
                  <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 14 }}>{(plan.credits || 0).toLocaleString()} credits/month</div>
                  {(Array.isArray(plan.features) ? plan.features : []).map((f, fi) => (
                    <div key={fi} style={{ fontSize: 11, color: COLORS.text, padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: COLORS.accent, fontSize: 10 }}>✓</span> {typeof f === "string" ? f : f.label || f.name || ""}
                    </div>
                  ))}
                  <button
                    disabled={plan.key === currentPlan || updatingPlan !== null}
                    onClick={async () => {
                      if (plan.key === currentPlan) return;
                      setUpdatingPlan(plan.key);
                      try {
                        await api.billing.updatePlan(plan.key);
                        setCurrentPlan(plan.key);
                        setPlanName(plan.name);
                        setPlanPrice(plan.price);
                      } catch (e) {
                        console.error(e);
                        alert(e?.message || "Could not update plan.");
                      } finally {
                        setUpdatingPlan(null);
                      }
                    }}
                    style={{ width: "100%", marginTop: 14, padding: "10px", borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: plan.key === currentPlan || updatingPlan ? "default" : "pointer", background: plan.key === currentPlan ? "transparent" : COLORS.accent, color: plan.key === currentPlan ? COLORS.textDim : COLORS.bg, border: plan.key === currentPlan ? `1px solid ${COLORS.border}` : "none", opacity: updatingPlan && updatingPlan !== plan.key ? 0.6 : 1 }}
                  >{plan.key === currentPlan ? "Current Plan" : updatingPlan === plan.key ? "Updating..." : (plan.credits || 0) > currentPlanCredits ? "Upgrade" : "Downgrade"}</button>
                </div>
              );})}
            </div>
          </div>

          {/* Credit Cost Reference */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Credit Costs</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {(creditCosts.length ? creditCosts : [
                { action: "Lead discovery", cost: "1 credit/lead" },
                { action: "Email verification", cost: "1 credit/lead" },
                { action: "Phone lookup", cost: "2 credits/lead" },
                { action: "Company enrichment", cost: "2 credits/lead" },
                { action: "ICP scoring", cost: "1 credit/lead" },
                { action: "AI personalisation", cost: "2 credits/lead" },
                { action: "AI audit analysis", cost: "25 credits" },
                { action: "Deck generation", cost: "15 credits" },
                { action: "Script generation", cost: "5 credits" },
                { action: "Niche research", cost: "10 credits" },
              ]).map((item, i) => (
                <div key={i} style={{ padding: "8px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: COLORS.text }}>{item.action}</span>
                  <span style={{ fontSize: 10, color: COLORS.accent, fontFamily: FONT, fontWeight: 600 }}>{item.cost}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Usage History */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Recent Usage</div>
            <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
              {(usageHistory.length ? usageHistory : USAGE_HISTORY).map((entry, i, arr) => (
                <div key={i} style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: i < arr.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.text }}>{entry.action}</div>
                    <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>{entry.date}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.warn }}>-{entry.credits}</div>
                    <div style={{ fontSize: 10, color: COLORS.textDim }}>{entry.balance} remaining</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === "notifications" && (
        <div style={{ maxWidth: 560 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { key: "weeklyDigest", label: "Weekly Digest", desc: "Summary of pipeline activity, credits used, and campaign performance" },
              { key: "creditAlert80", label: "Credit Alert — 80% Used", desc: "Get notified when you've used 80% of your monthly credits" },
              { key: "creditAlert100", label: "Credit Alert — 100% Used", desc: "Get notified when your credits run out" },
              { key: "campaignComplete", label: "Campaign Completion", desc: "Notification when enrichment or outreach campaigns finish processing" },
              { key: "surveyResponses", label: "New Survey Responses", desc: "Alert when stakeholders submit audit survey responses" },
            ].map(notif => (
              <div key={notif.key} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{notif.label}</div>
                  <div style={{ fontSize: 11, color: COLORS.textDim }}>{notif.desc}</div>
                </div>
                <div onClick={() => setNotifications({ ...notifications, [notif.key]: !notifications[notif.key] })} style={{ width: 44, height: 24, borderRadius: 12, cursor: "pointer", background: notifications[notif.key] ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.25s", flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: notifications[notif.key] ? 23 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ flex: 1, padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
      <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 600, color: accent }}>{value}</div>
      <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", marginTop: 4 }}>{label.toUpperCase()}</div>
    </div>
  );
}
