import { Link } from "react-router-dom";
import { HeroConsole, Ticker } from "../components/Console";
import Platform from "../components/Platform";
import Moat from "../components/Moat";
import Security from "../components/Security";
import Faq from "../components/Faq";
import Engagement from "../components/Engagement";
import Waitlist from "../components/Waitlist";
import { IconArrow, IconCheck, IconShield, Reveal, scrollToId } from "../components/ui";

/* ---------- segment icons ---------- */
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

const SEGMENTS = [
  { icon: <IconPillar />, name: "Urban Co-op Banks", desc: "1,500+ RBI-regulated banks, digitally hungry and underserved by global vendors." },
  { icon: <IconCoins />, name: "NBFCs", desc: "9,000+ lending, leasing and microfinance institutions across India." },
  { icon: <IconLeaf />, name: "Regional Rural Banks", desc: "Last-mile lenders serving 600+ districts — prime for an intelligence layer." },
  { icon: <IconSprout />, name: "Small Finance Banks", desc: "Fast-growing, inclusion-first banks with modern core stacks." },
];

const OUTCOMES = [
  {
    num: "01",
    title: "Deeper engagement",
    copy: "A unified money view and an advisor give customers a reason to open your app daily — not just on payday.",
    chip: "North-star · daily engagement",
  },
  {
    num: "02",
    title: "Lower cost to serve",
    copy: "Routine queries go to the AI advisor; complex ones route to your staff with full context attached.",
    chip: "North-star · cost per query",
  },
  {
    num: "03",
    title: "Precision cross-sell",
    copy: "Recommendations built from each customer's real numbers — surfaced at the right moment, approved by your team.",
    chip: "North-star · conversion quality",
  },
  {
    num: "04",
    title: "Examiner-ready operations",
    copy: "Every consent, query and recommendation is logged immutably — sized for RBI examination and internal audit.",
    chip: "North-star · audit readiness",
  },
];

export default function B2B() {
  return (
    <>
      {/* ---------- SUB-HERO ---------- */}
      <section id="home" className="sub-hero">
        <div className="container hero-grid">
          <Reveal>
            <div>
              <Link to="/" className="back-link">
                <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M15 9H4M8 4.5L3.5 9 8 13.5" />
                </svg>
                Back to the Finous concept
              </Link>
              <span className="badge-pill on-dark">
                <span className="pulse-dot" />
                Finous for Institutions · B2B
              </span>
              <h1 className="sub-hero-title">
                Give your app <span className="u-gold-dark">a brain.</span>
              </h1>
              <p className="sub-hero-sub">
                Finous layers a unified customer view, an AI advisor and
                proactive recommendations into your bank&rsquo;s own app — in
                your brand, on your terms, live in 6–8 weeks.
              </p>
              <div className="cta-row">
                <button className="btn btn-gold" onClick={() => scrollToId("waitlist")}>
                  Join the Waitlist <IconArrow size={15} />
                </button>
                <a className="btn btn-ghost-dark" href="mailto:founder@finous.site">
                  Talk to a Founder
                </a>
              </div>
              <div className="trust-row on-dark">
                <span className="trust-item"><IconShield size={15} /> RBI-regulated ready</span>
                <span className="trust-item"><IconCheck size={16} /> White-label · your brand</span>
                <span className="trust-item"><IconCheck size={16} /> Data stays in your boundary</span>
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <HeroConsole />
          </Reveal>
        </div>
      </section>

      <Ticker label="Institutional capabilities" />

      {/* ---------- OUTCOMES ---------- */}
      <section className="outcomes" aria-labelledby="outcomes-title">
        <div className="container">
          <Reveal>
            <div className="sec-head" style={{ marginBottom: 44 }}>
              <span className="eyebrow">The Business Case</span>
              <h2 id="outcomes-title" className="sec-title">
                What changes for your bank
              </h2>
              <p className="sec-lede">
                Finous is not a feature bolt-on — it changes the four numbers
                your board asks about every quarter.
              </p>
            </div>
          </Reveal>
          <div className="outcomes-grid">
            {OUTCOMES.map((o, i) => (
              <Reveal delay={i * 80} key={o.num}>
                <article className="outcome-card">
                  <span className="outcome-num">{o.num}</span>
                  <h3>{o.title}</h3>
                  <p>{o.copy}</p>
                  <span className="outcome-chip">{o.chip}</span>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- SEGMENTS ---------- */}
      <section className="segments" aria-label="Who we serve">
        <div className="container">
          <Reveal>
            <div className="seg-strip">
              {SEGMENTS.map((s) => (
                <div className="seg-cell" key={s.name}>
                  {s.icon}
                  <h4>{s.name}</h4>
                  <p>{s.desc}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Platform />
      <Moat />
      <Security />
      <Engagement />
      <Faq />

      <Waitlist
        eyebrow="Early Access · Institutions"
        title="Put your institution first in line"
        lede="Join the waitlist for pilot access. Early cohorts get founder-led onboarding, pricing locked for two years, and a direct line into the product roadmap."
        points={
          <>
            <li><IconCheck /> Pilot pricing locked for two years</li>
            <li><IconCheck /> Founder-led onboarding &amp; integration</li>
            <li><IconCheck /> Email only. No name, no phone.</li>
          </>
        }
        cardTitle="Request pilot access"
        cardSub="A founder replies to every institution email — usually within two business days."
        showInstNote={false}
      />
    </>
  );
}
