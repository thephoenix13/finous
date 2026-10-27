import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

const icon = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const TABS: { to: string; id: "home" | "advisor" | "plans" | "you"; end?: boolean; icon: ReactNode }[] = [
  { to: "/", id: "home", end: true, icon: icon(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /></>) },
  { to: "/advisor", id: "advisor", icon: icon(<path d="M21 12a8 8 0 0 1-8 8H7l-4 4v-4a8 8 0 0 1 8-8h2a8 8 0 0 1 8 0" />) },
  { to: "/plans", id: "plans", icon: icon(<><circle cx="12" cy="12" r="9" /><path d="m15 9-4 6-2-2 6-4" /></>) },
  { to: "/you", id: "you", icon: icon(<><circle cx="12" cy="8" r="4" /><path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" /></>) },
];

export default function TabBar() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("nav.label")} className="grid shrink-0 grid-cols-4 border-t border-line bg-page px-2 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `flex min-h-[56px] flex-col items-center justify-center gap-1 text-[10.5px] font-medium ${isActive ? "text-ink [&_svg]:stroke-[1.8]" : "text-ink-3"}`
          }
        >
          {tab.icon}
          <span>{t(`nav.${tab.id}`)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
