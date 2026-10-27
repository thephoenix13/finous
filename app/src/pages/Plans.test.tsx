// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
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
        <App />
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
