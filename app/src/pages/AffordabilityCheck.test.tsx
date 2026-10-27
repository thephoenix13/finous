// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import AffordabilityCheck from "./AffordabilityCheck";

const EN = { title: "Affordability", eyebrow: "A ₹40L car", notYet: "Not yet", yes: "Yes", assumptions: "Assumptions", down: "Down payment", loan: "Loan at 9.5%", outflow: "Total monthly outflow", headroom: "Your headroom" };
const HI = { title: "खरीद की क्षमता", eyebrow: "₹40 लाख की कार", notYet: "अभी नहीं", yes: "हाँ", assumptions: "मान्यताएँ", down: "डाउन पेमेंट", loan: "9.5% पर लोन", outflow: "कुल मासिक खर्च", headroom: "आपकी गुंजाइश" };

/** The persona, saving `saved` a month instead of ₹53,600. */
function savingA(saved: number): Api {
  const base = createMockApi();
  return { ...base, getCashFlow: async (options) => ({ ...(await base.getCashFlow(options)), saved }) };
}
const verdict = (eyebrow: string) => screen.getByText(eyebrow).nextElementSibling?.textContent;
const rowOf = (title: string) => screen.getByText(title).parentElement!.parentElement!;
const loaded = (lng: "en" | "hi" = "en") => screen.findByText(lng === "en" ? EN.assumptions : HI.assumptions);

describe("AffordabilityCheck: first view (prototype Affordability screen)", () => {
  it('says "Not yet" to a ₹40L car on ₹53,600 a month of headroom', async () => {
    renderWithI18n(<AffordabilityCheck />);
    await loaded();
    expect(verdict(EN.eyebrow)).toBe(EN.notYet);
  });

  it("says what is missing: ₹18,400 a month of headroom, or about ₹8.8L more down payment", async () => {
    renderWithI18n(<AffordabilityCheck />);
    await loaded();
    expect(screen.getByText("You'd need ₹18,400/month more headroom, or about ₹8.8L more down payment.")).toBeInTheDocument();
  });

  it("lists the assumptions: ₹8,00,000 down, a ₹67,200 EMI over 60 months at 9.5%, ₹72,000 a month with insurance", async () => {
    renderWithI18n(<AffordabilityCheck />);
    await loaded();
    expect(within(rowOf(EN.down)).getByText("₹8,00,000")).toBeInTheDocument();
    expect(within(rowOf(EN.down)).getByText("20% of ₹40L")).toBeInTheDocument();
    expect(within(rowOf(EN.loan)).getByText("₹67,200")).toBeInTheDocument();
    expect(within(rowOf(EN.loan)).getByText("60 months")).toBeInTheDocument();
    expect(within(rowOf(EN.outflow)).getByText("₹72,000")).toBeInTheDocument();
    expect(within(rowOf(EN.outflow)).getByText("Including insurance")).toBeInTheDocument();
  });

  it("compares the headroom with what the car needs, in a card of its own", async () => {
    renderWithI18n(<AffordabilityCheck />);
    await loaded();
    expect(screen.getByRole("heading", { level: 2, name: EN.headroom })).toBeInTheDocument();
    expect(
      screen.getByText("After EMIs, SIPs, and living expenses, you currently have ₹53,600/month free. A ₹40L car needs ₹72,000."),
    ).toBeInTheDocument();
  });

  it("has one h1, a labelled assumptions section and a Back link to the Plans tab", async () => {
    renderWithI18n(<AffordabilityCheck />);
    await loaded();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
    expect(screen.getByRole("region", { name: EN.assumptions })).toContainElement(screen.getByText(EN.down));
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });

  it("is a read-out, as in the prototype: no slider and no button", async () => {
    renderWithI18n(<AffordabilityCheck />);
    await loaded();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("AffordabilityCheck: when the answer is yes", () => {
  it('says "Yes" and what is left over each month', async () => {
    renderWithI18n(<AffordabilityCheck />, { api: savingA(100_000) });
    await loaded();
    expect(verdict(EN.eyebrow)).toBe(EN.yes);
    expect(screen.getByText("You'd still have about ₹28,000/month free after the car.")).toBeInTheDocument();
    expect(screen.queryByText(/more headroom/)).not.toBeInTheDocument();
  });

  it("shows the user's real headroom in the card, not the persona's", async () => {
    renderWithI18n(<AffordabilityCheck />, { api: savingA(100_000) });
    await loaded();
    expect(screen.getByText(/you currently have ₹1,00,000\/month free/)).toBeInTheDocument();
  });

  it("keeps the assumptions the same: they describe the car, not the user", async () => {
    renderWithI18n(<AffordabilityCheck />, { api: savingA(100_000) });
    await loaded();
    expect(within(rowOf(EN.loan)).getByText("₹67,200")).toBeInTheDocument();
    expect(within(rowOf(EN.outflow)).getByText("₹72,000")).toBeInTheDocument();
  });
});

describe("AffordabilityCheck: near the line", () => {
  it("is still a no at ₹72,000 a month, and shows the gap as ₹100, never ₹0", async () => {
    // The car needs ₹72,005.96 a month: ₹6 short. The shown gap has a floor of ₹100, and the down payment a floor of ₹0.1L.
    renderWithI18n(<AffordabilityCheck />, { api: savingA(72_000) });
    await loaded();
    expect(verdict(EN.eyebrow)).toBe(EN.notYet);
    expect(screen.getByText("You'd need ₹100/month more headroom, or about ₹0.1L more down payment.")).toBeInTheDocument();
  });

  it("is a yes at ₹72,006, the first whole rupee that covers it, with nothing to spare", async () => {
    renderWithI18n(<AffordabilityCheck />, { api: savingA(72_006) });
    await loaded();
    expect(verdict(EN.eyebrow)).toBe(EN.yes);
    expect(screen.getByText("You'd still have about ₹0/month free after the car.")).toBeInTheDocument();
  });

  it("is a yes at ₹73,000 with about ₹1,000 a month to spare", async () => {
    renderWithI18n(<AffordabilityCheck />, { api: savingA(73_000) });
    await loaded();
    expect(verdict(EN.eyebrow)).toBe(EN.yes);
    expect(screen.getByText("You'd still have about ₹1,000/month free after the car.")).toBeInTheDocument();
  });
});

describe("AffordabilityCheck: when no down payment could fix it", () => {
  it("asks only for headroom when the insurance alone is more than the user has", async () => {
    // ₹4,000 a month is less than the ₹4,800 of insurance, so even a car bought outright would not fit.
    renderWithI18n(<AffordabilityCheck />, { api: savingA(4_000) });
    await loaded();
    expect(verdict(EN.eyebrow)).toBe(EN.notYet);
    expect(screen.getByText("You'd need ₹68,000/month more headroom. A bigger down payment alone wouldn't cover it.")).toBeInTheDocument();
    expect(screen.queryByText(/more down payment/)).not.toBeInTheDocument();
  });

  it("copes with a user who spends more than they earn", async () => {
    renderWithI18n(<AffordabilityCheck />, { api: savingA(-10_000) });
    await loaded();
    expect(verdict(EN.eyebrow)).toBe(EN.notYet);
    expect(screen.getByText(/You'd need ₹82,000\/month more headroom\. A bigger down payment alone/)).toBeInTheDocument();
    expect(screen.getByText(/you currently have −₹10,000\/month free/)).toBeInTheDocument();
  });
});

describe("AffordabilityCheck: reading the user's own data", () => {
  it("shows the loading block first, announced to assistive technology", () => {
    const stuck: Api = { ...createMockApi(), getCashFlow: () => new Promise<never>(() => {}) };
    renderWithI18n(<AffordabilityCheck />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByText(EN.assumptions)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<AffordabilityCheck />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    expect(screen.queryByText(EN.assumptions)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(verdict(EN.eyebrow)).toBe(EN.notYet);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AffordabilityCheck: Hindi", () => {
  it("is fully translated, with the amounts unchanged", async () => {
    renderWithI18n(<AffordabilityCheck />, { lng: "hi" });
    await loaded("hi");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(HI.title);
    expect(verdict(HI.eyebrow)).toBe(HI.notYet);
    expect(screen.getByText("आपको हर महीने ₹18,400 और गुंजाइश चाहिए, या लगभग ₹8.8 लाख ज़्यादा डाउन पेमेंट।")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: HI.assumptions })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });

  it("writes the assumptions in Hindi", async () => {
    renderWithI18n(<AffordabilityCheck />, { lng: "hi" });
    await loaded("hi");
    expect(within(rowOf(HI.down)).getByText("₹8,00,000")).toBeInTheDocument();
    expect(within(rowOf(HI.down)).getByText("₹40 लाख का 20%")).toBeInTheDocument();
    expect(within(rowOf(HI.loan)).getByText("₹67,200")).toBeInTheDocument();
    expect(within(rowOf(HI.loan)).getByText("60 महीने")).toBeInTheDocument();
    expect(within(rowOf(HI.outflow)).getByText("₹72,000")).toBeInTheDocument();
    expect(within(rowOf(HI.outflow)).getByText("बीमा सहित")).toBeInTheDocument();
  });

  it("writes the headroom card in Hindi", async () => {
    renderWithI18n(<AffordabilityCheck />, { lng: "hi" });
    await loaded("hi");
    expect(screen.getByRole("heading", { level: 2, name: HI.headroom })).toBeInTheDocument();
    expect(
      screen.getByText("EMI, SIP और रोज़मर्रा के खर्चों के बाद आपके पास अभी हर महीने ₹53,600 बचते हैं। ₹40 लाख की कार के लिए ₹72,000 चाहिए।"),
    ).toBeInTheDocument();
  });

  it("answers yes in Hindi, and the case where only more headroom would help", async () => {
    const yes = renderWithI18n(<AffordabilityCheck />, { lng: "hi", api: savingA(100_000) });
    await loaded("hi");
    expect(verdict(HI.eyebrow)).toBe(HI.yes);
    expect(screen.getByText("कार के बाद भी आपके पास हर महीने लगभग ₹28,000 बचेंगे।")).toBeInTheDocument();
    yes.unmount();

    renderWithI18n(<AffordabilityCheck />, { lng: "hi", api: savingA(4_000) });
    await loaded("hi");
    expect(screen.getByText("आपको हर महीने ₹68,000 और गुंजाइश चाहिए। सिर्फ़ बड़ा डाउन पेमेंट इसे पूरा नहीं करेगा।")).toBeInTheDocument();
  });

  it("explains an error in Hindi", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<AffordabilityCheck />, { lng: "hi", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("यह लोड नहीं हो सका");
  });
});

describe("AffordabilityCheck: accessibility", () => {
  it.each([
    ["en", 53_600],
    ["en", 100_000],
    ["en", 4_000],
    ["hi", 53_600],
    ["hi", 100_000],
  ] as const)("has no accessibility violations in %s on a headroom of %i", async (lng, saved) => {
    const { container } = renderWithI18n(<AffordabilityCheck />, { lng, api: savingA(saved) });
    await loaded(lng);
    await expectAccessible(container);
  });
});
