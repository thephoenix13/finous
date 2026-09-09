import { Reveal, IconLock } from "./ui";

/* ---------- governance icons (custom, geometric) ---------- */
function IconShieldCheck({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 2.8v5.4c0 4.6-3 8.2-7 9.8-4-1.6-7-5.2-7-9.8V5.8z" />
      <path d="M9 11.8l2.1 2.1 4-4.2" />
    </svg>
  );
}
function IconBoundary({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" strokeDasharray="4 3" />
      <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconDocCheck({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3.5h8.5L19 8v12.5H6z" />
      <path d="M14.5 3.5V8H19" />
      <path d="M9 13l2 2 3.6-3.8" />
    </svg>
  );
}
function IconAudit({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 5h15M4.5 9.5h15M4.5 14h9" />
      <path d="M15.5 16.5l2 2 3.4-3.6" />
      <path d="M4.5 18.5h6" />
    </svg>
  );
}
function IconRbac({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
      <path d="M15.5 5.4a3.2 3.2 0 010 5.7M17.6 14.9c1.8.7 2.9 2.3 2.9 4.6" />
    </svg>
  );
}
function IconEncrypt({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7.5a4 4 0 018 0V10" />
      <circle cx="12" cy="15" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconCloud({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 18.5a4.5 4.5 0 01-.6-8.96A5.5 5.5 0 0117 8.6a4 4 0 01.6 7.9z" />
    </svg>
  );
}
function IconVpc({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="6.5" rx="1.5" />
      <rect x="4" y="13.5" width="16" height="6.5" rx="1.5" />
      <path d="M7.5 7.25h.01M7.5 16.75h.01" strokeWidth="2.2" />
    </svg>
  );
}
function IconOnPrem({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20.5h16M5.5 20.5V9.5L12 4l6.5 5.5v11" />
      <path d="M9.5 20.5v-5h5v5" />
      <path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01" strokeWidth="2.2" />
    </svg>
  );
}

const GOVERNANCE = [
  {
    icon: <IconShieldCheck />,
    title: "Consent-first architecture",
    desc: "Built on the RBI's Account Aggregator framework — no data is fetched without explicit, revocable customer consent.",
  },
  {
    icon: <IconBoundary />,
    title: "Data stays in your boundary",
    desc: "Processing runs inside the bank's VPC or data centre. Finous never commingles — or retains — customer data across institutions.",
  },
  {
    icon: <IconDocCheck />,
    title: "DPDP Act, 2023 ready",
    desc: "Privacy by design: data-principal rights workflows, consent receipts and DPIA support built into the platform.",
  },
  {
    icon: <IconAudit />,
    title: "Full audit trail",
    desc: "Every query, consent and recommendation is immutably logged — examination-ready for RBI and internal audit.",
  },
  {
    icon: <IconRbac />,
    title: "Role-based access",
    desc: "Granular RBAC for bankers, RMs and administrators, with SSO / SAML integration into your identity stack.",
  },
  {
    icon: <IconEncrypt />,
    title: "Encryption everywhere",
    desc: "AES-256 at rest, TLS 1.3 in transit — with bank-held keys on dedicated and on-prem deployments.",
  },
];

const DEPLOYMENTS = [
  {
    icon: <IconCloud />,
    model: "Finous Cloud",
    hosting: "Managed service, India-region data centres",
    boundary: "Data residency: India",
    time: "6–8 weeks",
  },
  {
    icon: <IconVpc />,
    model: "Dedicated VPC",
    hosting: "Isolated estate on your cloud account",
    boundary: "Your cloud, your keys",
    time: "8–10 weeks",
  },
  {
    icon: <IconOnPrem />,
    model: "On-premises",
    hosting: "Appliance inside the bank's data centre",
    boundary: "Air-gapped option",
    time: "10–12 weeks",
  },
];

const COMPLIANCE = [
  "DPDP Act, 2023",
  "RBI Account Aggregator framework",
  "ISO 27001-aligned controls",
  "SOC 2 Type II · on roadmap",
  "AES-256 · TLS 1.3",
  "Immutable audit trails",
];

export default function Security() {
  return (
    <section id="security" className="security" aria-labelledby="security-title">
      <div className="container">
        <Reveal>
          <span className="eyebrow on-dark">Security &amp; Governance</span>
          <h2 id="security-title" className="sec-title">
            Enterprise-grade by design
          </h2>
          <p className="sec-lede">
            Banks don&rsquo;t buy software — they buy assurance. Finous is
            architected so customer data never leaves the institution&rsquo;s
            control, and every action the AI takes can be explained, logged
            and audited.
          </p>
        </Reveal>

        <div className="sec-grid">
          <Reveal delay={80}>
            <div className="gov-list">
              {GOVERNANCE.map((g) => (
                <div className="gov-item" key={g.title}>
                  {g.icon}
                  <div>
                    <h4>{g.title}</h4>
                    <p>{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="spec-panel">
              <p className="spec-title">Deployment models</p>
              <p className="spec-sub">
                Choose how Finous runs for your institution — every model
                ships the same intelligence layer.
              </p>

              <div className="spec-head" aria-hidden="true">
                <span>Model</span>
                <span>Hosting</span>
                <span>Data boundary</span>
                <span>Go-live</span>
              </div>
              {DEPLOYMENTS.map((d) => (
                <div className="spec-row" key={d.model}>
                  <b>
                    {d.icon}
                    {d.model}
                  </b>
                  <span>
                    <span className="spec-k">Hosting</span>
                    {d.hosting}
                  </span>
                  <span>
                    <span className="spec-k">Data boundary</span>
                    {d.boundary}
                  </span>
                  <span>
                    <span className="spec-k">Go-live</span>
                    {d.time}
                  </span>
                </div>
              ))}

              <div className="comp-chips">
                {COMPLIANCE.map((c) => (
                  <span className="comp-chip" key={c}>{c}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <p className="sec-foot">
            <IconLock size={14} />
            Security architecture documents and control summaries are available
            under NDA — write to <a href="mailto:founder@finous.site">founder@finous.site</a>.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
