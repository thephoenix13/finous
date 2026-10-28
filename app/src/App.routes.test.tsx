// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import appSource from "./App.tsx?raw";
import { ApiProvider, createMockApi } from "./api";
import { createI18n, type Language } from "./i18n";
import { expectAccessible } from "./test/a11y";

/** Every address a user can reach, with an address for each `:id` route. A new route in App.tsx fails the coverage test below until it is added. */
const ROUTES = [
  "/",
  "/welcome",
  "/welcome/consent",
  "/welcome/sync",
  "/advisor",
  "/accounts",
  "/accounts/hdfc",
  "/accounts/icici-cc",
  "/accounts/hdfc-home",
  "/notifications",
  "/recap",
  "/search",
  "/cash-flow",
  "/transactions/t3",
  "/plans",
  "/plans/recommendations",
  "/plans/recommendations/refi",
  "/plans/recommendations/fd",
  "/plans/recommendations/ef",
  "/plans/goals",
  "/plans/goals/home-upgrade",
  "/plans/health",
  "/plans/health/breakdown",
  "/plans/tax",
  "/plans/prepay",
  "/plans/refinance",
  "/plans/afford",
  "/plans/goal-calc",
  "/plans/emi",
  "/you",
  "/you/linked",
  "/you/consents",
  "/you/privacy",
  "/you/profile",
];

const toPattern = (route: string) => new RegExp(`^${route.replace(/:[^/]+/g, "[^/]+")}$`);

describe("Every route", () => {
  it("is covered: each route declared in App.tsx has an address in the list above", () => {
    const declared = [...appSource.matchAll(/<Route\s+(?:index|path="([^"]*)")/g)].map((m) => m[1]).filter((p) => p !== "*" && !p?.startsWith("dev/"));
    const declaredAddresses = declared.map((p) => (p === undefined ? "/" : `/${p}`));
    for (const route of declaredAddresses) {
      expect(ROUTES.some((address) => toPattern(route).test(address)), `no address covers ${route}`).toBe(true);
    }
    // And no address in the list is a route that has gone.
    for (const address of ROUTES) {
      expect(declaredAddresses.some((route) => toPattern(route).test(address)), `${address} matches no route`).toBe(true);
    }
  });
});

describe("Walking every route", () => {
  let errors: unknown[][];
  beforeEach(() => {
    errors = [];
    vi.spyOn(console, "error").mockImplementation((...args) => void errors.push(args));
    vi.spyOn(console, "warn").mockImplementation((...args) => void errors.push(args));
  });
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  const open = (route: string, lng: Language) => {
    window.history.pushState({}, "", route);
    return render(
      <I18nextProvider i18n={createI18n(lng)}>
        <ApiProvider api={createMockApi()}>
          <App />
        </ApiProvider>
      </I18nextProvider>,
    );
  };

  it.each(ROUTES.flatMap((route) => (["en", "hi"] as const).map((lng) => [route, lng] as const)))(
    "%s in %s: loads its data, has one h1, shows no error and logs nothing",
    async (route, lng) => {
      const { container, unmount } = open(route, lng);
      await screen.findByRole("heading", { level: 1 });
      await waitFor(() => expect(container.querySelector('[aria-busy="true"]')).toBeNull(), { timeout: 4000 });
      // Let the last updates land before judging.
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { level: 1 })).not.toHaveTextContent(createI18n(lng).t("notFound.title"));
      expect(errors).toEqual([]);
      await expectAccessible(container);
      unmount();
    },
    15000,
  );

  it("shows the not-found page for an address that is not a screen", async () => {
    const { unmount } = open("/no/such/page", "en");
    expect(await screen.findByRole("heading", { level: 1, name: "We couldn't find that page." })).toBeInTheDocument();
    expect(errors).toEqual([]);
    unmount();
  });
});
