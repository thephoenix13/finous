import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/* ---------- Reveal: fade-in wrapper driven by App's IntersectionObserver ---------- */
export function Reveal({
  children,
  className = "",
  delay = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  id?: string;
}) {
  return (
    <div
      id={id}
      className={`reveal ${className}`}
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ---------- CountUp: animates a number when scrolled into view ---------- */
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 1700,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || started.current) return;
          started.current = true;
          io.disconnect();
          if (reduced) {
            setVal(to);
            return;
          }
          const t0 = performance.now();
          const tick = (t: number) => {
            const p = Math.min((t - t0) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3);
            setVal(Math.round(to * eased));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {val.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/* ---------- Brand ---------- */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="9" fill="#0f1f3d" />
      <path
        d="M11 25V9h10M11 17h7"
        stroke="#c9a227"
        strokeWidth="2.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="23.5" y="18" width="3" height="7" rx="1.3" fill="#c9a227" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="wordmark">
      Finous<span className="dot">.</span>
    </span>
  );
}

/* ---------- Custom inline icons ---------- */
const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconCheck({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="8.6" {...iconProps} opacity="0.35" />
      <path d="M6.4 10.3l2.4 2.5 4.8-5.4" {...iconProps} />
    </svg>
  );
}

export function IconVault({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <rect x="4" y="6" width="36" height="30" rx="4" {...iconProps} />
      <circle cx="22" cy="21" r="7.5" {...iconProps} />
      <path d="M22 16.5V21l3.2 2.4" {...iconProps} />
      <path d="M4 12h3.5M4 30h3.5M36.5 12H40M36.5 30H40" {...iconProps} opacity="0.5" />
      <path d="M12 36v3M32 36v3" {...iconProps} />
    </svg>
  );
}

export function IconWallet({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      <path d="M7 14a4 4 0 014-4h20a3 3 0 013 3v2" {...iconProps} />
      <rect x="7" y="14" width="30" height="20" rx="4" {...iconProps} />
      <path d="M30 22.5h7v5h-7a2.5 2.5 0 010-5z" {...iconProps} />
      <path d="M13 20.5l5 4 5-4 5 4" {...iconProps} opacity="0.55" />
    </svg>
  );
}

export function IconSpark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.5l1.6 4.4L14 7.5l-4.4 1.6L8 13.5 6.4 9.1 2 7.5l4.4-1.6L8 1.5z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function IconShield({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 1.8l6 2.4v4.6c0 3.8-2.6 6.4-6 7.4-3.4-1-6-3.6-6-7.4V4.2L9 1.8z" {...iconProps} />
      <path d="M6.4 9l1.9 1.9 3.4-3.8" {...iconProps} />
    </svg>
  );
}

export function IconLock({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="2" {...iconProps} />
      <path d="M5.2 7V5.2a2.8 2.8 0 015.6 0V7" {...iconProps} />
      <circle cx="8" cy="10.4" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMail({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <rect x="2" y="3.5" width="14" height="11" rx="2.5" {...iconProps} />
      <path d="M3 5.5l6 4.5 6-4.5" {...iconProps} />
    </svg>
  );
}

export function IconArrow({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path d="M3 9h11M10 4.5L14.5 9 10 13.5" {...iconProps} strokeWidth={2} />
    </svg>
  );
}

export function IconCard({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="2" y="4.5" width="16" height="11" rx="2.2" {...iconProps} />
      <path d="M2 8.5h16" {...iconProps} />
      <path d="M5 12.5h4" {...iconProps} opacity="0.6" />
    </svg>
  );
}

export function IconTrend({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2.5 15.5l4.5-5 3.5 3 6-7" {...iconProps} />
      <path d="M12.5 6.5h4v4" {...iconProps} />
    </svg>
  );
}

export function IconBell({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M10 3a4.8 4.8 0 00-4.8 4.8c0 4.4-1.4 5.7-1.4 5.7h12.4s-1.4-1.3-1.4-5.7A4.8 4.8 0 0010 3z" {...iconProps} />
      <path d="M8.2 16.5a1.9 1.9 0 003.6 0" {...iconProps} />
    </svg>
  );
}

export function IconLinkConsent({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path d="M8.5 11.5l3-3" {...iconProps} />
      <path d="M7 9L4.8 11.2a3 3 0 004.2 4.2L11.2 13" {...iconProps} />
      <path d="M13 11l2.2-2.2a3 3 0 00-4.2-4.2L8.8 6.8" {...iconProps} />
    </svg>
  );
}

/* Smooth-scroll helper for in-page anchors (HashRouter-safe) */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}
