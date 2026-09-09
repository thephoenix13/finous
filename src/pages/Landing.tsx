import { Link } from "react-router-dom";
import { HeroConsole, Ticker } from "../components/Console";
import Waitlist from "../components/Waitlist";
import {
  CountUp,
  IconArrow,
  IconCheck,
  IconShield,
  IconSpark,
  Reveal,
  scrollToId,
} from "../components/ui";

const STATS = [
  {
    value: <CountUp to={1500} suffix="+" />,
    label: (
      <>
        <b>Urban Co-op Banks</b> — RBI regulated, digitally hungry, underserved
        by global vendors
      </>
    ),
  },
  {
    value: <CountUp to={9000} suffix="+" />,
    label: (
      <>
        <b>NBFCs across India</b> — lending, leasing and microfinance
        institutions ready for an intelligence layer
      </>
    ),
  },
  {
    value: <CountUp to={252} suffix="M+" />,
    label: (
      <>
        <b>users already linked</b> on the Account Aggregator network — the
        consented data rails Finous is built on
      </>
    ),
  },
];

const TEASER = [
  {
    num: "01",
    title: "Proprietary India-finance AI",
    copy: "More relevant, more accurate — and significantly cheaper than generic LLMs.",
  },
  {
    num: "02",
    title: "Live in 6–8 weeks",
    copy: "Layers onto your stack. No core re-platforming, no two-year programme.",
  },
  {
    num: "03",
    title: "India first, then global",
    copy: "US credit unions, Volksbanken, Southeast Asia — same playbook, new markets.",
  },
];

export default function Landing() {
  return (
    <>
      {/* ---------- HERO ---------- */}
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
                Finous turns fragmented financial data into understanding —
                deployed inside a bank&rsquo;s own app for institutions, and
                offered free to customers in Hindi and English.{" "}
                <strong>One intelligence layer. Two directions.</strong>
              </p>
              <div className="cta-row">
                <button className="btn btn-gold" onClick={() => scrollToId("waitlist")}>
                  Join the Waitlist <IconArrow size={15} />
                </button>
                <button className="btn btn-ghost" onClick={() => scrollToId("concept")}>
                  Explore the Concept
                </button>
              </div>
              <div className="trust-row">
                <span className="trust-item"><IconShield size={15} /> RBI-regulated ready</span>
                <span className="trust-item"><IconCheck size={16} /> Consent-first architecture</span>
                <span className="trust-item"><IconCheck size={16} /> White-label · your brand</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <HeroConsole />
          </Reveal>
        </div>
      </section>

      <Ticker />

      {/* ---------- CONCEPT ---------- */}
      <section id="concept" className="concept">
        <div className="container">
          <Reveal>
            <div className="concept-head">
              <div>
                <span className="eyebrow">The Concept</span>
                <h2 className="sec-title">
                  One layer. Two directions.
                </h2>
              </div>
              <p className="concept-copy">
                Every bank sits on customer data it barely understands. Every
                customer juggles accounts, EMIs and investments no single app
                can see together. Finous connects the two: the same
                intelligence layer that helps an institution serve a customer
                better also hands that customer a complete, free picture of
                their money. Both sides get smarter — together.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="flow" role="img" aria-label="Flow diagram: banks and NBFCs feed the Finous intelligence layer, which advises customers, and consented data flows back">
              <div className="flow-node">
                <span className="flow-ico">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3.5 9L12 3.5 20.5 9z" />
                    <path d="M5.5 9.5v7M10 9.5v7M14 9.5v7M18.5 9.5v7" />
                    <path d="M4 17h16M3 20.5h18" />
                  </svg>
                </span>
                <h3>Banks &amp; NBFCs</h3>
                <p>Your app · your brand · your data</p>
              </div>

              <div className="flow-arrow">
                <span>understands</span>
                <svg viewBox="0 0 60 16" aria-hidden="true">
                  <path d="M2 8h48M44 3l7 5-7 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="flow-core">
                <span className="flow-core-mark">
                  <IconSpark size={18} />
                </span>
                <h3>The Finous Layer</h3>
                <p>Unified customer graph · AI advisor · proactive recommendations</p>
              </div>

              <div className="flow-arrow">
                <span>advises</span>
                <svg viewBox="0 0 60 16" aria-hidden="true">
                  <path d="M2 8h48M44 3l7 5-7 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>

              <div className="flow-node">
                <span className="flow-ico">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="8" r="3.2" />
                    <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
                    <path d="M15.5 5.4a3.2 3.2 0 010 5.7M17.6 14.9c1.8.7 2.9 2.3 2.9 4.6" />
                  </svg>
                </span>
                <h3>252M+ Customers</h3>
                <p>Hindi + English · free, forever</p>
              </div>
            </div>
            <p className="flow-loop">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16.5 8A7 7 0 105 4.5M5 1.5v3.5H8.5" />
              </svg>
              Every consented account sharpens the picture for both sides — a
              flywheel no single-sided product can build.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- TWO DIRECTIONS ---------- */}
      <section className="directions" aria-labelledby="directions-title">
        <div className="container">
          <Reveal>
            <div className="sec-head" style={{ marginBottom: 46 }}>
              <span className="eyebrow">Two Directions</span>
              <h2 id="directions-title" className="sec-title">
                Where do you want to go?
              </h2>
            </div>
          </Reveal>

          <div className="dir-grid">
            <Reveal delay={60}>
              <article className="dir-panel dir-b2b">
                <span className="dir-tag">Direction 01 · For Institutions</span>
                <h3>For Banks &amp; NBFCs</h3>
                <p>
                  A white-labelled intelligence platform inside your own app —
                  unified customer dashboard, AI advisor, proactive
                  recommendations. Your brand, your customers, your data.
                </p>
                <ul className="dir-list">
                  <li><IconCheck /> Live inside the bank&rsquo;s own app — nothing to install</li>
                  <li><IconCheck /> Deployed in 6–8 weeks, not years</li>
                  <li><IconCheck /> Data never leaves your boundary</li>
                </ul>
                <div className="dir-foot">
                  <Link to="/b2b" className="dir-link">
                    Explore Finous for Institutions <IconArrow size={15} />
                  </Link>
                  <span className="dir-stat">1,500+ UCBs · 9,000+ NBFCs addressable</span>
                </div>
              </article>
            </Reveal>

            <Reveal delay={160}>
              <article className="dir-panel dir-b2c">
                <span className="dir-tag">Direction 02 · For Customers</span>
                <h3>For Customers</h3>
                <p>
                  Every account in one place — bank balances, loans,
                  investments, credit cards — with an AI advisor that speaks
                  Hindi and English. The complete financial picture.
                </p>
                <ul className="dir-list">
                  <li><IconCheck /> Balances, FDs, loans, investments &amp; cards — one view</li>
                  <li><IconCheck /> AI advisor in हिंदी + English</li>
                  <li><IconCheck /> Free for customers. Always.</li>
                </ul>
                <div className="dir-foot">
                  <Link to="/b2c" className="dir-link">
                    Explore Finous for Customers <IconArrow size={15} />
                  </Link>
                  <span className="dir-stat">252M+ users already on AA rails</span>
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- STATS ---------- */}
      <section className="stats-sec" aria-label="Market opportunity">
        <div className="container">
          <Reveal delay={80}>
            <div className="stats-band">
              {STATS.map((s, i) => (
                <div className="stat" key={i}>
                  <div className="stat-num">{s.value}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              ))}
            </div>
            <p className="stats-note">
              SOURCES: RBI DIRECTORY OF URBAN CO-OPERATIVE BANKS · RBI NBFC REGISTERS · SAHAMATI AA ECOSYSTEM REPORTS
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------- MOAT TEASER ---------- */}
      <section className="teaser" aria-labelledby="teaser-title">
        <div className="container">
          <Reveal>
            <div className="teaser-head">
              <span className="eyebrow">Why It Works</span>
              <h2 id="teaser-title" className="sec-title">Built different, on purpose</h2>
              <Link to="/b2b" className="teaser-more">
                The full institutional story <IconArrow size={14} />
              </Link>
            </div>
          </Reveal>
          <div className="teaser-grid">
            {TEASER.map((t, i) => (
              <Reveal delay={i * 90} key={t.num}>
                <div className="teaser-item">
                  <span className="teaser-num">{t.num}</span>
                  <h3>{t.title}</h3>
                  <p>{t.copy}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Waitlist />
    </>
  );
}
