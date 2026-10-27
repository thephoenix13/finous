// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api, type HealthScore } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import HealthBreakdown from "./HealthBreakdown";

function withHealth(change: (h: HealthScore) => HealthScore): Api {
  const base = createMockApi();
  return { ...base, getHealthScore: async (options) => change(await base.getHealthScore(options)) };
}

const loaded = (lng: "en" | "hi" = "en") => screen.findAllByRole("progressbar").then(() => screen.getByRole("region", { name: lng === "en" ? "What's dragging" : "क्या नीचे खींच रहा है" }));
const bars = () => screen.getAllByRole("progressbar");

/** What the prototype's Breakdown screen shows: each component's name, how full its bar is, and the value beside it. */
const PROTOTYPE = [
  ["Debt to income", "78", "24%"],
  ["Savings rate", "82", "22%"],
  ["Emergency fund", "58", "3.5 mo"],
  ["Card utilisation", "90", "6%"],
  ["Diversification", "64", "64%"],
  ["Repayment track", "96", "96%"],
] as const;

describe("HealthBreakdown: first view (prototype Breakdown screen)", () => {
  it("shows the six components, in order, each with its bar and its value", async () => {
    renderWithI18n(<HealthBreakdown />);
    await loaded();
    expect(bars()).toHaveLength(6);
    expect(bars().map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-valuenow"), b.getAttribute("aria-valuetext")])).toEqual(
      PROTOTYPE.map(([name, fill, value]) => [name, fill, value]),
    );
  });

  it("fills each bar to its score, not to its value", async () => {
    renderWithI18n(<HealthBreakdown />);
    await loaded();
    // Debt to income is 24%, but a low debt load is a good score, so its bar is 78% full.
    expect((bars()[0].firstElementChild as HTMLElement).style.width).toBe("78%");
    expect((bars()[2].firstElementChild as HTMLElement).style.width).toBe("58%");
  });

  it("also shows each name and value as text, for sighted users", async () => {
    renderWithI18n(<HealthBreakdown />);
    await loaded();
    for (const [name, , value] of PROTOTYPE) {
      const row = screen.getByText(name).closest("li")!;
      expect(within(row).getByText(value)).toBeInTheDocument();
    }
  });

  it("does not make assistive technology read each name and value twice", async () => {
    renderWithI18n(<HealthBreakdown />);
    await loaded();
    const row = screen.getByText("Savings rate").closest("li")!;
    expect(screen.getByText("Savings rate")).toHaveAttribute("aria-hidden", "true");
    expect(within(row).getByText("22%")).toHaveAttribute("aria-hidden", "true");
    expect(within(row).getByRole("progressbar", { name: "Savings rate" })).toHaveAttribute("aria-valuetext", "22%");
  });

  it("is a list of six", async () => {
    renderWithI18n(<HealthBreakdown />);
    await loaded();
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("says what is dragging: the emergency fund and diversification", async () => {
    renderWithI18n(<HealthBreakdown />);
    const region = await loaded();
    expect(region).toContainElement(screen.getByRole("heading", { level: 2, name: "What's dragging" }));
    expect(screen.getByText("Emergency fund and diversification.")).toBeInTheDocument();
  });

  it("has one h1 and a Back link to the score", async () => {
    renderWithI18n(<HealthBreakdown />);
    await loaded();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Breakdown");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans/health");
  });
});

describe("HealthBreakdown: when the figures are different", () => {
  it("rounds a percentage to a whole number, and shows months to one decimal", async () => {
    renderWithI18n(<HealthBreakdown />, {
      api: withHealth((h) => ({
        ...h,
        components: h.components.map((c) => (c.id === "debt-to-income" ? { ...c, value: 24.6 } : c.id === "emergency-fund" ? { ...c, value: 12.04 } : c)),
      })),
    });
    await loaded();
    expect(bars()[0]).toHaveAttribute("aria-valuetext", "25%");
    expect(bars()[2]).toHaveAttribute("aria-valuetext", "12.0 mo");
  });

  it("holds a bar to the ends when a score is out of range", async () => {
    renderWithI18n(<HealthBreakdown />, {
      api: withHealth((h) => ({ ...h, components: h.components.map((c, i) => (i === 0 ? { ...c, score: 140 } : i === 1 ? { ...c, score: -10 } : c)) })),
    });
    await loaded();
    expect(bars()[0]).toHaveAttribute("aria-valuenow", "100");
    expect(bars()[1]).toHaveAttribute("aria-valuenow", "0");
  });

  it("says nothing is dragging the score down, when nothing is", async () => {
    renderWithI18n(<HealthBreakdown />, { api: withHealth((h) => ({ ...h, drags: [] })) });
    await loaded();
    expect(screen.getByText("Nothing is dragging your score down.")).toBeInTheDocument();
  });

  it("names one drag, starting with a capital", async () => {
    renderWithI18n(<HealthBreakdown />, { api: withHealth((h) => ({ ...h, drags: ["diversification"] })) });
    await loaded();
    expect(screen.getByText("Diversification.")).toBeInTheDocument();
  });

  it("lists three drags with the English comma before 'and'", async () => {
    renderWithI18n(<HealthBreakdown />, { api: withHealth((h) => ({ ...h, drags: ["emergency-fund", "diversification", "savings-rate"] })) });
    await loaded();
    expect(screen.getByText("Emergency fund, diversification, and savings rate.")).toBeInTheDocument();
  });
});

describe("HealthBreakdown: reading the user's own data", () => {
  it("shows the loading block first", () => {
    const stuck: Api = { ...createMockApi(), getHealthScore: () => new Promise<never>(() => {}) };
    renderWithI18n(<HealthBreakdown />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Breakdown");
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<HealthBreakdown />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(bars()).toHaveLength(6);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("HealthBreakdown: Hindi", () => {
  it("names the six components in Hindi with the same bars and values", async () => {
    renderWithI18n(<HealthBreakdown />, { lng: "hi" });
    await loaded("hi");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ब्योरा");
    expect(bars().map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-valuenow"), b.getAttribute("aria-valuetext")])).toEqual([
      ["आय के मुकाबले कर्ज", "78", "24%"],
      ["बचत दर", "82", "22%"],
      ["आपातकालीन निधि", "58", "3.5 माह"],
      ["कार्ड का उपयोग", "90", "6%"],
      ["विविधीकरण", "64", "64%"],
      ["भुगतान का रिकॉर्ड", "96", "96%"],
    ]);
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans/health");
  });

  it("says what is dragging in Hindi, ending with the Hindi full stop", async () => {
    renderWithI18n(<HealthBreakdown />, { lng: "hi" });
    const region = await loaded("hi");
    expect(region).toContainElement(screen.getByRole("heading", { level: 2, name: "क्या नीचे खींच रहा है" }));
    expect(screen.getByText("आपातकालीन निधि और विविधीकरण।")).toBeInTheDocument();
  });

  it("says nothing is dragging in Hindi, and explains an error", async () => {
    const none = renderWithI18n(<HealthBreakdown />, { lng: "hi", api: withHealth((h) => ({ ...h, drags: [] })) });
    await loaded("hi");
    expect(screen.getByText("कोई भी चीज़ आपके स्कोर को नीचे नहीं खींच रही।")).toBeInTheDocument();
    none.unmount();

    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<HealthBreakdown />, { lng: "hi", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("यह लोड नहीं हो सका");
  });
});

describe("HealthBreakdown: accessibility", () => {
  it.each([
    ["en", ["emergency-fund", "diversification"]],
    ["en", []],
    ["hi", ["emergency-fund", "diversification"]],
    ["hi", []],
  ] as const)("has no accessibility violations in %s with drags %j", async (lng, drags) => {
    const { container } = renderWithI18n(<HealthBreakdown />, { lng, api: withHealth((h) => ({ ...h, drags: [...drags] })) });
    await loaded(lng);
    await expectAccessible(container);
  });
});
