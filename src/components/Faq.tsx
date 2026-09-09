import { useState } from "react";
import { Reveal } from "./ui";

const FAQS = [
  {
    q: "How does Finous deploy inside our existing app?",
    a: "White-label. We ship native modules and APIs that render inside your bank's app — in your brand, colours and languages. Customers install nothing new, and your core is never re-platformed. Typical go-live is 6–8 weeks from kickoff.",
  },
  {
    q: "Where does customer data live?",
    a: "Inside your boundary. Data is processed in your dedicated VPC or on-premises environment and is never commingled across institutions. Finous retains no customer data after processing, and every fetch runs through the Account Aggregator's consented, revocable rails.",
  },
  {
    q: "Who owns the data — and the insights?",
    a: "You do. The institution owns all customer data and every insight the model generates. Finous never sells, shares or monetises customer data, and your teams can export everything at any time.",
  },
  {
    q: "How do you handle compliance and regulation?",
    a: "The platform is designed around the RBI's Account Aggregator framework and the DPDP Act, 2023 — consent-first data flows, data-principal rights workflows, DPIA support, and immutable audit trails sized for RBI examination.",
  },
  {
    q: "Can the AI advisor be trusted with customers?",
    a: "The advisor is grounded in each customer's actual numbers — not general knowledge — with strict guardrails and explainable recommendations. Anything sensitive is routed to your own staff, and every answer is logged and reviewable.",
  },
  {
    q: "What does it cost?",
    a: "A per-institution subscription plus usage, sized to your book — typically a fraction of building in-house or running generic LLMs at scale. Early design partners receive pilot pricing and a direct line into the product roadmap.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number>(0);

  return (
    <section className="faq" aria-labelledby="faq-title">
      <div className="container">
        <div className="faq-head">
          <Reveal>
            <span className="eyebrow">Institution FAQ</span>
            <h2 id="faq-title" className="sec-title">
              Answers for the diligence team
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="faq-head-note">
              Everything CIOs, CROs and compliance heads ask us before a
              pilot — answered plainly.
            </p>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div className="faq-list">
            {FAQS.map((item, i) => {
              const isOpen = open === i;
              return (
                <div className={`faq-item ${isOpen ? "open" : ""}`} key={item.q}>
                  <button
                    className="faq-q"
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    {item.q}
                    <span className="faq-x" aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                        <path d="M7 2v10M2 7h10" />
                      </svg>
                    </span>
                  </button>
                  <div className="faq-a" id={`faq-panel-${i}`}>
                    <div className="faq-a-inner">
                      <p>{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="faq-foot">
            A question we haven&rsquo;t answered? Write to{" "}
            <a href="mailto:founder@finous.site">founder@finous.site</a> — a
            founder replies, not a form letter.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
