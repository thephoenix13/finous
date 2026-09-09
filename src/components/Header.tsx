import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LogoMark, Wordmark, scrollToId } from "./ui";

const PAGE_LINKS = [
  { to: "/", label: "Home" },
  { to: "/b2b", label: "For Institutions" },
  { to: "/b2c", label: "For Customers" },
];

const ANCHOR_LINKS = [
  { id: "waitlist", label: "Waitlist" },
  { id: "contact", label: "Contact" },
];

export default function Header() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const p = max > 0 ? Math.min(doc.scrollTop / max, 1) : 0;
      setScrolled(doc.scrollTop > 14);
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${p})`;
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const close = () => setOpen(false);

  return (
    <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="Finous — home" onClick={close}>
          <LogoMark />
          <Wordmark />
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {PAGE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link ${pathname === l.to ? "active" : ""}`}
            >
              {l.label}
            </Link>
          ))}
          {ANCHOR_LINKS.map((l) => (
            <button key={l.id} className="nav-link nav-btn" onClick={() => scrollToId(l.id)}>
              {l.label}
            </button>
          ))}
        </nav>

        <button className="btn btn-gold header-cta" onClick={() => scrollToId("waitlist")}>
          Join Waitlist
        </button>

        <button
          className={`hamburger ${open ? "open" : ""}`}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className="scroll-progress" aria-hidden="true">
        <div ref={progressRef} />
      </div>

      <div className={`mobile-menu ${open ? "open" : ""}`}>
        <nav aria-label="Mobile">
          {PAGE_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`mobile-link ${pathname === l.to ? "active" : ""}`}
              onClick={close}
            >
              {l.label}
            </Link>
          ))}
          {ANCHOR_LINKS.map((l) => (
            <button
              key={l.id}
              className="mobile-link mobile-btn"
              onClick={() => {
                close();
                window.setTimeout(() => scrollToId(l.id), 60);
              }}
            >
              {l.label}
            </button>
          ))}
          <button
            className="btn btn-gold"
            onClick={() => {
              close();
              window.setTimeout(() => scrollToId("waitlist"), 60);
            }}
          >
            Join Waitlist
          </button>
        </nav>
      </div>
    </header>
  );
}
