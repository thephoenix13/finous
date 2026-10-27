// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { inr, roundTo } from "../lib/format";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import GoalCalculator from "./GoalCalculator";

const EN = { title: "Goal calculator", monthly: "Monthly contribution", name: "House down payment", target: "Target amount", saved: "Already saved", rate: "Expected annual return", time: "Time available" };
const HI = { title: "लक्ष्य कैलकुलेटर", monthly: "मासिक योगदान", name: "घर का डाउन पेमेंट", target: "लक्ष्य राशि", saved: "अब तक की बचत", rate: "अपेक्षित सालाना रिटर्न", time: "उपलब्ध समय" };

const under = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
const rowOf = (title: string) => screen.getByText(title).parentElement!.parentElement!;

describe("GoalCalculator (prototype Goal calculator screen)", () => {
  it("says ₹31,400 a month, to reach ₹30,00,000 in 5 years", () => {
    renderWithI18n(<GoalCalculator />);
    expect(under(EN.monthly)).toBe("₹31,400");
    expect(screen.getByText("to reach ₹30,00,000 in 5 years")).toBeInTheDocument();
  });

  it("agrees with a hand calculation: ₹31,398.72 a month, shown to the nearest ₹100", () => {
    // Monthly compounding at 6% a year, contributions at month-end: c = (target - saved * g) / ((g - 1) / r).
    const r = 0.06 / 12;
    const g = (1 + r) ** 60;
    const exact = (3_000_000 - 600_000 * g) / ((g - 1) / r);
    expect(exact).toBeCloseTo(31_398.72, 2);
    renderWithI18n(<GoalCalculator />);
    expect(under(EN.monthly)).toBe(inr(roundTo(exact, 100)));
  });

  it("lists the goal's figures: ₹30,00,000 target, ₹6,00,000 saved, 6% return, 60 months", () => {
    renderWithI18n(<GoalCalculator />);
    expect(within(rowOf(EN.target)).getByText("₹30,00,000")).toBeInTheDocument();
    expect(within(rowOf(EN.target)).getByText("Target in 5 years")).toBeInTheDocument();
    expect(within(rowOf(EN.saved)).getByText("₹6,00,000")).toBeInTheDocument();
    expect(within(rowOf(EN.saved)).getByText("Set aside for this goal")).toBeInTheDocument();
    expect(within(rowOf(EN.rate)).getByText("6%")).toBeInTheDocument();
    expect(within(rowOf(EN.rate)).getByText("Assumed, not guaranteed")).toBeInTheDocument();
    expect(within(rowOf(EN.time)).getByText("60 months")).toBeInTheDocument();
    expect(within(rowOf(EN.time)).getByText("5 years")).toBeInTheDocument();
  });

  it("states how the estimate was made and that the return is not guaranteed", () => {
    renderWithI18n(<GoalCalculator />);
    expect(screen.getByText("Rounded estimate. Monthly compounding; contributions at month-end. Returns are assumed, not guaranteed.")).toBeInTheDocument();
  });

  it("names the goal as the heading of its figures", () => {
    renderWithI18n(<GoalCalculator />);
    expect(screen.getByRole("region", { name: EN.name })).toContainElement(screen.getByText(EN.target));
    expect(screen.getByRole("heading", { level: 2, name: EN.name })).toBeInTheDocument();
  });

  it("has one h1 and a Back link to the Plans tab", () => {
    renderWithI18n(<GoalCalculator />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(EN.title);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });

  it("is a read-out of one example: no slider, and no button that would claim to create a goal", () => {
    renderWithI18n(<GoalCalculator />);
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("needs no data, so it shows at once: no loading block", () => {
    renderWithI18n(<GoalCalculator />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(under(EN.monthly)).toBe("₹31,400");
  });
});

describe("GoalCalculator: Hindi", () => {
  it("is fully translated, with the amounts unchanged", () => {
    renderWithI18n(<GoalCalculator />, { lng: "hi" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(HI.title);
    expect(under(HI.monthly)).toBe("₹31,400");
    expect(screen.getByText("5 वर्ष में ₹30,00,000 तक पहुँचने के लिए")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: HI.name })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });

  it("writes the figures in Hindi", () => {
    renderWithI18n(<GoalCalculator />, { lng: "hi" });
    expect(within(rowOf(HI.target)).getByText("₹30,00,000")).toBeInTheDocument();
    expect(within(rowOf(HI.target)).getByText("5 वर्ष में लक्ष्य")).toBeInTheDocument();
    expect(within(rowOf(HI.saved)).getByText("₹6,00,000")).toBeInTheDocument();
    expect(within(rowOf(HI.saved)).getByText("इस लक्ष्य के लिए अलग रखी")).toBeInTheDocument();
    expect(within(rowOf(HI.rate)).getByText("6%")).toBeInTheDocument();
    expect(within(rowOf(HI.rate)).getByText("अनुमानित, गारंटीशुदा नहीं")).toBeInTheDocument();
    expect(within(rowOf(HI.time)).getByText("60 महीने")).toBeInTheDocument();
  });

  it("carries the footnote in Hindi", () => {
    renderWithI18n(<GoalCalculator />, { lng: "hi" });
    expect(screen.getByText("अनुमान, पूर्णांकित। मासिक चक्रवृद्धि; योगदान हर महीने के अंत में। रिटर्न अनुमानित हैं, गारंटीशुदा नहीं।")).toBeInTheDocument();
  });
});

describe("GoalCalculator: accessibility", () => {
  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<GoalCalculator />, { lng });
    await expectAccessible(container);
  });
});
