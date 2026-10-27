// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type AccountsOverview, type Api, type Insight, type RefinanceInsight } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import RefinanceCheck from "./RefinanceCheck";

const EN = { title: "Refinance check", saving: "Monthly saving", rate: "Your rate", market: "Market", breakEven: "Break-even", involves: "What this involves", fee: "Processing fee", docs: "Documentation", total: "Total upfront" };
const HI = { title: "रिफाइनेंस जाँच", saving: "मासिक बचत", rate: "आपकी दर", market: "बाज़ार", breakEven: "ब्रेक-ईवन", involves: "इसमें क्या शामिल है", fee: "प्रोसेसिंग शुल्क", docs: "दस्तावेज़ीकरण", total: "कुल शुरुआती खर्च" };

/** The text under a label in the result card. */
const under = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
/** The row a title sits in. */
const rowOf = (title: string) => screen.getByText(title).parentElement!.parentElement!;

/** The mock persona, with its accounts and/or insights changed. */
function withData({ accounts, insights }: { accounts?: (a: AccountsOverview) => AccountsOverview; insights?: (i: Insight[]) => Insight[] }): Api {
  const base = createMockApi();
  return {
    ...base,
    listAccounts: async (options) => {
      const all = await base.listAccounts(options);
      return accounts ? accounts(all) : all;
    },
    listInsights: async (options) => {
      const all = await base.listInsights(options);
      return insights ? insights(all) : all;
    },
  };
}
const withAccounts = (accounts: (a: AccountsOverview) => AccountsOverview) => withData({ accounts });
const withInsights = (insights: (i: Insight[]) => Insight[]) => withData({ insights });
/** The persona's refinance offer, with some fields changed. */
const offerWith = (change: Partial<RefinanceInsight>) => (insights: Insight[]) =>
  insights.map((i) => (i.kind === "refinance" ? { ...i, ...change } : i));

describe("RefinanceCheck: first view (prototype Refinance screen)", () => {
  it("shows ₹1,523 a month saved, your 8.9% against the market's 8.5%, and a 26-month break-even", async () => {
    renderWithI18n(<RefinanceCheck />);
    expect(await screen.findByText(EN.saving)).toBeInTheDocument();
    expect(under(EN.saving)).toBe("₹1,523");
    expect(under(EN.rate)).toBe("8.9%");
    expect(under(EN.market)).toBe("8.5%");
    expect(under(EN.breakEven)).toBe("26 mo");
  });

  it("lists what switching costs: ₹31,000 to process, ₹8,000 for documentation, ₹39,000 in all", async () => {
    renderWithI18n(<RefinanceCheck />);
    await screen.findByText(EN.involves);
    expect(within(rowOf(EN.fee)).getByText("₹31,000")).toBeInTheDocument();
    expect(within(rowOf(EN.fee)).getByText("About 0.5% of outstanding")).toBeInTheDocument();
    expect(within(rowOf(EN.docs)).getByText("₹8,000")).toBeInTheDocument();
    expect(within(rowOf(EN.docs)).getByText("Stamping, legal, valuation")).toBeInTheDocument();
    expect(within(rowOf(EN.total)).getByText("₹39,000")).toBeInTheDocument();
    expect(within(rowOf(EN.total)).getByText("Recovered in 26 months")).toBeInTheDocument();
  });

  it("has one h1, a labelled costs section, and a Back link to the Plans tab", async () => {
    renderWithI18n(<RefinanceCheck />);
    await screen.findByText(EN.involves);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
    expect(screen.getByRole("region", { name: EN.involves })).toContainElement(screen.getByText(EN.fee));
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });

  it("has no slider or button: it is a read-out, as in the prototype", async () => {
    renderWithI18n(<RefinanceCheck />);
    await screen.findByText(EN.involves);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("adds up on screen: the fee and the documentation make the total", async () => {
    renderWithI18n(<RefinanceCheck />);
    await screen.findByText(EN.involves);
    const amount = (title: string) => Number(within(rowOf(title)).getByText(/^₹/).textContent!.replace(/[^\d]/g, ""));
    expect(amount(EN.fee) + amount(EN.docs)).toBe(amount(EN.total));
  });
});

describe("RefinanceCheck: reading the user's own data", () => {
  it("shows the loading block first, announced to assistive technology", () => {
    const stuck: Api = { ...createMockApi(), listAccounts: () => new Promise<never>(() => {}) };
    renderWithI18n(<RefinanceCheck />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(EN.saving)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<RefinanceCheck />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    expect(screen.queryByText(EN.saving)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(EN.saving)).toBeInTheDocument();
    expect(under(EN.saving)).toBe("₹1,523");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says there is no home loan, instead of a refinance check for nothing", async () => {
    renderWithI18n(<RefinanceCheck />, { api: withAccounts((a) => ({ ...a, loans: [] })) });
    expect(await screen.findByText("We don't see a home loan in your linked accounts.")).toBeInTheDocument();
    expect(screen.queryByText(EN.saving)).not.toBeInTheDocument();
  });

  it("says switching would not help, when there is a loan but no refinance offer", async () => {
    renderWithI18n(<RefinanceCheck />, { api: withInsights((all) => all.filter((i) => i.kind !== "refinance")) });
    expect(await screen.findByText(/Switching wouldn't save you anything right now/)).toBeInTheDocument();
    expect(screen.queryByText(EN.saving)).not.toBeInTheDocument();
    expect(screen.queryByText("We don't see a home loan in your linked accounts.")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
  });

  it("ignores an offer made for some other loan", async () => {
    renderWithI18n(<RefinanceCheck />, { api: withInsights(offerWith({ loanId: "someone-elses-loan" })) });
    expect(await screen.findByText(/Switching wouldn't save you anything right now/)).toBeInTheDocument();
    expect(screen.queryByText(EN.saving)).not.toBeInTheDocument();
  });

  it("shows whatever offer it is given: other rates, costs and a one-month break-even", async () => {
    const api = withData({
      accounts: (a) => ({ ...a, loans: a.loans.map((l) => ({ ...l, outstanding: 4_000_000 })) }),
      insights: offerWith({
        monthlySaving: 2_500,
        currentRatePercent: 9.35,
        marketRatePercent: 8.1,
        breakEvenMonths: 1,
        costs: { processingFee: 24_000, documentation: 6_000 },
        upfrontCost: 30_000,
      }),
    });
    renderWithI18n(<RefinanceCheck />, { api });
    await screen.findByText(EN.saving);
    expect(under(EN.saving)).toBe("₹2,500");
    expect(under(EN.rate)).toBe("9.35%");
    expect(under(EN.market)).toBe("8.1%");
    expect(under(EN.breakEven)).toBe("1 mo");
    expect(within(rowOf(EN.fee)).getByText("₹24,000")).toBeInTheDocument();
    expect(within(rowOf(EN.fee)).getByText("About 0.6% of outstanding")).toBeInTheDocument(); // 24,000 of ₹40,00,000
    expect(within(rowOf(EN.total)).getByText("₹30,000")).toBeInTheDocument();
    expect(within(rowOf(EN.total)).getByText("Recovered in 1 month")).toBeInTheDocument(); // singular
  });
});

describe("RefinanceCheck: Hindi", () => {
  it("is fully translated, with the amounts and rates unchanged", async () => {
    renderWithI18n(<RefinanceCheck />, { lng: "hi" });
    expect(await screen.findByText(HI.saving)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(HI.title);
    expect(screen.getByRole("region", { name: HI.involves })).toBeInTheDocument();
    expect(under(HI.saving)).toBe("₹1,523");
    expect(under(HI.rate)).toBe("8.9%");
    expect(under(HI.market)).toBe("8.5%");
    expect(under(HI.breakEven)).toBe("26 माह");
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });

  it("writes the cost rows in Hindi", async () => {
    renderWithI18n(<RefinanceCheck />, { lng: "hi" });
    await screen.findByText(HI.involves);
    expect(within(rowOf(HI.fee)).getByText("₹31,000")).toBeInTheDocument();
    expect(within(rowOf(HI.fee)).getByText("बकाया राशि का लगभग 0.5%")).toBeInTheDocument();
    expect(within(rowOf(HI.docs)).getByText("स्टैम्प, कानूनी, वैल्यूएशन")).toBeInTheDocument();
    expect(within(rowOf(HI.total)).getByText("₹39,000")).toBeInTheDocument();
    expect(within(rowOf(HI.total)).getByText("26 महीने में वसूल")).toBeInTheDocument();
  });

  it("explains the error, the missing loan and the missing offer in Hindi", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    const failed = renderWithI18n(<RefinanceCheck />, { lng: "hi", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("यह लोड नहीं हो सका");
    failed.unmount();

    const noLoan = renderWithI18n(<RefinanceCheck />, { lng: "hi", api: withAccounts((a) => ({ ...a, loans: [] })) });
    expect(await screen.findByText("आपके लिंक किए गए खातों में कोई होम लोन नहीं दिखा।")).toBeInTheDocument();
    noLoan.unmount();

    renderWithI18n(<RefinanceCheck />, { lng: "hi", api: withInsights((all) => all.filter((i) => i.kind !== "refinance")) });
    expect(await screen.findByText(/अभी बदलने से कोई बचत नहीं होगी/)).toBeInTheDocument();
  });
});

describe("RefinanceCheck: accessibility", () => {
  it.each(["en", "hi"] as const)("has no accessibility violations in %s, once loaded", async (lng) => {
    const { container } = renderWithI18n(<RefinanceCheck />, { lng });
    await screen.findByText(lng === "en" ? EN.saving : HI.saving);
    await expectAccessible(container);
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s with no offer", async (lng) => {
    const { container } = renderWithI18n(<RefinanceCheck />, { lng, api: withInsights((all) => all.filter((i) => i.kind !== "refinance")) });
    await screen.findByText(lng === "en" ? /Switching wouldn't save/ : /अभी बदलने से/);
    await expectAccessible(container);
  });
});
