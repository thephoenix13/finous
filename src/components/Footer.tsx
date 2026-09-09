import { Link } from "react-router-dom";
import { IconLock, IconMail, LogoMark, Wordmark, scrollToId } from "./ui";

export default function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand" aria-label="Finous — back to top">
              <LogoMark />
              <Wordmark />
            </Link>
            <p>
              The AI layer that helps banks understand their customers —
              and helps customers understand their money.
            </p>
            <span className="footer-nidhi">by Nidhiverse Pvt Ltd</span>
          </div>

          <div>
            <h5>Navigate</h5>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/b2b">For Institutions</Link></li>
              <li><Link to="/b2c">For Customers</Link></li>
              <li>
                <button className="footer-btn" onClick={() => scrollToId("waitlist")}>
                  Join the Waitlist
                </button>
              </li>
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
