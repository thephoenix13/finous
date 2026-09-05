import { CountUp, IconCheck, IconVault, IconWallet, Reveal } from "./ui";

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
