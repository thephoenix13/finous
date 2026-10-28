// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api, type TaxSummary } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Tax from "./Tax";

const EN = { title: "Tax · FY 2026–27", breakdown: "80C breakdown", health: "Section 80D · health insurance", homeLoan: "Section 24b · home loan interest", left: "What's left", progress: "Section 80C limit used" };
const HI = { title: "टैक्स · वित्त वर्ष 2026–27", breakdown: "80C का ब्योरा", health: "धारा 80D · स्वास्थ्य बीमा", homeLoan: "धारा 24b · होम लोन ब्याज", left: "अभी क्या बाकी है", progress: "धारा 80C की सीमा का उपयोग" };

const EYEBROW = "Section 80C · used ₹94,000 of ₹1,50,000";
const HI_EYEBROW = "धारा 80C · ₹1,50,000 में से ₹94,000 इस्तेमाल";

/** The persona, with the tax summary changed. */
function withTax(change: (tax: TaxSummary) => TaxSummary): Api {
  const base = createMockApi();
  return { ...base, getTaxSummary: async (options) => change(await base.getTaxSummary(options)) };
}
const using = (used: number) => withTax((t) => ({ ...t, section80C: { ...t.section80C, used } }));

const loaded = (lng: "en" | "hi" = "en") => screen.findByRole("region", { name: lng === "en" ? EN.breakdown : HI.breakdown });
const under = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
const rowOf = (title: string) => screen.getByText(title).parentElement!.parentElement!;
const bar = () => screen.getByRole("progressbar");

describe("Tax: first view (prototype Tax screen)", () => {
  it("is for financial year 2026–27", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
  });

  it("shows ₹56,000 left to invest in 80C, having used ₹94,000 of ₹1,50,000, before 31 March", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    expect(under(EYEBROW)).toBe("₹56,000");
    expect(screen.getByText("Left to invest before 31 March")).toBeInTheDocument();
  });

  it("draws the bar at 63% and says what it measures, in words", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    expect(screen.getByRole("progressbar", { name: EN.progress })).toHaveAttribute("aria-valuenow", "63");
    expect(bar()).toHaveAttribute("aria-valuetext", "₹94,000 of ₹1,50,000");
    expect((bar().firstElementChild as HTMLElement).style.width).toMatch(/^62\.6/);
  });

  it("says the 80C figures cover the whole financial year, including SIP instalments still to come", async () => {
    renderWithI18n(<Tax />);
    expect(await screen.findByText("For the whole financial year, including instalments still to come.")).toBeInTheDocument();
  });

  it("breaks 80C down: PPF ₹42,000, an ELSS SIP ₹30,000 and life insurance ₹22,000", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    const region = within(screen.getByRole("region", { name: EN.breakdown }));
    expect(within(rowOf("PPF contribution")).getByText("HDFC · auto-debit")).toBeInTheDocument();
    expect(within(rowOf("PPF contribution")).getByText("₹42,000")).toBeInTheDocument();
    expect(within(rowOf("ELSS SIP")).getByText("Parag Parikh Tax Saver · ₹2,500/month")).toBeInTheDocument();
    expect(within(rowOf("ELSS SIP")).getByText("₹30,000")).toBeInTheDocument();
    expect(within(rowOf("Life insurance premium")).getByText("HDFC Life · annual")).toBeInTheDocument();
    expect(within(rowOf("Life insurance premium")).getByText("₹22,000")).toBeInTheDocument();
    expect(region.getAllByText(/^₹/)).toHaveLength(3);
  });

  it("adds up on screen: the three items make the ₹94,000 used", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    const amount = (title: string) => Number(within(rowOf(title)).getByText(/^₹[\d,]+$/).textContent!.replace(/[^\d]/g, ""));
    expect(amount("PPF contribution") + amount("ELSS SIP") + amount("Life insurance premium")).toBe(94_000);
  });

  it("shows the health insurance: ₹14,000 against a ₹25,000 limit", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    expect(screen.getByRole("region", { name: EN.health })).toContainElement(screen.getByText("Self and family"));
    expect(within(rowOf("Self and family")).getByText("Limit ₹25,000")).toBeInTheDocument();
    expect(within(rowOf("Self and family")).getByText("₹14,000")).toBeInTheDocument();
  });

  it("deducts ₹2,00,000 of the ₹5,51,800 home loan interest paid, because of the cap", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    expect(screen.getByRole("region", { name: EN.homeLoan })).toContainElement(screen.getByText("Deductible interest"));
    expect(within(rowOf("Deductible interest")).getByText("₹5,51,800 paid · capped at ₹2,00,000")).toBeInTheDocument();
    expect(within(rowOf("Deductible interest")).getByText("₹2,00,000")).toHaveClass("text-positive");
  });

  it("says what is left, and what filling it would save: about ₹17,472 at the 30% bracket", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    expect(screen.getByRole("heading", { level: 2, name: EN.left })).toBeInTheDocument();
    expect(
      screen.getByText("₹56,000 in 80C room. Using the full ₹56,000 on an 80C option such as ELSS would save about ₹17,472 in tax at the 30% bracket. For information only."),
    ).toBeInTheDocument();
  });

  it("agrees with a hand calculation of that saving: ₹56,000 at 30% plus 4% cess", async () => {
    expect(56_000 * 0.3 * 1.04).toBeCloseTo(17_472, 6);
    renderWithI18n(<Tax />);
    await loaded();
    expect(screen.getByText(/would save about ₹17,472 in tax/)).toBeInTheDocument();
  });

  it("has one h1, four labelled sections' worth of content, and a Back link to the Plans tab", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("region")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });

  it("is a read-out: no slider and no button", async () => {
    renderWithI18n(<Tax />);
    await loaded();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Tax: when the figures are different", () => {
  it("shows no room, not a negative one, when 80C is used up exactly", async () => {
    renderWithI18n(<Tax />, { api: using(150_000) });
    await loaded();
    expect(under("Section 80C · used ₹1,50,000 of ₹1,50,000")).toBe("₹0");
    expect(screen.getByText("You've used the whole 80C limit. For information only.")).toBeInTheDocument();
    expect(screen.queryByText(/would save about/)).not.toBeInTheDocument();
    expect(bar()).toHaveAttribute("aria-valuenow", "100");
  });

  it("holds the bar full and the room at ₹0 when more than the limit has gone in", async () => {
    renderWithI18n(<Tax />, { api: using(160_000) });
    await loaded();
    expect(under("Section 80C · used ₹1,60,000 of ₹1,50,000")).toBe("₹0");
    expect(bar()).toHaveAttribute("aria-valuenow", "100");
    expect((bar().firstElementChild as HTMLElement).style.width).toBe("100%");
    expect(screen.getByText("You've used the whole 80C limit. For information only.")).toBeInTheDocument();
  });

  it("shows the whole limit as room, and an empty bar, when nothing has gone in", async () => {
    renderWithI18n(<Tax />, { api: withTax((t) => ({ ...t, section80C: { ...t.section80C, used: 0, items: [] } })) });
    await loaded();
    expect(under("Section 80C · used ₹0 of ₹1,50,000")).toBe("₹1,50,000");
    expect(bar()).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText(/₹1,50,000 in 80C room\. Using the full ₹1,50,000/)).toBeInTheDocument();
  });

  it("does not promise a saving at a 0% tax rate", async () => {
    renderWithI18n(<Tax />, { api: withTax((t) => ({ ...t, slabPercent: 0 })) });
    await loaded();
    expect(screen.getByText("₹56,000 in 80C room. For information only.")).toBeInTheDocument();
    expect(screen.queryByText(/would save about/)).not.toBeInTheDocument();
  });

  it("works the saving out at another rate: ₹56,000 at 20% plus cess is ₹11,648", async () => {
    renderWithI18n(<Tax />, { api: withTax((t) => ({ ...t, slabPercent: 20 })) });
    await loaded();
    expect(screen.getByText(/would save about ₹11,648 in tax at the 20% bracket/)).toBeInTheDocument();
  });

  it("does not say 'capped' when the interest paid is under the cap", async () => {
    renderWithI18n(<Tax />, { api: withTax((t) => ({ ...t, homeLoanInterest: { paid: 120_000, cap: 200_000, deductible: 120_000 } })) });
    await loaded();
    expect(within(rowOf("Deductible interest")).getByText("₹1,20,000 paid")).toBeInTheDocument();
    expect(within(rowOf("Deductible interest")).getByText("₹1,20,000", { selector: "span.text-positive" })).toBeInTheDocument();
    expect(screen.queryByText(/capped at/)).not.toBeInTheDocument();
  });

  it("lists whatever 80C items it is given, each described by how it is paid", async () => {
    const api = withTax((t) => ({
      ...t,
      section80C: {
        limit: 150_000,
        used: 60_000,
        items: [{ id: "elss", kind: "elss", provider: "Axis ELSS", amount: 60_000, schedule: "sip", monthlyAmount: 5_000 }],
      },
    }));
    renderWithI18n(<Tax />, { api });
    await loaded();
    expect(within(rowOf("ELSS SIP")).getByText("Axis ELSS · ₹5,000/month")).toBeInTheDocument();
    expect(screen.queryByText("PPF contribution")).not.toBeInTheDocument();
  });
});

describe("Tax: reading the user's own data", () => {
  it("shows the loading block first, with just 'Tax' as the title", () => {
    const stuck: Api = { ...createMockApi(), getTaxSummary: () => new Promise<never>(() => {}) };
    renderWithI18n(<Tax />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Tax$/);
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Tax />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Tax$/);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Tax: Hindi", () => {
  it("is translated: title, hero, date and bar", async () => {
    renderWithI18n(<Tax />, { lng: "hi" });
    await loaded("hi");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(HI.title);
    expect(under(HI_EYEBROW)).toBe("₹56,000");
    expect(screen.getByText("31 मार्च से पहले निवेश के लिए बाकी")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: HI.progress })).toHaveAttribute("aria-valuetext", "₹1,50,000 में से ₹94,000");
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });

  it("writes the breakdown in Hindi, with the providers as they are", async () => {
    renderWithI18n(<Tax />, { lng: "hi" });
    await loaded("hi");
    expect(within(rowOf("PPF योगदान")).getByText("HDFC · ऑटो-डेबिट")).toBeInTheDocument();
    expect(within(rowOf("ELSS SIP निवेश")).getByText("Parag Parikh Tax Saver · ₹2,500/महीना")).toBeInTheDocument();
    expect(within(rowOf("जीवन बीमा प्रीमियम")).getByText("HDFC Life · सालाना")).toBeInTheDocument();
    expect(within(rowOf("जीवन बीमा प्रीमियम")).getByText("₹22,000")).toBeInTheDocument();
  });

  it("writes the health and home loan sections in Hindi", async () => {
    renderWithI18n(<Tax />, { lng: "hi" });
    await loaded("hi");
    expect(screen.getByRole("region", { name: HI.health })).toBeInTheDocument();
    expect(within(rowOf("स्वयं और परिवार")).getByText("सीमा ₹25,000")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: HI.homeLoan })).toBeInTheDocument();
    expect(within(rowOf("कटौती योग्य ब्याज")).getByText("₹5,51,800 चुकाया · ₹2,00,000 पर सीमित")).toBeInTheDocument();
  });

  it("writes what is left in Hindi, in all three cases", async () => {
    const some = renderWithI18n(<Tax />, { lng: "hi" });
    await loaded("hi");
    expect(
      screen.getByText("80C में ₹56,000 की गुंजाइश है। पूरे ₹56,000 को ELSS जैसे किसी 80C विकल्प में लगाने पर 30% ब्रैकेट में लगभग ₹17,472 टैक्स बचेगा। सिर्फ़ जानकारी के लिए।"),
    ).toBeInTheDocument();
    some.unmount();

    const none = renderWithI18n(<Tax />, { lng: "hi", api: using(150_000) });
    await loaded("hi");
    expect(screen.getByText("आप 80C की पूरी सीमा इस्तेमाल कर चुके हैं। सिर्फ़ जानकारी के लिए।")).toBeInTheDocument();
    none.unmount();

    renderWithI18n(<Tax />, { lng: "hi", api: withTax((t) => ({ ...t, slabPercent: 0 })) });
    await loaded("hi");
    expect(screen.getByText("80C में ₹56,000 की गुंजाइश है। सिर्फ़ जानकारी के लिए।")).toBeInTheDocument();
  });

  it("explains an error in Hindi", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Tax />, { lng: "hi", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("यह लोड नहीं हो सका");
  });
});

describe("Tax: accessibility", () => {
  it.each([
    ["en", 94_000],
    ["en", 150_000],
    ["en", 160_000],
    ["hi", 94_000],
    ["hi", 150_000],
  ] as const)("has no accessibility violations in %s with ₹%i used", async (lng, used) => {
    const { container } = renderWithI18n(<Tax />, { lng, api: using(used) });
    await loaded(lng);
    await expectAccessible(container);
  });
});
