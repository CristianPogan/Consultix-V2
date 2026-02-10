import { useState, useEffect, useRef } from "react";

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
};

const FONT = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";
const FONT_BODY = "'DM Sans', 'Segoe UI', system-ui, sans-serif";

// --- Main App ---
export default function App() {
  const [step, setStep] = useState(0); // 0=ICP, 1=discovery, 2=enrichment, 3=personalization, 4=outreach
  const [icpForm, setIcpForm] = useState({ industry: "B2B SaaS", minEmployees: "30", maxEmployees: "500", region: "North America, Europe", role: "VP Growth, CTO, Head of Product", lookalike: "" });
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
  const logRef = useRef(null);

  const addLog = (msg, type = "info") => {
    setProcessLog(prev => [...prev, { msg, type, ts: Date.now() }]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [processLog]);

  const runDiscovery = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    addLog("→ Connecting to AI Ark API...", "system");
    await sleep(800);
    addLog("✓ Authenticated", "success");
    await sleep(400);
    addLog(`→ ICP: ${icpForm.industry}, ${icpForm.minEmployees}-${icpForm.maxEmployees} employees`, "info");
    addLog(`→ Target roles: ${icpForm.role}`, "info");
    addLog(`→ Regions: ${icpForm.region}`, "info");
    if (icpForm.lookalike) {
      addLog(`→ Lookalike seed: ${icpForm.lookalike}`, "info");
    }
    await sleep(600);
    addLog("→ Running lookalike matching algorithm...", "system");
    await sleep(1200);
    addLog(`✓ Scanned 14,208 companies against ICP`, "success");
    await sleep(300);

    for (let i = 0; i < MOCK_COMPANIES.length; i++) {
      await sleep(200 + Math.random() * 300);
      const c = MOCK_COMPANIES[i];
      addLog(`  + ${c.name} — ${c.industry} — ICP: ${c.icpScore}%`, "data");
    }
    await sleep(400);
    addLog(`\n✓ Discovery complete: ${MOCK_COMPANIES.length} companies matched (95%+ ICP score)`, "success");
    setDiscoveredLeads(MOCK_COMPANIES);
    setSelectedLeads(new Set(MOCK_COMPANIES.map(c => c.id)));
    setIsProcessing(false);
    setStep(1);
  };

  const runEnrichment = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    const selected = MOCK_COMPANIES.filter(c => selectedLeads.has(c.id));
    addLog("→ Connecting to BetterContact waterfall...", "system");
    await sleep(600);
    addLog("✓ 20+ data providers ready", "success");
    await sleep(300);
    addLog("→ Connecting to Icypeas email finder...", "system");
    await sleep(500);
    addLog("✓ Catch-all verification enabled", "success");
    await sleep(300);
    addLog("→ Connecting to Wiza LinkedIn enrichment...", "system");
    await sleep(500);
    addLog("✓ Real-time LinkedIn data active\n", "success");

    let allContacts = [];
    for (const company of selected) {
      addLog(`→ Enriching ${company.name}...`, "system");
      await sleep(400);
      const contacts = MOCK_CONTACTS[company.id] || [];
      for (const contact of contacts) {
        await sleep(300 + Math.random() * 400);
        addLog(`  ✓ ${contact.name} (${contact.title}) — ${contact.email} — verified ✓`, "data");
        if (contact.linkedinData) {
          addLog(`    LinkedIn: ${contact.linkedinData.connections} connections, ${contact.linkedinData.posts} posts`, "dim");
        }
      }
      allContacts = [...allContacts, ...contacts.map(c => ({ ...c, company: company.name, companyId: company.id }))];
    }
    await sleep(400);
    addLog(`\n✓ Enrichment complete: ${allContacts.length} verified contacts across ${selected.length} companies`, "success");
    addLog(`  Bounce risk: ${allContacts.filter(c => c.bounceRisk === "low").length} low, ${allContacts.filter(c => c.bounceRisk === "medium").length} medium`, "info");
    setEnrichedContacts(allContacts);
    setSelectedContacts(new Set(allContacts.map(c => c.id)));
    setIsProcessing(false);
    setStep(2);
  };

  const runPersonalization = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    const selected = enrichedContacts.filter(c => selectedContacts.has(c.id));
    addLog("→ Connecting to Claude API (claude-sonnet-4-5)...", "system");
    await sleep(600);
    addLog("✓ Model ready\n", "success");

    const emails = {};
    for (const contact of selected) {
      addLog(`→ Generating personalized email for ${contact.name} (${contact.company})...`, "system");
      addLog(`  Context: ${contact.title}, ${contact.linkedinData?.recentActivity || "no recent activity"}`, "dim");
      await sleep(800 + Math.random() * 1200);
      const email = PERSONALIZED_EMAILS[contact.id];
      if (email) {
        emails[contact.id] = email;
        addLog(`  ✓ Subject: "${email.subject}"`, "data");
      } else {
        addLog(`  ✓ Generated fallback template`, "data");
        emails[contact.id] = { subject: `Quick question for ${contact.name}`, body: `Hi ${contact.name.split(" ")[0]},\n\nI came across ${contact.company} and was impressed by what you're building...\n\n[Your name]` };
      }
    }
    await sleep(400);
    addLog(`\n✓ Personalization complete: ${Object.keys(emails).length} unique emails generated`, "success");
    addLog(`  Average personalization signals used: 4.2 per email`, "info");
    setPersonalizedEmails(emails);
    setIsProcessing(false);
    setStep(3);
  };

  const runOutreach = async () => {
    setIsProcessing(true);
    setProcessLog([]);
    const contacts = enrichedContacts.filter(c => selectedContacts.has(c.id) && personalizedEmails[c.id]);
    addLog("→ Connecting to Instantly.ai...", "system");
    await sleep(600);
    addLog("✓ Sending accounts verified (3 active)", "success");
    await sleep(300);
    addLog("→ Warming check: all accounts above 85% warmup score", "success");
    await sleep(300);
    addLog(`→ Queuing ${contacts.length} emails...\n`, "system");

    const queue = [];
    for (const contact of contacts) {
      await sleep(300 + Math.random() * 200);
      const sendTime = new Date(Date.now() + Math.random() * 86400000 * 3);
      const entry = {
        contact,
        email: personalizedEmails[contact.id],
        scheduledAt: sendTime,
        status: "queued",
      };
      queue.push(entry);
      addLog(`  ✓ Queued: ${contact.email} — sends ${sendTime.toLocaleDateString()} ${sendTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, "data");
    }
    await sleep(400);
    addLog(`\n✓ Campaign ready: ${queue.length} emails queued across 3 sending accounts`, "success");
    addLog(`  Estimated delivery window: 1-3 days (smart throttling enabled)`, "info");
    addLog(`  Follow-up sequence: 3 steps, 3-day intervals`, "info");
    setOutreachQueue(queue);
    setIsProcessing(false);
    setStep(4);
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const STEPS = [
    { label: "01", name: "Define ICP", icon: "◎" },
    { label: "02", name: "Discover", icon: "⟐" },
    { label: "03", name: "Enrich", icon: "⟡" },
    { label: "04", name: "Personalize", icon: "✦" },
    { label: "05", name: "Outreach", icon: "➤" },
  ];

  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", color: COLORS.text, fontFamily: FONT_BODY, fontSize: 14 }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${COLORS.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: COLORS.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: COLORS.bg, fontFamily: FONT }}>⚡</div>
          <div>
            <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, letterSpacing: "-0.02em" }}>PIPELINE<span style={{ color: COLORS.accent }}>.</span>AI</div>
            <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT, letterSpacing: "0.05em" }}>LEAD GENERATION AGENT</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <StatusPill color={COLORS.accent} label="AI Ark" />
          <StatusPill color={COLORS.accent} label="Icypeas" />
          <StatusPill color={COLORS.accent} label="BetterContact" />
          <StatusPill color={COLORS.accent} label="Wiza" />
          <StatusPill color={COLORS.accent} label="Instantly" />
        </div>
      </div>

      {/* Step Nav */}
      <div style={{ display: "flex", borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
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
      <div style={{ display: "flex", height: "calc(100vh - 110px)" }}>
        {/* Main Panel */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {step === 0 && <ICPForm form={icpForm} setForm={setIcpForm} onSubmit={runDiscovery} isProcessing={isProcessing} />}
          {step === 1 && <DiscoveryPanel leads={discoveredLeads} selected={selectedLeads} setSelected={setSelectedLeads} onNext={runEnrichment} isProcessing={isProcessing} />}
          {step === 2 && <EnrichmentPanel contacts={enrichedContacts} selected={selectedContacts} setSelected={setSelectedContacts} expanded={expandedContact} setExpanded={setExpandedContact} onNext={runPersonalization} isProcessing={isProcessing} />}
          {step === 3 && <PersonalizationPanel contacts={enrichedContacts.filter(c => selectedContacts.has(c.id))} emails={personalizedEmails} expanded={expandedEmail} setExpanded={setExpandedEmail} onNext={runOutreach} isProcessing={isProcessing} />}
          {step === 4 && <OutreachPanel queue={outreachQueue} />}
        </div>

        {/* Log Panel */}
        <div style={{ width: 380, borderLeft: `1px solid ${COLORS.border}`, background: COLORS.surface, display: "flex", flexDirection: "column" }}>
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

function ICPForm({ form, setForm, onSubmit, isProcessing }) {
  const fields = [
    { key: "industry", label: "Target Industry", placeholder: "e.g. B2B SaaS, FinTech, Healthcare" },
    { key: "minEmployees", label: "Min Employees", placeholder: "e.g. 30" },
    { key: "maxEmployees", label: "Max Employees", placeholder: "e.g. 500" },
    { key: "region", label: "Target Regions", placeholder: "e.g. North America, Europe" },
    { key: "role", label: "Target Roles / Personas", placeholder: "e.g. VP Growth, CTO, Head of Product" },
    { key: "lookalike", label: "Lookalike Companies (optional)", placeholder: "e.g. stripe.com, notion.so, figma.com" },
  ];

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          Define Your <span style={{ color: COLORS.accent }}>Ideal Customer</span>
        </h2>
        <p style={{ color: COLORS.textMuted, margin: "8px 0 0", lineHeight: 1.6 }}>
          AI Ark will use this profile to find companies with 95%+ ICP match.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {fields.map(f => (
          <div key={f.key}>
            <label style={{ display: "block", fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginBottom: 6, letterSpacing: "0.05em", fontWeight: 600 }}>
              {f.label.toUpperCase()}
            </label>
            <input
              value={form[f.key]}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              style={{
                width: "100%", padding: "12px 14px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: 8, color: COLORS.text, fontFamily: FONT_BODY, fontSize: 14,
                outline: "none", transition: "border 0.2s", boxSizing: "border-box",
              }}
              onFocus={e => e.target.style.borderColor = COLORS.borderActive}
              onBlur={e => e.target.style.borderColor = COLORS.border}
            />
          </div>
        ))}
      </div>
      <button onClick={onSubmit} disabled={isProcessing} style={{
        marginTop: 28, padding: "14px 32px", background: COLORS.accent, color: COLORS.bg,
        border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 13, fontWeight: 600,
        cursor: isProcessing ? "wait" : "pointer", opacity: isProcessing ? 0.6 : 1,
        letterSpacing: "0.02em", transition: "all 0.2s",
      }}>
        {isProcessing ? "DISCOVERING LEADS..." : "RUN DISCOVERY →"}
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
        <button onClick={onNext} disabled={isProcessing || selected.size === 0} style={{
          padding: "12px 28px", background: selected.size > 0 ? COLORS.accent : COLORS.border, color: selected.size > 0 ? COLORS.bg : COLORS.textDim,
          border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
          cursor: isProcessing || selected.size === 0 ? "default" : "pointer", opacity: isProcessing ? 0.6 : 1,
        }}>
          {isProcessing ? "ENRICHING..." : `ENRICH ${selected.size} COMPANIES →`}
        </button>
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

function EnrichmentPanel({ contacts, selected, setSelected, expanded, setExpanded, onNext, isProcessing }) {
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
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Click a contact to view LinkedIn insights. {selected.size} selected for personalization.</p>
        </div>
        <button onClick={onNext} disabled={isProcessing || selected.size === 0} style={{
          padding: "12px 28px", background: selected.size > 0 ? COLORS.accent : COLORS.border, color: selected.size > 0 ? COLORS.bg : COLORS.textDim,
          border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
          cursor: isProcessing || selected.size === 0 ? "default" : "pointer", opacity: isProcessing ? 0.6 : 1,
        }}>
          {isProcessing ? "GENERATING..." : `PERSONALIZE ${selected.size} EMAILS →`}
        </button>
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

function PersonalizationPanel({ contacts, emails, expanded, setExpanded, onNext, isProcessing }) {
  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
            <span style={{ color: COLORS.accent }}>{Object.keys(emails).length}</span> Personalized Emails
          </h2>
          <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>Click to preview each email. Edit before sending.</p>
        </div>
        <button onClick={onNext} disabled={isProcessing} style={{
          padding: "12px 28px", background: COLORS.accent, color: COLORS.bg,
          border: "none", borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
          cursor: isProcessing ? "wait" : "pointer", opacity: isProcessing ? 0.6 : 1,
        }}>
          {isProcessing ? "QUEUING..." : `QUEUE ALL FOR OUTREACH →`}
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {contacts.map(contact => {
          const email = emails[contact.id];
          if (!email) return null;
          const isOpen = expanded === contact.id;
          return (
            <div key={contact.id} onClick={() => setExpanded(isOpen ? null : contact.id)} style={{ cursor: "pointer" }}>
              <div style={{
                padding: "14px 20px", background: COLORS.surface, border: `1px solid ${COLORS.border}`,
                borderRadius: isOpen ? "10px 10px 0 0" : 10, transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: COLORS.accentBg, border: `1px solid ${COLORS.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>✦</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{contact.name} <span style={{ color: COLORS.textDim, fontWeight: 400, fontSize: 12 }}>— {contact.company}</span></div>
                  <div style={{ fontSize: 13, color: COLORS.blue }}>📧 {email.subject}</div>
                </div>
                <span style={{ color: COLORS.textDim, fontSize: 18, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
              </div>
              {isOpen && (
                <div style={{
                  padding: "20px", background: "#0e0e16", border: `1px solid ${COLORS.border}`, borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                }}>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 4 }}>TO: {contact.email}</div>
                  <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 12 }}>SUBJECT: {email.subject}</div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, color: COLORS.text, fontSize: 13.5, padding: "16px", background: COLORS.surface, borderRadius: 8, border: `1px solid ${COLORS.border}` }}>
                    {email.body}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutreachPanel({ queue }) {
  const totalQueued = queue.length;
  const sorted = [...queue].sort((a, b) => a.scheduledAt - b.scheduledAt);

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.02em" }}>
          Campaign <span style={{ color: COLORS.accent }}>Ready</span>
        </h2>
        <p style={{ color: COLORS.textMuted, margin: "6px 0 0" }}>{totalQueued} emails queued for delivery via Instantly.ai</p>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28 }}>
        <StatCard label="Emails Queued" value={totalQueued} accent={COLORS.accent} />
        <StatCard label="Companies" value={new Set(queue.map(q => q.contact.company)).size} accent={COLORS.blue} />
        <StatCard label="Avg ICP Match" value="95%" accent={COLORS.accent} />
        <StatCard label="Bounce Risk" value="<2%" accent={COLORS.accent} />
      </div>

      {/* Queue Table */}
      <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "flex", padding: "10px 20px", borderBottom: `1px solid ${COLORS.border}`, fontFamily: FONT, fontSize: 10, color: COLORS.textDim, letterSpacing: "0.08em", fontWeight: 600 }}>
          <span style={{ flex: 2 }}>RECIPIENT</span>
          <span style={{ flex: 2 }}>SUBJECT</span>
          <span style={{ flex: 1 }}>SCHEDULED</span>
          <span style={{ flex: 0.7, textAlign: "center" }}>STATUS</span>
        </div>
        {sorted.map((item, i) => (
          <div key={i} style={{ display: "flex", padding: "12px 20px", borderBottom: i < sorted.length - 1 ? `1px solid ${COLORS.border}` : "none", alignItems: "center", fontSize: 13 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontWeight: 500 }}>{item.contact.name}</div>
              <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: FONT }}>{item.contact.email}</div>
            </div>
            <div style={{ flex: 2, color: COLORS.textMuted, fontSize: 12 }}>{item.email.subject}</div>
            <div style={{ flex: 1, fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>
              {item.scheduledAt.toLocaleDateString()} {item.scheduledAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div style={{ flex: 0.7, textAlign: "center" }}>
              <span style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontFamily: FONT, fontWeight: 500, background: COLORS.warnBg, color: COLORS.warn, border: `1px solid ${COLORS.warn}22` }}>
                queued
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, padding: 20, background: COLORS.surface, borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
        <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textDim, letterSpacing: "0.06em", marginBottom: 10, fontWeight: 600 }}>NEXT STEPS IN PRODUCTION</div>
        <div style={{ color: COLORS.textMuted, fontSize: 13, lineHeight: 1.7 }}>
          This demo simulated the full pipeline. In the production Claude Code agent, each step would call real APIs: AI Ark for discovery, BetterContact + Icypeas for enrichment, Wiza for LinkedIn data, Claude API for personalization, and Instantly.ai for sending. The agent would run on a schedule, process leads in batches, and track campaign performance automatically.
        </div>
      </div>
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
