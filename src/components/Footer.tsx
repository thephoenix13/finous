import { IconLock, IconMail, LogoMark, Wordmark } from "./ui";

const NAV = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#platform", label: "Platform" },
  { href: "#security", label: "Security" },
  { href: "#waitlist", label: "Waitlist" },
];

export default function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <a href="#home" className="brand" aria-label="Finous — back to top">
              <LogoMark />
              <Wordmark />
            </a>
            <p>
              The AI layer that helps banks understand their customers.
              Financial intelligence for institutions — and a complete
              financial picture for the people they serve.
            </p>
            <span className="footer-nidhi">by Nidhiverse Pvt Ltd</span>
          </div>

          <div>
            <h5>Navigate</h5>
            <ul className="footer-links">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href}>{n.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-contact">
            <h5>Contact</h5>
            <a className="mail-btn" href="mailto:founder@finous.site">
              <IconMail size={16} /> founder@finous.site
            </a>
            <p>
              For partnerships, pilot programmes, institutional demos and
              press — write to us and we&rsquo;ll respond within two business
              days.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Nidhiverse Pvt Ltd · All rights reserved</span>
          <span className="confidential">
            <IconLock size={13} /> Confidential · Not for distribution
          </span>
        </div>
      </div>
    </footer>
  );
}
