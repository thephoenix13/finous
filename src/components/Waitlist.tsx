import { useState, type FormEvent } from "react";
import { IconArrow, IconCheck, IconLock, Reveal } from "./ui";

type State = "idle" | "sending" | "done";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Waitlist() {
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
        <Reveal>
          <div>
            <span className="eyebrow on-dark">Early Access</span>
            <h2>Be the first to know</h2>
            <p className="sec-lede">
              We&rsquo;re building the future of financial intelligence. Join
              the waitlist for early access.
            </p>
            <ul className="wl-points">
              <li><IconCheck /> Early access for founding institutions</li>
              <li><IconCheck /> No spam — one email when the doors open</li>
              <li><IconCheck /> Email only. No name, no phone.</li>
            </ul>
          </div>
        </Reveal>

        <Reveal delay={160}>
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
                <h3>Reserve your spot</h3>
                <p>Founding institutions get priority onboarding and pricing.</p>
                <form className="wl-form" onSubmit={submit} noValidate>
                  <label className="wl-label" htmlFor="wl-email">
                    Email address
                  </label>
                  <input
                    id="wl-email"
                    className={`wl-input ${error ? "invalid" : ""}`}
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError("");
                    }}
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "wl-error" : undefined}
                  />
                  {error && (
                    <p className="wl-error" id="wl-error" role="alert">
                      <IconLock size={13} /> {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    className="btn btn-gold"
                    disabled={state === "sending"}
                    style={{ width: "100%" }}
                  >
                    {state === "sending" ? "Joining…" : "Join Waitlist"}
                    {state !== "sending" && <IconArrow size={15} />}
                  </button>
                  <p className="wl-note">
                    <IconLock size={13} /> No name, no phone — just your email.
                    Unsubscribe anytime.
                  </p>
                  <p className="wl-inst">
                    Representing a bank or NBFC? Write to{" "}
                    <a href="mailto:founder@finous.site">founder@finous.site</a>{" "}
                    for a pilot conversation — early access opens in cohorts,
                    institutions first.
                  </p>
                </form>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
