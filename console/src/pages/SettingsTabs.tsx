import { NavLink } from "react-router";
import { cx } from "../lib/cx";
import { ROUTES } from "../routes";

type Tab = { to: string; label: string; end?: boolean };

/** The screens inside one part of the settings, side by side. */
export function SectionTabs({ label, tabs }: { label: string; tabs: Tab[] }) {
  return (
    <nav aria-label={label} className="mb-8 border-b border-line">
      <ul className="-mb-px flex flex-wrap gap-6">
        {tabs.map((t) => (
          <li key={t.to}>
            <NavLink to={t.to} end={t.end} className={({ isActive }) => cx("block border-b-2 pb-3 text-[14px] font-medium", isActive ? "border-brand text-ink" : "border-transparent text-ink-2 hover:text-ink")}>
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** The three screens under "Branding and app". */
export default function SettingsTabs() {
  return (
    <SectionTabs
      label="Branding and app"
      tabs={[
        { to: ROUTES.branding, label: "Branding" },
        { to: ROUTES.address, label: "Web address and install" },
        { to: ROUTES.languages, label: "Languages and advisor" },
      ]}
    />
  );
}

/** The three screens under "Integration". */
export function IntegrationTabs() {
  return (
    <SectionTabs
      label="Integration"
      tabs={[
        { to: ROUTES.integration, label: "Data feed", end: true },
        { to: ROUTES.mapping, label: "Mapping and test" },
        { to: ROUTES.access, label: "Sign-in and API keys" },
      ]}
    />
  );
}

/** The four screens under "Compliance". */
export function ComplianceTabs() {
  return (
    <SectionTabs
      label="Compliance"
      tabs={[
        { to: ROUTES.compliance, label: "Documents", end: true },
        { to: ROUTES.consents, label: "Consent ledger" },
        { to: ROUTES.accessLog, label: "Staff access log" },
        { to: ROUTES.requests, label: "Customer requests" },
      ]}
    />
  );
}
