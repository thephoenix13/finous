// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import EmiCalculator, { EMI_DEFAULTS } from "./EmiCalculator";

const slider = (name: string) => screen.getByRole("slider", { name }) as HTMLInputElement;
const setSlider = (name: string, value: number) => fireEvent.change(slider(name), { target: { value: String(value) } });
const rupees = (text: string | null | undefined) => Number((text ?? "").replace(/[^\d]/g, ""));

/** The value shown under a label, in either language. */
const figure = (label: string) => screen.getByText(label).nextElementSibling?.textContent;

const EN = { title: "EMI calculator", monthly: "Monthly EMI", principal: "Principal", interest: "Interest", total: "Total", loan: "Loan amount", rate: "Interest rate", tenure: "Tenure" };
const HI = { title: "EMI कैलकुलेटर", monthly: "मासिक EMI", principal: "मूलधन", interest: "ब्याज", total: "कुल", loan: "लोन की राशि", rate: "ब्याज दर", tenure: "अवधि" };

describe("EmiCalculator: first view (prototype EMI screen)", () => {
  it("starts on the persona's home loan: ₹62L at 8.9% for 17.5 years", () => {
    expect(EMI_DEFAULTS).toEqual({ principal: 6_200_000, ratePct: 8.9, years: 17.5 });
    renderWithI18n(<EmiCalculator />);
    expect(slider(EN.loan).value).toBe("6200000");
    expect(slider(EN.rate).value).toBe("8.9");
    expect(slider(EN.tenure).value).toBe("17.5");
  });

  it("shows ₹58,345 a month, ₹62,00,000 principal, ₹60,52,518 interest and ₹1,22,52,518 in all", () => {
    renderWithI18n(<EmiCalculator />);
    expect(figure(EN.monthly)).toBe("₹58,345");
    expect(figure(EN.principal)).toBe("₹62,00,000");
    expect(figure(EN.interest)).toBe("₹60,52,518");
    expect(figure(EN.total)).toBe("₹1,22,52,518");
  });

  it("has one h1, the screen title", () => {
    renderWithI18n(<EmiCalculator />, { route: "/plans/emi" });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
  });

  it("links Back to the Plans tab", () => {
    renderWithI18n(<EmiCalculator />);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });
});

describe("EmiCalculator: the sliders", () => {
  it("takes the prototype's ranges and steps", () => {
    renderWithI18n(<EmiCalculator />);
    const range = (name: string) => {
      const s = slider(name);
      return [s.min, s.max, s.step];
    };
    expect(range(EN.loan)).toEqual(["500000", "15000000", "50000"]);
    expect(range(EN.rate)).toEqual(["6", "14", "0.1"]);
    expect(range(EN.tenure)).toEqual(["1", "30", "0.5"]);
  });

  it("reads each value aloud the way it is shown", () => {
    renderWithI18n(<EmiCalculator />);
    expect(slider(EN.loan)).toHaveAttribute("aria-valuetext", "₹62,00,000");
    expect(slider(EN.rate)).toHaveAttribute("aria-valuetext", "8.9%");
    expect(slider(EN.tenure)).toHaveAttribute("aria-valuetext", "17.5 years");
  });

  it("recalculates when the loan, rate or tenure changes: ₹30L at 8.5% for 20 years is ₹26,035", () => {
    renderWithI18n(<EmiCalculator />);
    setSlider(EN.loan, 3_000_000);
    setSlider(EN.rate, 8.5);
    setSlider(EN.tenure, 20);
    expect(figure(EN.monthly)).toBe("₹26,035");
    expect(figure(EN.principal)).toBe("₹30,00,000");
    expect(figure(EN.interest)).toBe("₹32,48,327");
    expect(figure(EN.total)).toBe("₹62,48,327");
  });

  it("moves one slider at a time and leaves the others alone", () => {
    renderWithI18n(<EmiCalculator />);
    setSlider(EN.rate, 9.5);
    expect(slider(EN.loan).value).toBe("6200000");
    expect(slider(EN.tenure).value).toBe("17.5");
    expect(figure(EN.monthly)).not.toBe("₹58,345");
  });

  it("a higher rate or a longer tenure changes the EMI the right way", () => {
    renderWithI18n(<EmiCalculator />);
    const emi = () => rupees(figure(EN.monthly));
    const base = emi();
    setSlider(EN.rate, 10);
    expect(emi()).toBeGreaterThan(base);
    setSlider(EN.rate, 8.9);
    setSlider(EN.tenure, 25);
    expect(emi()).toBeLessThan(base);
  });

  it.each([
    ["the smallest loan, lowest rate, shortest tenure", 500_000, 6, 1, "₹43,033", "₹16,399", "₹5,16,399"],
    ["the largest loan, highest rate, longest tenure", 15_000_000, 14, 30, "₹1,77,731", "₹4,89,83,075", "₹6,39,83,075"],
    ["a tenure of a year and a half", 1_000_000, 12, 1.5, "₹60,982", "₹97,677", "₹10,97,677"],
  ])("handles %s", (_, loan, rate, years, monthly, interest, total) => {
    renderWithI18n(<EmiCalculator />);
    setSlider(EN.loan, loan);
    setSlider(EN.rate, rate);
    setSlider(EN.tenure, years);
    expect(figure(EN.monthly)).toBe(monthly);
    expect(figure(EN.interest)).toBe(interest);
    expect(figure(EN.total)).toBe(total);
  });

  it("always shows principal plus interest equal to the total, to the rupee", () => {
    renderWithI18n(<EmiCalculator />);
    for (const [loan, rate, years] of [[777_000, 7.3, 13.5], [4_450_000, 9.1, 7], [12_350_000, 11.7, 28.5], [650_000, 6.4, 2]] as const) {
      setSlider(EN.loan, loan);
      setSlider(EN.rate, rate);
      setSlider(EN.tenure, years);
      expect(rupees(figure(EN.principal)) + rupees(figure(EN.interest))).toBe(rupees(figure(EN.total)));
    }
  });
});

describe("EmiCalculator: tenure wording", () => {
  it.each([
    [1, "1 year"],
    [1.5, "1.5 years"],
    [2, "2 years"],
    [17.5, "17.5 years"],
    [30, "30 years"],
  ])("says %s as %j in English", (years, shown) => {
    renderWithI18n(<EmiCalculator />);
    setSlider(EN.tenure, years);
    expect(slider(EN.tenure)).toHaveAttribute("aria-valuetext", shown);
  });

  it.each([
    [1, "1 वर्ष"],
    [17.5, "17.5 वर्ष"],
    [30, "30 वर्ष"],
  ])("says %s as %j in Hindi", (years, shown) => {
    renderWithI18n(<EmiCalculator />, { lng: "hi" });
    setSlider(HI.tenure, years);
    expect(slider(HI.tenure)).toHaveAttribute("aria-valuetext", shown);
  });
});

describe("EmiCalculator: Hindi", () => {
  it("is fully translated: title, labels and sliders", () => {
    renderWithI18n(<EmiCalculator />, { lng: "hi" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(HI.title);
    for (const label of [HI.monthly, HI.principal, HI.interest, HI.total]) expect(screen.getByText(label)).toBeInTheDocument();
    for (const name of [HI.loan, HI.rate, HI.tenure]) expect(slider(name)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });

  it("shows the same amounts as English, in Indian digit grouping", () => {
    renderWithI18n(<EmiCalculator />, { lng: "hi" });
    expect(figure(HI.monthly)).toBe("₹58,345");
    expect(figure(HI.principal)).toBe("₹62,00,000");
    expect(figure(HI.total)).toBe("₹1,22,52,518");
  });

  it("recalculates in Hindi too", () => {
    renderWithI18n(<EmiCalculator />, { lng: "hi" });
    setSlider(HI.loan, 3_000_000);
    setSlider(HI.rate, 8.5);
    setSlider(HI.tenure, 20);
    expect(figure(HI.monthly)).toBe("₹26,035");
  });
});

describe("EmiCalculator: accessibility", () => {
  it("announces the result politely as it changes, and as a whole", () => {
    renderWithI18n(<EmiCalculator />);
    const live = screen.getByText(EN.monthly).closest("[aria-live]");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveAttribute("aria-atomic", "true");
    expect(live).toContainElement(screen.getByText(EN.total));
  });

  it("keeps the results out of the sliders' announcements, so each is read once", () => {
    renderWithI18n(<EmiCalculator />);
    expect(slider(EN.loan).closest("[aria-live]")).toBeNull();
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<EmiCalculator />, { lng });
    await expectAccessible(container);
  });
});
