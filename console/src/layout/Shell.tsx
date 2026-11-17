import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { useAuth, useSession } from "../auth/AuthProvider";
import { AREA_LABEL, canOpen, ROLE_LABEL, type Area } from "../lib/access";
import { cx } from "../lib/cx";
import { useOnline } from "../lib/useOnline";
import { ROUTES } from "../routes";
import { Button, Tag } from "../ui";
import { OfflineScreen } from "../ui/States";
import ErrorBoundary from "./ErrorBoundary";

type NavItem = { to: string; area: Area; label?: string; /** The address this item stays highlighted under. */ under: string };

const MAIN: NavItem[] = [
  { to: ROUTES.overview, area: "overview", under: "/" },
  { to: ROUTES.opportunities, area: "opportunities", under: ROUTES.opportunities },
  { to: ROUTES.campaigns, area: "campaigns", under: ROUTES.campaigns },
  { to: ROUTES.products, area: "products", under: ROUTES.products },
  { to: ROUTES.reports, area: "reports", under: ROUTES.reports },
];

const SETTINGS: NavItem[] = [
  { to: ROUTES.branding, area: "app", under: "/settings/app" },
  { to: ROUTES.integration, area: "integration", under: ROUTES.integration },
  { to: ROUTES.team, area: "team", under: ROUTES.team },
  { to: ROUTES.compliance, area: "compliance", under: ROUTES.compliance },
  { to: ROUTES.billing, area: "billing", under: ROUTES.billing },
  { to: ROUTES.help, area: "help", under: ROUTES.help },
];

/** The frame around every signed-in screen: sidebar, who is signed in, and the offline screen when there is no connection. */
export default function Shell() {
  const session = useSession();
  const { client } = useAuth();
  const { pathname } = useLocation();
  const { online, retry } = useOnline();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (item: NavItem) => (item.under === "/" ? pathname === "/" : pathname === item.under || pathname.startsWith(`${item.under}/`));

  const link = (item: NavItem) => (
    <li key={item.to}>
      <Link
        to={item.to}
        onClick={() => setMenuOpen(false)}
        aria-current={isActive(item) ? "page" : undefined}
        className={cx("block rounded-btn px-3 py-2 text-[14px]", isActive(item) ? "bg-tint font-semibold text-ink" : "text-ink-2 hover:bg-tint")}
      >
        {item.label ?? AREA_LABEL[item.area]}
      </Link>
    </li>
  );

  const visible = (items: NavItem[]) => items.filter((i) => canOpen(session.role, i.area));
  const settings = visible(SETTINGS);

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-btn focus:bg-surface focus:px-4 focus:py-2">
        Skip to the content
      </a>

      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 md:hidden">
        <span className="font-display text-[18px]">Finous</span>
        <button type="button" aria-expanded={menuOpen} aria-controls="console-nav" onClick={() => setMenuOpen((o) => !o)} className="h-11 rounded-btn border border-line px-4 text-[14px] font-medium">
          Menu
        </button>
      </div>

      <aside className={cx("border-r border-line bg-surface md:block md:w-[248px] md:shrink-0", menuOpen ? "block" : "hidden")}>
        <div className="flex h-full flex-col gap-6 px-4 py-6 md:sticky md:top-0 md:h-screen md:overflow-y-auto">
          <div className="hidden px-3 md:block">
            <p className="font-display text-[22px] leading-none">Finous</p>
            <p className="mt-1 text-[12px] text-ink-3">for institutions</p>
          </div>
          <nav id="console-nav" aria-label="Console">
            <ul className="space-y-0.5">{visible(MAIN).map(link)}</ul>
            {settings.length > 0 ? (
              <>
                <p className="mb-1 mt-6 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">Settings</p>
                <ul className="space-y-0.5">{settings.map(link)}</ul>
              </>
            ) : null}
          </nav>
          <div className="mt-auto space-y-3 border-t border-line px-3 pt-4">
            <div>
              <p className="text-[14px] font-medium">{session.name}</p>
              <p className="text-[12.5px] text-ink-3">{session.bank}</p>
              <div className="mt-1.5">
                <Tag>{ROLE_LABEL[session.role]}</Tag>
              </div>
            </div>
            <Button variant="ghost" fullWidth onClick={() => void client.signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      <main id="main" className="min-w-0 flex-1 px-4 py-8 md:px-10">
        <div className="mx-auto max-w-[1040px]">{online ? <ErrorBoundary><Outlet /></ErrorBoundary> : <OfflineScreen onRetry={() => void retry()} />}</div>
      </main>
    </div>
  );
}
