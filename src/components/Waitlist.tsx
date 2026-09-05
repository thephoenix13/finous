import { useState, type FormEvent, type ReactNode } from "react";
import { IconArrow, IconCheck, IconLock } from "./ui";

type State = "idle" | "sending" | "done";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DEFAULT_POINTS = (
  <>
    <li><IconCheck /> Early access for founding institutions</li>
    <li><IconCheck /> No spam — one email when the doors open</li>
    <li><IconCheck /> Email only. No name, no phone.</li>
  </>
);

export default function Waitlist({
  eyebrow = "Early Access",
  title = "Be the first to know",
  lede = "We're building the future of financial intelligence. Join the waitlist for early access.",
  points = DEFAULT_POINTS,
  cardTitle = "Reserve your spot",
  cardSub = "Founding institutions get priority onboarding and pricing.",
  ctaLabel = "Join Waitlist",
  showInstNote = true,
}: {
  eyebrow?: string;
  title?: ReactNode;
  lede?: ReactNode;
  points?: ReactNode;
  cardTitle?: ReactNode;
  cardSub?: ReactNode;
  ctaLabel?: string;
  showInstNote?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setState("sending");
    window.setTimeout(() => setState("done"), 750);
  };

  const reset = () => {
    setEmail("");
    setError("");
    setState("idle");
  };

  return (
    <section id="waitlist" className="waitlist">
      <div className="container waitlist-grid">
        <div className="reveal">
          <div>
            <span className="eyebrow on-dark">{eyebrow}</span>
            <h2>{title}</h2>
            <p className="sec-lede">{lede}</p>
            <ul className="wl-points">{points}</ul>
          </div>
        </div>

        <div className="reveal" style={{ ["--d" as string]: "160ms" }}>
          <div className="wl-card">
            {state === "done" ? (
              <div className="wl-success" role="status" aria-live="polite">
                <div className="wl-check">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <path
                      d="M5.5 14.5l6 6 11-12.5"
                      stroke="#a1811d"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3>You&rsquo;re on the list! We&rsquo;ll reach out soon.</h3>
                <p>
                  Keep an eye on your inbox — early-access invitations go out
                  in the order they were received.
                </p>
                <span className="email-echo">{email.trim()}</span>
                <br />
                <button className="wl-again" onClick={reset}>
                  Join with a different email
                </button>
              </div>
            ) : (
              <>
                <h3>{cardTitle}</h3>
                <p className="wl-card-sub">{cardSub}</p>
                <form className="wl-form" onSubmit={submit} noValidate>
                  <label className="wl-label" htmlFor="wl-email">
                    Work or personal email
                  </label>
                  <input
                    id="wl-email"
                    className={`wl-input ${error ? "invalid" : ""}`}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    disabled={state === "sending"}
                  />
                  {error && (
                    <p className="wl-error" role="alert">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M7 4v3.4M7 9.6v.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      {error}
                    </p>
                  )}
                  <button className="btn btn-gold" type="submit" disabled={state === "sending"}>
                    {state === "sending" ? "Reserving your spot…" : ctaLabel}
                    {state !== "sending" && <IconArrow size={15} />}
                  </button>
                  <p className="wl-note">
                    <IconLock size={13} /> No name, no phone — just your email.
                    Unsubscribe anytime.
                  </p>
                  {showInstNote && (
                    <p className="wl-inst">
                      Representing a bank or NBFC? Write to{" "}
                      <a href="mailto:founder@finous.site">founder@finous.site</a>{" "}
                      for a pilot conversation — early access opens in cohorts,
                      institutions first.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
