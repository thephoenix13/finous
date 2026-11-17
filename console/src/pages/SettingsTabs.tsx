import { NavLink } from "react-router";
import { cx } from "../lib/cx";
import { ROUTES } from "../routes";

const TABS = [
  { to: ROUTES.branding, label: "Branding" },
  { to: ROUTES.address, label: "Web address and install" },
  { to: ROUTES.languages, label: "Languages and advisor" },
];

/** The three screens under "Branding and app", side by side. */
export default function SettingsTabs() {
  return (
    <nav aria-label="Branding and app" className="mb-8 border-b border-line">
      <ul className="-mb-px flex flex-wrap gap-6">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink to={t.to} className={({ isActive }) => cx("block border-b-2 pb-3 text-[14px] font-medium", isActive ? "border-brand text-ink" : "border-transparent text-ink-2 hover:text-ink")}>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
