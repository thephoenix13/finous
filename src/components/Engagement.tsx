import { Reveal, IconCheck, IconArrow } from "./ui";

const PHASES = [
  {
    num: "01",
    weeks: "Weeks 1–2",
    title: "Discovery sprint",
    desc: "A two-week, no-cost sprint: data mapping, security review and success metrics. You leave with a deployment blueprint — even if you don't proceed.",
    chips: ["Deployment blueprint", "Security review pack"],
  },
  {
    num: "02",
    weeks: "One quarter",
    title: "Design-partner pilot",
    desc: "A live pilot inside your app, scoped to a chosen customer segment. Founding pricing, weekly reviews with the founders, and a hard exit gate at 90 days.",
    chips: ["Founding pricing", "Weekly founder reviews", "90-day exit gate"],
  },
  {
    num: "03",
    weeks: "Post go-live",
    title: "Scale",
    desc: "Rollout across segments and branches with SLA-backed uptime — and a seat on the product roadmap as the model sharpens on your market.",
    chips: ["SLA-backed uptime", "Roadmap seat"],
  },
];

const TERMS = [
  "Priority onboarding — the first cohort opens to institutions only",
  "Founding-institution pricing, locked for two years",
  "A direct line to the founding team for the length of the pilot",
  "Optional co-branded case study — published only if the numbers land",
];

export default function Engagement() {
  return (
    <section id="pilot" className="engage" aria-labelledby="engage-title">
      <div className="container">
        <Reveal>
          <span className="eyebrow">Engagement Model</span>
          <h2 id="engage-title" className="sec-title">
            From first call to full rollout
          </h2>
          <p className="sec-lede">
            No multi-year programmes, no change-management theatre. Three
            phases, fixed durations, and a clear exit gate at every step — so
            the risk stays ours, not yours.
          </p>
        </Reveal>

        <div className="engage-grid">
          <Reveal delay={80}>
            <div className="phases">
              {PHASES.map((p) => (
                <div className="phase" key={p.num}>
                  <div className="phase-mark">
                    <span className="phase-num">{p.num}</span>
                    <span className="phase-weeks">{p.weeks}</span>
                  </div>
                  <div className="phase-body">
                    <h3>{p.title}</h3>
                    <p>{p.desc}</p>
                    <div className="phase-chips">
                      {p.chips.map((c) => (
                        <span className="phase-chip" key={c}>{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={180}>
            <aside className="terms-card">
              <p className="terms-kicker">Design-partner terms</p>
              <h3>What the first cohort gets</h3>
              <ul className="terms-list">
                {TERMS.map((t) => (
                  <li key={t}>
                    <IconCheck />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <p className="terms-note">
                Cohorts are deliberately small — every design partner gets
                hands-on onboarding, not a ticket queue.
              </p>
              <a className="terms-cta" href="#waitlist">
                Reserve a place in the next cohort <IconArrow size={15} />
              </a>
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
