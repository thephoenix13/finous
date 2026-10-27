import type { ReactNode } from "react";
import { NavLink } from "react-router";

const icon = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const TABS: { to: string; label: string; end?: boolean; icon: ReactNode }[] = [
  { to: "/", label: "Home", end: true, icon: icon(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /></>) },
  { to: "/advisor", label: "Advisor", icon: icon(<path d="M21 12a8 8 0 0 1-8 8H7l-4 4v-4a8 8 0 0 1 8-8h2a8 8 0 0 1 8 0" />) },
  { to: "/plans", label: "Plans", icon: icon(<><circle cx="12" cy="12" r="9" /><path d="m15 9-4 6-2-2 6-4" /></>) },
  { to: "/you", label: "You", icon: icon(<><circle cx="12" cy="8" r="4" /><path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" /></>) },
];

export default function TabBar() {
  return (
    <nav aria-label="Main" className="grid shrink-0 grid-cols-4 border-t border-line bg-page px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium ${isActive ? "text-ink [&_svg]:stroke-[1.8]" : "text-ink-3"}`
          }
        >
          {t.icon}
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
