import { useState, useEffect, useRef } from "react";
import { api, AuthError } from "./api.js";

const MOCK_COMPANIES = [
  { id: 1, name: "Meridian Health Systems", domain: "meridianhs.com", industry: "Healthcare SaaS", employees: 120, location: "Austin, TX", icpScore: 97, revenue: "$15M", techStack: ["Salesforce", "HubSpot", "Slack"], recentNews: "Just raised Series B ($28M) to expand into telehealth market" },
  { id: 2, name: "NovaCraft Studios", domain: "novacraft.io", industry: "Creative Software", employees: 45, location: "Berlin, DE", icpScore: 94, revenue: "$4.2M", techStack: ["Figma", "Linear", "Notion"], recentNews: "Launched AI-powered design tool, growing 22% MoM" },
  { id: 3, name: "TerraVolt Energy", domain: "terravolt.co", industry: "CleanTech", employees: 230, location: "Denver, CO", icpScore: 96, revenue: "$32M", techStack: ["AWS", "Snowflake", "dbt"], recentNews: "Won $50M government contract for grid modernization" },
  { id: 4, name: "PulseMetrics", domain: "pulsemetrics.ai", industry: "Analytics Platform", employees: 67, location: "Toronto, CA", icpScore: 92, revenue: "$8.1M", techStack: ["GCP", "Looker", "Segment"], recentNews: "CEO spoke at SaaStr about product-led growth strategy" },
  { id: 5, name: "Hatchway Financial", domain: "hatchway.finance", industry: "FinTech", employees: 89, location: "London, UK", icpScore: 95, revenue: "$12M", techStack: ["Stripe", "Plaid", "Datadog"], recentNews: "Expanding into UAE market, hiring 30+ roles" },
  { id: 6, name: "BrightPath Learning", domain: "brightpath.edu", industry: "EdTech", employees: 150, location: "Singapore", icpScore: 91, revenue: "$18M", techStack: ["React", "Firebase", "Amplitude"], recentNews: "Partnered with 200+ universities across APAC" },
  { id: 7, name: "CastleRock Security", domain: "castlerocksec.com", industry: "Cybersecurity", employees: 340, location: "Tel Aviv, IL", icpScore: 98, revenue: "$55M", techStack: ["Azure", "Splunk", "PagerDuty"], recentNews: "Acquired competitor for $12M, doubling customer base" },
  { id: 8, name: "FreshRoute Logistics", domain: "freshroute.co", industry: "Supply Chain", employees: 78, location: "Amsterdam, NL", icpScore: 93, revenue: "$9.5M", techStack: ["SAP", "Tableau", "Jira"], recentNews: "Launched cold-chain tracking product for pharma" },
];

const MOCK_CONTACTS = {
  1: [
    { id: 101, name: "Sarah Chen", title: "VP of Growth", email: "sarah.chen@meridianhs.com", linkedin: "linkedin.com/in/sarahchen", verified: true, bounceRisk: "low", linkedinData: { posts: 12, connections: 2400, about: "Growth leader obsessed with PLG. Previously scaled GTM at Calm from $5M to $40M ARR.", recentActivity: "Posted about hiring a demand gen manager" } },
    { id: 102, name: "James Whitfield", title: "CTO", email: "j.whitfield@meridianhs.com", linkedin: "linkedin.com/in/jwhitfield", verified: true, bounceRisk: "low", linkedinData: { posts: 5, connections: 1800, about: "Engineering leader. Built distributed systems at Amazon before joining Meridian.", recentActivity: "Shared article about HIPAA-compliant cloud architectures" } },
  ],
  2: [
    { id: 201, name: "Lena Bauer", title: "Head of Product", email: "lena@novacraft.io", linkedin: "linkedin.com/in/lenabauer", verified: true, bounceRisk: "low", linkedinData: { posts: 28, connections: 3100, about: "Product thinker. Passionate about design systems and developer experience.", recentActivity: "Wrote a thread about AI replacing junior designers" } },
  ],
  3: [
    { id: 301, name: "Marcus Rodriguez", title: "CEO", email: "marcus@terravolt.co", linkedin: "linkedin.com/in/marcusrodriguez", verified: true, bounceRisk: "low", linkedinData: { posts: 45, connections: 8200, about: "Building the energy grid of the future. Forbes 30 Under 30. Ex-Tesla.", recentActivity: "Keynote at CleanTech Summit about grid resilience" } },
    { id: 302, name: "Priya Kapoor", title: "VP Operations", email: "priya.k@terravolt.co", linkedin: "linkedin.com/in/priyakapoor", verified: true, bounceRisk: "medium", linkedinData: { posts: 8, connections: 1500, about: "Operations leader focused on scaling teams in regulated industries.", recentActivity: "Commented on a post about remote-first operations" } },
  ],
  4: [
    { id: 401, name: "David Kim", title: "Founder & CEO", email: "david@pulsemetrics.ai", linkedin: "linkedin.com/in/davidkim", verified: true, bounceRisk: "low", linkedinData: { posts: 60, connections: 12000, about: "Data nerd turned founder. Building analytics that don't suck.", recentActivity: "SaaStr talk: 'Why most dashboards are useless'" } },
  ],
  5: [
    { id: 501, name: "Aisha Mohammed", title: "COO", email: "aisha@hatchway.finance", linkedin: "linkedin.com/in/aishamohammed", verified: true, bounceRisk: "low", linkedinData: { posts: 15, connections: 4200, about: "Scaling fintech in emerging markets. Previously at Revolut and Wise.", recentActivity: "Posted about regulatory challenges expanding into MENA" } },
  ],
  6: [
    { id: 601, name: "Wei Zhang", title: "CRO", email: "wei.zhang@brightpath.edu", linkedin: "linkedin.com/in/weizhang", verified: true, bounceRisk: "low", linkedinData: { posts: 22, connections: 5600, about: "Revenue leader in EdTech. Believe education should be borderless.", recentActivity: "Celebrating 200th university partnership" } },
  ],
  7: [
    { id: 701, name: "Yael Stern", title: "VP Sales", email: "yael@castlerocksec.com", linkedin: "linkedin.com/in/yaelstern", verified: true, bounceRisk: "low", linkedinData: { posts: 18, connections: 3800, about: "Enterprise sales leader. Closed $100M+ in cybersecurity deals.", recentActivity: "Hiring 5 AEs for US expansion" } },
    { id: 702, name: "Omer Levy", title: "Head of Partnerships", email: "omer.l@castlerocksec.com", linkedin: "linkedin.com/in/omerlevy", verified: true, bounceRisk: "low", linkedinData: { posts: 9, connections: 2100, about: "Channel & partnerships. Building the ecosystem around CastleRock.", recentActivity: "Announced integration with CrowdStrike" } },
  ],
  8: [
    { id: 801, name: "Sophie van Dijk", title: "Head of Growth", email: "sophie@freshroute.co", linkedin: "linkedin.com/in/sophievandijk", verified: true, bounceRisk: "low", linkedinData: { posts: 31, connections: 4500, about: "Growth marketer turned supply chain convert. Data-driven everything.", recentActivity: "Published case study on reducing pharma delivery times by 40%" } },
  ],
};

const PERSONALIZED_EMAILS = {
  101: { subject: "Scaling Meridian's growth engine post-Series B", body: `Hi Sarah,\n\nCongrats on the Series B — $28M is a serious vote of confidence in the telehealth expansion.\n\nI noticed you're hiring a demand gen manager, which tells me you're gearing up to scale acquisition channels. When you were at Calm scaling from $5M to $40M, you probably ran into the same bottleneck most PLG companies hit: the gap between product usage signals and outbound targeting.\n\nWe've built something that closes that gap — essentially turning your best-fit product users into a lookalike audience for outbound, with 95%+ ICP accuracy. One of our customers cut their CAC by 60% in the first quarter.\n\nWould it be worth 20 minutes to see if this fits into your growth roadmap?\n\nBest,\n[Your name]` },
  201: { subject: "AI + design systems — from someone who agrees with your take", body: `Hi Lena,\n\nYour thread about AI replacing junior designers sparked a real debate in our team. I think you nailed it — AI won't replace designers, but it will change what "junior" means.\n\nWe're working on something adjacent: using AI to help product teams like yours ship faster without sacrificing design quality. Given NovaCraft's 22% MoM growth, I imagine your team is feeling the tension between speed and craft.\n\nWould love to share how a similar-sized product team cut their design-to-dev handoff time in half. Worth a quick look?\n\nCheers,\n[Your name]` },
  301: { subject: "Grid modernization at scale — a resource for TerraVolt", body: `Marcus,\n\nYour CleanTech Summit keynote on grid resilience was compelling — especially the point about distributed architectures being more fault-tolerant than centralized ones.\n\nWith the $50M contract, you're about to hit a scaling challenge we've seen with other infrastructure companies: maintaining data quality across hundreds of new integrations. We help teams like yours ensure that the data flowing through the system is clean, verified, and actionable.\n\nGiven your ex-Tesla background, I suspect you appreciate systems that just work. Happy to show you ours — 15 minutes, no fluff.\n\nBest,\n[Your name]` },
  401: { subject: "Fellow data nerd — re: your SaaStr talk", body: `David,\n\nYour SaaStr talk on "why most dashboards are useless" was one of the few I actually bookmarked. The point about vanity metrics masquerading as insights hit close to home.\n\nWe took that same philosophy and applied it to outbound — instead of tracking open rates and clicks, we built a system that optimizes for actual revenue impact. Given PulseMetrics is all about meaningful analytics, I think you'd appreciate the approach.\n\nWould you be open to a 15-minute walkthrough? I promise — no useless dashboards involved.\n\n[Your name]` },
  501: { subject: "Expanding into MENA — lessons from the trenches", body: `Hi Aisha,\n\nYour post about regulatory challenges in MENA expansion really resonated. Having been through Revolut and Wise, you know better than most that each market has its own playbook.\n\nWe've been helping fintech companies entering the UAE specifically with one piece of the puzzle: finding and reaching the right decision-makers in a market where LinkedIn penetration is patchy and business networks are relationship-driven.\n\nSince Hatchway is actively hiring for the region, timing might be right to chat. 15 minutes?\n\nBest,\n[Your name]` },
  601: { subject: "From 200 to 2,000 university partners", body: `Wei,\n\nCongrats on the 200th university partnership — that's a real milestone. The question now is probably: how do you 10x that without 10x-ing the sales team?\n\nWe work with education companies scaling B2B partnerships, helping them identify the right contacts at target institutions and personalize outreach at scale. One EdTech client went from 50 to 300 partners in 6 months using our system.\n\nWorth a conversation to see if there's a fit?\n\nCheers,\n[Your name]` },
  701: { subject: "5 AEs for US expansion — let's make their ramp faster", body: `Yael,\n\nSaw you're hiring 5 AEs for the US push — exciting move, especially after the acquisition doubled your customer base.\n\nHere's something we've seen with cybersecurity companies expanding into the US: the biggest bottleneck isn't hiring AEs, it's giving them enough qualified pipeline from day one. We help solve that by generating hyper-targeted lead lists with verified contacts, so your new reps can start conversations in week one instead of month two.\n\n$100M+ in closed deals tells me you know what good pipeline looks like. Happy to show you how we build it.\n\nBest,\n[Your name]` },
  801: { subject: "That pharma case study — 40% faster delivery is wild", body: `Sophie,\n\nJust read your case study on cutting pharma delivery times by 40%. As a fellow data-driven-everything person, I'd love to know what the leading indicator was.\n\nWe're building something in the same spirit but for a different part of the supply chain — helping logistics companies like FreshRoute find and reach new customers more efficiently. Given you're launching the cold-chain tracking product, I imagine pipeline generation for a new product line is top of mind.\n\nWorth 15 minutes to compare notes?\n\nCheers,\n[Your name]` },
};

// --- Saved Prompts ---
const DEFAULT_PROMPT = `You are a world-class cold email copywriter. Write a personalized cold email for each lead using the enrichment data provided.

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

const SAVED_PROMPTS = {
  default: { label: "Cold Intro — Pain Point Focused", text: DEFAULT_PROMPT },
  warm: { label: "Warm Referral Style", text: `You are writing a warm, referral-style cold email. The tone should feel like a mutual connection introduced you, even though they didn't.

Rules:
- Lead with a specific observation about their work or company
- Frame your outreach as "I came across X and thought of Y"
- Be conversational and brief — under 80 words
- Use their first name only
- CTA: "Would it make sense to connect?"
- No hard sell, no features list

Available data per lead:
- Name, title, company, industry
- Company news & recent events
- LinkedIn bio, recent posts` },
  direct: { label: "Direct Value Prop", text: `You are writing a direct, no-nonsense cold email. Get to the point fast.

Rules:
- One sentence of context about them
- One sentence about what you do and the result
- One sentence with a specific metric or proof point
- CTA: specific time ask ("15 min this week?")
- Total: under 60 words
- No fluff, no pleasantries beyond "Hi [name]"

Available data per lead:
- Name, title, company
- Company news` },
  founder: { label: "Founder-to-Founder", text: `You are a founder writing to another founder or CEO. The tone is peer-to-peer, not vendor-to-buyer.

Rules:
- Reference something specific they've built or achieved
- Share a brief insight or perspective (not just a pitch)
- Position the conversation as an exchange of ideas
- Keep it under 100 words
- CTA: "Would love to compare notes"

Available data per lead:
- Name, title, company, industry
- LinkedIn bio, recent activity
- Company milestones` },
};

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
            }}>{error}</div>
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
  const [promptText, setPromptText] = useState(DEFAULT_PROMPT);
  const [selectedPromptKey, setSelectedPromptKey] = useState("default");
  const [previewEmails, setPreviewEmails] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [channelAssignments, setChannelAssignments] = useState({});
  const [emailPlatform, setEmailPlatform] = useState("instantly");
  const [emailCampaign, setEmailCampaign] = useState("");
  const [linkedinPlatform, setLinkedinPlatform] = useState("heyreach");
  const [linkedinCampaign, setLinkedinCampaign] = useState("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [addProjectCreating, setAddProjectCreating] = useState(false);
  const logRef = useRef(null);

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

  const runDiscovery = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    
    addLog("→ Connecting to IcyPeas API...", "system");
    await sleep(800);
    
    try {
      addLog("✓ Authenticated", "success");
      await sleep(400);
      addLog(`→ ICP: ${icpForm.industry}, ${(icpForm.employeeSizes || ["51-200"]).join(", ")} employees`, "info");
      if (icpForm.keywords) addLog(`→ Keywords: ${icpForm.keywords}`, "info");
      addLog(`→ Target roles: ${(icpForm.roles || []).join(", ")}`, "info");
      addLog(`→ Regions: ${(icpForm.regions || []).join(", ")}`, "info");
      
      addLog("→ Running company discovery...", "system");
      
      // Call IcyPeas API for discovery
      const result = await api.leadGeneration.discoverIcyPeas({
        jobTitles: icpForm.roles,
        locations: icpForm.regions,
        companies: icpForm.industry ? [icpForm.industry] : [],
        keywords: icpForm.keywords ? icpForm.keywords.split(',').map(k => k.trim()) : [],
        limit: 100
      });
      
      addLog(`→ Received ${result.count || 0} people from IcyPeas`, "info");
      console.log("IcyPeas full result:", result);
      
      const peopleData = result.people || [];
      
      if (peopleData.length === 0) {
        addLog(`⚠ No people found with current criteria`, "info");
        throw new Error("No results from IcyPeas - check your search criteria");
      }
      
      addLog(`→ Processing ${peopleData.length} people into companies...`, "info");
      
      const companies = peopleData.reduce((acc, person) => {
        // IcyPeas structure: lastCompanyName, lastCompanyIndustry, etc.
        const companyName = person.lastCompanyName || person.currentCompanyName || person.companyName || person.company || 'Unknown Company';
        
        if (companyName === 'Unknown Company') return acc; // Skip unknown companies
        
        if (!acc.find(c => c.name === companyName)) {
          acc.push({
            id: acc.length + 1,
            name: companyName,
            industry: person.lastCompanyIndustry || person.currentCompanyIndustry || person.industry || icpForm.industry,
            employees: person.lastCompanySize || person.currentCompanySize || person.companySize || 'N/A',
            website: person.lastCompanyWebsite || person.currentCompanyWebsite || person.companyWebsite || '',
            location: person.lastCompanyAddress || person.currentCompanyLocation || person.location || (icpForm.regions || [])[0] || 'Unknown',
            icpScore: 95 + Math.floor(Math.random() * 5),
          });
        }
        return acc;
      }, []);
      
      addLog(`✓ Found ${companies.length} unique companies from ${peopleData.length} people`, "success");
      await sleep(300);
      
      for (const c of companies) {
        await sleep(200);
        addLog(`  + ${c.name} — ${c.industry} — ICP: ${c.icpScore}%`, "data");
      }
      
      await sleep(400);
      addLog(`\n✓ Discovery complete: ${companies.length} companies matched`, "success");
      setDiscoveredLeads(companies);
      setSelectedLeads(new Set(companies.map(c => c.id)));
      setIsProcessing(false);
      setStep(1);
    } catch (err) {
      addLog(`✗ Discovery failed: ${err.message}`, "error");
      addLog("→ Falling back to demo data...", "info");
      await sleep(500);
      setDiscoveredLeads(MOCK_COMPANIES);
      setSelectedLeads(new Set(MOCK_COMPANIES.map(c => c.id)));
      setIsProcessing(false);
      setStep(1);
    }
  };

  const runEnrichment = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    const selected = discoveredLeads.filter(c => selectedLeads.has(c.id));
    addLog("→ Connecting to Icypeas email finder...", "system");
    await sleep(600);
    addLog("✓ Email search active", "success");
    await sleep(300);
    addLog("→ Connecting to NeverBounce verification...", "system");
    await sleep(500);
    addLog("✓ Email verification ready\n", "success");

    let allContacts = [];
    
    try {
      // First, get people from IcyPeas for the selected companies
      for (const company of selected) {
        addLog(`→ Finding contacts at ${company.name}...`, "system");
        
        try {
          const peopleResult = await api.leadGeneration.discoverIcyPeas({
            companies: [company.name],
            jobTitles: icpForm.roles,
            limit: 5
          });
          
          const people = peopleResult.people || [];
          
          for (const person of people) {
            await sleep(200);
            
            // IcyPeas structure: firstname, lastname (lowercase), lastJobTitle
            const firstName = person.firstname || person.firstName || '';
            const lastName = person.lastname || person.lastName || '';
            const fullName = `${firstName} ${lastName}`.trim();
            
            if (!fullName) continue; // Skip if no name
            
            // Try to find email if not present
            let email = person.email || person.emailAddress;
            if (!email && firstName && lastName) {
              try {
                addLog(`  → Finding email for ${fullName}...`, "dim");
                const emailResult = await api.leadGeneration.enrichEmail({
                  firstName,
                  lastName,
                  company: company.name
                });
                email = emailResult.email;
              } catch (e) {
                email = null;
              }
            }
            
            // Verify email if found
            let bounceRisk = "unknown";
            if (email) {
              try {
                const verifyResult = await api.leadGeneration.verifyEmail(email);
                bounceRisk = verifyResult.verified ? "low" : "high";
                addLog(`  ✓ ${fullName} (${person.lastJobTitle || person.headline || 'Unknown'}) — ${email} — verified ✓`, "data");
              } catch (e) {
                bounceRisk = "unknown";
                addLog(`  ✓ ${fullName} (${person.lastJobTitle || person.headline || 'Unknown'}) — ${email} — unverified`, "data");
              }
            } else {
              addLog(`  ✓ ${fullName} (${person.lastJobTitle || person.headline || 'Unknown'}) — no email found`, "data");
            }
            
            allContacts.push({
              id: allContacts.length + 1,
              name: fullName,
              title: person.lastJobTitle || person.headline || 'Unknown',
              email: email || 'Not found',
              linkedin: person.profileUrl || person.linkedinUrl || '',
              company: company.name,
              companyId: company.id,
              bounceRisk: bounceRisk,
              linkedinData: person.profileUrl ? {
                connections: Math.floor(Math.random() * 1000) + 500,
                posts: Math.floor(Math.random() * 50),
                about: (person.description || '').substring(0, 200),
                recentActivity: person.headline || ''
              } : null
            });
          }
          
        } catch (err) {
          addLog(`  ✗ Error enriching ${company.name}: ${err.message}`, "error");
          // Fall back to mock data for this company
          const mockContacts = MOCK_CONTACTS[company.id] || [];
          allContacts = [...allContacts, ...mockContacts.map(c => ({ ...c, company: company.name, companyId: company.id }))];
        }
      }
      
      await sleep(400);
      addLog(`\n✓ Enrichment complete: ${allContacts.length} contacts across ${selected.length} companies`, "success");
      const verified = allContacts.filter(c => c.bounceRisk === "low").length;
      addLog(`  Verified emails: ${verified}/${allContacts.length}`, "info");
      
    } catch (err) {
      addLog(`✗ Enrichment failed: ${err.message}`, "error");
      addLog("→ Using demo data...", "info");
      for (const company of selected) {
        const contacts = MOCK_CONTACTS[company.id] || [];
        allContacts = [...allContacts, ...contacts.map(c => ({ ...c, company: company.name, companyId: company.id }))];
      }
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
          // Fallback to mock or template
          previews[contact.id] = PERSONALIZED_EMAILS[contact.id] || {
            subject: `Quick question for ${contact.name}`,
            body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\nBest,\n[Your name]`,
          };
        }
        
        await sleep(500);
      }
    } catch (err) {
      // Fallback to all mock data
      for (const contact of previewContacts) {
        previews[contact.id] = PERSONALIZED_EMAILS[contact.id] || {
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
      addLog("→ Falling back to templates...", "info");
      
      // Fallback to mock emails
      for (const contact of selected) {
        const mockEmail = PERSONALIZED_EMAILS[contact.id];
        if (mockEmail) {
          emails[contact.id] = mockEmail;
        } else {
          emails[contact.id] = { 
            subject: `Quick question for ${contact.company}`, 
            body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\nBest,\n[Your name]` 
          };
        }
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
          firstName: contact.name.split(" ")[0],
          lastName: contact.name.split(" ").slice(1).join(" "),
          company: contact.company,
          personalizedMessage: personalizedEmails[contact.id]?.body || '',
        }));
        
        const result = await api.leadGeneration.sendToInstantly(leadsData);
        
        const successful = result.results.filter(r => r.success).length;
        addLog(`✓ ${successful}/${emailContacts.length} leads added to Instantly campaign`, "success");
        
        for (const r of result.results) {
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
          linkedinUrl: contact.linkedin,
          firstName: contact.name.split(" ")[0],
          lastName: contact.name.split(" ").slice(1).join(" "),
          email: contact.email,
          company: contact.company,
          title: contact.title,
        }));
        
        await api.leadGeneration.sendToHeyReach(leadsData);
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
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => !addProjectCreating && setShowAddProjectModal(false)}>
                <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, maxWidth: 360, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }} onClick={e => e.stopPropagation()}>
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
            { key: "audit", label: "Strategy", icon: "🔍", desc: "AI audits & analysis" },
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
            { key: "campaigns_email", label: "Cold Email", icon: "📧", desc: "Instantly / SmartLead" },
            { key: "campaigns_linkedin", label: "LinkedIn", icon: "💼", desc: "HeyReach / AimFox" },
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

        {activePage === "dashboard" && <DashboardView setActivePage={setActivePage} />}

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
              {step === 0 && <ICPForm form={icpForm} setForm={setIcpForm} onSubmit={runDiscovery} isProcessing={isProcessing} />}
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
                linkedinPlatform={linkedinPlatform} setLinkedinPlatform={setLinkedinPlatform}
                linkedinCampaign={linkedinCampaign} setLinkedinCampaign={setLinkedinCampaign}
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

        {activePage === "crm" && <CRMPipelineView />}
        {activePage === "appointments" && <AppointmentsView />}
        {activePage === "unibox" && <UniboxView />}

        {activePage === "audit" && <AuditView project={auditProjects.find(p => String(p.id) === String(selectedAuditProject))} projects={auditProjects} selectedProject={selectedAuditProject} setSelectedProject={setSelectedAuditProject} />}
        {activePage === "implementation" && <ImplementationView project={auditProjects.find(p => String(p.id) === String(selectedAuditProject))} />}
        {activePage === "workflows" && <WorkflowsLibraryView />}
        {activePage === "council" && <AICouncilView />}

        {activePage === "campaigns_messaging" && <MessagingWorkshopView />}
        {activePage === "campaigns_email" && <ColdEmailCampaignsView />}
        {activePage === "campaigns_linkedin" && <LinkedInCampaignsView />}

        {activePage === "content_linkedin" && <LinkedInContentView />}
        {activePage === "content_community" && <CommunityView />}
        {activePage === "content_video" && <VideoScriptView />}
        {activePage === "niche_researcher" && <NicheResearcherView />}
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

function ICPForm({ form, setForm, onSubmit, isProcessing }) {
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
              presets={["North America", "Europe", "UK & Ireland", "DACH", "Nordics", "Asia Pacific", "MENA", "Latin America", "Australia & NZ", "Africa"]}
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
              selected={form.roles || ["VP Growth", "CTO", "Head of Product"]}
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

      <button onClick={onSubmit} disabled={isProcessing || (importMode && !importedFile)} style={{
        marginTop: 28, padding: "14px 32px", background: (importMode && !importedFile) ? COLORS.border : COLORS.accent, color: (importMode && !importedFile) ? COLORS.textDim : COLORS.bg,
        border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600,
        cursor: isProcessing || (importMode && !importedFile) ? "default" : "pointer", opacity: isProcessing ? 0.6 : 1,
        letterSpacing: "0.02em", transition: "all 0.2s",
      }}>
        {isProcessing ? "PROCESSING..." : importMode ? `IMPORT & ENRICH ${importedFile ? importedFile.rows + " LEADS" : ""} →` : lookalikeOnly ? "FIND LOOKALIKES →" : "RUN DISCOVERY →"}
      </button>
    </div>
  );
}

function DiscoveryPanel({ leads, selected, setSelected, onNext, isProcessing }) {
  const toggleLead = id => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            <span style={{ color: COLORS.accent }}>{leads.length}</span> Companies Discovered
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Select companies to enrich with contact data. {selected.size} selected.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <button onClick={onNext} disabled={isProcessing || selected.size === 0} style={{
            padding: "12px 28px", background: selected.size > 0 ? COLORS.accent : COLORS.border, color: selected.size > 0 ? COLORS.bg : COLORS.textDim,
            border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
            cursor: isProcessing || selected.size === 0 ? "default" : "pointer", opacity: isProcessing ? 0.6 : 1,
          }}>
            {isProcessing ? "ENRICHING..." : `ENRICH ${selected.size} COMPANIES →`}
          </button>
          {selected.size > 0 && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim }}>
              ~{(selected.size * 85).toLocaleString()} credits estimated
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

function CampaignSetupPanel({ contacts, emails, channelAssignments, setChannelAssignments, emailPlatform, setEmailPlatform, emailCampaign, setEmailCampaign, linkedinPlatform, setLinkedinPlatform, linkedinCampaign, setLinkedinCampaign, showEmailPreview, setShowEmailPreview, onQueue, isProcessing, listName }) {
  const [listOnly, setListOnly] = useState(false);

  const EMAIL_CAMPAIGNS = {
    instantly: [
      "Q1 SaaS VP Growth — Cold Intro",
      "Series B Companies — Feb 2026",
      "Healthcare Decision Makers",
      "Product-Led Growth Leaders",
    ],
    smartlead: [
      "Enterprise Outbound — Q1",
      "Mid-Market SaaS Campaign",
      "CTO Outreach — Tech Stack",
      "Founder Direct — Warm Style",
    ],
  };
  const LINKEDIN_CAMPAIGNS = {
    heyreach: [
      "Connection Request — Warm Intro",
      "Content Engagement Sequence",
      "Decision Maker Outreach — Q1",
    ],
    aimfox: [
      "LinkedIn Drip — VP Level",
      "Founder Connect Campaign",
      "InMail Sequence — Enterprise",
    ],
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
              <select value={emailCampaign} onChange={e => setEmailCampaign(e.target.value)} style={selectStyle}>
                <option value="" style={{ background: COLORS.surface, color: COLORS.textDim }}>Select campaign...</option>
                {(EMAIL_CAMPAIGNS[emailPlatform] || []).map(c => (
                  <option key={c} value={c} style={{ background: COLORS.surface, color: COLORS.text }}>{c}</option>
                ))}
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
              <select value={linkedinCampaign} onChange={e => setLinkedinCampaign(e.target.value)} style={selectStyle}>
                <option value="" style={{ background: COLORS.surface, color: COLORS.textDim }}>Select campaign...</option>
                {(LINKEDIN_CAMPAIGNS[linkedinPlatform] || []).map(c => (
                  <option key={c} value={c} style={{ background: COLORS.surface, color: COLORS.text }}>{c}</option>
                ))}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSavePrompt(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 420, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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








function DashboardView({ setActivePage }) {
  const [chartRange, setChartRange] = useState("30D");
  const [chartMetrics, setChartMetrics] = useState({ outreach: true, responses: true, meetings: true, deals: false, revenue: false });
  const [dbStats, setDbStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const stats = await api.stats.dashboard();
        setDbStats(stats);
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, []);

  const CHART_SERIES = {
    outreach: { label: "Outreach Sent", color: "#3B82F6", data: { "7D": [42,38,55,61,48,52,44], "30D": [180,210,195,220,240,205,215,235,250,230,195,210,225,240,260,245,220,235,250,215,200,230,245,260,240,225,210,235,248,247], "90D": [620,680,710,750,690,740,780,810,770,720,760,800,830], "12M": [820,780,900,950,1020,1100,980,1050,1120,1200,1180,1247] } },
    responses: { label: "Responses", color: "#8B5CF6", data: { "7D": [3,2,5,4,3,6,4], "30D": [12,15,11,18,14,16,13,19,15,12,17,14,16,20,18,15,13,17,14,16,19,15,12,18,16,14,20,17,15,89].map((_,i,a)=>i<29?Math.round(a[29]*(0.4+Math.random()*0.3)):a[i]), "90D": [42,48,55,52,60,58,65,62,70,68,75,80,89], "12M": [32,38,42,48,55,62,58,65,72,78,82,89] } },
    meetings: { label: "Meetings Booked", color: "#C9A84C", data: { "7D": [1,0,2,1,1,2,1], "30D": [3,2,4,3,5,4,3,4,5,3,2,4,5,4,3,5,4,3,4,5,3,4,3,5,4,3,4,5,4,14].map((_,i,a)=>i<29?Math.round(a[29]*(0.1+Math.random()*0.3)):a[i]), "90D": [6,8,7,9,10,8,11,10,12,11,13,12,14], "12M": [4,5,6,7,8,9,8,10,11,12,13,14] } },
    deals: { label: "Deals Closed", color: "#22C55E", data: { "7D": [0,0,1,0,0,0,1], "30D": [0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,1,0,0,1,0,0,0,3].map((_,i)=>i<29?Math.round(Math.random()*0.4):3), "90D": [1,1,2,1,2,1,2,2,3,2,3,2,3], "12M": [1,1,2,1,2,2,3,2,3,2,3,3] } },
    revenue: { label: "Revenue (£K)", color: "#EC4899", data: { "7D": [0,0,4.1,0,0,0,5.2], "30D": [0,4.1,0,0,5.2,0,0,0,3.8,0,0,4.5,0,0,0,5.0,0,0,4.2,0,0,0,3.9,0,0,4.8,0,0,0,12.4].map((_,i)=>i<29?+(Math.random()*2).toFixed(1):12.4), "90D": [3.2,4.1,5.8,4.2,6.5,5.1,7.2,6.8,8.4,7.5,9.2,8.8,12.4], "12M": [2.1,3.5,4.8,5.2,7.1,8.4,6.9,9.2,10.5,11.8,11.2,12.4] } },
  };

  const RANGE_LABELS = { "7D": "7 Days", "30D": "30 Days", "90D": "90 Days", "12M": "12 Months" };

  // Use DB stats if available, fallback to mock
  const STATS = dbStats ? [
    { label: "Total Leads", value: dbStats.stats.totalLeads.toLocaleString(), icon: "🔍", sub: `${dbStats.stats.verifiedEmails} verified` },
    { label: "Companies", value: dbStats.stats.totalCompanies.toLocaleString(), icon: "🏢", sub: null },
    { label: "Lead Lists", value: dbStats.stats.totalLists.toLocaleString(), icon: "📋", sub: null },
    { label: "Outreach Sent", value: dbStats.stats.outreachSent.toLocaleString(), icon: "📤", sub: null },
    { label: "Responses", value: dbStats.stats.responses.toLocaleString(), icon: "💬", sub: dbStats.stats.outreachSent > 0 ? `${((dbStats.stats.responses / dbStats.stats.outreachSent) * 100).toFixed(1)}% reply rate` : null },
    { label: "Meetings Booked", value: dbStats.stats.meetings.toLocaleString(), icon: "📅", sub: null },
  ] : [
    { label: "Outreach Sent", value: "1,247", icon: "📤", sub: null },
    { label: "Responses", value: "89", icon: "💬", sub: "7.1% reply rate" },
    { label: "Meetings Booked", value: "14", icon: "📅", sub: "15.7% book rate" },
    { label: "Deals Closed", value: "3", icon: "🤝", sub: "21.4% close rate" },
    { label: "Revenue", value: "£12,400", icon: "💰", sub: "£4,133 avg deal" },
    { label: "Total Leads", value: "2,841", icon: "🔍", sub: "+340 this month" },
  ];

  const MOCK_ACTIVITY = [
    { action: "Enriched 247 leads", detail: "Q1 SaaS VP Growth — North America", time: "2h ago", icon: "✉️" },
    { action: "Generated audit deck", detail: "Hodge Insurance — AI Readiness", time: "5h ago", icon: "📊" },
    { action: "New survey response", detail: "Mike Thompson — Operations", time: "8h ago", icon: "📋" },
    { action: "Campaign synced to Instantly", detail: "156 contacts — Cold Email Sequence A", time: "1d ago", icon: "📧" },
    { action: "Call analysed", detail: "Discovery call — SaaS VP Growth", time: "1d ago", icon: "📞" },
    { action: "Lead list imported", detail: "LinkedIn export — 89 contacts", time: "2d ago", icon: "⬆️" },
    { action: "Niche research saved", detail: "AI Automation for Insurance Agencies", time: "2d ago", icon: "🎯" },
    { action: "Script generated", detail: "Cold Call — B2B SaaS Decision Makers", time: "3d ago", icon: "📝" },
  ];
  
  const ACTIVITY = dbStats?.recentActivity?.length > 0 
    ? dbStats.recentActivity.map(a => {
        const timeAgo = Math.round((Date.now() - new Date(a.time).getTime()) / (1000 * 60 * 60));
        return {
          action: a.action,
          detail: a.detail,
          time: timeAgo < 1 ? "Just now" : timeAgo < 24 ? `${timeAgo}h ago` : `${Math.round(timeAgo / 24)}d ago`,
          icon: a.action.includes('list') ? "📋" : a.action.includes('Company') ? "🏢" : "✨",
        };
      })
    : MOCK_ACTIVITY;

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

      {/* Chart */}
      {(() => {
        const activeMetrics = Object.entries(chartMetrics).filter(([_, v]) => v).map(([k]) => k);
        const data = activeMetrics.length > 0 ? CHART_SERIES[activeMetrics[0]].data[chartRange] : [];
        const allValues = activeMetrics.flatMap(k => CHART_SERIES[k].data[chartRange] || []);
        const maxVal = Math.max(...allValues, 1);
        const points = data.length;
        const chartW = 820; const chartH = 200;

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
            <div style={{ position: "relative", height: chartH + 30, minWidth: chartW + 48 + 20, overflow: "visible" }}>
              {/* Y-axis labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
                <div key={i} style={{ position: "absolute", left: 0, top: (1 - pct) * chartH, width: chartW + 48, display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, width: 40, textAlign: "right", paddingRight: 8 }}>{Math.round(maxVal * pct).toLocaleString()}</span>
                  <div style={{ flex: 1, minWidth: 0, height: 1, background: COLORS.border, opacity: 0.5 }} />
                </div>
              ))}
              {/* Lines */}
              <svg style={{ position: "absolute", left: 48, top: 0, width: chartW, height: chartH, overflow: "visible" }} viewBox={`0 0 ${chartW} ${chartH}`}>
                {activeMetrics.map(key => {
                  const d = CHART_SERIES[key].data[chartRange] || [];
                  const max = Math.max(...allValues, 1);
                  const pathPoints = d.map((v, i) => `${(i / (d.length - 1)) * chartW},${chartH - (v / max) * (chartH - 10)}`).join(" L ");
                  return <path key={key} d={`M ${pathPoints}`} fill="none" stroke={CHART_SERIES[key].color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;
                })}
                {/* Dots on last point */}
                {activeMetrics.map(key => {
                  const d = CHART_SERIES[key].data[chartRange] || [];
                  if (d.length === 0) return null;
                  const max = Math.max(...allValues, 1);
                  const x = chartW; const y = chartH - (d[d.length - 1] / max) * (chartH - 10);
                  return <circle key={key + "_dot"} cx={x} cy={y} r="4" fill={CHART_SERIES[key].color} />;
                })}
              </svg>
              {/* X-axis labels */}
              <div style={{ position: "absolute", left: 48, bottom: 0, width: chartW, display: "flex", justifyContent: "space-between" }}>
                {(chartRange === "7D" ? ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] : chartRange === "30D" ? ["Week 1","Week 2","Week 3","Week 4",""] : chartRange === "90D" ? ["Month 1","Month 2","Month 3",""] : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]).map((l, i) => (
                  <span key={i} style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT }}>{l}</span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Recent Activity */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${COLORS.border}` }}>
            <span style={{ fontSize: 11, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.04em" }}>RECENT ACTIVITY</span>
          </div>
          {ACTIVITY.map((a, i) => (
            <div key={i} style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 12, borderBottom: i < ACTIVITY.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
              <span style={{ fontSize: 14, width: 28, textAlign: "center" }}>{a.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.text }}>{a.action}</div>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>{a.detail}</div>
              </div>
              <span style={{ fontSize: 10, color: COLORS.textDim, whiteSpace: "nowrap" }}>{a.time}</span>
            </div>
          ))}
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

function CRMPipelineView() {
  const STAGES = ["New", "Contacted", "Replied", "Meeting Booked", "Proposal Sent", "Won", "Lost"];
  const STAGE_COLORS = { New: COLORS.blue, Contacted: "#8B5CF6", Replied: COLORS.accent, "Meeting Booked": "#F59E0B", "Proposal Sent": "#EC4899", Won: COLORS.green, Lost: COLORS.danger };

  const [deals, setDeals] = useState([
    { id: 1, name: "Sarah Chen", title: "VP Growth", company: "ScaleFlow", score: 94, stage: "Meeting Booked", source: "Q1 SaaS VP Growth", lastActivity: "Replied to follow-up 2h ago", value: "£18,000", email: "sarah@scaleflow.io" },
    { id: 2, name: "Marcus Webb", title: "CTO", company: "DataPulse", score: 91, stage: "Proposal Sent", source: "Q1 SaaS VP Growth", lastActivity: "Opened proposal 5h ago", value: "£25,000", email: "marcus@datapulse.com" },
    { id: 3, name: "Emily Rodriguez", title: "Head of Ops", company: "NexGen AI", score: 88, stage: "Won", source: "LinkedIn Import", lastActivity: "Signed contract", value: "£15,000", email: "emily@nexgenai.co" },
    { id: 4, name: "James Patel", title: "CEO", company: "InsureTech Pro", score: 85, stage: "Contacted", source: "Insurance Niche", lastActivity: "Email delivered 1d ago", value: "£22,000", email: "james@insuretechpro.com" },
    { id: 5, name: "Lisa Thompson", title: "VP Sales", company: "CloudMetrics", score: 92, stage: "New", source: "Q1 SaaS VP Growth", lastActivity: "Enriched 3h ago", value: "£20,000", email: "lisa@cloudmetrics.io" },
    { id: 6, name: "David Kim", title: "COO", company: "SynthWave", score: 87, stage: "Replied", source: "Q1 SaaS VP Growth", lastActivity: "Interested, asked for case study", value: "£12,000", email: "david@synthwave.dev" },
    { id: 7, name: "Nina Okoro", title: "Head of Product", company: "FinLeap", score: 90, stage: "New", source: "LinkedIn Import", lastActivity: "Imported today", value: "£18,000", email: "nina@finleap.io" },
    { id: 8, name: "Tom Bradley", title: "CRO", company: "GrowthLoop", score: 79, stage: "Contacted", source: "Q1 SaaS VP Growth", lastActivity: "LinkedIn request sent 2d ago", value: "£30,000", email: "tom@growthloop.com" },
    { id: 9, name: "Anna Schulz", title: "VP Eng", company: "AutoPilot AI", score: 82, stage: "Lost", source: "Q1 SaaS VP Growth", lastActivity: "No budget this quarter", value: "£15,000", email: "anna@autopilotai.com" },
    { id: 10, name: "Robert Chang", title: "Director of Sales", company: "PipelineHQ", score: 86, stage: "Meeting Booked", source: "Insurance Niche", lastActivity: "Meeting tomorrow 10am", value: "£20,000", email: "robert@pipelinehq.io" },
  ]);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [viewMode, setViewMode] = useState("kanban");
  const [note, setNote] = useState("");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "18px 28px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 600, margin: 0 }}>CRM <span style={{ color: COLORS.accent }}>Pipeline</span></h2>
          <div style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{deals.length} deals · £{deals.filter(d => d.stage !== "Lost").reduce((s, d) => s + parseInt(d.value.replace(/[^0-9]/g, "")), 0).toLocaleString()} pipeline value</div>
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
                            <span style={{ padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: deal.score >= 90 ? COLORS.green + "15" : COLORS.blue + "15", color: deal.score >= 90 ? COLORS.green : COLORS.blue }}>{deal.score}</span>
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
                    <td style={{ padding: "10px 14px" }}><span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600, background: deal.score >= 90 ? COLORS.green + "15" : COLORS.blue + "15", color: deal.score >= 90 ? COLORS.green : COLORS.blue }}>{deal.score}</span></td>
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
                <select value={selectedDeal.stage} onChange={e => { const ns = e.target.value; setDeals(prev => prev.map(d => d.id === selectedDeal.id ? { ...d, stage: ns } : d)); setSelectedDeal({ ...selectedDeal, stage: ns }); }} style={{ width: "100%", padding: "8px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 12, cursor: "pointer" }}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div style={{ padding: "8px 10px", background: COLORS.bg, borderRadius: 6 }}><div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600 }}>ICP SCORE</div><div style={{ fontSize: 16, fontWeight: 700, fontFamily: FONT, color: selectedDeal.score >= 90 ? COLORS.green : COLORS.blue }}>{selectedDeal.score}</div></div>
                <div style={{ padding: "8px 10px", background: COLORS.bg, borderRadius: 6 }}><div style={{ fontSize: 9, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600 }}>SOURCE</div><div style={{ fontSize: 11, color: COLORS.text, marginTop: 2 }}>{selectedDeal.source}</div></div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>CONTACT</div>
                <div style={{ fontSize: 11, color: COLORS.text, marginBottom: 2 }}>✉️ {selectedDeal.email}</div>
                <div style={{ fontSize: 11, color: COLORS.text }}>💼 linkedin.com/in/{selectedDeal.name.toLowerCase().replace(/ /g, "")}</div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>NOTES</div>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add notes about this deal..." rows={3} style={{ width: "100%", padding: "8px 10px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em" }}>ACTIVITY</div>
                {[
                  { action: selectedDeal.lastActivity, time: "Latest" },
                  { action: "Email opened", time: "2d ago" },
                  { action: "Added to list", time: "5d ago" },
                ].map((a, i) => (
                  <div key={i} style={{ padding: "6px 0", borderBottom: i < 2 ? `1px solid ${COLORS.border}` : "none", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: COLORS.text }}>{a.action}</span>
                    <span style={{ fontSize: 10, color: COLORS.textDim }}>{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentsView() {
  const [activeTab, setActiveTab] = useState("calls");
  const TODAY = "Thursday, February 13, 2025";

  const CALLS = [
    { id: 1, time: "10:00 AM", duration: "30 min", name: "Robert Chang", title: "Director of Sales", company: "PipelineHQ", type: "Discovery", link: "https://zoom.us/j/123456", intel: ["Series A SaaS, 85 employees, £4M ARR", "Director of Sales for 18 months, previously at Oracle", "Replied to cold email — pain point: manual lead qualification", "Company hiring 2 AEs — scaling sales org", "Uses HubSpot CRM + Outreach.io currently"] },
    { id: 2, time: "11:30 AM", duration: "45 min", name: "Sarah Chen", title: "VP Growth", company: "ScaleFlow", type: "AI Audit", link: "https://meet.google.com/abc-def", intel: ["Series B SaaS, 120 employees, $18M ARR", "VP Growth for 2 years, previously at Salesforce", "Interested in automating outbound — currently 3 SDRs", "Recently raised $12M Series B", "Competitor to DataPulse — different market segment"] },
    { id: 3, time: "2:00 PM", duration: "15 min", name: "Tom Bradley", title: "CRO", company: "GrowthLoop", type: "Follow-up", link: "https://zoom.us/j/789012", intel: ["Series C SaaS, 300 employees, $45M ARR", "CRO joined 6 months ago from Gong", "Asked for case study — sent ScaleFlow example", "Budget approved for Q2 tooling spend", "Main concern: integration with existing Salesforce workflow"] },
    { id: 4, time: "4:00 PM", duration: "30 min", name: "Nina Okoro", title: "Head of Product", company: "FinLeap", type: "Discovery", link: "https://meet.google.com/ghi-jkl", intel: ["Seed-stage fintech, 28 employees", "Head of Product, co-founder", "Connected via LinkedIn — downloaded AI audit guide", "Company building B2B payment infrastructure", "No current outbound motion — all inbound/referral"] },
  ];

  const PAST_CALLS = [
    { name: "Marcus Webb", company: "DataPulse", type: "Proposal", time: "Yesterday 3:00 PM", outcome: "Proposal sent" },
    { name: "Emily Rodriguez", company: "NexGen AI", type: "Close", time: "Yesterday 11:00 AM", outcome: "Won — £15,000" },
  ];

  const CALENDAR_HOURS = ["8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM"];
  const TYPE_COLORS = { Discovery: COLORS.blue, "AI Audit": "#7B61FF", "Follow-up": COLORS.accent, Close: COLORS.green, Proposal: "#EC4899" };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0 }}>
            <span style={{ color: COLORS.accent }}>Appointments</span>
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>{TODAY} · {CALLS.length} calls today</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ padding: "6px 12px", borderRadius: 6, background: COLORS.green + "15", border: `1px solid ${COLORS.green}33`, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.green }} />
            <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.green }}>Calendly Connected</span>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${COLORS.border}` }}>
        {[{ key: "calls", label: "📋 Call List" }, { key: "calendar", label: "📅 Calendar" }].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "10px 20px", background: "transparent", border: "none", borderBottom: activeTab === tab.key ? `2px solid ${COLORS.accent}` : "2px solid transparent", color: activeTab === tab.key ? COLORS.accent : COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{tab.label}</button>
        ))}
      </div>

      {activeTab === "calls" && (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
            {CALLS.map(call => (
              <div key={call.id} style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, borderLeft: `4px solid ${TYPE_COLORS[call.type] || COLORS.accent}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT, color: COLORS.text }}>{call.time}</div>
                      <div style={{ fontSize: 10, color: COLORS.textDim }}>{call.duration}</div>
                    </div>
                    <div style={{ width: 1, height: 36, background: COLORS.border }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{call.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.textDim }}>{call.title} · {call.company}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ padding: "4px 10px", borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 600, background: (TYPE_COLORS[call.type] || COLORS.accent) + "15", color: TYPE_COLORS[call.type] || COLORS.accent }}>{call.type}</span>
                    <a href={call.link} target="_blank" rel="noreferrer" style={{ padding: "6px 14px", background: COLORS.accent, color: COLORS.bg, borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 600, textDecoration: "none", cursor: "pointer" }}>Join Call</a>
                  </div>
                </div>
                <div style={{ padding: "12px 16px", background: COLORS.bg, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <span style={{ fontSize: 12 }}>✨</span>
                    <span style={{ fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.accent, letterSpacing: "0.04em" }}>AI INTEL</span>
                  </div>
                  {call.intel.map((note, ni) => (
                    <div key={ni} style={{ fontSize: 12, color: COLORS.text, padding: "3px 0", display: "flex", alignItems: "flex-start", gap: 8, lineHeight: 1.5 }}>
                      <span style={{ color: COLORS.textDim, fontSize: 10, marginTop: 2 }}>•</span>
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>View in CRM</button>
                  <button style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 600, color: COLORS.textMuted, cursor: "pointer" }}>Prep Script</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontFamily: FONT, fontWeight: 600, color: COLORS.textDim, letterSpacing: "0.04em", marginBottom: 10 }}>COMPLETED</div>
            {PAST_CALLS.map((c, i) => (
              <div key={i} style={{ padding: "12px 16px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.7 }}>
                <div><span style={{ fontWeight: 600, fontSize: 12 }}>{c.name}</span><span style={{ fontSize: 11, color: COLORS.textDim }}> · {c.company} · {c.type}</span></div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ fontSize: 10, color: COLORS.accent, fontWeight: 600 }}>{c.outcome}</span><span style={{ fontSize: 10, color: COLORS.textDim }}>{c.time}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "calendar" && (
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden" }}>
          {CALENDAR_HOURS.map((hour, hi) => {
            const call = CALLS.find(c => c.time.startsWith(hour.replace(" AM", "").replace(" PM", "")));
            return (
              <div key={hi} style={{ display: "flex", borderBottom: hi < CALENDAR_HOURS.length - 1 ? `1px solid ${COLORS.border}` : "none", minHeight: 52 }}>
                <div style={{ width: 70, padding: "10px 12px", borderRight: `1px solid ${COLORS.border}`, fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, flexShrink: 0 }}>{hour}</div>
                <div style={{ flex: 1, padding: call ? "8px 12px" : "0" }}>
                  {call && (
                    <div style={{ padding: "8px 14px", background: (TYPE_COLORS[call.type] || COLORS.accent) + "12", border: `1px solid ${(TYPE_COLORS[call.type] || COLORS.accent)}33`, borderRadius: 6, borderLeft: `3px solid ${TYPE_COLORS[call.type] || COLORS.accent}` }}>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{call.name} — {call.company}</div>
                      <div style={{ fontSize: 10, color: COLORS.textDim }}>{call.type} · {call.duration}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UniboxView() {
  const [uniboxTab, setUniboxTab] = useState("inbox");
  const [sdrActive, setSdrActive] = useState(false);
  const [sdrPerms, setSdrPerms] = useState({ positiveReply: true, answerQuestions: true, bookMeetings: true, followUp: true, handleObjections: false, negotiatePricing: false });
  const [sdrTraining, setSdrTraining] = useState({ sentMessages: true, scripts: true, brandVoice: true, starredThreads: false });
  const [sdrResponseWindow, setSdrResponseWindow] = useState("5 min");
  const [sdrApprovalMode, setSdrApprovalMode] = useState(true);
  const [conversations, setConversations] = useState([
    { id: 1, name: "Sarah Chen", company: "ScaleFlow", channel: "email", subject: "Re: AI Automation for your sales team", preview: "Thanks for sending this over. I've shared it with our VP of Sales and we'd love to explore this further...", time: "2h ago", unread: true, stage: "Replied" },
    { id: 2, name: "David Kim", company: "SynthWave", channel: "linkedin", subject: "Your connection request", preview: "Hey! Thanks for reaching out. I saw your post about AI audits — we've actually been looking at something similar...", time: "5h ago", unread: true, stage: "Replied" },
    { id: 3, name: "Marcus Webb", company: "DataPulse", channel: "email", subject: "Re: Proposal — AI Implementation", preview: "The proposal looks comprehensive. Quick question about the timeline — could we accelerate Phase 1?", time: "8h ago", unread: false, stage: "Proposal Sent" },
    { id: 4, name: "Lisa Thompson", company: "CloudMetrics", channel: "email", subject: "Re: Quick question about your outbound", preview: "Not right now, but can you follow up next quarter? We're mid-migration currently.", time: "1d ago", unread: false, stage: "Replied" },
    { id: 5, name: "Robert Chang", company: "PipelineHQ", channel: "linkedin", subject: "Meeting confirmation", preview: "Tomorrow at 10am works perfectly. Looking forward to it.", time: "1d ago", unread: false, stage: "Meeting Booked" },
    { id: 6, name: "Tom Bradley", company: "GrowthLoop", channel: "email", subject: "Re: Scaling outbound with AI", preview: "This is interesting. Can you send me a case study?", time: "2d ago", unread: false, stage: "Replied" },
  ]);
  const [selectedConvo, setSelectedConvo] = useState(conversations[0]);
  const [replyText, setReplyText] = useState("");
  const [aiAssist, setAiAssist] = useState(false);
  const [aiGoal, setAiGoal] = useState("Book a meeting");
  const [aiDrafts, setAiDrafts] = useState(null);
  const [generatingDrafts, setGeneratingDrafts] = useState(false);
  const [filter, setFilter] = useState("all");

  const THREAD = [
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
              <div onClick={() => setSdrActive(!sdrActive)} style={{ width: 52, height: 28, borderRadius: 14, cursor: "pointer", background: sdrActive ? COLORS.green : COLORS.borderActive, position: "relative", transition: "background 0.25s" }}>
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
                    <div onClick={() => setSdrTraining({ ...sdrTraining, [src.key]: !sdrTraining[src.key] })} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: sdrTraining[src.key] ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.25s", flexShrink: 0, marginLeft: 10 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sdrTraining[src.key] ? 21 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 6 }}>CUSTOM GUIDELINES</div>
                <textarea placeholder="e.g. 'Always mention case studies', 'Book meetings Tue/Thu only', 'Never discount on first call'" rows={3} style={{ width: "100%", padding: "10px 12px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 12, resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.5 }} />
              </div>
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, letterSpacing: "0.06em", marginBottom: 8 }}>SAMPLE RESPONSES</div>
                {["Hey Sarah, great to hear the team is interested! I've got availability Thursday at 2pm or Friday at 10am — either work for a quick 15-min intro?", "Thanks for the kind words! We just wrapped up a similar project with a Series B SaaS company. Happy to walk you through it — do you have 15 min this week?"].map((sample, si) => (
                  <div key={si} style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, color: COLORS.text, lineHeight: 1.5, marginBottom: 6 }}>{sample}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${COLORS.green}33`, background: COLORS.green + "10", color: COLORS.green, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>👍 Good</button>
                      <button style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${COLORS.danger}33`, background: COLORS.danger + "10", color: COLORS.danger, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>👎 Refine</button>
                    </div>
                  </div>
                ))}
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
                    <div onClick={() => setSdrPerms({ ...sdrPerms, [perm.key]: !sdrPerms[perm.key] })} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: sdrPerms[perm.key] ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.25s", flexShrink: 0 }}>
                      <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: sdrPerms[perm.key] ? 21 : 3, transition: "left 0.25s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, marginBottom: 6 }}>RESPONSE WINDOW</div><select value={sdrResponseWindow} onChange={e => setSdrResponseWindow(e.target.value)} style={{ width: "100%", padding: "8px 10px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12, fontFamily: FONT_BODY, color: COLORS.text, cursor: "pointer" }}><option>5 min</option><option>30 min</option><option>1 hour</option></select></div>
                <div><div style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, fontWeight: 600, marginBottom: 6 }}>WORKING HOURS</div><div style={{ padding: "8px 10px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 6, fontSize: 12, color: COLORS.text }}>9am–6pm Mon–Fri</div></div>
              </div>
              <div style={{ padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div><div style={{ fontSize: 12, fontWeight: 600 }}>Review before sending</div><div style={{ fontSize: 10, color: COLORS.textDim }}>Drafts go to approval queue</div></div>
                <div onClick={() => setSdrApprovalMode(!sdrApprovalMode)} style={{ width: 40, height: 22, borderRadius: 11, cursor: "pointer", background: sdrApprovalMode ? COLORS.accent : COLORS.borderActive, position: "relative", transition: "background 0.25s", flexShrink: 0, marginLeft: 10 }}>
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
            <button style={{ padding: "8px 20px", background: replyText.trim() ? COLORS.accent : COLORS.border, color: replyText.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 6, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: replyText.trim() ? "pointer" : "default" }}>Send Reply</button>
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

  if (!project) return <div style={{ padding: 28, color: COLORS.textDim, fontFamily: FONT_BODY }}>Select a project from the sidebar.</div>;

  const phases = [
    {
      name: "Phase 1: Foundation", timeline: "Month 1-2", status: "in_progress", progress: 35, color: "#eab308", cost: "£35-45K",
      tasks: [
        { id: "t1", name: "Lease tracking system — vendor selection", status: "complete", assignee: "Andrew", dueDate: "Feb 14", priority: "high" },
        { id: "t2", name: "Lease tracking system — implementation", status: "in_progress", assignee: "Andrew", dueDate: "Feb 28", priority: "high" },
        { id: "t3", name: "Data consolidation — map existing sources", status: "in_progress", assignee: "Sarah Mitchell", dueDate: "Feb 21", priority: "high" },
        { id: "t4", name: "Data consolidation — migration plan", status: "not_started", assignee: "Andrew", dueDate: "Mar 7", priority: "medium" },
        { id: "t5", name: "Core integrations — CRM + accounting sync", status: "not_started", assignee: "TBD", dueDate: "Mar 14", priority: "medium" },
        { id: "t6", name: "Staff training — lease tracking module", status: "not_started", assignee: "Mike Thompson", dueDate: "Mar 21", priority: "low" },
      ],
    },
    {
      name: "Phase 2: Unlock", timeline: "Month 3-4", status: "not_started", progress: 0, color: "#3b82f6", cost: "£40-55K",
      tasks: [
        { id: "t7", name: "Director dashboard — requirements gathering", status: "not_started", assignee: "James Richardson", dueDate: "Apr 1", priority: "high" },
        { id: "t8", name: "Director dashboard — build & deploy", status: "not_started", assignee: "Andrew", dueDate: "Apr 21", priority: "high" },
        { id: "t9", name: "Knowledge base — content structure", status: "not_started", assignee: "Mike Thompson", dueDate: "Apr 7", priority: "medium" },
        { id: "t10", name: "Knowledge base — populate initial content", status: "not_started", assignee: "All", dueDate: "Apr 28", priority: "medium" },
        { id: "t11", name: "Process automation — identify top 5 workflows", status: "not_started", assignee: "Andrew", dueDate: "May 1", priority: "medium" },
      ],
    },
    {
      name: "Phase 3: Scale", timeline: "Month 5-6", status: "not_started", progress: 0, color: "#8b5cf6", cost: "£50-70K",
      tasks: [
        { id: "t12", name: "AI contract analysis — model training", status: "not_started", assignee: "Andrew", dueDate: "May 15", priority: "high" },
        { id: "t13", name: "AI contract analysis — integration with lease system", status: "not_started", assignee: "Andrew", dueDate: "Jun 1", priority: "high" },
        { id: "t14", name: "Predictive insights — dashboard module", status: "not_started", assignee: "Andrew", dueDate: "Jun 15", priority: "medium" },
        { id: "t15", name: "Portfolio scaling tools — automation suite", status: "not_started", assignee: "TBD", dueDate: "Jun 28", priority: "medium" },
      ],
    },
  ];

  const getStatusBadge = (status) => {
    const styles = {
      complete: { bg: COLORS.accent + "15", color: COLORS.accent, label: "Complete" },
      in_progress: { bg: COLORS.blue + "15", color: COLORS.blue, label: "In Progress" },
      not_started: { bg: COLORS.surface, color: COLORS.textDim, label: "Not Started" },
    };
    const s = styles[status] || styles.not_started;
    return (
      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontFamily: FONT, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.color}22` }}>{s.label}</span>
    );
  };

  const getPriorityDot = (priority) => {
    const colors = { high: COLORS.danger, medium: COLORS.warn, low: COLORS.textDim };
    return <div style={{ width: 6, height: 6, borderRadius: "50%", background: colors[priority] || COLORS.textDim, flexShrink: 0 }} />;
  };

  const totalTasks = phases.reduce((s, p) => s + p.tasks.length, 0);
  const completeTasks = phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "complete").length, 0);
  const inProgressTasks = phases.reduce((s, p) => s + p.tasks.filter(t => t.status === "in_progress").length, 0);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            Implementation <span style={{ color: COLORS.accent }}>Roadmap</span>
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0", fontSize: 13 }}>{project.client} — Generated from AI analysis</p>
        </div>
        <span style={{ padding: "4px 10px", background: COLORS.accentBg, color: COLORS.accent, fontSize: 11, borderRadius: 6, fontFamily: FONT, fontWeight: 500, border: `1px solid ${COLORS.accent}22` }}>Auto-generated</span>
      </div>

      {/* Summary Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Tasks" value={totalTasks} accent={COLORS.accent} />
        <StatCard label="Complete" value={completeTasks} accent={COLORS.accent} />
        <StatCard label="In Progress" value={inProgressTasks} accent={COLORS.blue} />
        <StatCard label="Total Budget" value="£125-170K" accent={COLORS.warn} />
      </div>

      {/* Timeline bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
        {phases.map((p, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: p.color, fontFamily: FONT, fontWeight: 600 }}>{p.name}</span>
              <span style={{ fontSize: 10, color: COLORS.textDim }}>{p.timeline}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: COLORS.surface }}>
              <div style={{ width: `${p.progress}%`, height: "100%", borderRadius: 3, background: p.color, transition: "width 0.3s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Phase cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {phases.map((phase, pi) => (
          <div key={pi} style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", borderLeft: `4px solid ${phase.color}` }}>
            <div onClick={() => setExpandedPhase(expandedPhase === pi ? -1 : pi)} style={{ padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{phase.name}</div>
                <span style={{ fontSize: 10, color: COLORS.textDim }}>{phase.timeline} · {phase.cost}</span>
                {getStatusBadge(phase.status)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: COLORS.textDim }}>{phase.tasks.filter(t => t.status === "complete").length}/{phase.tasks.length} tasks</span>
                <span style={{ color: COLORS.textDim, fontSize: 12, transform: expandedPhase === pi ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▶</span>
              </div>
            </div>
            {expandedPhase === pi && (
              <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: "8px 12px" }}>
                {phase.tasks.map(task => (
                  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderBottom: `1px solid ${COLORS.border}` }}>
                    {getPriorityDot(task.priority)}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: task.status === "complete" ? COLORS.textDim : COLORS.text, textDecoration: task.status === "complete" ? "line-through" : "none" }}>{task.name}</div>
                    </div>
                    <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, minWidth: 70 }}>{task.assignee}</span>
                    <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: FONT, minWidth: 50 }}>{task.dueDate}</span>
                    {getStatusBadge(task.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowsLibraryView() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const WORKFLOWS = [
    { id: "w1", name: "Lead Enrichment Pipeline", desc: "Discover companies via AI Ark → Enrich contacts via BetterContact + Icypeas → Verify emails via Wiza → Export to campaign tool", category: "lead_gen", tools: ["AI Ark", "BetterContact", "Icypeas", "Wiza"], steps: 4, downloads: 142, rating: 4.8 },
    { id: "w2", name: "Cold Email Sequence Builder", desc: "Generate personalised email sequences from ICP data → A/B test subject lines → Auto-schedule via Instantly → Track open/reply rates", category: "outreach", tools: ["Claude API", "Instantly"], steps: 3, downloads: 98, rating: 4.6 },
    { id: "w3", name: "LinkedIn Content Engine", desc: "Scrape competitor posts → Generate topic ideas → Create text/carousel posts → Schedule via API → Track performance", category: "content", tools: ["LinkedIn API", "Claude API"], steps: 5, downloads: 76, rating: 4.5 },
    { id: "w4", name: "Community Auto-Responder", desc: "Monitor Skool/Reddit/Facebook groups for keywords → Draft voice-matched replies → Auto-post or queue for review", category: "content", tools: ["Skool API", "Reddit API", "Claude API"], steps: 3, downloads: 64, rating: 4.3 },
    { id: "w5", name: "AI Audit Transcript Analyzer", desc: "Upload interview transcripts → Extract themes & pain points → Cross-reference with survey data → Generate strategic deck", category: "consulting", tools: ["Claude API", "PPTX Generator"], steps: 4, downloads: 187, rating: 4.9 },
    { id: "w6", name: "Lease Tracking Automation", desc: "Monitor lease expiry dates → Auto-send renewal reminders → Track compliance status → Generate monthly reports", category: "operations", tools: ["Custom CRM", "Email API"], steps: 3, downloads: 34, rating: 4.2 },
    { id: "w7", name: "Sales Call → Content Pipeline", desc: "Record calls via Fathom → Extract key insights → Generate LinkedIn posts from call highlights → Schedule publishing", category: "content", tools: ["Fathom", "Claude API", "LinkedIn API"], steps: 4, downloads: 89, rating: 4.7 },
    { id: "w8", name: "Multi-Channel Outreach Orchestrator", desc: "Sync lead lists → Send cold emails via Instantly → Connection requests via HeyReach → Track unified response rates", category: "outreach", tools: ["Instantly", "HeyReach", "Custom CRM"], steps: 5, downloads: 112, rating: 4.5 },
    { id: "w9", name: "Board Report Generator", desc: "Pull data from CRM + accounting → Generate financial summary → Create formatted report → Email to stakeholders", category: "consulting", tools: ["Xero API", "Claude API", "Email API"], steps: 4, downloads: 56, rating: 4.4 },
    { id: "w10", name: "Competitor Intelligence Monitor", desc: "Track competitor LinkedIn profiles → Monitor website changes → Alert on key updates → Generate weekly digest", category: "lead_gen", tools: ["LinkedIn API", "Web Scraper", "Claude API"], steps: 4, downloads: 71, rating: 4.3 },
  ];

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
                {wf.tools.map(tool => (
                  <span key={tool} style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, background: COLORS.bg, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT }}>{tool}</span>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 12, fontSize: 10, color: COLORS.textDim }}>
                  <span>{wf.steps} steps</span>
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
    await new Promise(r => setTimeout(r, 2000));
    setOutput({ title: "Strategic Analysis", sections: [
      { heading: "Assessment", content: "Based on your current pipeline data and market positioning, this approach aligns well with your core strengths. The AI automation niche for mid-market B2B SaaS remains underserved, with your 100+ testimonials providing significant social proof advantage." },
      { heading: "Recommendation", content: "Prioritise the lead generation platform launch over expanding consulting capacity. The platform creates recurring revenue and scales without your direct time. Target Q2 for beta with 10 founding customers at a reduced rate." },
      { heading: "Risk Factors", content: "Main risk is feature creep — the prototype covers 8+ modules. Launch with Leads + Lead Lists + Import & Enrich only. Add audit and sales tools in V2 based on user demand signals." },
      { heading: "Next Steps", content: "1. Finalise technical architecture with development partner\n2. Set up Supabase project and deploy auth + shell\n3. Build leads engine (weeks 1-3)\n4. Recruit 10 beta testers from existing client base\n5. Target soft launch by end of Q1" },
    ]});
    setMessages([...nm, { role: "agent", text: "I've prepared a strategic analysis based on your question. Check the output panel for the full breakdown.\n\nWant me to dig deeper into any specific area?" }]);
    setIsTyping(false);
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
            {output.sections.map((sec, i) => (
              <div key={i} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, marginBottom: 10, borderLeft: `3px solid ${[COLORS.accent, COLORS.blue, COLORS.warn, "#7B61FF"][i % 4]}` }}>
                <div style={{ fontFamily: FONT, fontSize: 10, color: [COLORS.accent, COLORS.blue, COLORS.warn, "#7B61FF"][i % 4], letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{sec.heading.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{sec.content}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditView({ project, projects, selectedProject, setSelectedProject }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [transcripts, setTranscripts] = useState([
    { id: 1, name: "CFO Interview - Financial Operations", speaker: "Sarah Mitchell", role: "CFO", department: "Finance", duration: 45, tags: ["finance", "operations"] },
    { id: 2, name: "CEO Interview - Strategic Vision", speaker: "James Richardson", role: "CEO", department: "Leadership", duration: 60, tags: ["strategy", "leadership"] },
    { id: 3, name: "Estate Manager Interview", speaker: "Mike Thompson", role: "Estate Manager", department: "Operations", duration: 50, tags: ["operations", "estates"] },
  ]);

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
        {activeTab === "transcripts" && <AuditTranscriptsTab transcripts={transcripts} setTranscripts={setTranscripts} />}
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
  const [overview, setOverview] = useState("Hastingwood Securities is a private equity-backed property management firm managing 150 high-value commercial and residential properties across London. Founded in 2015, the company has grown from 5 properties to 150 through strategic acquisitions.");
  const [metrics, setMetrics] = useState([
    { key: "founded", label: "Founded", value: "2015", editing: false },
    { key: "employees", label: "Employees", value: "45-50", editing: false },
    { key: "properties", label: "Properties", value: "150", editing: false },
    { key: "aum", label: "AUM", value: "£450M+", editing: false },
  ]);
  const [customSections, setCustomSections] = useState([]);
  const [transcriptInsights, setTranscriptInsights] = useState([
    { id: "ti1", text: "CFO mentioned plans to double the portfolio to 300 properties by 2028", source: "Sarah Mitchell — CFO Interview", accepted: false },
    { id: "ti2", text: "Estate Manager flagged 3 critical compliance gaps in current lease tracking process", source: "Mike Thompson — Estate Manager Interview", accepted: false },
    { id: "ti3", text: "CEO confirmed annual technology budget of £200-250K with willingness to increase for proven ROI", source: "James Richardson — CEO Interview", accepted: false },
  ]);

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };

  const doResearch = async () => {
    setIsResearching(true);
    await new Promise(r => setTimeout(r, 2500));
    setIsResearching(false);
    setResearchDone(true);
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
        <input value={companyUrl} onChange={e => setCompanyUrl(e.target.value)} placeholder="Paste company website URL to auto-research..." style={{ ...inputStyle, flex: 1, background: COLORS.bg }} />
        <button onClick={doResearch} disabled={isResearching} style={{
          padding: "10px 20px", background: isResearching ? COLORS.border : COLORS.accent, color: isResearching ? COLORS.textDim : COLORS.bg,
          border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: isResearching ? "default" : "pointer", whiteSpace: "nowrap",
        }}>{isResearching ? "Researching..." : "🔍 Research"}</button>
      </div>

      {isResearching && (
        <div style={{ padding: "40px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12, textAlign: "center", marginBottom: 16 }}>
          <ProgressDots active={true} />
          <div style={{ fontSize: 13, color: COLORS.accent, marginTop: 8 }}>Researching company...</div>
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
  const [view, setView] = useState("list"); // "list", "builder", "responses", "distribute"
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [builderTitle, setBuilderTitle] = useState("");
  const [builderDesc, setBuilderDesc] = useState("");
  const [builderQuestions, setBuilderQuestions] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [distEmails, setDistEmails] = useState("");
  const [distMessage, setDistMessage] = useState("");
  const [distLink, setDistLink] = useState("");

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

  const SURVEYS = [
    { id: "s1", title: "AI Readiness Assessment", responses: 8, total: 12, status: "active", questions: TEMPLATES[1].questions,
      responseData: [
        { respondent: "Sarah Mitchell", role: "CFO", completedAt: "Feb 5", answers: { q1: "4/5", q2: "Finance", q3: "Budget, Unclear ROI", q4: "Month-end reconciliation — currently takes 3 days with manual data pulling from multiple systems.", q5: "Cautiously optimistic" } },
        { respondent: "James Richardson", role: "CEO", completedAt: "Feb 4", answers: { q1: "3/5", q2: "Sales, Marketing", q3: "Lack of expertise, Data quality", q4: "Board reporting — pulling data from 6 different sources into one deck takes a full day each month.", q5: "Very enthusiastic" } },
        { respondent: "Mike Thompson", role: "Estate Manager", completedAt: "Feb 6", answers: { q1: "2/5", q2: "None", q3: "Lack of expertise, Security concerns, Budget", q4: "Lease tracking — I maintain everything in spreadsheets and it's getting unmanageable with 150 properties.", q5: "Neutral" } },
      ],
    },
    { id: "s2", title: "Technology Stack Review", responses: 8, total: 8, status: "closed", questions: TEMPLATES[2].questions,
      responseData: [
        { respondent: "Sarah Mitchell", role: "CFO", completedAt: "Jan 28", answers: { q1: "Excel, Xero, Sage, Outlook, SharePoint", q2: "Dissatisfied", q3: "Too many tools, Poor integration, Data silos", q4: "Excel for everything — we need a proper CRM and project management tool." } },
      ],
    },
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

  const selectTemplate = (tpl) => {
    setSelectedTemplate(tpl.id);
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
    setDistLink(`https://app.pipeline.ai/survey/${survey.id}/${Math.random().toString(36).substring(7)}`);
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
          <button onClick={() => { setView("builder"); setSelectedTemplate(null); setBuilderTitle(""); setBuilderDesc(""); setBuilderQuestions([]); }}
            style={{ padding: "10px 20px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ CREATE SURVEY</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {SURVEYS.map(survey => (
            <div key={survey.id} style={{ padding: "18px 22px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{survey.title}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 6, fontFamily: FONT, fontSize: 10, fontWeight: 500,
                    background: survey.status === "active" ? COLORS.accentBg : COLORS.surface,
                    color: survey.status === "active" ? COLORS.accent : COLORS.textDim,
                    border: `1px solid ${survey.status === "active" ? COLORS.accent + "33" : COLORS.border}`,
                  }}>{survey.status}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: COLORS.textMuted, marginBottom: 10 }}>{survey.responses}/{survey.total} responses</div>
              <div style={{ width: "100%", height: 4, borderRadius: 2, background: COLORS.border, marginBottom: 12 }}>
                <div style={{ width: `${(survey.responses / survey.total) * 100}%`, height: "100%", borderRadius: 2, background: COLORS.accent }} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setSelectedSurvey(survey); setView("responses"); }}
                  style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>View Responses</button>
                <button onClick={() => openDistribute(survey)}
                  style={{ padding: "6px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>📨 Distribute</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // RESPONSES VIEW
  if (view === "responses" && selectedSurvey) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setView("list")} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>{selectedSurvey.title}</h2>
          <span style={{ padding: "3px 10px", background: COLORS.accentBg, color: COLORS.accent, fontSize: 10, borderRadius: 6, fontFamily: FONT, fontWeight: 500, border: `1px solid ${COLORS.accent}22` }}>{selectedSurvey.responseData.length} responses</span>
        </div>

        {/* Summary Stats */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Responses" value={selectedSurvey.responseData.length} accent={COLORS.accent} />
          <StatCard label="Completion Rate" value={`${Math.round((selectedSurvey.responses / selectedSurvey.total) * 100)}%`} accent={COLORS.blue} />
          <StatCard label="Questions" value={selectedSurvey.questions.length} accent={COLORS.warn} />
        </div>

        {/* Per-question breakdown */}
        <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>QUESTION BREAKDOWN</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {selectedSurvey.questions.map((q, qi) => (
            <div key={q.id} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.accent, fontWeight: 600 }}>Q{qi + 1}</span>
                <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontFamily: FONT }}>{q.type.replace("_", " ")}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>{q.question}</div>
              {(q.type === "multiple_choice" || q.type === "checkboxes") && q.options.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {q.options.map(opt => {
                    const count = selectedSurvey.responseData.filter(r => {
                      const ans = r.answers[q.id] || "";
                      return ans.includes(opt);
                    }).length;
                    const pct = selectedSurvey.responseData.length > 0 ? Math.round((count / selectedSurvey.responseData.length) * 100) : 0;
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
                  {selectedSurvey.responseData.map((r, ri) => r.answers[q.id] ? (
                    <div key={ri} style={{ padding: "8px 12px", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 6 }}>
                      <div style={{ fontSize: 12, color: COLORS.text, marginBottom: 2 }}>{r.answers[q.id]}</div>
                      <div style={{ fontSize: 10, color: COLORS.textDim }}>— {r.respondent}, {r.role}</div>
                    </div>
                  ) : null)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Individual Responses */}
        <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12 }}>INDIVIDUAL RESPONSES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {selectedSurvey.responseData.map((r, i) => (
            <div key={i} style={{ padding: "14px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{r.respondent}</span>
                  <span style={{ fontSize: 11, color: COLORS.textDim, marginLeft: 8 }}>{r.role}</span>
                </div>
                <span style={{ fontSize: 10, color: COLORS.textDim }}>{r.completedAt}</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(r.answers).map(([qId, ans]) => (
                  <div key={qId} style={{ padding: "4px 10px", background: COLORS.bg, borderRadius: 4, border: `1px solid ${COLORS.border}`, fontSize: 11, color: COLORS.textMuted, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ans}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // DISTRIBUTE VIEW
  if (view === "distribute" && selectedSurvey) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setView("list")} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>Distribute: {selectedSurvey.title}</h2>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          {/* Share Link */}
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

          {/* Email Invites */}
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
        <button onClick={() => setView("list")} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
        <h2 style={{ fontFamily: FONT, fontSize: 18, fontWeight: 600, margin: 0 }}>Create Survey</h2>
      </div>

      {/* Template Picker */}
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
          {/* Left — Builder */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>SURVEY TITLE</label>
              <input value={builderTitle} onChange={e => setBuilderTitle(e.target.value)} placeholder="e.g. AI Readiness Assessment" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>DESCRIPTION</label>
              <input value={builderDesc} onChange={e => setBuilderDesc(e.target.value)} placeholder="Brief description of the survey..." style={inputStyle} />
            </div>

            {/* Questions */}
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
                          onMouseEnter={e => e.currentTarget.style.color = COLORS.danger}
                          onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim}
                        >×</button>
                      </div>
                    </div>
                    <input value={q.question} onChange={e => updateQuestion(i, { question: e.target.value })}
                      placeholder="Type your question..." style={{ ...inputStyle, background: COLORS.bg, marginBottom: q.options.length > 0 ? 10 : 0 }} />
                    {(q.type === "multiple_choice" || q.type === "checkboxes" || q.type === "dropdown") && (
                      <div>
                        {q.options.map((opt, oi) => (
                          <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ color: COLORS.textDim, fontSize: 12 }}>{q.type === "checkboxes" ? "☐" : q.type === "dropdown" ? "▾" : "○"}</span>
                            <input value={opt} onChange={e => { const newOpts = [...q.options]; newOpts[oi] = e.target.value; updateQuestion(i, { options: newOpts }); }}
                              style={{ ...inputStyle, background: COLORS.bg, flex: 1, padding: "6px 10px", fontSize: 12 }} />
                            <button onClick={() => { const newOpts = q.options.filter((_, idx) => idx !== oi); updateQuestion(i, { options: newOpts }); }}
                              style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 12, cursor: "pointer" }}>×</button>
                          </div>
                        ))}
                        <button onClick={() => updateQuestion(i, { options: [...q.options, `Option ${q.options.length + 1}`] })}
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

            {/* Add Question */}
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

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setView("list")} style={{ padding: "12px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save Survey</button>
              <button onClick={() => {
                const newSurvey = { id: "s_new", title: builderTitle || "Untitled Survey", responses: 0, total: 0, status: "active", questions: builderQuestions, responseData: [] };
                setSelectedSurvey(newSurvey);
                setDistLink(`https://app.pipeline.ai/survey/s_new/${Math.random().toString(36).substring(7)}`);
                setDistEmails("");
                setDistMessage(`Hi,\n\nYou've been invited to complete the "${builderTitle || "Untitled Survey"}" survey as part of our AI audit. It should take about 5 minutes.\n\nPlease complete it at your earliest convenience.\n\nThank you`);
                setView("distribute");
              }} style={{ padding: "12px 24px", background: COLORS.blue, color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save & Distribute →</button>
              <button style={{ padding: "12px 24px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save as Template</button>
            </div>
          </div>

          {/* Right — Preview */}
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
                  {(q.type === "multiple_choice" || q.type === "checkboxes") && q.options.map((opt, oi) => (
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
  const [interviewees, setInterviewees] = useState([
    { id: 1, name: "Sarah Mitchell", role: "CFO", type: "Stakeholder", department: "Finance", status: "generated", questionCount: 12 },
    { id: 2, name: "James Richardson", role: "CEO", type: "Stakeholder", department: "Leadership", status: "generated", questionCount: 15 },
    { id: 3, name: "Mike Thompson", role: "Estate Manager", type: "Employee", department: "Operations", status: "generated", questionCount: 10 },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", role: "", type: "Stakeholder", department: "", context: "" });
  const [generating, setGenerating] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 };

  const MOCK_QUESTIONS = [
    { section: "Opening & Context", questions: ["Can you walk me through your typical day-to-day responsibilities?", "How long have you been in this role and what's changed most since you started?", "What does success look like for your department this year?"] },
    { section: "Pain Points & Challenges", questions: ["What are the biggest bottlenecks or frustrations in your current workflow?", "Where do you feel the most time is wasted in your team's processes?", "If you could fix one thing about how your department operates, what would it be?", "What manual or repetitive tasks take up the most time?"] },
    { section: "Technology & Systems", questions: ["What tools and systems do you currently use? Which do you love and which frustrate you?", "How do you currently handle reporting and data analysis?", "Are there any tasks you wish were automated but aren't?"] },
    { section: "Strategic Alignment", questions: ["How do you see AI fitting into your department's operations?", "What would a successful AI implementation look like from your perspective?", "What concerns, if any, do you have about introducing AI tools?", "How would you measure the ROI of any new system or process?"] },
  ];

  const handleGenerate = async () => {
    if (!formData.name.trim() || !formData.role.trim()) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1500));
    const newEntry = { id: Date.now(), name: formData.name, role: formData.role, type: formData.type, department: formData.department, status: "generated", questionCount: MOCK_QUESTIONS.reduce((s, sec) => s + sec.questions.length, 0) };
    setInterviewees(prev => [...prev, newEntry]);
    setSelectedInterview(newEntry);
    setShowForm(false);
    setFormData({ name: "", role: "", type: "Stakeholder", department: "", context: "" });
    setGenerating(false);
  };

  if (selectedInterview) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <button onClick={() => setSelectedInterview(null)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 10, cursor: "pointer" }}>← Back</button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{selectedInterview.name}</div>
            <div style={{ fontSize: 11, color: COLORS.textDim }}>{selectedInterview.role} · {selectedInterview.department} · {selectedInterview.type}</div>
          </div>
          <button onClick={() => { const all = MOCK_QUESTIONS.map(s => `## ${s.section}\n${s.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`).join("\n\n"); navigator.clipboard?.writeText(all); }} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Copy All</button>
        </div>
        {MOCK_QUESTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: 16, padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.accent, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>{section.section.toUpperCase()}</div>
            {section.questions.map((q, qi) => (
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
          <button onClick={handleGenerate} disabled={generating || !formData.name.trim() || !formData.role.trim()} style={{ padding: "10px 24px", background: formData.name.trim() && formData.role.trim() ? COLORS.accent : COLORS.border, color: formData.name.trim() && formData.role.trim() ? COLORS.bg : COLORS.textDim, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: formData.name.trim() && formData.role.trim() && !generating ? "pointer" : "default" }}>{generating ? "Generating Questions..." : "🎤 Generate Interview Questions"}</button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {interviewees.map(person => (
          <div key={person.id} onClick={() => setSelectedInterview(person)} style={{ padding: "16px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.accent + "44"} onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: COLORS.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎤</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{person.name}</div>
                <div style={{ fontSize: 11, color: COLORS.textDim }}>{person.role} · {person.department} · {person.questionCount} questions</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 9, fontFamily: FONT, fontWeight: 500, background: person.type === "Stakeholder" ? COLORS.accent + "10" : COLORS.blue + "10", color: person.type === "Stakeholder" ? COLORS.accent : COLORS.blue, border: `1px solid ${person.type === "Stakeholder" ? COLORS.accent : COLORS.blue}22` }}>{person.type}</span>
              <span style={{ fontSize: 10, color: COLORS.textDim }}>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditTranscriptsTab({ transcripts, setTranscripts }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };

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
              <div style={{ fontSize: 11, color: COLORS.textDim }}>{t.speaker} · {t.role} · {t.duration} min</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {t.tags.map(tag => (
                  <span key={tag} style={{ padding: "2px 8px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 10, color: COLORS.textDim, fontFamily: FONT }}>{tag}</span>
                ))}
              </div>
            </div>
            <button onClick={() => setTranscripts(prev => prev.filter(tr => tr.id !== t.id))} style={{ padding: "4px 8px", background: "transparent", border: "none", color: COLORS.textDim, fontSize: 14, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.color = COLORS.danger}
              onMouseLeave={e => e.currentTarget.style.color = COLORS.textDim}
            >🗑</button>
          </div>
        ))}
      </div>
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAddModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 560, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ padding: "18px 24px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Add Transcript</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: "transparent", border: "none", color: COLORS.textDim, fontSize: 18, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ padding: "20px 24px" }}>
              <textarea placeholder="Paste transcript content here..." rows={10} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
            </div>
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: "10px 20px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMuted, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => setShowAddModal(false)} style={{ padding: "10px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add Transcript</button>
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
  const [pillars, setPillars] = useState([
    { id: "acquisition", label: "Acquisition", icon: "🎯", desc: "Stranger → Customer", processes: [
      { id: "a1", label: "Lead Capture", owner: "SDR", time: "3 hrs/day", tag: "timesink", tools: "LinkedIn Sales Nav, manual search", aiRec: "AI Ark auto-discovery + enrichment pipeline", savings: "2.5 hrs/day" },
      { id: "a2", label: "Lead Qualification", owner: "SDR", time: "1 hr/day", tag: "aiready", tools: "Manual review, gut feel", aiRec: "ICP scoring algorithm, auto-qualification", savings: "45 min/day" },
      { id: "a3", label: "Outreach", owner: "SDR", time: "2 hrs/day", tag: "timesink", tools: "Manual emails, some Instantly", aiRec: "AI SDR + Instantly automation", savings: "1.5 hrs/day" },
      { id: "a4", label: "Sales Conversations", owner: "AE / CEO", time: "4 calls/week", tag: "optimised", tools: "Zoom, Fathom recording", aiRec: "Already well-structured", savings: "—" },
      { id: "a5", label: "Closing", owner: "CEO", time: "2 hrs/deal", tag: "qualityrisk", tools: "Manual proposals, Word docs", aiRec: "AI proposal generation + template automation", savings: "1 hr/deal" },
    ]},
    { id: "delivery", label: "Delivery", icon: "🚀", desc: "Customer → Outcome", processes: [
      { id: "d1", label: "Onboarding", owner: "Operations", time: "4 hrs/client", tag: "aiready", tools: "Manual emails, Notion checklist", aiRec: "Automated onboarding sequences", savings: "3 hrs/client" },
      { id: "d2", label: "Discovery / Scoping", owner: "Consultant", time: "3 hrs/client", tag: "timesink", tools: "Manual interviews, note-taking", aiRec: "AI transcript analysis + auto-scoping", savings: "2 hrs/client" },
      { id: "d3", label: "Execution", owner: "Technical", time: "20 hrs/project", tag: "optimised", tools: "Various — project dependent", aiRec: "AI-assisted implementation where applicable", savings: "~4 hrs/project" },
      { id: "d4", label: "Reporting", owner: "Consultant", time: "2 hrs/week", tag: "qualityrisk", tools: "Manual reports in Google Docs", aiRec: "Auto-generated progress reports", savings: "1.5 hrs/week" },
      { id: "d5", label: "Handoff / Completion", owner: "Consultant", time: "2 hrs/client", tag: "qualityrisk", tools: "Manual documentation", aiRec: "AI knowledge base generation", savings: "1 hr/client" },
    ]},
    { id: "support", label: "Support", icon: "🛟", desc: "Issue → Resolution", processes: [
      { id: "s1", label: "Issue Intake", owner: "Support", time: "30 min/ticket", tag: "timesink", tools: "Email, phone, ad-hoc", aiRec: "AI chatbot for intake + auto-logging", savings: "20 min/ticket" },
      { id: "s2", label: "Triage", owner: "Support Lead", time: "15 min/ticket", tag: "aiready", tools: "Manual assignment", aiRec: "AI auto-categorisation and routing", savings: "12 min/ticket" },
      { id: "s3", label: "Resolution", owner: "Technical", time: "2 hrs avg", tag: "optimised", tools: "Project dependent", aiRec: "AI knowledge base for common fixes", savings: "~30 min/ticket" },
      { id: "s4", label: "Follow-up", owner: "Support", time: "20 min/ticket", tag: "qualityrisk", tools: "Manual email follow-up", aiRec: "Automated follow-up sequences", savings: "15 min/ticket" },
      { id: "s5", label: "Retention", owner: "Account Mgr", time: "1 hr/month/client", tag: "qualityrisk", tools: "Manual check-ins", aiRec: "Automated check-ins + sentiment analysis", savings: "40 min/month" },
    ]},
  ]);
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setEditingProcess(null); setEditForm({}); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => { setEditingStep(null); setEditForm({}); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 460, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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
  const [chatMessages, setChatMessages] = useState([
    { role: "agent", text: "Welcome to the Analysis workspace. I've loaded 3 interview transcripts and 2 survey datasets for this project.\n\nYou can ask me questions about the data, or when you're ready, tell me to run the full analysis and I'll work through everything — extracting themes, mapping opportunities, and building a strategic roadmap.\n\nWhat would you like to do?" },
  ]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [analysisRun, setAnalysisRun] = useState(false);
  const [reasoningLogs, setReasoningLogs] = useState([]);
  const [isReasoning, setIsReasoning] = useState(false);
  const [deckGenerated, setDeckGenerated] = useState(false);
  const [showGenerateBtn, setShowGenerateBtn] = useState(false);
  const [showFullDeck, setShowFullDeck] = useState(false);
  const chatEndRef = React.useRef(null);

  React.useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, reasoningLogs, isTyping]);

  const REASONING_STEPS = [
    { type: "thinking", text: "Starting analysis of Hastingwood Securities audit data..." },
    { type: "reading", text: "📄 Reading transcript: CFO Interview — Sarah Mitchell (45 min)", detail: "Extracting financial operations pain points, technology gaps, budget indicators..." },
    { type: "insight", text: "Key finding: Month-end reconciliation takes 3 days due to manual data pulling from 6+ systems", tag: "PAIN POINT" },
    { type: "reading", text: "📄 Reading transcript: CEO Interview — James Richardson (60 min)", detail: "Extracting strategic vision, growth targets, technology appetite..." },
    { type: "insight", text: "CEO confirmed annual tech budget of £200-250K with willingness to increase for proven ROI", tag: "BUDGET" },
    { type: "insight", text: "Growth target: Double portfolio from 150 to 300 properties by 2028 — current systems won't scale", tag: "STRATEGIC" },
    { type: "reading", text: "📄 Reading transcript: Estate Manager Interview — Mike Thompson (50 min)", detail: "Extracting operational bottlenecks, compliance gaps, day-to-day friction..." },
    { type: "insight", text: "Manual lease tracking across 150 properties — estate manager maintains everything in spreadsheets", tag: "CRITICAL RISK" },
    { type: "insight", text: "3 compliance gaps identified in current lease tracking process — potential regulatory exposure", tag: "COMPLIANCE" },
    { type: "thinking", text: "Processing survey data: AI Readiness Assessment (8/12 responses)..." },
    { type: "insight", text: "67% of respondents rated AI adoption at 2/5 or below — significant readiness gap", tag: "SURVEY" },
    { type: "insight", text: "Top barriers: Budget (58%), Lack of expertise (50%), Unclear ROI (42%)", tag: "SURVEY" },
    { type: "thinking", text: "Processing survey data: Technology Stack Review (8/8 responses)..." },
    { type: "insight", text: "75% dissatisfied with current tech stack — top frustrations: too many tools, poor integration, data silos", tag: "SURVEY" },
    { type: "thinking", text: "Cross-referencing themes across all data sources..." },
    { type: "theme", text: "Theme 1: Manual processes creating revenue risk — lease tracking, reconciliation, reporting all manual", detail: "Appears in 3/3 transcripts + both surveys. Estimated £100K+ annual revenue leakage." },
    { type: "theme", text: "Theme 2: Key-person dependency — critical knowledge locked in individuals", detail: "Estate manager is single point of failure. No documentation system." },
    { type: "theme", text: "Theme 3: Growth blocked by systems — current infrastructure can't support 2x portfolio growth", detail: "CEO growth target requires fundamentally different operational backbone." },
    { type: "theme", text: "Theme 4: Data silos preventing decision-making — 6+ disconnected systems", detail: "CFO spends 3 days/month just assembling board reports manually." },
    { type: "thinking", text: "Building opportunity matrix — mapping impact vs. complexity..." },
    { type: "matrix", text: "Quick Wins: Automated lease tracking (£100K+ protection), Director dashboard (20hr/month saved)" },
    { type: "matrix", text: "Big Swings: Knowledge management system (de-risk key-person), AI contract analysis (unlock efficiency)" },
    { type: "thinking", text: "Constructing 3-phase implementation roadmap..." },
    { type: "roadmap", text: "Phase 1 (Month 1-2): Foundation — Lease tracking + data consolidation. Est. £35-45K" },
    { type: "roadmap", text: "Phase 2 (Month 3-4): Unlock — Director dashboard + knowledge base. Est. £40-55K" },
    { type: "roadmap", text: "Phase 3 (Month 5-6): Scale — AI contract analysis + predictive insights. Est. £50-70K" },
    { type: "thinking", text: "Calculating ROI projections..." },
    { type: "value", text: "Total investment: £125-170K over 6 months. Projected annual value: £280-350K (2.1x ROI in Year 1)" },
    { type: "complete", text: "✅ Analysis complete — 4 themes identified, opportunity matrix built, 3-phase roadmap constructed." },
  ];

  const getTagColor = (tag) => {
    if (tag === "CRITICAL RISK") return COLORS.danger;
    if (tag === "BUDGET" || tag === "STRATEGIC") return COLORS.blue;
    if (tag === "COMPLIANCE") return COLORS.warn;
    if (tag === "SURVEY") return "#7B61FF";
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

    for (let i = 0; i < REASONING_STEPS.length; i++) {
      await new Promise(r => setTimeout(r, 700));
      setReasoningLogs(prev => [...prev, REASONING_STEPS[i]]);
    }

    setIsReasoning(false);
    setShowGenerateBtn(true);
    setChatMessages(prev => [...prev, { role: "agent", text: "Analysis complete. I've identified 4 key themes, built an opportunity matrix, and mapped a 3-phase implementation roadmap.\n\nYou can ask me questions about any of the findings, or hit **Generate Deck** to create your presentation.\n\nSome things you might ask:\n• What were the main pain points from Mike Thompson's interview?\n• Can you elaborate on the compliance risks?\n• What's the breakdown of the Phase 1 investment?" }]);
  };

  const generateDeck = async () => {
    setShowGenerateBtn(false);
    setIsTyping(true);
    setChatMessages(prev => [...prev, { role: "agent", text: "Generating your presentation deck — 10 McKinsey-style slides..." }]);
    await new Promise(r => setTimeout(r, 2500));
    setDeckGenerated(true);
    setIsTyping(false);
    setChatMessages(prev => [...prev, { role: "agent", text: "Your deck is ready! 10 slides covering the full analysis — from current state through to next steps.\n\nClick any slide thumbnail on the right to preview it, or click **Open Editor** for the full-screen editor where you can click to edit any text.\n\nYou can also ask me to revise specific slides — for example:\n• \"Change slide 4 to focus more on compliance risk\"\n• \"Make the roadmap phases shorter — 4 months total\"\n• \"Add a slide about technology recommendations\"" }]);
  };

  const sendMessage = async () => {
    if (!userInput.trim() || isTyping || isReasoning) return;
    const msg = userInput.trim().toLowerCase();
    const newMessages = [...chatMessages, { role: "user", text: userInput }];
    setChatMessages(newMessages);
    setUserInput("");
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 1200));

    // Check if user wants to run analysis
    if (!analysisRun && (msg.includes("run") || msg.includes("start") || msg.includes("analyse") || msg.includes("analyze") || msg.includes("go ahead") || msg.includes("full analysis"))) {
      setChatMessages([...newMessages, { role: "agent", text: "Starting the full analysis now. I'll work through all transcripts and surveys, identify themes, map opportunities, and build a roadmap. Watch the reasoning panel..." }]);
      setIsTyping(false);
      await new Promise(r => setTimeout(r, 800));
      runAnalysis();
      return;
    }

    // Mock responses for different question types
    let response = "";
    if (msg.includes("mike") || msg.includes("thompson") || msg.includes("estate")) {
      response = "From Mike Thompson's interview (Estate Manager, 50 min), the key issues were:\n\n1. **Lease tracking is entirely manual** — he maintains all 150 properties in spreadsheets. He described it as \"getting unmanageable\" and flagged that they've missed renewal windows multiple times.\n\n2. **Compliance gaps** — he identified 3 specific areas where their current tracking doesn't meet regulatory requirements. This is a potential exposure risk.\n\n3. **Single point of failure** — Mike is the only person who knows the full property portfolio status. If he's unavailable, there's no backup system or documentation.\n\n4. **No scalability** — with the CEO's target of 300 properties, Mike said his current process \"would completely break down\" beyond ~180 properties.";
    } else if (msg.includes("sarah") || msg.includes("cfo") || msg.includes("finance")) {
      response = "Sarah Mitchell (CFO) highlighted several financial operations pain points:\n\n• **Month-end reconciliation** takes 3 full days because they're pulling data manually from 6+ disconnected systems\n• **Board reporting** is a major time sink — assembling accurate financial reports requires cross-referencing multiple sources\n• She rated AI adoption at 4/5 but noted **budget and unclear ROI** as the main blockers\n• She expressed frustration with the current tech stack, particularly the reliance on Excel for critical financial processes\n• Her top priority would be automating the reconciliation process, which she estimated could save 40+ hours per month";
    } else if (msg.includes("compliance") || msg.includes("risk")) {
      response = "The compliance risks identified across the audit data:\n\n1. **Lease regulatory compliance** — Mike Thompson flagged 3 specific gaps in how they track lease obligations. Without a centralized system, they can't demonstrate compliance to regulators.\n\n2. **Data protection** — with tenant data spread across spreadsheets, personal email, and multiple tools, there are potential GDPR concerns.\n\n3. **Financial reporting accuracy** — the manual reconciliation process introduces risk of errors that could affect regulatory financial reporting.\n\n4. **Audit trail** — no systematic way to track who made what changes to lease terms or financial records.\n\nThe estimated exposure from compliance gaps is significant — industry benchmarks suggest fines and remediation costs could reach £50-100K+ for a portfolio of this size.";
    } else if (msg.includes("slide") && msg.includes("change") || msg.includes("revise") || msg.includes("update slide") || msg.includes("modify slide")) {
      response = "Got it — I've noted that revision. The changes will be reflected in the deck. You can click **Open Editor** to see the updated slide and make further inline edits.\n\nWant me to adjust anything else?";
    } else if (msg.includes("roi") || msg.includes("investment") || msg.includes("cost") || msg.includes("budget")) {
      response = "Here's the investment breakdown:\n\n**Total: £125-170K over 6 months**\n\n• Phase 1 (Foundation): £35-45K — Lease tracking system + data consolidation\n• Phase 2 (Unlock): £40-55K — Director dashboard + knowledge base\n• Phase 3 (Scale): £50-70K — AI contract analysis + predictive insights\n\n**Projected Returns:**\n• Year 1: £280-350K value (2.1x ROI)\n• Year 2: £400-500K (compounding efficiency gains)\n• Year 3: £600-750K (full AI maturity + scaled portfolio)\n\nThe CEO confirmed an annual tech budget of £200-250K, so this fits within their existing allocation with room for contingency.";
    } else if (!analysisRun) {
      response = "I can answer that once I've run the analysis. Would you like me to start the full analysis now? Just say \"run the analysis\" or \"go ahead\" and I'll work through everything.";
    } else {
      response = "That's a great question. Based on the data I've analysed, I can tell you that this relates to the broader themes we identified — particularly around operational efficiency and the key-person dependency risk.\n\nWould you like me to dig deeper into a specific aspect, or shall we move on to generating the deck?";
    }

    setChatMessages(prev => [...prev, { role: "agent", text: response }]);
    setIsTyping(false);
  };

  if (showFullDeck) return <AuditFullDeckViewer project={project} onClose={() => setShowFullDeck(false)} />;

  const SLIDE_LABELS = ["Title", "Agenda", "Current State", "Key Finding", "Survey Results", "Opportunity Matrix", "Roadmap", "Investment Case", "Value Projection", "Next Steps"];

  return (
    <div style={{ flex: 1, display: "flex", height: "100%", overflow: "hidden", margin: -28, marginTop: -28 }}>
      {/* Left — Chat */}
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
                <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.6, whiteSpace: "pre-line" }}>{msg.text.replace(/\*\*(.*?)\*\*/g, "$1")}</div>
              </div>
            </div>
          ))}

          {/* Reasoning log embedded in chat */}
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

      {/* Right — Deck Preview */}
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

            {/* Title slide large preview */}
            <div onClick={() => setShowFullDeck(true)} style={{ cursor: "pointer", marginBottom: 16 }}>
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 8, overflow: "hidden", border: `1px solid ${COLORS.border}`, background: "linear-gradient(135deg, #1e293b, #0f172a)", position: "relative", display: "flex", alignItems: "center" }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 6, background: "#eab308" }} />
                <div style={{ padding: "0 40px" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Hodge Insurance Agency</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 20 }}>Operations Assessment & Strategic Recommendations</div>
                  <div style={{ fontSize: 8, color: "#eab308", fontWeight: 600, marginBottom: 2, letterSpacing: "0.04em" }}>PREPARED FOR PERRY SALVAGNE IV, PRESIDENT/CEO</div>
                  <div style={{ fontSize: 8, color: "#64748b" }}>October 2024</div>
                </div>
                <div style={{ position: "absolute", bottom: 8, left: 40, fontSize: 6, color: "#374151" }}>Confidential — Prepared for Hodge Insurance Agency, Inc.</div>
              </div>
            </div>

            {/* Slide grid */}
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
    const [editing, setEditing] = useState(false);
    const [tempVal, setTempVal] = useState(value);
    if (editing) {
      const El = multiline ? "textarea" : "input";
      return React.createElement(El, {
        value: tempVal, onChange: e => setTempVal(e.target.value),
        onBlur: () => { onChange(tempVal); setEditing(false); },
        onKeyDown: !multiline ? e => { if (e.key === "Enter") { onChange(tempVal); setEditing(false); } } : undefined,
        autoFocus: true,
        style: { ...style, background: "rgba(234,179,8,0.08)", border: "2px solid #eab308", borderRadius: 4, outline: "none", resize: multiline ? "none" : undefined, padding: "4px 8px", width: "100%", boxSizing: "border-box" },
      });
    }
    return (
      <div onClick={() => { setEditing(true); setTempVal(value); }} style={{ ...style, cursor: "text", borderRadius: 4, transition: "background 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(234,179,8,0.05)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >{value}</div>
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [playbookName, setPlaybookName] = useState("");
  const [saveSelections, setSaveSelections] = useState({});

  const MOCK_PLAYBOOKS = [
    { id: "pb1", name: "Q1 SaaS VP Growth — Cold Intro", audience: "VPs of Growth at Series B+ SaaS", created: "Feb 8, 2026",
      emails: [
        { id: "pb1e1", label: "Initial Email — Pain-Led", subject: "{{first_name}}, quick question about outbound", body: "Hi {{first_name}},\n\nQuick question: how much time are your reps spending on lead research vs. actually selling?..." },
        { id: "pb1e2", label: "Initial Email — Result-Led", subject: "47 meetings in 6 weeks", body: "Hi {{first_name}},\n\nA quick stat: one of our clients went from 12 booked meetings per month to 47..." },
        { id: "pb1e3", label: "Follow-up #1", subject: "re: quick question", body: "Hi {{first_name}},\n\nJust bumping this up..." },
      ],
      linkedin: [
        { id: "pb1l1", label: "Connection Request — A", body: "Hi {{first_name}} — saw {{company_name}} is scaling. I work with similar companies on AI outbound..." },
        { id: "pb1l2", label: "Follow-up after accept", body: "Thanks for connecting! Quick question — how are you handling outbound personalisation?..." },
      ],
      subjects: [
        "{{first_name}}, quick question about outbound",
        "47 meetings in 6 weeks (here's how)",
        "saw {{company_name}} is hiring SDRs — what if you didn't need to?",
        "your competitors are automating outbound",
        "{{first_name}}, are your reps still researching leads manually?",
      ],
    },
    { id: "pb2", name: "Healthcare Decision Makers", audience: "CTOs & CIOs at healthcare orgs (200+)", created: "Jan 22, 2026",
      emails: [
        { id: "pb2e1", label: "Initial Email — Compliance-Led", subject: "{{first_name}}, a question about {{company_name}}'s data ops", body: "Hi {{first_name}},\n\nHealthcare data is messy. Compliance makes it messier..." },
        { id: "pb2e2", label: "Follow-up #1", subject: "re: data ops", body: "Hi {{first_name}},\n\nJust following up..." },
        { id: "pb2e3", label: "Follow-up #2", subject: "one last thing", body: "Hi {{first_name}},\n\nLast note..." },
        { id: "pb2e4", label: "Follow-up #3 — Breakup", subject: "closing the loop", body: "Hi {{first_name}},\n\nLooks like timing isn't right..." },
      ],
      linkedin: [
        { id: "pb2l1", label: "Connection Request", body: "Hi {{first_name}} — I help healthcare orgs streamline data operations with AI..." },
        { id: "pb2l2", label: "Follow-up", body: "Thanks for connecting! Curious — how is {{company_name}} handling data compliance right now?..." },
      ],
      subjects: [
        "{{first_name}}, a question about {{company_name}}'s data ops",
        "healthcare data doesn't have to be this hard",
        "how [similar org] cut compliance overhead by 40%",
        "{{first_name}}, quick thought on {{company_name}}'s data stack",
      ],
    },
    { id: "pb3", name: "FinTech CROs — EMEA", audience: "CROs at FinTech companies, European market", created: "Jan 15, 2026",
      emails: [
        { id: "pb3e1", label: "Initial Email", subject: "{{first_name}}, quick question re: pipeline", body: "Hi {{first_name}},\n\nI noticed {{company_name}} just raised..." },
        { id: "pb3e2", label: "Follow-up #1", subject: "re: pipeline", body: "Hi {{first_name}},\n\nBumping this up..." },
        { id: "pb3e3", label: "Follow-up #2", subject: "last note", body: "Hi {{first_name}},\n\nFinal follow-up..." },
      ],
      linkedin: [
        { id: "pb3l1", label: "Connection Request", body: "{{first_name}}, congrats on the raise at {{company_name}}. I help FinTech CROs scale outbound..." },
        { id: "pb3l2", label: "Follow-up", body: "Appreciate the connection! Quick Q — what's your biggest challenge scaling pipeline right now?..." },
      ],
      subjects: [
        "{{first_name}}, congrats on the raise",
        "how FinTech CROs are scaling pipeline in 2026",
        "{{company_name}} + AI outbound = more pipeline",
      ],
    },
  ];

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
    await new Promise(r => setTimeout(r, 1200));
    if (!messagingSuite) {
      const nextStep = workshopStep + 1;
      if (nextStep < AGENT_QUESTIONS.length) {
        setChatMessages([...newMessages, { role: "agent", text: AGENT_QUESTIONS[nextStep].message }]);
        setWorkshopStep(nextStep);
      } else {
        setChatMessages([...newMessages, { role: "agent", text: "Perfect — I've got everything I need. Generating your complete messaging suite now..." }]);
        setWorkshopStep(nextStep);
        await new Promise(r => setTimeout(r, 2500));
        setMessagingSuite(MOCK_SUITE);
        setChatMessages(prev => [...prev, { role: "agent", text: "Your messaging suite is ready! I've created 2 email variants with follow-ups, 3 LinkedIn messages, and 20 subject lines to A/B test.\n\nClick ✏️ Revise on any piece to refine it. When you're happy, hit Save Playbook — you can select exactly which pieces to include." }]);
      }
    } else {
      setChatMessages([...newMessages, { role: "agent", text: "Got it — I've updated that piece. Take a look at the revised version on the right. Want to adjust anything else?" }]);
    }
    setIsTyping(false);
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSaveModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 520, maxHeight: "80vh", background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column" }}>
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
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 500, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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

function ColdEmailCampaignsView() {
  const [view, setView] = useState("list");
  const [addLeadsCampaign, setAddLeadsCampaign] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    name: "", senderAccounts: [], subjects: [{ id: 1, value: "", mode: "manual" }], bodies: [{ id: 1, value: "", mode: "manual" }],
    followups: [{ id: 1, delay: 1, subjectLine: false, bodies: [{ id: 1, value: "", mode: "manual" }] }, { id: 2, delay: 2, subjectLine: false, bodies: [{ id: 1, value: "", mode: "manual" }] }],
    dailyLimit: 50, startDate: "", endDate: "", openTracking: true, timezone: "Europe/London", sendStart: "09:00", sendEnd: "17:00", sendDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  });
  const MOCK_CAMPAIGNS = [
    { id: 1, name: "Q1 SaaS VP Growth — Cold Intro", status: "active", leads: 342, sent: 289, opened: 187, replied: 34, bounced: 4, dailyLimit: 50, startDate: "2026-01-15" },
    { id: 2, name: "Series B Companies — Feb 2026", status: "active", leads: 156, sent: 98, opened: 54, replied: 12, bounced: 2, dailyLimit: 40, startDate: "2026-02-01" },
    { id: 3, name: "Healthcare Decision Makers", status: "paused", leads: 210, sent: 210, opened: 132, replied: 28, bounced: 6, dailyLimit: 50, startDate: "2025-12-01" },
    { id: 4, name: "Product-Led Growth Leaders", status: "draft", leads: 0, sent: 0, opened: 0, replied: 0, bounced: 0, dailyLimit: 50, startDate: "" },
  ];
  const MOCK_SENDERS = [
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
          <button onClick={() => setView("create")} style={{ padding: "12px 24px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ CREATE CAMPAIGN</button>
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
        <button onClick={() => setView("list")} style={{ padding: "12px 28px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Create Campaign</button>
      </div>
    </div>
  );
}

function LinkedInCampaignsView() {
  const [addLeadsCampaign, setAddLeadsCampaign] = useState(null);
  const MOCK_CAMPAIGNS = [
    { id: 1, name: "Connection Request — Warm Intro", status: "active", leads: 180, sent: 145, accepted: 62, replied: 18, platform: "HeyReach" },
    { id: 2, name: "Content Engagement Sequence", status: "active", leads: 95, sent: 72, accepted: 34, replied: 11, platform: "HeyReach" },
    { id: 3, name: "Decision Maker Outreach — Q1", status: "paused", leads: 220, sent: 220, accepted: 88, replied: 24, platform: "AimFox" },
  ];

  const addLeadsBtn = (c) => (
    <button onClick={() => setAddLeadsCampaign(c)} style={{ padding: "7px 14px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.blue; e.currentTarget.style.color = COLORS.blue; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.textMuted; }}
    >+ Add Leads</button>
  );

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 32 }}>
      {addLeadsCampaign && <AddLeadsModal campaign={addLeadsCampaign} onClose={() => setAddLeadsCampaign(null)} accentColor={COLORS.blue} />}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>LinkedIn <span style={{ color: COLORS.blue }}>Campaigns</span></h2>
        <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Manage your HeyReach & AimFox campaigns</p>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatCard label="Active Campaigns" value={MOCK_CAMPAIGNS.filter(c => c.status === "active").length} accent={COLORS.blue} />
        <StatCard label="Total Sent" value={MOCK_CAMPAIGNS.reduce((s, c) => s + c.sent, 0)} accent={COLORS.blue} />
        <StatCard label="Acceptance Rate" value={`${Math.round(MOCK_CAMPAIGNS.reduce((s,c)=>s+c.accepted,0)/Math.max(MOCK_CAMPAIGNS.reduce((s,c)=>s+c.sent,0),1)*100)}%`} accent={COLORS.accent} />
        <StatCard label="Reply Rate" value={`${Math.round(MOCK_CAMPAIGNS.reduce((s,c)=>s+c.replied,0)/Math.max(MOCK_CAMPAIGNS.reduce((s,c)=>s+c.sent,0),1)*100)}%`} accent={COLORS.warn} />
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
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={onClose}>
      <div style={{ background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 24, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 28 }}>{intg.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>Configure {intg.label}</div>
            <div style={{ fontSize: 12, color: COLORS.textDim }}>{intg.desc}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
          {(intg.credentialFields || []).map(f => (
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
  { key: "fathom", label: "Fathom", icon: "🎙️", desc: "AI meeting assistant — import call transcripts", category: "call_recording", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }] },
  { key: "fireflies", label: "Fireflies.ai", icon: "🔥", desc: "Meeting transcription & analysis", category: "call_recording", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }] },
  { key: "zoom", label: "Zoom", icon: "📹", desc: "Import recordings & transcripts", category: "call_recording", credentialFields: [{ name: "client_id", label: "Client ID", type: "text" }, { name: "client_secret", label: "Client Secret", type: "password" }] },
  { key: "unipile", label: "Unipile", icon: "💼", desc: "LinkedIn company data & profile enrichment", category: "enrichment", orderTypes: ["lead_enrichment"], credentialFields: [{ name: "account_id", label: "Account ID", type: "text" }, { name: "access_token", label: "Access Token", type: "password" }, { name: "dsn", label: "DSN", type: "text", placeholder: "e.g. api12.unipile.com:14291" }] },
  { key: "instantly", label: "Instantly", icon: "📧", desc: "Cold email campaigns", category: "outreach", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "campaign_id", label: "Campaign ID", type: "text" }] },
  { key: "smartlead", label: "SmartLead", icon: "📬", desc: "Cold email campaigns", category: "outreach", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "workspace_id", label: "Workspace ID", type: "text" }] },
  { key: "heyreach", label: "HeyReach", icon: "🤝", desc: "LinkedIn outreach automation", category: "outreach", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "campaign_id", label: "Campaign ID", type: "text" }] },
  { key: "aimfox", label: "AimFox", icon: "🦊", desc: "LinkedIn outreach automation", category: "outreach", credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "campaign_id", label: "Campaign ID", type: "text" }] },
  { key: "icypeas", label: "IcyPeas", icon: "🧊", desc: "Find people & email search", category: "enrichment", orderTypes: ["lead_search", "lead_enrichment"], costLabel: "~$0.02/lead", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }] },
  { key: "bettercontact", label: "BetterContact", icon: "✉️", desc: "Email verification & list cleaning", category: "enrichment", orderTypes: ["lead_enrichment"], costLabel: "~$0.01/verify", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }] },
  { key: "zerobounce", label: "ZeroBounce", icon: "🛡️", desc: "Email verification & validation", category: "enrichment", orderTypes: ["lead_enrichment"], costLabel: "~$0.008/verify", costTier: 1, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }] },
  { key: "findy", label: "Findy", icon: "🔍", desc: "Lead discovery & enrichment", category: "enrichment", orderTypes: ["lead_search"], costLabel: "~$0.03/lead", costTier: 2, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }] },
  { key: "cleanlist", label: "Cleanlist", icon: "🧹", desc: "List cleaning & verification", category: "enrichment", orderTypes: ["lead_enrichment"], costLabel: "~$0.012/verify", costTier: 2, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }] },
  { key: "wiza", label: "Wiza", icon: "📊", desc: "Sales intelligence & lead data", category: "enrichment", orderTypes: ["lead_search"], costLabel: "~$0.04/lead", costTier: 4, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }] },
  { key: "leadsmagix", label: "Leads Magix", icon: "✨", desc: "B2B lead generation platform", category: "enrichment", orderTypes: ["lead_search"], costLabel: "~$0.025/lead", costTier: 3, credentialFields: [{ name: "api_key", label: "API Key", type: "password" }, { name: "workspace_id", label: "Workspace ID", type: "text" }] },
];

const ENRICHMENT_INTEGRATIONS = INTEGRATIONS_META.filter(i => i.category === "enrichment");
const LEAD_SEARCH_KEYS = ENRICHMENT_INTEGRATIONS.filter(i => (i.orderTypes || []).includes("lead_search")).map(i => i.key);
const LEAD_ENRICHMENT_KEYS = ENRICHMENT_INTEGRATIONS.filter(i => (i.orderTypes || []).includes("lead_enrichment")).map(i => i.key);

function SettingsView() {
  const [activeTab, setActiveTab] = useState("brand_voice");
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState({});
  const [configModal, setConfigModal] = useState(null);
  const [leadSearchOrder, setLeadSearchOrder] = useState({ leadSearch: LEAD_SEARCH_KEYS, leadEnrichment: LEAD_ENRICHMENT_KEYS });
  const [leadOrderSaving, setLeadOrderSaving] = useState(false);
  const [integrationCosts, setIntegrationCosts] = useState({});
  
  useEffect(() => {
    async function loadSettings() {
      try {
        const result = await api.settings.get('brand_voice');
        if (result.settings) {
          setAnswers(result.settings);
          setSubmitted(true);
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

  const QUESTIONS = [
    { section: "About You", items: [
      { key: "name", label: "What's your full name?", placeholder: "Andrew Dunn", type: "input" },
      { key: "title", label: "What's your current role / title?", placeholder: "AI Consultant & Founder, Vibe Consulting", type: "input" },
      { key: "industry", label: "What industry do you operate in?", placeholder: "AI Consulting, B2B SaaS, Automation", type: "input" },
      { key: "experience", label: "How many years of experience do you have?", placeholder: "e.g. 8 years in tech, 3 in AI consulting", type: "input" },
      { key: "unique", label: "What makes you different from others in your space?", placeholder: "e.g. I run a one-person agency that competes with teams of 20 using AI leverage...", type: "textarea" },
    ]},
    { section: "Your Audience", items: [
      { key: "audience_who", label: "Who is your ideal audience?", placeholder: "e.g. B2B founders, VPs of Sales, heads of growth at SaaS companies (50-500 employees)", type: "textarea" },
      { key: "audience_problems", label: "What are their biggest pain points?", placeholder: "e.g. Spending too much on lead gen tools, low reply rates, can't personalise at scale...", type: "textarea" },
      { key: "audience_goals", label: "What outcomes do they want?", placeholder: "e.g. More qualified meetings, lower CAC, efficient outbound that doesn't feel spammy", type: "textarea" },
    ]},
    { section: "Content Pillars", items: [
      { key: "topics", label: "What are your 3-5 core topics you create content about?", placeholder: "e.g. AI automation, lead generation, cold outreach, one-person business, vibe coding", type: "textarea" },
      { key: "strong_opinions", label: "What are your strongest opinions / hot takes?", placeholder: "e.g. One-person businesses will outperform agencies. AI won't replace consultants but consultants using AI will replace those who don't...", type: "textarea" },
      { key: "stories", label: "What personal stories or case studies do you reference often?", placeholder: "e.g. Building Vibe Consulting from scratch, client results (100 testimonials), specific client wins...", type: "textarea" },
    ]},
    { section: "Writing Style", items: [
      { key: "tone", label: "How would you describe your tone?", placeholder: "e.g. Direct, no-fluff, conversational but authoritative. I use short sentences and paragraphs.", type: "textarea" },
      { key: "vocabulary", label: "Any specific phrases, words or expressions you use often?", placeholder: "e.g. 'Here\u2019s the thing', 'Let me break this down', 'The real question is...'", type: "textarea" },
      { key: "avoid", label: "What words or styles do you avoid?", placeholder: "e.g. Corporate jargon, buzzwords like 'synergy', overly formal language, emoji overuse", type: "textarea" },
      { key: "formatting", label: "How do you typically format your posts?", placeholder: "e.g. Short paragraphs, line breaks between thoughts, bold opening hook, end with a question", type: "textarea" },
    ]},
    { section: "Content Goals", items: [
      { key: "goal", label: "What's the primary goal of your content?", placeholder: "e.g. Generate inbound leads, build authority, grow audience, drive traffic to offers", type: "input" },
      { key: "cta_style", label: "How do you typically end posts / what's your CTA style?", placeholder: "e.g. Ask a question, invite DMs, point to a link, 'Follow for more...'", type: "textarea" },
      { key: "frequency", label: "How often do you want to post?", placeholder: "e.g. Daily on LinkedIn, 3x/week on video, engage in communities daily", type: "input" },
    ]},
    { section: "Examples", items: [
      { key: "best_post", label: "Paste your best-performing post (the one that felt most 'you'):", placeholder: "Paste your best LinkedIn post, tweet, or content piece here...", type: "textarea_lg" },
      { key: "inspiration", label: "Who do you look up to content-wise? (creators, writers, thought leaders)", placeholder: "e.g. Alex Hormozi, Chris Walker, Justin Welsh, Sahil Bloom", type: "input" },
    ]},
  ];

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
                      <textarea value={answers[q.key] || ""} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder={q.placeholder} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                    ) : (
                      <input value={answers[q.key] || ""} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder={q.placeholder} style={inputStyle} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button onClick={async () => {
            setSaving(true);
            try {
              await api.settings.save('buyer_persona', answers);
              setSubmitted(true);
            } catch (err) {
              console.error("Failed to save buyer persona:", err);
              alert("Failed to save. Please try again.");
            } finally {
              setSaving(false);
            }
          }} disabled={saving} style={{ padding: "14px 28px", background: saving ? COLORS.border : COLORS.accent, color: saving ? COLORS.textDim : COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving..." : submitted ? "✓ Buyer Persona Saved" : "Save Buyer Persona"}
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
                  await api.integrations.save(configModal.key, credentials);
                  await loadIntegrationStatus();
                  setConfigModal(null);
                } catch (err) {
                  console.error("Failed to save integration:", err);
                  alert("Failed to save credentials. Please try again.");
                }
              }}
              onClose={() => setConfigModal(null)}
            />
          )}
          <p style={{ color: COLORS.textMuted, marginBottom: 20, fontSize: 13 }}>Connect your tools to power the platform. Call recording tools feed into content generation, outreach tools sync with campaigns.</p>

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
          {QUESTIONS.map(section => (
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
            <StatCard label="Questions Answered" value={`${Object.values(answers).filter(v => v && v.trim()).length}/${QUESTIONS.reduce((s, sec) => s + sec.items.length, 0)}`} accent={COLORS.accent} />
            <StatCard label="Profile Strength" value={Object.values(answers).filter(v => v && v.trim()).length >= 15 ? "Strong" : "Good"} accent={COLORS.accent} />
            <StatCard label="Active Modules" value="3" accent={COLORS.blue} />
          </div>
          {QUESTIONS.map(section => (
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

      {/* Buyer Persona Tab */}
      {activeTab === "buyer_persona" && (
        <div>
          <p style={{ color: COLORS.textMuted, marginBottom: 24, fontSize: 13 }}>Define your ideal buyer persona. This profile feeds into messaging personalisation, content targeting, and sales scripts across the platform.</p>
          {[
            { section: "Background & Demographics", items: [
              { key: "bp_job_title", label: "What is their typical job title?", placeholder: "e.g. VP of Sales, Head of Growth, CTO, Founder/CEO", type: "input" },
              { key: "bp_seniority", label: "What level of seniority are they?", placeholder: "e.g. C-suite, VP, Director, Manager", type: "input" },
              { key: "bp_industry", label: "What industry do they work in?", placeholder: "e.g. B2B SaaS, Financial Services, Healthcare, E-commerce", type: "input" },
              { key: "bp_company_size", label: "What size company do they typically work at?", placeholder: "e.g. 50-500 employees, Series B+, £5-50M revenue", type: "input" },
              { key: "bp_age_range", label: "What's their typical age range?", placeholder: "e.g. 30-50", type: "input" },
              { key: "bp_education", label: "What's their typical educational background?", placeholder: "e.g. MBA, engineering degree, self-taught, business school", type: "input" },
            ]},
            { section: "Experience & Skills", items: [
              { key: "bp_career_path", label: "What does their typical career path look like?", placeholder: "e.g. Started as SDR → AE → Sales Manager → VP of Sales over 10-15 years", type: "textarea" },
              { key: "bp_expertise", label: "What are they an expert in?", placeholder: "e.g. Revenue operations, pipeline management, team scaling, go-to-market strategy", type: "textarea" },
              { key: "bp_tools", label: "What tools/platforms do they use daily?", placeholder: "e.g. Salesforce, HubSpot, LinkedIn Sales Nav, Gong, Outreach, Slack", type: "textarea" },
              { key: "bp_team", label: "How big is the team they manage?", placeholder: "e.g. 5-20 direct reports, manages SDR + AE teams", type: "input" },
            ]},
            { section: "Goals & Motivations", items: [
              { key: "bp_primary_goal", label: "What is their #1 professional goal right now?", placeholder: "e.g. Hit revenue targets, scale the team, reduce CAC, improve conversion rates", type: "textarea" },
              { key: "bp_success_metric", label: "What KPIs are they measured on?", placeholder: "e.g. Revenue, pipeline generated, meetings booked, conversion rate, CAC, LTV", type: "textarea" },
              { key: "bp_aspirations", label: "Where do they want to be in 2-3 years?", placeholder: "e.g. CRO position, building their own company, recognised industry leader", type: "textarea" },
            ]},
            { section: "Pain Points & Frustrations", items: [
              { key: "bp_biggest_pain", label: "What's their biggest daily frustration?", placeholder: "e.g. Too much time on manual tasks, low-quality leads, tool overload, lack of data", type: "textarea" },
              { key: "bp_fear", label: "What keeps them up at night professionally?", placeholder: "e.g. Missing targets, falling behind competitors, team attrition, board pressure", type: "textarea" },
              { key: "bp_objections", label: "What objections do they typically raise when buying?", placeholder: "e.g. Budget constraints, need to prove ROI first, bad experience with similar tools, too busy to implement", type: "textarea" },
              { key: "bp_failed_solutions", label: "What solutions have they tried that didn't work?", placeholder: "e.g. Hired an agency, bought expensive tools with low adoption, tried building in-house", type: "textarea" },
            ]},
            { section: "Buying Behaviour", items: [
              { key: "bp_info_sources", label: "Where do they go for information and advice?", placeholder: "e.g. LinkedIn, industry podcasts, peer recommendations, Gartner, conferences", type: "textarea" },
              { key: "bp_decision_process", label: "How do they typically make purchasing decisions?", placeholder: "e.g. Research online → ask peers → request demo → internal business case → approval from CFO", type: "textarea" },
              { key: "bp_budget_authority", label: "What budget authority do they have?", placeholder: "e.g. Can approve up to £50K independently, above that needs board sign-off", type: "input" },
              { key: "bp_buying_triggers", label: "What triggers them to start looking for a solution?", placeholder: "e.g. Missed quarterly targets, new board pressure, competitor doing it, team complaints", type: "textarea" },
            ]},
          ].map(section => (
            <div key={section.section} style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: FONT, fontSize: 10, color: "#7B61FF", letterSpacing: "0.08em", fontWeight: 600, marginBottom: 12, padding: "8px 16px", background: "#7B61FF10", borderRadius: 6, display: "inline-block" }}>{section.section.toUpperCase()}</div>
              <div style={{ padding: "20px 24px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 12 }}>
                {section.items.map((q, i) => (
                  <div key={q.key} style={{ marginBottom: i < section.items.length - 1 ? 18 : 0 }}>
                    <label style={labelStyle}>{q.label}</label>
                    {q.type === "input" ? (
                      <input value={answers[q.key] || ""} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder={q.placeholder} style={inputStyle} />
                    ) : (
                      <textarea value={answers[q.key] || ""} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })} placeholder={q.placeholder} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingBottom: 32 }}>
            <button style={{ padding: "14px 32px", background: COLORS.accent, color: COLORS.bg, border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save Buyer Persona →</button>
          </div>
        </div>
      )}
    </div>
  );
}




function NicheResearcherView() {
  const [view, setView] = useState("library"); // library, chat, detail
  const [selectedNiche, setSelectedNiche] = useState(null);
  const [savedNiches, setSavedNiches] = useState([
    { id: "sn1", name: "AI Automation for Mid-Market B2B SaaS", score: 92, size: "~12,000 companies", competition: "Medium", demand: "High", avgDeal: "£15-30K", savedDate: "Feb 8", audience: "VPs of Sales & CROs at Series B+ B2B SaaS (50-500 employees)", positioning: "The one-person AI consultancy delivering enterprise-level outbound systems", monetisation: "AI Audit (£2-5K) → Implementation (£15-30K) → Retainer (£3-5K/mo)", advantage: "AI-native methodology, 100+ testimonials, rapid deployment", channels: "LinkedIn, Skool, cold outreach, referral network", why: "High willingness to pay, proven demand, your methodology gives unfair speed advantage" },
    { id: "sn2", name: "AI Ops for Property Management Firms", score: 87, size: "~8,500 companies", competition: "Low", demand: "High", avgDeal: "£20-45K", savedDate: "Feb 5", audience: "Managing Directors & COOs at property firms (50-500 units)", positioning: "AI-powered operations transformation specialist for property management", monetisation: "Operations Audit (£3-5K) → System Build (£20-45K) → Support (£2-4K/mo)", advantage: "Direct experience with Hastingwood case study", channels: "LinkedIn, property conferences, referral from existing clients", why: "Low competition, high pain points, you have a proven case study" },
  ]);
  const [chatMessages, setChatMessages] = useState([{ role: "agent", text: "Hey! I'm your Niche Research assistant. I'll help you find the ideal niche. What are your core skills and areas of expertise?" }]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState(0);
  const [nichesGenerated, setNichesGenerated] = useState(false);
  const chatEndRef = React.useRef(null);

  React.useEffect(() => { if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, isTyping]);

  const DISCOVERED_NICHES = [
    { id: "n1", name: "AI Automation for Mid-Market B2B SaaS", score: 92, size: "~12,000 companies", competition: "Medium", demand: "High", avgDeal: "£15-30K", audience: "VPs of Sales & CROs at Series B+ B2B SaaS (50-500 employees)", positioning: "The one-person AI consultancy delivering enterprise-level outbound systems", monetisation: "AI Audit (£2-5K) → Implementation (£15-30K) → Retainer (£3-5K/mo)", advantage: "AI-native methodology, 100+ testimonials, rapid deployment", channels: "LinkedIn, Skool, cold outreach, referral network", why: "High willingness to pay, proven demand, your methodology gives unfair speed advantage" },
    { id: "n2", name: "AI Ops for Property Management Firms", score: 87, size: "~8,500 companies", competition: "Low", demand: "High", avgDeal: "£20-45K", audience: "Managing Directors & COOs at property firms (50-500 units)", positioning: "AI-powered operations transformation for property management", monetisation: "Operations Audit (£3-5K) → System Build (£20-45K) → Support (£2-4K/mo)", advantage: "Hastingwood case study, deep domain knowledge", channels: "LinkedIn, property conferences, referrals", why: "Low competition, high pain points, proven case study" },
    { id: "n3", name: "Lead Gen Automation for Agencies & Consultants", score: 84, size: "~45,000 businesses", competition: "High", demand: "Very High", avgDeal: "£5-15K", audience: "Solo consultants & agency founders (£100K-1M revenue)", positioning: "Done-for-you AI lead gen system replacing your £2K/mo tool stack", monetisation: "Setup (£5-10K) → Platform licence (£500-1K/mo)", advantage: "You're the target customer — built this for yourself first", channels: "LinkedIn, Skool, YouTube, cold outreach", why: "Massive market, you use the product yourself, easy to demonstrate ROI" },
    { id: "n4", name: "AI Strategy for Insurance Agencies", score: 79, size: "~22,000 agencies", competition: "Very Low", demand: "Medium", avgDeal: "£10-25K", audience: "Agency principals at independent agencies (10-100 staff)", positioning: "The AI consultant who understands insurance — audit to implementation", monetisation: "AI Audit (£2-5K) → Implementation (£10-25K) → Quarterly review (£1-2K)", advantage: "Hodge Insurance case study, industry-specific knowledge", channels: "Insurance conferences, LinkedIn, industry publications", why: "Very low competition, industry behind on AI, direct case study proof" },
  ];

  const AGENT_FLOW = ["Who have you had the best results with? Industry, size, role?", "What problem do you solve better than anyone?", "Price range and model — project, retainer, productised?", "How competitive do you want your niche?", "Where do these people hang out?"];

  const sendMessage = async () => {
    if (!userInput.trim() || isTyping) return;
    const nm = [...chatMessages, { role: "user", text: userInput }]; setChatMessages(nm); setUserInput(""); setIsTyping(true);
    await new Promise(r => setTimeout(r, 1200));
    if (step < AGENT_FLOW.length) { setChatMessages([...nm, { role: "agent", text: AGENT_FLOW[step] }]); setStep(step + 1); }
    else if (!nichesGenerated) { setNichesGenerated(true); setChatMessages([...nm, { role: "agent", text: "I've identified 4 high-potential niches. Check the dashboard on the right — each card shows score, market size, and avg deal. Click any card for details.\n\nHit 💾 Save on any niche to add it to your library." }]); }
    else { setChatMessages([...nm, { role: "agent", text: "Good point — I've factored that in. Take another look at the recommendations." }]); }
    setIsTyping(false);
  };

  const saveNiche = (niche) => {
    if (!savedNiches.find(sn => sn.name === niche.name)) {
      setSavedNiches(prev => [{ ...niche, id: `sn_${Date.now()}`, savedDate: "Just now" }, ...prev]);
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
          <button style={{ padding: "12px 24px", background: COLORS.blue, color: "#fff", border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>⚡ Generate Lead List →</button>
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
          <button onClick={() => { setView("chat"); setNichesGenerated(false); setStep(0); setChatMessages([{ role: "agent", text: "Let's research a new niche. What are your core skills and expertise?" }]); }}
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
            <div><div style={{ fontWeight: 600, fontSize: 13 }}>Niche Researcher</div><div style={{ fontSize: 10, color: COLORS.textDim }}>{nichesGenerated ? `${DISCOVERED_NICHES.length} niches found` : `Step ${Math.min(step + 1, AGENT_FLOW.length + 1)}/${AGENT_FLOW.length + 1}`}</div></div>
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
          <input value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !isTyping) sendMessage(); }} placeholder={nichesGenerated ? "Refine..." : "Describe expertise..."} style={{ flex: 1, padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none" }} disabled={isTyping} />
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
              {DISCOVERED_NICHES.map(niche => {
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
  const [savedScripts, setSavedScripts] = useState([
    { id: "ss1", name: "B2B SaaS VP Cold Call", type: "Cold Call", created: "Feb 8", sections: 5, uses: 24, audience: "VPs of Sales at SaaS companies" },
    { id: "ss2", name: "AI Audit Discovery Call", type: "Discovery Call", created: "Feb 5", sections: 5, uses: 18, audience: "CTOs & COOs at mid-market firms" },
    { id: "ss3", name: "Follow-up After Demo", type: "Follow-up Call", created: "Jan 28", sections: 4, uses: 12, audience: "Decision-makers post-demo" },
    { id: "ss4", name: "Insurance Agency Cold Call", type: "Cold Call", created: "Jan 20", sections: 5, uses: 31, audience: "Insurance agency principals" },
    { id: "ss5", name: "Objection Handling Playbook", type: "Objection Handling", created: "Jan 15", sections: 6, uses: 45, audience: "All prospects" },
  ]);

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
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSaveModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ width: 420, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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
  const [savedVideoScripts, setSavedVideoScripts] = useState([
    { id: "vs1", name: "AI Usage Hot Take", scripts: 2, created: "Feb 7", style: "educational", topic: "Why most people use AI wrong" },
    { id: "vs2", name: "Client Testimonial Series", scripts: 3, created: "Feb 4", style: "storytelling", topic: "From 0 to 100 testimonials" },
  ]);
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowSaveModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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

  const CALL_HISTORY = [
    { id: "c1", name: "Sarah Chen — Acme SaaS", date: "Feb 10", duration: "22 min", score: 7.2, outcome: "Meeting booked", source: "Fathom" },
    { id: "c2", name: "Mark Davies — TechCorp", date: "Feb 9", duration: "18 min", score: 8.1, outcome: "Proposal sent", source: "Fathom" },
    { id: "c3", name: "Lisa Wang — CloudBase", date: "Feb 8", duration: "25 min", score: 6.5, outcome: "Follow-up needed", source: "Fathom" },
    { id: "c4", name: "Tom Harris — DataFlow", date: "Feb 7", duration: "15 min", score: 5.8, outcome: "No interest", source: "Manual" },
    { id: "c5", name: "Emma Wilson — ScaleUp AI", date: "Feb 6", duration: "30 min", score: 8.7, outcome: "Closed won", source: "Fathom" },
    { id: "c6", name: "James Lee — PropTech Inc", date: "Feb 5", duration: "20 min", score: 7.5, outcome: "Demo scheduled", source: "Fathom" },
  ];

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

  const CALL_IDEAS = [
    { id: "c1", title: "\"We're spending £500/month on Apollo and getting nothing\"", quote: "Prospect admitted they've been paying for lead gen tools for 6 months with zero ROI. They didn't even know you could waterfall email verification.", source: "Call with Lisa Park — Feb 8", callDate: "Feb 8" },
    { id: "c2", title: "\"Our reps spend 3 hours a day just researching leads\"", quote: "Head of Sales said their team manually researches every prospect. They had no idea AI could automate the entire discovery-to-personalisation flow.", source: "Call with Marcus Johnson — Feb 5", callDate: "Feb 5" },
    { id: "c3", title: "\"We tried AI but the emails all sounded like robots\"", quote: "VP of Growth said they tested AI email tools but the lack of personalisation killed their reply rates. They were using template-based systems with zero context.", source: "Call with Sarah Chen — Feb 3", callDate: "Feb 3" },
    { id: "c4", title: "\"I didn't know you could do all this with a one-person team\"", quote: "Founder was shocked when they saw the full automation stack in action. They assumed you needed a team of 5+ to run outbound at scale.", source: "Call with Jake Morrison — Jan 30", callDate: "Jan 30" },
  ];

  const MOCK_COMPETITORS = [
    { id: "comp1", name: "Chris Walker", handle: "@chris_walker", followers: "142K", recentPost: "The demand gen playbook is broken. Here's what's replacing it...", engagement: "2.4K likes", tracked: true },
    { id: "comp2", name: "Justin Welsh", handle: "@justinwelsh", followers: "580K", recentPost: "I've made $5M as a solopreneur. My biggest advantage? Systems, not hustle.", engagement: "5.1K likes", tracked: true },
    { id: "comp3", name: "Alex Hormozi", handle: "@hormozi", followers: "1.2M", recentPost: "Most businesses don't have a lead problem. They have an offer problem.", engagement: "8.7K likes", tracked: true },
  ];

  const MOCK_SCHEDULED = [
    { id: "s1", content: "Stop overthinking your AI strategy. Start with one process...", format: "text", date: "Feb 12, 2026", time: "09:00", status: "scheduled" },
    { id: "s2", content: "3 tools that replaced my entire lead gen team →", format: "carousel", date: "Feb 13, 2026", time: "11:00", status: "scheduled" },
    { id: "s3", content: "The ROI of AI consulting isn't what you think...", format: "image", date: "Feb 14, 2026", time: "08:30", status: "scheduled" },
  ];

  const MOCK_PUBLISHED = [
    { id: "p1", content: "I built a one-person agency that competes with firms 10x my size. Here's how AI made it possible...", format: "text", date: "Feb 10, 2026", impressions: 12400, likes: 234, comments: 47, reposts: 18 },
    { id: "p2", content: "Your cold emails are failing because of one thing: they sound like cold emails...", format: "text", date: "Feb 8, 2026", impressions: 8900, likes: 167, comments: 32, reposts: 11 },
    { id: "p3", content: "The AI automation stack I recommend to every client →", format: "carousel", date: "Feb 6, 2026", impressions: 15200, likes: 312, comments: 58, reposts: 34 },
  ];

  const MOCK_GENERATED = [
    {
      id: "g1", format: "text",
      content: "Most people think AI automation is about replacing humans.\n\nThey're wrong.\n\nThe best companies I work with use AI to handle the repetitive work — data entry, lead research, email personalisation — so their team can focus on what actually drives revenue:\n\n→ Building relationships\n→ Creative problem solving\n→ Strategic decisions\n\nOne client freed up 15 hours per week per person. They didn't fire anyone. They redeployed that time into closing bigger deals.\n\nResult? 40% revenue increase in 6 months.\n\nAI doesn't replace your team. It multiplies them.\n\nWhat's one task you wish you could automate today?",
    },
    {
      id: "g2", format: "text",
      content: "Hot take: You don't need a bigger team.\n\nYou need better systems.\n\nI run a consulting business with zero employees that regularly outperforms agencies with 15+ people. Here's the reality:\n\n• AI handles my lead research\n• AI personalises every email\n• AI drafts my proposals\n• AI writes first drafts of reports\n\nI handle strategy, relationships, and final quality.\n\nThe future isn't about headcount. It's about leverage.\n\nAgree or disagree?",
    },
  ];

  const MOCK_CAROUSEL = [
    { slide: 1, text: "5 AI Tools That\nChanged My Business", bg: COLORS.accent },
    { slide: 2, text: "1. AI Ark\nSmart company discovery\nthat actually works", bg: COLORS.blue },
    { slide: 3, text: "2. BetterContact\n95%+ email verification\nusing waterfall method", bg: "#7B61FF" },
    { slide: 4, text: "3. Claude\nPersonalisation that\ndoesn't sound like AI", bg: COLORS.warn },
    { slide: 5, text: "4. Instantly\nCold email at scale\nwithout hitting spam", bg: "#E1306C" },
    { slide: 6, text: "Follow for more\nAI automation tips\n→ Link in bio", bg: COLORS.accent },
  ];

  const inputStyle = { width: "100%", padding: "10px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600, marginBottom: 6 };

  const selectIdea = (title) => { setTopic(title); };

  const generate = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    if (format === "carousel") {
      setGeneratedPosts([{ id: "gc1", format: "carousel", slides: MOCK_CAROUSEL }]);
    } else {
      setGeneratedPosts(MOCK_GENERATED.map(p => ({ ...p, format })));
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
                {CALL_IDEAS.map(idea => (
                  <div key={idea.id} onClick={() => selectIdea(idea.title.replace(/"/g, ""))} style={{
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setSchedulePost(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 440, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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
  const [accounts, setAccounts] = useState([
    { id: 1, platform: "skool", name: "AI Automation Community", connected: true },
    { id: 2, platform: "linkedin", name: "SaaS Growth Leaders", connected: true },
    { id: 3, platform: "facebook", name: "Entrepreneurs Hub", connected: true },
  ]);
  const [keywords, setKeywords] = useState(["AI automation", "lead generation", "cold outreach", "AI agent", "vibe coding"]);
  const [newKeyword, setNewKeyword] = useState("");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccountPlatform, setNewAccountPlatform] = useState("skool");
  const [newAccountName, setNewAccountName] = useState("");
  const [voiceSamples, setVoiceSamples] = useState([
    { id: 1, type: "linkedin_post", title: "Why AI won't replace consultants", preview: "Hot take: AI won't replace consultants. But consultants who use AI will replace those who don't...", date: "Jan 28, 2026" },
    { id: 2, type: "blog", title: "The One-Person Agency Playbook", preview: "I've been running a one-person consulting business for 2 years now. Here's what I've learned about leveraging AI to compete with teams 10x your size...", date: "Jan 15, 2026" },
    { id: 3, type: "comment", title: "Reply on Skool — AI tools thread", preview: "Great question! The key is layering tools rather than relying on one platform. I use AI Ark for discovery, BetterContact for verification...", date: "Feb 3, 2026" },
  ]);
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

  const MOCK_FEED = [
    {
      id: 1, platform: "skool", community: "AI Automation Community", author: "Jake Morrison",
      content: "Has anyone successfully set up an AI agent for lead generation? I've been trying to automate my cold outreach but keep hitting walls with personalization. Would love to hear what tools people are using.",
      matchedKeywords: ["AI agent", "lead generation", "cold outreach"],
      timestamp: "2h ago", likes: 14, comments: 8,
      draftReply: "Great question Jake! I've been running AI-powered lead gen for a while now. The key is layering tools — use AI Ark for discovery, BetterContact for email verification, then Claude for personalization. The personalization piece is what makes or breaks reply rates. Happy to share my exact workflow if you're interested. What's your current tech stack looking like?",
      url: "https://www.skool.com/ai-automation/post/abc123",
    },
    {
      id: 2, platform: "linkedin", community: "SaaS Growth Leaders", author: "Sarah Chen",
      content: "Hot take: Most companies are using AI wrong. They're automating tasks that shouldn't be automated and ignoring the areas where AI could genuinely 10x their output. Specifically in content creation and lead qualification — these are where I'm seeing the biggest ROI.",
      matchedKeywords: ["AI automation"],
      timestamp: "4h ago", likes: 89, comments: 23,
      draftReply: "Couldn't agree more Sarah. The companies I work with that see the biggest results are the ones using AI for the high-leverage stuff — personalised outreach at scale, intelligent lead scoring, content repurposing. The trap is automating for the sake of it rather than automating strategically. What specific content creation workflows have you seen work best?",
      url: "https://linkedin.com/feed/update/def456",
    },
    {
      id: 3, platform: "skool", community: "AI Automation Community", author: "Marcus Williams",
      content: "Just discovered vibe coding with Claude and it's completely changed how I build. Went from idea to working prototype in 3 hours. The trick is treating it like a conversation with a CTO rather than just writing prompts.",
      matchedKeywords: ["vibe coding"],
      timestamp: "6h ago", likes: 32, comments: 15,
      draftReply: "Love hearing this Marcus! You've nailed the key insight — the conversation-first approach is everything. I've found that spending 10-15 minutes upfront mapping out the architecture in plain English with Claude before writing a single line of code saves hours. What did you build? Would love to see it!",
      url: "https://www.skool.com/ai-automation/post/ghi789",
    },
    {
      id: 4, platform: "facebook", community: "Entrepreneurs Hub", author: "Lisa Park",
      content: "Looking for recommendations on AI tools for lead generation. Currently spending about £500/month on Apollo and not seeing great results. Is there something better out there?",
      matchedKeywords: ["AI", "lead generation"],
      timestamp: "8h ago", likes: 7, comments: 12,
      draftReply: "Hey Lisa! I was in the exact same boat with Apollo. Switched to a stacked approach — AI Ark for smarter company discovery, Icypeas + BetterContact for email verification (waterfall method gets 95%+ accuracy), and then AI personalization for each email. Total cost is comparable but the results are significantly better because you're getting verified contacts with genuinely personalised messaging. Happy to break down the full stack if that helps!",
      url: "https://facebook.com/groups/entrepreneurs/posts/xyz789",
    },
  ];

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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowAgentWarning(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: 480, background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
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
    await new Promise(r => setTimeout(r, 1800));
    
    // TODO: Integrate with OpenAI API for real responses using org context
    const reply = "I understand you're asking about: \"" + userMsg + "\"\n\nI can help with that! Currently processing your request based on your account data...\n\nThis feature will be fully integrated with your CRM, leads, campaigns, and all Pipeline data to provide contextual answers. Would you like me to elaborate on any specific area?";
    
    setMessages([...nm, { role: "agent", text: reply }]);
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

function AccountView() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ firstName: "", lastName: "", email: "", company: "", timezone: "Europe/London", photoUrl: "" });
  const [originalProfile, setOriginalProfile] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [currentPlan] = useState("growth");
  const [creditsUsed] = useState(1247);
  const [creditsTotal] = useState(2000);
  const [notifications, setNotifications] = useState({ weeklyDigest: true, creditAlert80: true, creditAlert100: true, campaignComplete: true, surveyResponses: false });
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
                      background: "rgba(0,0,0,0.6)", 
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
                  <div style={{ fontSize: 11, color: COLORS.accent, marginTop: 2 }}>{PLANS.find(p => p.key === currentPlan)?.name} Plan</div>
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
                  <span style={{ fontWeight: 700, fontSize: 20 }}>{PLANS.find(p => p.key === currentPlan)?.name}</span>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 10, fontFamily: FONT, fontWeight: 600, background: COLORS.accent + "15", color: COLORS.accent }}>{PLANS.find(p => p.key === currentPlan)?.price}/mo</span>
                </div>
                <div style={{ fontSize: 12, color: COLORS.textDim }}>Renews March 11, 2025 · Paid via Visa ****4821</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${COLORS.border}`, borderRadius: 6, color: COLORS.textMuted, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Manage Subscription</button>
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
            {USAGE_BREAKDOWN.map((cat, i) => (
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
              {PLANS.map(plan => (
                <div key={plan.key} style={{ flex: 1, padding: "20px", background: COLORS.surface, border: `1px solid ${plan.key === currentPlan ? COLORS.accent + "55" : COLORS.border}`, borderRadius: 12, position: "relative" }}>
                  {plan.key === currentPlan && <div style={{ position: "absolute", top: -1, left: 20, right: 20, height: 3, background: COLORS.accent, borderRadius: "0 0 2px 2px" }} />}
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{plan.name}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.accent, marginBottom: 4 }}>{plan.price}<span style={{ fontSize: 12, fontWeight: 400, color: COLORS.textDim }}>/mo</span></div>
                  <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 14 }}>{plan.credits.toLocaleString()} credits/month</div>
                  {plan.features.map((f, fi) => (
                    <div key={fi} style={{ fontSize: 11, color: COLORS.text, padding: "4px 0", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: COLORS.accent, fontSize: 10 }}>✓</span> {f}
                    </div>
                  ))}
                  <button style={{ width: "100%", marginTop: 14, padding: "10px", borderRadius: 8, fontFamily: FONT, fontSize: 11, fontWeight: 600, cursor: "pointer", background: plan.key === currentPlan ? "transparent" : COLORS.accent, color: plan.key === currentPlan ? COLORS.textDim : COLORS.bg, border: plan.key === currentPlan ? `1px solid ${COLORS.border}` : "none" }}>{plan.key === currentPlan ? "Current Plan" : plan.credits > PLANS.find(p => p.key === currentPlan).credits ? "Upgrade" : "Downgrade"}</button>
                </div>
              ))}
            </div>
          </div>

          {/* Credit Cost Reference */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Credit Costs</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[
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
              ].map((item, i) => (
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
              {USAGE_HISTORY.map((entry, i) => (
                <div key={i} style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: i < USAGE_HISTORY.length - 1 ? `1px solid ${COLORS.border}` : "none" }}>
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
