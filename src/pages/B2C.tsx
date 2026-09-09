import { Link } from "react-router-dom";
import { AdvisorChat, Ticker } from "../components/Console";
import PhoneMock from "../components/PhoneMock";
import Waitlist from "../components/Waitlist";
import {
  IconArrow,
  IconBell,
  IconCard,
  IconCheck,
  IconLinkConsent,
  IconLock,
  IconShield,
  IconSpark,
  IconTrend,
  IconVault,
  IconWallet,
  Reveal,
  scrollToId,
} from "../components/ui";

const TICKER_B2C = [
  "All accounts · one place",
  "AI advisor · हिंदी + English",
  "Free for customers",
  "RBI Account Aggregator",
  "Revoke consent anytime",
  "No data selling. Ever.",
  "EMI & bill alerts",
  "Balances · FDs · loans · cards",
];

const ACCOUNT_TYPES = [
  { icon: <IconWallet size={16} />, name: "Savings & current accounts", desc: "Live balances across every bank you link." },
  { icon: <IconVault size={16} />, name: "Fixed deposits & recurring deposits", desc: "Maturity dates and ladders, tracked for you." },
  { icon: <IconTrend size={16} />, name: "Investments", desc: "Mutual funds, stocks and NPS in one growth view." },
  { icon: <IconCard size={16} />, name: "Credit cards & loans", desc: "EMIs, dues and utilisation — before they become problems." },
];

const STEPS = [
  {
    icon: <IconLinkConsent size={17} />,
    tag: "Step 1",
    title: "Link with one consent",
    desc: "Connect accounts through RBI's Account Aggregator framework. You approve every fetch — and can revoke it in one tap. No passwords shared, ever.",
  },
  {
    icon: <IconSpark size={17} />,
    tag: "Step 2",
    title: "Finous builds the picture",
    desc: "Balances, EMIs, investments and cards merge into one live financial view — with a health score that updates as your money moves.",
  },
  {
    icon: <IconBell size={17} />,
    tag: "Step 3",
    title: "The advisor speaks up",
    desc: "In Hindi or English, at the moments that matter: EMI due tomorrow, idle cash that could work harder, a card creeping toward its limit.",
  },
];

const PROMISES = [
  { icon: <IconShield size={16} />, title: "Consent you control", desc: "Every data fetch is approved by you, and consent can be revoked anytime." },
  { icon: <IconLock size={16} />, title: "Never sold, never shared", desc: "Your data is yours. Finous doesn't sell it to advertisers or lenders." },
  { icon: <IconCheck size={16} />, title: "Free for customers", desc: "The complete picture costs you nothing — and never will." },
  { icon: <IconBell size={16} />, title: "Alerts, not spam", desc: "Nudges only when they help. No calls, no marketing blasts." },
];

export default function B2C() {
  return (
    <>
      {/* ---------- SUB-HERO ---------- */}
      <section id="home" className="sub-hero sub-hero-b2c">
        <div className="container hero-grid">
          <Reveal>
            <div>
              <Link to="/" className="back-link light">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 9H4M8 4.5L3.5 9 8 13.5" />
                </svg>
                Back to the Finous concept
              </Link>
              <span className="badge-pill">
                <span className="pulse-dot" />
                Finous for Customers · B2C · Free
              </span>
              <h1 className="sub-hero-title">
                Your whole financial life,{" "}
                <span className="u-gold">
                  in one place.
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
                </span>
              </h1>
              <p className="sub-hero-sub">
                Bank balances, loans, investments, credit cards — plus an AI
                advisor that speaks Hindi and English. Your complete financial
                picture, free.
              </p>
              <div className="cta-row">
                <button className="btn btn-gold" onClick={() => scrollToId("waitlist")}>
                  Join the Waitlist <IconArrow size={15} />
                </button>
                <button className="btn btn-ghost" onClick={() => scrollToId("how")}>
                  See How It Works
                </button>
              </div>
              <div className="trust-row">
                <span className="trust-item"><IconCheck size={16} /> Free forever</span>
                <span className="trust-item"><IconShield size={15} /> RBI Account Aggregator</span>
                <span className="trust-item"><IconCheck size={16} /> हिंदी + English</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <PhoneMock />
          </Reveal>
        </div>
      </section>

      <Ticker items={TICKER_B2C} label="Customer benefits" />

      {/* ---------- ONE PLACE ---------- */}
      <section className="oneplace" aria-labelledby="oneplace-title">
        <div className="container onepage-grid">
          <Reveal>
            <div>
              <span className="eyebrow">The Complete Picture</span>
              <h2 id="oneplace-title" className="sec-title">
                Stop doing mental maths across five apps
              </h2>
              <p className="sec-lede">
                Most Indians juggle two banks, an NBFC loan, a few folios and
                a credit card — and see none of it together. Finous pulls it
                into one live ledger, so the answer to
                &ldquo;where do I actually stand?&rdquo; takes one glance.
              </p>
              <ul className="type-list">
                {ACCOUNT_TYPES.map((t) => (
                  <li key={t.name}>
                    <span className="type-ico">{t.icon}</span>
                    <div>
                      <h4>{t.name}</h4>
                      <p>{t.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="ledger-card">
              <div className="ledger-top">
                <span className="ledger-eyebrow">Net position · live</span>
                <span className="live-chip"><i />SYNCED</span>
              </div>
              <p className="ledger-total">₹4,00,360</p>
              <p className="ledger-sub">across 4 institutions · 9 accounts</p>
              <div className="ledger-rows">
                <div className="ledger-r"><span><IconWallet size={13} /> Savings &amp; FDs</span><b>₹3,24,300</b></div>
                <div className="ledger-r"><span><IconTrend size={13} /> Investments</span><b>₹1,18,240</b></div>
                <div className="ledger-r"><span><IconCard size={13} /> Credit card dues</span><b className="neg">−₹42,180</b></div>
                <div className="ledger-r"><span><IconVault size={13} /> Home loan outstanding</span><b>₹24.1L</b></div>
              </div>
              <div className="ledger-meter">
                <span>Financial health</span>
                <div className="meter"><i style={{ width: "82%" }} /></div>
                <b>82 · Strong</b>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- ADVISOR ---------- */}
      <section className="advisor-sec" aria-labelledby="advisor-title">
        <div className="container onepage-grid">
          <Reveal>
            <div>
              <span className="eyebrow on-dark">The AI Advisor</span>
              <h2 id="advisor-title" className="sec-title">
                Ask your money anything
              </h2>
              <p className="sec-lede">
                &ldquo;Can I afford a new EMI?&rdquo; · &ldquo;क्या मेरी बचत
                काफी है?&rdquo; The Finous advisor answers from your real
                numbers — in the language you think in — and nudges you before
                problems arrive, not after.
              </p>
              <ul className="advisor-points">
                <li><IconSpark size={14} /> Grounded in your accounts — not generic advice</li>
                <li><IconSpark size={14} /> EMI, bill and overdraft alerts that arrive early</li>
                <li><IconSpark size={14} /> Plain-language explainers for FDs, SIPs, credit scores</li>
              </ul>
            </div>
          </Reveal>

          <Reveal delay={140}>
            <div className="advisor-demo">
              <div className="advisor-demo-frame">
                <div className="advisor-demo-head">
                  <span className="live-chip"><i />LIVE DEMO</span>
                  <span>हिंदी ↔ English, every reply</span>
                </div>
                <AdvisorChat />
                <p className="advisor-demo-foot">
                  Representative guidance · your advisor speaks from your linked accounts
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section id="how" className="how" aria-labelledby="how-title">
        <div className="container">
          <Reveal>
            <div className="sec-head" style={{ marginBottom: 46 }}>
              <span className="eyebrow">How It Works</span>
              <h2 id="how-title" className="sec-title">Live in three steps</h2>
            </div>
          </Reveal>
          <div className="steps">
            {STEPS.map((s, i) => (
              <Reveal delay={i * 100} key={s.tag}>
                <div className="step-card">
                  <div className="step-head">
                    <span className="step-ico">{s.icon}</span>
                    <span className="step-tag">{s.tag}</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- PRIVACY ---------- */}
      <section className="privacy" aria-labelledby="privacy-title">
        <div className="container">
          <Reveal>
            <div className="sec-head" style={{ marginBottom: 44 }}>
              <span className="eyebrow">Private by Design</span>
              <h2 id="privacy-title" className="sec-title">
                Your data answers to you
              </h2>
              <p className="sec-lede">
                Finous is built on the RBI&rsquo;s Account Aggregator
                framework — consented, revocable, and never for sale.
              </p>
            </div>
          </Reveal>
          <div className="promise-grid">
            {PROMISES.map((p, i) => (
              <Reveal delay={i * 80} key={p.title}>
                <div className="promise-card">
                  <span className="promise-ico">{p.icon}</span>
                  <h3>{p.title}</h3>
                  <p>{p.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Waitlist
        eyebrow="Early Access · Customers"
        title="Get Finous on day one"
        lede="We're opening invites in small batches. Join the waitlist and be first to see your whole financial life in one place — free."
        points={
          <>
            <li><IconCheck /> Free when it launches — and always</li>
            <li><IconCheck /> Hindi + English from day one</li>
            <li><IconCheck /> Email only. No name, no phone, no spam.</li>
          </>
        }
        cardTitle="Reserve your invite"
        cardSub="Invites go out in the order they were received — you'll get exactly one email when yours is ready."
        showInstNote={false}
      />
    </>
  );
}
