import { useEffect, useState } from "react";
import { Reveal, IconCheck, IconShield, IconSpark, IconArrow } from "./ui";

const SCRIPT = [
  {
    hi: "आपका इमरजेंसी फंड 7.2 महीने का है — लक्ष्य से बेहतर।",
    en: "Emergency fund covers 7.2 months — above the 6-month target.",
  },
  {
    hi: "SIP ₹8,000 से बढ़ाकर ₹12,000 करने का सही समय है।",
    en: "A good time to step up the SIP from ₹8,000 to ₹12,000.",
  },
  {
    hi: "होम लोन रीफाइनेंस से सालाना ₹8,400 की बचत संभव है।",
    en: "Refinancing the home loan could save ₹8,400 a year.",
  },
];

const RECS = [
  <>Pre-approved credit line · <strong>₹1.5L @ 11.4%</strong> — offer valid 7 days</>,
  <>FD ladder of <strong>₹2.0L</strong> matures in 12 days — auto-renew?</>,
  <>Credit utilisation at <strong>31%</strong> — score could rise ~18 pts</>,
];

const ACCOUNTS = [
  { name: "Savings", bank: "Janata Co-op Bank", amt: "₹48,210", live: true },
  { name: "Fixed Deposit", bank: "Janata Co-op Bank", amt: "₹2,00,000" },
  { name: "Mutual Funds", bank: "3 folios · AA linked", amt: "₹1,12,400" },
  { name: "Credit Card", bank: "•• 4821", amt: "−₹18,750" },
  { name: "Home Loan", bank: "Urban NBFC", amt: "₹24.1L" },
];

const TICKER = [
  "White-label deployment",
  "RBI-regulated partners",
  "AA consent architecture",
  "AI advisor · हिंदी + English",
  "6–8 week go-live",
  "DPDP Act, 2023 ready",
  "Data stays in your boundary",
  "Proprietary India-finance model",
];

function useReducedMotion() {
  const [reduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  return reduced;
}

function Console() {
  const reduced = useReducedMotion();
  const [msgIdx, setMsgIdx] = useState(0);
  const [typing, setTyping] = useState(!reduced);
  const [savings, setSavings] = useState(48210);
  const [tick, setTick] = useState(false);
  const [recIdx, setRecIdx] = useState(0);

  /* advisor message loop */
  useEffect(() => {
    if (reduced) return;
    let t: number;
    if (typing) {
      t = window.setTimeout(() => setTyping(false), 1150);
    } else {
      t = window.setTimeout(() => {
        setMsgIdx((i) => (i + 1) % SCRIPT.length);
        setTyping(true);
      }, 3400);
    }
    return () => clearTimeout(t);
  }, [typing, reduced]);

  /* live balance tick */
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setSavings((v) => v + Math.floor(Math.random() * 190) - 40);
      setTick(true);
      window.setTimeout(() => setTick(false), 750);
    }, 3100);
    return () => clearInterval(id);
  }, [reduced]);

  /* recommendation rotation */
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setRecIdx((i) => (i + 1) % RECS.length), 4200);
    return () => clearInterval(id);
  }, [reduced]);

  const prev = SCRIPT[(msgIdx + SCRIPT.length - 1) % SCRIPT.length];
  const curr = SCRIPT[msgIdx];

  return (
    <div className="console-wrap">
      <div className="console">
        <div className="console-top">
          <div className="console-dots" aria-hidden="true">
            <i /><i /><i />
          </div>
          <span className="console-label">Finous · Customer Intelligence</span>
          <span className="live-chip"><i />LIVE</span>
        </div>

        <div className="console-body">
          <div className="health-card">
            <div className="dial" role="img" aria-label="Financial health score: 82 out of 100, strong">
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle className="dial-track" cx="42" cy="42" r="36" strokeWidth="7" fill="none" />
                <circle className="dial-arc" cx="42" cy="42" r="36" strokeWidth="7" fill="none" />
              </svg>
              <span className="dial-num">82<small>Strong</small></span>
            </div>
            <div className="health-meta">
              <h4>Priya S. · Financial Health</h4>
              <p>5 accounts unified via Account Aggregator. Risk: low · Savings on track.</p>
            </div>
          </div>

          <div className="acct-list" aria-label="Unified accounts">
            {ACCOUNTS.map((a) => (
              <div className="acct-row" key={a.name}>
                <span className="acct-ico"><IconSpark size={13} /></span>
                <span>
                  <span className="acct-name" style={{ display: "block" }}>{a.name}</span>
                  <span className="acct-bank" style={{ display: "block" }}>{a.bank}</span>
                </span>
                <span className={`acct-amt ${a.live && tick ? "tick" : ""}`}>
                  {a.live ? `₹${savings.toLocaleString("en-IN")}` : a.amt}
                </span>
              </div>
            ))}
          </div>

          <div className="advisor-card">
            <div className="advisor-head">
              <IconSpark size={13} /> Finous Advisor · हिंदी + English
            </div>
            {!reduced && msgIdx > 0 && (
              <div className="msg" style={{ opacity: 0.55 }}>
                <div className="msg-hi">{prev.hi}</div>
                <div className="msg-en">{prev.en}</div>
              </div>
            )}
            {typing ? (
              <div className="msg typing" aria-label="Advisor is typing">
                <i /><i /><i />
              </div>
            ) : (
              <div className="msg" key={msgIdx}>
                <div className="msg-hi">{curr.hi}</div>
                <div className="msg-en">{curr.en}</div>
              </div>
            )}
            <div className="rec-card" key={`rec-${recIdx}`}>
              <span className="rec-tag">PROACTIVE</span>
              <span className="rec-text">{RECS[recIdx]}</span>
            </div>
          </div>
        </div>

        <div className="console-foot">
          <span>Consent-based data · <b>Account Aggregator</b> framework</span>
          <span><b>AA</b> · RBI sandbox compliant</span>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="home" className="hero">
      <div className="container hero-grid">
        <Reveal>
          <div>
            <span className="badge-pill">
              <span className="pulse-dot" />
              Now onboarding founding institutions
            </span>
            <h1 className="hero-title">
              The AI layer that helps banks{" "}
              <span className="u-gold">
                understand
                <svg viewBox="0 0 220 14" preserveAspectRatio="none" aria-hidden="true">
                  <path
                    d="M4 10.5C48 4.5 150 3.5 216 7"
                    fill="none"
                    stroke="#c9a227"
                    strokeWidth="5.5"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                </svg>
              </span>{" "}
              their customers
            </h1>
            <p className="hero-sub">
              Finous unifies every account a customer holds — deposits, loans,
              investments, cards — into one intelligence layer, and puts an AI
              advisor inside your bank&rsquo;s own app. Customers get clarity.
              You get growth.
            </p>
            <div className="cta-row">
              <a href="#waitlist" className="btn btn-gold">
                Join the Waitlist <IconArrow size={15} />
              </a>
              <a href="#about" className="btn btn-ghost">
                Learn More
              </a>
            </div>
            <div className="trust-row">
              <span className="trust-item"><IconShield size={15} /> RBI-regulated ready</span>
              <span className="trust-item"><IconCheck size={16} /> Consent-first architecture</span>
              <span className="trust-item"><IconCheck size={16} /> White-label · your brand</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <Console />
        </Reveal>
      </div>
    </section>
  );
}

export function Ticker() {
  return (
    <div className="ticker" aria-label="Finous capabilities">
      <div className="ticker-track">
        {[0, 1].map((dup) => (
          <div
            key={dup}
            aria-hidden={dup === 1}
            style={{ display: "flex", alignItems: "center", gap: 44, paddingRight: 44 }}
          >
            {TICKER.map((t) => (
              <span className="ticker-item" key={t}>{t}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
