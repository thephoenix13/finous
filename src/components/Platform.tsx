import { Reveal } from "./ui";

/* ---------- capability icons (custom, geometric) ---------- */
function IconGraph({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="2.6" />
      <circle cx="18" cy="7.5" r="2.6" />
      <circle cx="11" cy="18" r="2.6" />
      <path d="M8.4 7.2l7-1M7.3 8.3l2.6 7.3M16.8 9.8l-4.5 6.2" />
    </svg>
  );
}
function IconAdvisor({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5.5h16v11H12l-4.5 4v-4H4z" />
      <path d="M8 9.5h8M8 12.5h5" />
      <path d="M18.5 2.5l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconSignal({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <path d="M7.8 7.8a6 6 0 000 8.4M16.2 7.8a6 6 0 010 8.4" />
      <path d="M5 5a10 10 0 000 14M19 5a10 10 0 010 14" />
    </svg>
  );
}
function IconDesk({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="4" width="17" height="13" rx="2" />
      <path d="M7 13.5v-3M11 13.5V8.5M15 13.5v-2.2" />
      <path d="M9 20.5h6M12 17v3.5" />
    </svg>
  );
}
function IconKey({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="15.5" r="4.5" />
      <path d="M11.5 12.5L20 4M16 8l2.6 2.6M13.4 10.6l2 2" />
    </svg>
  );
}

const CAPABILITIES = [
  {
    icon: <IconGraph />,
    title: "Unified customer graph",
    desc: "Every account, loan, card and investment assembled into one live household picture — refreshed through the Account Aggregator network, not monthly batch files.",
    tags: ["AA-powered", "Real-time"],
  },
  {
    icon: <IconAdvisor />,
    title: "AI Advisor, Hindi + English",
    desc: "Grounded in the customer's own numbers rather than generic knowledge — so answers reference their actual balances, EMIs and goals, in their own language.",
    tags: ["Vernacular", "Grounded"],
  },
  {
    icon: <IconSignal />,
    title: "Proactive recommendations",
    desc: "Signals before the event: overdraft risk, missed-EMI warnings, idle-balance opportunities — surfaced as nudges the bank controls and approves.",
    tags: ["Pre-emptive", "Bank-approved"],
  },
  {
    icon: <IconDesk />,
    title: "Banker command center",
    desc: "Portfolio health, churn signals and cross-sell pipelines for RMs and branch heads — the same intelligence layer, on the institution's side of the glass.",
    tags: ["CRM-ready", "Role-based"],
  },
  {
    icon: <IconKey />,
    title: "Consent & data rails",
    desc: "Every data fetch is AA-consented, logged and revocable. The institution — never Finous — decides what the intelligence layer may see and say.",
    tags: ["Audit-logged", "Revocable"],
  },
];

export default function Platform() {
  return (
    <section id="platform" className="platform" aria-labelledby="platform-title">
      <div className="container">
        <div className="platform-head">
          <Reveal>
            <span className="eyebrow">The Platform</span>
            <h2 id="platform-title" className="sec-title">
              One intelligence layer, deployed inside your stack
            </h2>
          </Reveal>
          <Reveal delay={90}>
            <p className="sec-lede" style={{ marginTop: 0 }}>
              Finous sits between your core systems and your customer&rsquo;s
              screen — a white-labelled intelligence layer that renders in
              your brand, speaks your customer&rsquo;s language and never
              moves their data out of your boundary.
            </p>
          </Reveal>
        </div>

        {/* architecture stack */}
        <Reveal delay={60}>
          <div className="arch" role="img" aria-label="Finous platform architecture: experience layer on top, Finous intelligence layer in the middle, data and core systems below">
            <div className="tier">
              <div className="tier-label">
                Experience
                <small>YOUR APP · YOUR BRAND</small>
              </div>
              <div className="tier-chips">
                <span className="t-chip">Your bank&rsquo;s app</span>
                <span className="t-chip">Your brand &amp; colours</span>
                <span className="t-chip">Hindi + English UI</span>
                <span className="t-chip">No new app to install</span>
              </div>
            </div>

            <div className="connector" aria-hidden="true">
              <i />
              <i style={{ animationDelay: "-1.3s" }} />
            </div>

            <div className="tier tier-intel">
              <div className="tier-label">
                Finous Layer
                <small>INTELLIGENCE ENGINE</small>
              </div>
              <div className="tier-chips">
                <span className="t-chip">AI Advisor · HI / EN</span>
                <span className="t-chip">Customer intelligence graph</span>
                <span className="t-chip">Proactive recommendations</span>
                <span className="t-chip">Banker analytics suite</span>
              </div>
            </div>

            <div className="connector" aria-hidden="true">
              <i />
              <i style={{ animationDelay: "-1.3s" }} />
            </div>

            <div className="tier">
              <div className="tier-label">
                Data &amp; Core
                <small>YOUR EXISTING SYSTEMS</small>
              </div>
              <div className="tier-chips">
                <span className="t-chip">Core banking system</span>
                <span className="t-chip">Account Aggregator network</span>
                <span className="t-chip">Deposits · Loans · Cards</span>
                <span className="t-chip">Investments &amp; insurance</span>
              </div>
            </div>

            <p className="arch-caption">
              Consented data flows up · <b>intelligence flows into your app</b> · in real time
            </p>
          </div>
        </Reveal>

        {/* capability ledger */}
        <Reveal delay={100}>
          <div className="ledger">
            {CAPABILITIES.map((c, i) => (
              <div className="ledger-row" key={c.title}>
                <span className="ledger-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="ledger-ico">{c.icon}</span>
                <div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
                <div className="ledger-tags">
                  {c.tags.map((t) => (
                    <span className="ledger-tag" key={t}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
