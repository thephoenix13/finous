// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import App from "../App";
import { ApiError, ApiProvider, createMockApi, type Api, type TaxSummary } from "../api";
import { createI18n, type Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Plans from "./Plans";

/** The tools, in the prototype's order, each with its title and subtitle in both languages. */
const TOOLS = [
  { href: "/plans/tax", en: ["Tax", "₹56,000 left in 80C"], hi: ["टैक्स", "80C में ₹56,000 बाकी"] },
  { href: "/plans/prepay", en: ["Prepay home loan", "What if I pay ₹50K extra"], hi: ["होम लोन का प्रीपेमेंट", "अगर मैं ₹50K ज़्यादा चुकाऊँ"] },
  { href: "/plans/refinance", en: ["Refinance check", "Should I switch my home loan"], hi: ["रिफाइनेंस जाँच", "क्या मुझे अपना होम लोन बदलना चाहिए"] },
  { href: "/plans/afford", en: ["Affordability check", "Can I buy a ₹40L car"], hi: ["खरीद की क्षमता की जाँच", "क्या मैं ₹40 लाख की कार खरीद सकता हूँ"] },
  { href: "/plans/goal-calc", en: ["Goal calculator", "How much to save each month"], hi: ["लक्ष्य कैलकुलेटर", "हर महीने कितना बचाना है"] },
  { href: "/plans/emi", en: ["EMI calculator", "Any loan, any rate"], hi: ["EMI कैलकुलेटर", "कोई भी लोन, कोई भी दर"] },
] as const;

const linkTo = (href: string) => screen.getAllByRole("link").find((l) => l.getAttribute("href") === href)!;
/** The Tax row's live subtitle arrives after a load; wait for it so no test ends mid-update. */
const settled = (lng: "en" | "hi" = "en") => screen.findByText(lng === "en" ? /left in 80C/ : /80C में .* बाकी/);

/** Wraps an Api so a test can wait for its tax call to finish, whether it succeeds or fails, and for the screen to react. */
function watchTax(api: Api) {
  let call: Promise<unknown> = Promise.resolve();
  return {
    api: { ...api, getTaxSummary: (options?: Parameters<Api["getTaxSummary"]>[0]) => (call = api.getTaxSummary(options)) } as Api,
    finished: async () => {
      await call.catch(() => {});
      await act(async () => {});
    },
  };
}

/** The mock persona, with its tax summary changed. */
function withTax(change: (tax: TaxSummary) => TaxSummary): Api {
  const base = createMockApi();
  return { ...base, getTaxSummary: async (options) => change(await base.getTaxSummary(options)) };
}

describe("Plans", () => {
  it.each(["en", "hi"] as const)("offers every tool in %s with its title and subtitle", async (lng) => {
    renderWithI18n(<Plans />, { lng });
    await settled(lng);
    for (const tool of TOOLS) {
      const [title, subtitle] = tool[lng];
      expect(linkTo(tool.href), tool.href).toHaveTextContent(title);
      expect(linkTo(tool.href), tool.href).toHaveTextContent(subtitle);
    }
  });

  it("lists the tools in the prototype's order: tax, prepay, refinance, affordability, goal, EMI", async () => {
    renderWithI18n(<Plans />);
    await settled();
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(TOOLS.map((t) => t.href));
  });

  it("keeps the Plans hero above the tools", async () => {
    renderWithI18n(<Plans />);
    await settled();
    expect(screen.getByRole("heading", { level: 1, name: "What do you want to figure out?" })).toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<Plans />, { lng });
    await settled(lng);
    await expectAccessible(container);
  });
});

describe("Plans: the Tax row's subtitle", () => {
  it("describes the screen while the figure loads, then says what is left in 80C", async () => {
    renderWithI18n(<Plans />, { api: { ...createMockApi(), getTaxSummary: () => new Promise<never>(() => {}) } });
    expect(linkTo("/plans/tax")).toHaveTextContent("Section 80C, 80D, home loan interest");
    expect(linkTo("/plans/tax")).not.toHaveTextContent("left in 80C");
  });

  it("shows ₹56,000 left once it is known", async () => {
    renderWithI18n(<Plans />);
    await settled();
    expect(linkTo("/plans/tax")).toHaveTextContent("₹56,000 left in 80C");
    expect(linkTo("/plans/tax")).not.toHaveTextContent("Section 80C, 80D");
  });

  it("goes on describing the screen if the figure cannot be loaded, and says nothing about the failure", async () => {
    const failing = createMockApi();
    failing.failNext(new ApiError("unavailable"));
    const { api, finished } = watchTax(failing);
    renderWithI18n(<Plans />, { api });
    await finished();
    expect(linkTo("/plans/tax")).toHaveTextContent("Section 80C, 80D, home loan interest");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("describes the screen, not '₹0 left', when the whole 80C limit is used", async () => {
    const { api, finished } = watchTax(withTax((t) => ({ ...t, section80C: { ...t.section80C, used: t.section80C.limit } })));
    renderWithI18n(<Plans />, { api });
    await finished();
    expect(linkTo("/plans/tax")).toHaveTextContent("Section 80C, 80D, home loan interest");
    expect(linkTo("/plans/tax")).not.toHaveTextContent("left in 80C");
  });

  it("follows the data: ₹1,00,000 used leaves ₹50,000", async () => {
    renderWithI18n(<Plans />, { api: withTax((t) => ({ ...t, section80C: { ...t.section80C, used: 100_000 } })) });
    expect(await screen.findByText(/₹50,000 left in 80C/)).toBeInTheDocument();
  });

  it("is written in Hindi too", async () => {
    renderWithI18n(<Plans />, { lng: "hi" });
    await settled("hi");
    expect(linkTo("/plans/tax")).toHaveTextContent("80C में ₹56,000 बाकी");
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

  it("opens the tax screen from the Plans tab, loads the year, and comes back with Back", async () => {
    const user = userEvent.setup();
    open("/plans");
    await user.click(screen.getByRole("link", { name: /Tax/ }));
    expect(window.location.pathname).toBe("/plans/tax");
    expect(await screen.findByRole("heading", { level: 1, name: "Tax · FY 2026–27" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: "Back" }));
    expect(window.location.pathname).toBe("/plans");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What do you want to figure out?");
    expect(await screen.findByText(/left in 80C/)).toBeInTheDocument();
  });

  it("loads the tax screen straight from a deep link, in Hindi", async () => {
    open("/plans/tax", "hi");
    expect(await screen.findByRole("heading", { level: 1, name: "टैक्स · वित्त वर्ष 2026–27" })).toBeInTheDocument();
  });

  it("opens the goal calculator from the Plans tab, and comes back with Back", async () => {
    const user = userEvent.setup();
    open("/plans");
    await user.click(screen.getByRole("link", { name: /Goal calculator/ }));
    expect(window.location.pathname).toBe("/plans/goal-calc");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Goal calculator");
    expect(screen.getByText("₹31,400")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Plans" })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("link", { name: "Back" }));
    expect(window.location.pathname).toBe("/plans");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("What do you want to figure out?");
  });

  it("loads the goal calculator straight from a deep link, in Hindi", () => {
    open("/plans/goal-calc", "hi");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("लक्ष्य कैलकुलेटर");
    expect(screen.getByText("₹31,400")).toBeInTheDocument();
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
