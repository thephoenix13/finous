import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { editProductRoute, followUpRoute, opportunityRoute, ROUTES } from "./routes";
import { expectAccessible } from "./test/a11y";
import { renderConsole } from "./test/render";

/** Every address, and the heading its screen shows. A new route has to be added here, which is the point. */
const SCREENS: [string, string][] = [
  [ROUTES.overview, "Overview"],
  [ROUTES.opportunities, "Opportunities"],
  [ROUTES.campaigns, "Campaigns"],
  [ROUTES.products, "Products"],
  [ROUTES.reports, "Reports"],
  [ROUTES.branding, "Branding and app"],
  [ROUTES.address, "Branding and app"],
  [ROUTES.languages, "Branding and app"],
  [ROUTES.integration, "Integration"],
  [ROUTES.mapping, "Integration"],
  [ROUTES.access, "Integration"],
  [ROUTES.team, "Team"],
  [ROUTES.invite, "Invite staff"],
  [ROUTES.compliance, "Compliance documents"],
  [ROUTES.consents, "Consent ledger"],
  [ROUTES.accessLog, "Staff access log"],
  [ROUTES.requests, "Customer requests"],
  [ROUTES.newProduct, "Add a product"],
  [editProductRoute("p1"), "Edit product"],
  [opportunityRoute("o1"), "Rohit K."],
  [followUpRoute("o1"), "Follow-up: Rohit K."],
  [ROUTES.billing, "Billing"],
  [ROUTES.help, "Help"],
];

describe("every route, as an Admin", () => {
  it.each(SCREENS)("%s opens, has one h1, and passes the accessibility check", async (route, heading) => {
    const { container } = renderConsole({ route });
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeInTheDocument();
    // Wait for the screen's own data, so axe sees the loaded screen and not its placeholder.
    await screen.findByRole("heading", { level: 1, name: heading });
    expect(container.querySelectorAll("h1")).toHaveLength(1);
    await expectAccessible(container);
  });

  it("opens each sign-in screen without anyone signed in", async () => {
    const first = renderConsole({ as: null, route: ROUTES.signIn });
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
    first.unmount();
    renderConsole({ as: null, route: ROUTES.verify });
    // No email is waiting for a code, so it goes back to the first step.
    expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
  });

  it("sends every screen to sign-in when nobody is signed in", async () => {
    for (const [route] of SCREENS) {
      const { unmount } = renderConsole({ as: null, route });
      expect(await screen.findByRole("heading", { level: 1, name: "Sign in" })).toBeInTheDocument();
      unmount();
    }
  });
});
