import type { CSSProperties } from "react";
import { Reveal } from "./ui";

const w = (v: string) => ({ "--w": v }) as CSSProperties;

const DEPLOY_STEPS = [
  {
    weeks: "Weeks 1–2",
    title: "Discover & design",
    desc: "Product mapping, branding, compliance review with your team.",
  },
  {
    weeks: "Weeks 3–5",
    title: "Integration",
    desc: "Core banking hookup, Account Aggregator consent flows, AA testing.",
  },
  {
    weeks: "Weeks 6–8",
    title: "Pilot & go-live",
    desc: "Staff training, controlled pilot, then full launch in your app.",
  },
];

const REGIONS = [
  { label: "India", note: "home market", home: true },
  { label: "US Credit Unions", note: "community finance" },
  { label: "Volksbanken", note: "Germany" },
  { label: "Southeast Asia", note: "underbanked corridors" },
];

export default function Moat() {
  return (
    <section className="moat" aria-labelledby="moat-title">
      <div className="container moat-grid">
        <div className="moat-left">
          <Reveal>
            <span className="eyebrow">The Moat</span>
            <h2 id="moat-title" className="sec-title">
              What makes Finous different
            </h2>
            <p className="sec-lede">
              Anyone can wrap a generic chatbot around a bank&rsquo;s data.
              Almost no one can ship a proprietary model that understands
              Indian financial products, regulations and languages — at a
              fraction of the cost — in under two months. That&rsquo;s the
              gap we own.
            </p>
            <blockquote className="moat-quote">
              &ldquo;Generic models answer questions. Finous understands the
              customer.&rdquo;
              <span>— The Finous thesis</span>
            </blockquote>
          </Reveal>
        </div>

        <div className="moat-cards">
          <Reveal delay={60}>
            <article className="moat-card">
              <div className="moat-card-head">
                <span className="moat-num">01</span>
                <h3>A proprietary model, built for Indian finance</h3>
              </div>
              <p>
                Trained and tuned on Indian products, regulations and
                languages — more relevant, more accurate, and significantly
                cheaper to run than generic LLMs for every advisor query your
                customers make.
              </p>
              <div className="moat-visual" aria-label="Cost per million advisor queries, illustrative">
                <div className="cost-row">
                  <div className="cost-meta">
                    <span>Generic LLM API</span>
                    <span>baseline · 100%</span>
                  </div>
                  <div className="bar"><i className="grey" style={w("100%")} /></div>
                </div>
                <div className="cost-row">
                  <div className="cost-meta">
                    <span>Finous proprietary model</span>
                    <span>≈ 85% lower</span>
                  </div>
                  <div className="bar"><i className="gold-fill" style={w("15%")} /></div>
                </div>
                <p className="cost-note">
                  Illustrative · cost per 1M advisor queries, inference only
                </p>
              </div>
            </article>
          </Reveal>

          <Reveal delay={120}>
            <article className="moat-card">
              <div className="moat-card-head">
                <span className="moat-num">02</span>
                <h3>Deploys in 6–8 weeks</h3>
              </div>
              <p>
                Not a two-year core transformation. Finous layers onto your
                existing stack and ships fast — from first workshop to
                go-live inside your app in one quarter.
              </p>
              <div className="moat-visual">
                <div className="deploy-track">
                  {DEPLOY_STEPS.map((s) => (
                    <div className="deploy-step" key={s.weeks}>
                      <span className="deploy-weeks">{s.weeks}</span>
                      <h4>{s.title}</h4>
                      <p>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>

          <Reveal delay={180}>
            <article className="moat-card">
              <div className="moat-card-head">
                <span className="moat-num">03</span>
                <h3>India first, then global</h3>
              </div>
              <p>
                We&rsquo;re building for the world&rsquo;s most exciting
                financial market first — then taking the same playbook to
                community lenders everywhere.
              </p>
              <div className="moat-visual">
                <div className="regions">
                  {REGIONS.map((r) => (
                    <span className={`region-chip ${r.home ? "home" : ""}`} key={r.label}>
                      <i />
                      {r.label} <small>· {r.note}</small>
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
