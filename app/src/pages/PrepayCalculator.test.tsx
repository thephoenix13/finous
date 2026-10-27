// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type AccountsOverview, type Api } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import PrepayCalculator from "./PrepayCalculator";

const EN = { title: "Prepay home loan", saved: "Interest saved", months: "Months saved", close: "New close", amount: "Prepay amount", where: "Where this sits" };
const HI = { title: "होम लोन का प्रीपेमेंट", saved: "बचा ब्याज", months: "बचे महीने", close: "नई अंतिम तारीख", amount: "प्रीपेमेंट राशि", where: "आपकी बचत पर असर" };

const ready = (name: string) => screen.findByRole("slider", { name });
const slider = (name: string) => screen.getByRole("slider", { name }) as HTMLInputElement;
const setAmount = (name: string, value: number) => fireEvent.change(slider(name), { target: { value: String(value) } });
/** The text under a label in the result card. */
const under = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
const rupees = (text: string | null | undefined) => Number((text ?? "").replace(/[^\d]/g, ""));

/** The mock persona, with the accounts changed. */
function withAccounts(change: (accounts: AccountsOverview) => AccountsOverview): Api {
  const base = createMockApi();
  return { ...base, listAccounts: async (options) => change(await base.listAccounts(options)) };
}

describe("PrepayCalculator: first view (prototype Prepay screen)", () => {
  it("shows ₹1,83,378 saved, 4 months sooner, closing Nov 2043, for a ₹50,000 prepayment", async () => {
    renderWithI18n(<PrepayCalculator />);
    await ready(EN.amount);
    expect(under(EN.saved)).toBe("₹1,83,378"); // not ₹1,83,382, which the bank's rounded EMI would give
    expect(under(EN.months)).toBe("4");
    expect(under(EN.close)).toBe("Nov 2043");
  });

  it("offers the prototype's slider: ₹10,000 to ₹2,00,000 in ₹10,000 steps, starting at ₹50,000", async () => {
    renderWithI18n(<PrepayCalculator />);
    await ready(EN.amount);
    const s = slider(EN.amount);
    expect([s.min, s.max, s.step, s.value]).toEqual(["10000", "200000", "10000", "50000"]);
    expect(s).toHaveAttribute("aria-valuetext", "₹50,000");
  });

  it("says where this leaves the savings: 3.1 months against a benchmark of 6", async () => {
    renderWithI18n(<PrepayCalculator />);
    await ready(EN.amount);
    expect(screen.getByRole("heading", { level: 2, name: EN.where })).toBeInTheDocument();
    expect(
      screen.getByText(
        "You have ₹4,20,000 in savings across 2 banks. Using ₹50,000 for prepayment leaves about 3.1 months of essential expenses (EMI, rent, food). The benchmark is 6 months.",
      ),
    ).toBeInTheDocument();
  });

  it("has one h1 and a Back link to the Plans tab", async () => {
    renderWithI18n(<PrepayCalculator />);
    await ready(EN.amount);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });
});

describe("PrepayCalculator: moving the slider", () => {
  it.each([
    [10_000, "₹37,231", "1", "Feb 2044", "3.4"],
    [100_000, "₹3,60,055", "8", "Jul 2043", "2.7"],
    [200_000, "₹6,94,774", "15", "Dec 2042", "1.8"],
  ])("a prepayment of %i saves %s and %s months, closing %s, leaving %s months of buffer", async (amount, saved, months, close, buffer) => {
    renderWithI18n(<PrepayCalculator />);
    await ready(EN.amount);
    setAmount(EN.amount, amount);
    expect(under(EN.saved)).toBe(saved);
    expect(under(EN.months)).toBe(months);
    expect(under(EN.close)).toBe(close);
    expect(screen.getByText(new RegExp(`leaves about ${buffer} months`))).toBeInTheDocument();
  });

  it("saves more interest and ends the loan sooner the more you prepay", async () => {
    renderWithI18n(<PrepayCalculator />);
    await ready(EN.amount);
    const read = () => [rupees(under(EN.saved)), Number(under(EN.months))];
    const [savedSmall, monthsSmall] = read();
    setAmount(EN.amount, 150_000);
    const [savedBig, monthsBig] = read();
    expect(savedBig).toBeGreaterThan(savedSmall);
    expect(monthsBig).toBeGreaterThan(monthsSmall);
  });

  it("shows the amount in the sentence and on the slider as you move it", async () => {
    renderWithI18n(<PrepayCalculator />);
    await ready(EN.amount);
    setAmount(EN.amount, 120_000);
    expect(slider(EN.amount)).toHaveAttribute("aria-valuetext", "₹1,20,000");
    expect(screen.getByText(/Using ₹1,20,000 for prepayment/)).toBeInTheDocument();
  });
});

describe("PrepayCalculator: reading the user's own data", () => {
  it("shows the loading block first, announced to assistive technology", () => {
    const stuck: Api = { ...createMockApi(), listAccounts: () => new Promise<never>(() => {}) };
    renderWithI18n(<PrepayCalculator />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title); // the header does not wait
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<PrepayCalculator />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await ready(EN.amount);
    expect(under(EN.saved)).toBe("₹1,83,378");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says there is no home loan, instead of showing a calculator for nothing", async () => {
    renderWithI18n(<PrepayCalculator />, { api: withAccounts((a) => ({ ...a, loans: [] })) });
    expect(await screen.findByText("We don't see a home loan in your linked accounts.")).toBeInTheDocument();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("calculates on the loan it is given: a different balance, rate and end date", async () => {
    const api = withAccounts((a) => ({ ...a, loans: [{ ...a.loans[0], outstanding: 3_000_000, ratePercent: 9.5, monthsLeft: 120, endsOn: "2036-09" }] }));
    renderWithI18n(<PrepayCalculator />, { api });
    await ready(EN.amount);
    // Worked by hand: ₹30L at 9.5% over 120 months is an EMI of ₹38,819; ₹50,000 extra saves 3.3 months and ₹77,643 of interest.
    expect(under(EN.saved)).toBe("₹77,643");
    expect(under(EN.months)).toBe("3");
    expect(under(EN.close)).toBe("Jun 2036");
  });

  it("builds the savings figure from every bank, and says 'bank' for one", async () => {
    renderWithI18n(<PrepayCalculator />, { api: withAccounts((a) => ({ ...a, bank: [a.bank[0]] })) });
    await ready(EN.amount);
    expect(screen.getByText(/You have ₹2,84,000 in savings in 1 bank\. Using ₹50,000/)).toBeInTheDocument();
  });

  it("never shows a negative buffer when the prepayment is more than the savings", async () => {
    renderWithI18n(<PrepayCalculator />, { api: withAccounts((a) => ({ ...a, bank: [{ ...a.bank[0], balance: 30_000 }] })) });
    await ready(EN.amount);
    expect(screen.getByText(/leaves about 0\.0 months/)).toBeInTheDocument();
  });

  it("keeps the slider within the loan, and copes with a prepayment that clears it", async () => {
    const api = withAccounts((a) => ({ ...a, loans: [{ ...a.loans[0], outstanding: 8_000, ratePercent: 12, monthsLeft: 12, endsOn: "2027-09" }] }));
    renderWithI18n(<PrepayCalculator />, { api });
    await ready(EN.amount);
    expect(slider(EN.amount).max).toBe("10000");
    expect(slider(EN.amount).value).toBe("10000"); // the start is held to the maximum
    expect(under(EN.months)).toBe("12");
    expect(under(EN.close)).toBe("Sep 2026");
    // The loan costs ₹8,529 in all; paying the ₹8,000 balance now saves the ₹529 of interest.
    expect(under(EN.saved)).toBe("₹529");
  });
});

describe("PrepayCalculator: Hindi", () => {
  it("is fully translated, with the date in Hindi and the amounts unchanged", async () => {
    renderWithI18n(<PrepayCalculator />, { lng: "hi" });
    await ready(HI.amount);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(HI.title);
    expect(screen.getByRole("heading", { level: 2, name: HI.where })).toBeInTheDocument();
    expect(under(HI.saved)).toBe("₹1,83,378");
    expect(under(HI.months)).toBe("4");
    expect(under(HI.close)).toBe("नव॰ 2043");
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });

  it("writes the sentence in Hindi, with the plural for two banks and for one", async () => {
    const two = renderWithI18n(<PrepayCalculator />, { lng: "hi" });
    await ready(HI.amount);
    expect(
      screen.getByText(
        "आपके पास 2 बैंकों में ₹4,20,000 की बचत है। प्रीपेमेंट के लिए ₹50,000 इस्तेमाल करने पर लगभग 3.1 महीने के ज़रूरी खर्च (EMI, किराया, खाना) बचते हैं। बेंचमार्क 6 महीने है।",
      ),
    ).toBeInTheDocument();
    two.unmount();

    renderWithI18n(<PrepayCalculator />, { lng: "hi", api: withAccounts((a) => ({ ...a, bank: [a.bank[0]] })) });
    await ready(HI.amount);
    expect(screen.getByText(/आपके पास 1 बैंक में ₹2,84,000 की बचत है/)).toBeInTheDocument();
  });

  it("recalculates in Hindi too", async () => {
    renderWithI18n(<PrepayCalculator />, { lng: "hi" });
    await ready(HI.amount);
    setAmount(HI.amount, 100_000);
    expect(under(HI.saved)).toBe("₹3,60,055");
    expect(under(HI.close)).toBe("जुल॰ 2043");
  });

  it("explains an error and the missing loan in Hindi", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    const failed = renderWithI18n(<PrepayCalculator />, { lng: "hi", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("यह लोड नहीं हो सका");
    expect(screen.getByRole("button", { name: "फिर कोशिश करें" })).toBeInTheDocument();
    failed.unmount();

    renderWithI18n(<PrepayCalculator />, { lng: "hi", api: withAccounts((a) => ({ ...a, loans: [] })) });
    expect(await screen.findByText("आपके लिंक किए गए खातों में कोई होम लोन नहीं दिखा।")).toBeInTheDocument();
  });
});

describe("PrepayCalculator: accessibility", () => {
  it("announces the result politely as the slider moves, and as a whole", async () => {
    renderWithI18n(<PrepayCalculator />);
    await ready(EN.amount);
    const live = screen.getByText(EN.saved).closest("[aria-live]");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveAttribute("aria-atomic", "true");
    expect(live).toContainElement(screen.getByText(EN.close));
    expect(slider(EN.amount).closest("[aria-live]")).toBeNull();
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s, once loaded", async (lng) => {
    const { container } = renderWithI18n(<PrepayCalculator />, { lng });
    await ready(lng === "en" ? EN.amount : HI.amount);
    await expectAccessible(container);
  });
});
