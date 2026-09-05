import { CountUp, IconCheck, IconVault, IconWallet, Reveal } from "./ui";

/* ---------- segment icons (custom, geometric) ---------- */
function IconPillar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 9L12 3.5 20.5 9z" />
      <path d="M5.5 9.5v7M10 9.5v7M14 9.5v7M18.5 9.5v7" />
      <path d="M4 17h16M3 20.5h18" />
    </svg>
  );
}
function IconCoins() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="2.8" />
      <path d="M5 6v5.5c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8V6" />
      <path d="M5 11.5V17c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-5.5" />
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19.5 4.5c-8 0-13 4.5-13 10.5 0 2.5 1.5 4.5 4 4.5 6.5 0 9-7 9-15z" />
      <path d="M4.5 19.5c4-5.5 8-8.5 12-10.5" />
    </svg>
  );
}
function IconSprout() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5v-7" />
      <path d="M12 13.5C12 9 9 7 4.5 7c0 4.5 3 6.5 7.5 6.5z" />
      <path d="M12 11c0-3.5 2.5-5.5 7.5-5.5 0 4.5-3 6.5-7.5 6" />
    </svg>
  );
}

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
        <b>users linked on Account Aggregator</b> — consented, structured
        financial data, growing every quarter
      </>
    ),
  },
];

function PanelB2B() {
  return (
    <div className="panel panel-dark">
      <span className="panel-icon" aria-hidden="true">
        <IconVault size={46} />
      </span>
      <span className="panel-tag">B2B · For Institutions</span>
      <h3>A white-labelled platform for banks &amp; NBFCs</h3>
      <p className="panel-sub">
        Finous runs quietly inside your own app — your brand, your customers,
        our intelligence.
      </p>
      <ul className="panel-list">
        <li><IconCheck /> Unified dashboard across every customer relationship</li>
        <li><IconCheck /> AI advisor that speaks your customer&rsquo;s language</li>
        <li><IconCheck /> Proactive, pre-approved product recommendations</li>
        <li><IconCheck /> Deploys into your existing stack — no rip-and-replace</li>
      </ul>
    </div>
  );
}

function PanelB2C() {
  return (
    <div className="panel panel-light">
      <span className="panel-icon" aria-hidden="true" style={{ color: "#c9a227" }}>
        <IconWallet size={46} />
      </span>
      <span className="panel-tag">B2C · For Customers</span>
      <h3>Every account, one place — completely free</h3>
      <p className="panel-sub">
        Customers finally see their full financial picture, and an advisor
        that explains it.
      </p>
      <ul className="panel-list">
        <li><IconCheck /> Bank balances, loans, investments and credit cards together</li>
        <li><IconCheck /> AI advisor in Hindi and English</li>
        <li><IconCheck /> Consent-first, built on the Account Aggregator framework</li>
        <li><IconCheck /> A complete financial picture — free, always</li>
      </ul>
    </div>
  );
}

export default function About() {
  return (
    <section id="about" className="about">
      <div className="container">
        <div className="about-head">
          <Reveal>
            <div className="sec-head">
              <span className="eyebrow">The Platform</span>
              <h2 className="sec-title">
                One intelligence layer, two sides of the same ledger
              </h2>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <p className="sec-lede">
              Finous is a financial intelligence platform with a two-sided
              model: a white-labelled engine that banks and NBFCs ship inside
              their own apps — and a free, complete financial picture for
              their customers. When customers understand their money,
              institutions grow. Both sides win on one ledger.
            </p>
          </Reveal>
        </div>

        <div className="panels">
          <Reveal className="panels-col" delay={80}>
            <PanelB2B />
          </Reveal>
          <Reveal className="panels-col" delay={200}>
            <PanelB2C />
          </Reveal>
          <div className="flywheel-chip" aria-hidden="true">
            One
            <br />
            ledger
            <svg width="26" height="14" viewBox="0 0 26 14" fill="none">
              <path
                d="M2 7h18M15 2l5 5-5 5"
                stroke="#0f1f3d"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <Reveal delay={100}>
          <div className="seg-strip" aria-label="Institution segments Finous is built for">
            <div className="seg-cell">
              <IconPillar />
              <h4>Urban Co-operative Banks</h4>
              <p>Retail-deposit intelligence for 1,500+ RBI-regulated UCBs.</p>
            </div>
            <div className="seg-cell">
              <IconCoins />
              <h4>NBFCs</h4>
              <p>Cross-sell and collections IQ across 9,000+ lenders.</p>
            </div>
            <div className="seg-cell">
              <IconLeaf />
              <h4>Regional Rural Banks</h4>
              <p>Vernacular, low-bandwidth journeys for last-mile credit.</p>
            </div>
            <div className="seg-cell">
              <IconSprout />
              <h4>Small Finance Banks</h4>
              <p>Inclusion-first onboarding and household cash-flow views.</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
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
  );
}
