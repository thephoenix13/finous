// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { ApiProvider, createMockApi } from "../api";
import { createI18n, type Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Plans from "./Plans";

describe("Plans", () => {
  it.each([
    ["en", "EMI calculator", "Any loan, any rate"],
    ["hi", "EMI कैलकुलेटर", "कोई भी लोन, कोई भी दर"],
  ] as const)("offers the EMI calculator in %s", (lng, title, subtitle) => {
    renderWithI18n(<Plans />, { lng });
    const link = screen.getByRole("link", { name: new RegExp(title) });
    expect(link).toHaveAttribute("href", "/plans/emi");
    expect(link).toHaveTextContent(subtitle);
  });

  it.each([
    ["en", "Prepay home loan", "What if I pay ₹50K extra"],
    ["hi", "होम लोन का प्रीपेमेंट", "अगर मैं ₹50K ज़्यादा चुकाऊँ"],
  ] as const)("offers the prepay calculator in %s, ahead of the EMI calculator as in the prototype", (lng, title, subtitle) => {
    renderWithI18n(<Plans />, { lng });
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/plans/prepay");
    expect(links[0]).toHaveTextContent(title);
    expect(links[0]).toHaveTextContent(subtitle);
    expect(links[links.length - 1]).toHaveAttribute("href", "/plans/emi");
  });

  it.each([
    ["en", "Refinance check", "Should I switch my home loan"],
    ["hi", "रिफाइनेंस जाँच", "क्या मुझे अपना होम लोन बदलना चाहिए"],
  ] as const)("offers the refinance check in %s, between prepay and EMI as in the prototype", (lng, title, subtitle) => {
    renderWithI18n(<Plans />, { lng });
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/plans/prepay", "/plans/refinance", "/plans/afford", "/plans/emi"]);
    expect(links[1]).toHaveTextContent(title);
    expect(links[1]).toHaveTextContent(subtitle);
  });

  it.each([
    ["en", "Affordability check", "Can I buy a ₹40L car"],
    ["hi", "खरीद की क्षमता की जाँच", "क्या मैं ₹40 लाख की कार खरीद सकता हूँ"],
  ] as const)("offers the affordability check in %s, between refinance and EMI as in the prototype", (lng, title, subtitle) => {
    renderWithI18n(<Plans />, { lng });
    const links = screen.getAllByRole("link");
    expect(links[2]).toHaveAttribute("href", "/plans/afford");
    expect(links[2]).toHaveTextContent(title);
    expect(links[2]).toHaveTextContent(subtitle);
  });

  it("keeps the Plans hero above the tools", () => {
    renderWithI18n(<Plans />);
    expect(screen.getByRole("heading", { level: 1, name: "What do you want to figure out?" })).toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<Plans />, { lng });
    await expectAccessible(container);
  });
});

/** The whole app, from the Plans tab to the calculator and back. */
describe("Plans to EMI calculator, in the real app", () => {
  const open = (path: string, lng: Language = "en") => {
    window.history.pushState({}, "", path);
    return render(
      <I18nextProvider i18n={createI18n(lng)}>
        <ApiProvider api={createMockApi()}>
          <App />
        </ApiProvider>
      </I18nextProvider>,
    );
  };

  beforeEach(() => window.history.pushState({}, "", "/"));
  afterEach(() => window.history.pushState({}, "", "/"));

  it("opens the calculator from the Plans tab and comes back with Back", async () => {
    const user = userEvent.setup();
    open("/plans");
    await user.click(screen.getByRole("link", { name: /EMI calculator/ }));
    expect(window.location.pathname).toBe("/plans/emi");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("EMI calculator");
    expect(screen.getByText("₹58,345")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "Back" }));
    expect(window.location.pathname).toBe("/plans");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What do you want to figure out?");
  });

  it("opens the prepay calculator from the Plans tab, loads the loan, and comes back with Back", async () => {
    const user = userEvent.setup();
    open("/plans");
    await user.click(screen.getByRole("link", { name: /Prepay home loan/ }));
    expect(window.location.pathname).toBe("/plans/prepay");
    expect(await screen.findByRole("slider", { name: "Prepay amount" })).toBeInTheDocument();
    expect(screen.getByText("₹1,83,378")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: "Back" }));
    expect(window.location.pathname).toBe("/plans");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What do you want to figure out?");
  });

  it("opens the refinance check from the Plans tab, loads the offer, and comes back with Back", async () => {
    const user = userEvent.setup();
    open("/plans");
    await user.click(screen.getByRole("link", { name: /Refinance check/ }));
    expect(window.location.pathname).toBe("/plans/refinance");
    expect(await screen.findByText("Monthly saving")).toBeInTheDocument();
    expect(screen.getByText("₹1,523")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: "Back" }));
    expect(window.location.pathname).toBe("/plans");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What do you want to figure out?");
  });

  it("opens the affordability check from the Plans tab, loads the headroom, and comes back with Back", async () => {
    const user = userEvent.setup();
    open("/plans");
    await user.click(screen.getByRole("link", { name: /Affordability check/ }));
    expect(window.location.pathname).toBe("/plans/afford");
    expect(await screen.findByText("Assumptions")).toBeInTheDocument();
    expect(screen.getByText("Not yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: "Back" }));
    expect(window.location.pathname).toBe("/plans");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What do you want to figure out?");
  });

  it("loads the affordability check straight from a deep link, in Hindi", async () => {
    open("/plans/afford", "hi");
    expect(await screen.findByText("मान्यताएँ")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("खरीद की क्षमता");
  });

  it("loads the refinance check straight from a deep link, in Hindi", async () => {
    open("/plans/refinance", "hi");
    expect(await screen.findByText("मासिक बचत")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("रिफाइनेंस जाँच");
  });

  it("loads the prepay calculator straight from a deep link, in Hindi", async () => {
    open("/plans/prepay", "hi");
    expect(await screen.findByRole("slider", { name: "प्रीपेमेंट राशि" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("होम लोन का प्रीपेमेंट");
  });

  it("keeps the Plans tab highlighted on the calculator", () => {
    open("/plans/emi");
    expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("loads straight from a deep link", () => {
    open("/plans/emi");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("EMI calculator");
    expect(screen.getByRole("slider", { name: "Loan amount" })).toBeInTheDocument();
  });

  it("works in Hindi, tab bar included", () => {
    open("/plans/emi", "hi");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("EMI कैलकुलेटर");
    expect(screen.getByRole("link", { name: "योजनाएँ" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });
});
