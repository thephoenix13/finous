import { useEffect, useState } from "react";
import { AdvisorChat, useReducedMotion } from "./Console";
import { IconBell, IconCard, IconTrend, IconVault, IconWallet, LogoMark } from "./ui";

const ROWS = [
  { icon: <IconWallet size={14} />, name: "Savings · HDFC", amt: "₹1,24,300" },
  { icon: <IconVault size={14} />, name: "FD · SBI", amt: "₹2,00,000" },
  { icon: <IconTrend size={14} />, name: "Mutual Funds", amt: "₹1,18,240" },
  { icon: <IconCard size={14} />, name: "Credit Card", amt: "−₹42,180", neg: true },
];

const BASE = 400360; /* net of the rows above */

export default function PhoneMock() {
  const reduced = useReducedMotion();
  const [delta, setDelta] = useState(0);
  const [tick, setTick] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setDelta(Math.floor(Math.random() * 220) - 50);
      setTick(true);
      window.setTimeout(() => setTick(false), 750);
    }, 3100);
    return () => clearInterval(id);
  }, [reduced]);

  const total = BASE + delta;

  return (
    <div className="phone-wrap">
      <div className="phone">
        <div className="phone-screen">
          <div className="phone-notch" aria-hidden="true" />
          <div className="phone-head">
            <span className="phone-brand">
              <LogoMark size={22} /> Finous
            </span>
            <span className="phone-bell" aria-hidden="true"><IconBell size={16} /></span>
          </div>

          <p className="phone-greet">नमस्ते, Priya</p>
          <p className="phone-label">Total balance · 4 institutions</p>
          <p className={`phone-total ${tick ? "tick" : ""}`}>
            ₹{total.toLocaleString("en-IN")}
          </p>

          <div className="phone-rows" aria-label="Unified accounts">
            {ROWS.map((r) => (
              <div className="phone-row" key={r.name}>
                <span className="phone-row-ico">{r.icon}</span>
                <span className="phone-row-name">{r.name}</span>
                <span className={`phone-row-amt ${r.neg ? "neg" : ""}`}>{r.amt}</span>
              </div>
            ))}
          </div>

          <AdvisorChat compact />

          <p className="phone-consent">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
              <rect x="3" y="7" width="10" height="7" rx="2" />
              <path d="M5.2 7V5.2a2.8 2.8 0 015.6 0V7" />
            </svg>
            AA consent · revoke anytime
          </p>
        </div>
      </div>
      <span className="phone-badge">FREE · हिंदी + English</span>
    </div>
  );
}
