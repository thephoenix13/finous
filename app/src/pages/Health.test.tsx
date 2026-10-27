// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api, type HealthScore } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Health from "./Health";

/** The persona, with the health score changed. */
function withHealth(change: (h: HealthScore) => HealthScore): Api {
  const base = createMockApi();
  return { ...base, getHealthScore: async (options) => change(await base.getHealthScore(options)) };
}

const loaded = (lng: "en" | "hi" = "en") => screen.findByRole("link", { name: lng === "en" ? "See the six components" : "छह घटक देखें" });
/** The score under the hero's eyebrow. The same words are also the page title, so take the paragraph, not the heading. */
const under = (label: string) =>
  screen
    .getAllByText(label)
    .find((el) => el.tagName === "P")
    ?.nextElementSibling?.textContent;

describe("Health: first view (prototype Health score screen)", () => {
  it("shows 742, out of 900, up 18 points this month", async () => {
    renderWithI18n(<Health />);
    await loaded();
    expect(under("Health score")).toBe("742");
    expect(screen.getByText("Out of 900")).toBeInTheDocument();
    expect(screen.getByText("↑ 18 points this month")).toBeInTheDocument();
  });

  it("says where the user stands: the top 22% for the income band, and what is dragging", async () => {
    renderWithI18n(<Health />);
    await loaded();
    expect(screen.getByText("You're in the top 22% for your income band. The drags are emergency fund and diversification.")).toBeInTheDocument();
  });

  it("leads to the six components with a real link", async () => {
    renderWithI18n(<Health />);
    expect(await loaded()).toHaveAttribute("href", "/plans/health/breakdown");
  });

  it("has one h1 and a Back link to the Plans tab", async () => {
    renderWithI18n(<Health />);
    await loaded();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Health score");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });

  it("has no slider and no button: the one way on is the link", async () => {
    renderWithI18n(<Health />);
    await loaded();
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Health: when the figures are different", () => {
  it("shows another score, out of its own maximum, and another standing", async () => {
    renderWithI18n(<Health />, { api: withHealth((h) => ({ ...h, score: 810, outOf: 1000, topPercentForIncomeBand: 5 })) });
    await loaded();
    expect(under("Health score")).toBe("810");
    expect(screen.getByText("Out of 1000")).toBeInTheDocument();
    expect(screen.getByText(/in the top 5% for your income band/)).toBeInTheDocument();
  });

  it.each([
    [18, "↑ 18 points this month"],
    [1, "↑ 1 point this month"],
    [-5, "↓ 5 points this month"],
    [-1, "↓ 1 point this month"],
    [0, "No change this month"],
  ])("says a change of %i as %j", async (changeThisMonth, text) => {
    renderWithI18n(<Health />, { api: withHealth((h) => ({ ...h, changeThisMonth })) });
    await loaded();
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("says nothing is dragging the score down, when nothing is", async () => {
    renderWithI18n(<Health />, { api: withHealth((h) => ({ ...h, drags: [] })) });
    await loaded();
    expect(screen.getByText("You're in the top 22% for your income band. Nothing is dragging your score down.")).toBeInTheDocument();
    expect(screen.queryByText(/The drag/)).not.toBeInTheDocument();
  });

  it("says 'the drag is', in the singular, for one", async () => {
    renderWithI18n(<Health />, { api: withHealth((h) => ({ ...h, drags: ["diversification"] })) });
    await loaded();
    expect(screen.getByText(/The drag is diversification\./)).toBeInTheDocument();
  });

  it("lists three drags the way English does", async () => {
    renderWithI18n(<Health />, { api: withHealth((h) => ({ ...h, drags: ["emergency-fund", "diversification", "savings-rate"] })) });
    await loaded();
    expect(screen.getByText(/The drags are emergency fund, diversification, and savings rate\./)).toBeInTheDocument();
  });
});

describe("Health: reading the user's own data", () => {
  it("shows the loading block first, announced to assistive technology", () => {
    const stuck: Api = { ...createMockApi(), getHealthScore: () => new Promise<never>(() => {}) };
    renderWithI18n(<Health />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Health score");
    expect(screen.queryByText("Out of 900")).not.toBeInTheDocument();
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Health />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(under("Health score")).toBe("742");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Health: Hindi", () => {
  it("is translated: title, score, out of, change and the link", async () => {
    renderWithI18n(<Health />, { lng: "hi" });
    await loaded("hi");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("हेल्थ स्कोर");
    expect(under("हेल्थ स्कोर")).toBe("742");
    expect(screen.getByText("900 में से")).toBeInTheDocument();
    expect(screen.getByText("↑ इस महीने 18 अंक")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "छह घटक देखें" })).toHaveAttribute("href", "/plans/health/breakdown");
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });

  it("writes the standing and the drags in Hindi, joined with Hindi's own 'और'", async () => {
    renderWithI18n(<Health />, { lng: "hi" });
    await loaded("hi");
    expect(screen.getByText("आप अपने आय वर्ग में शीर्ष 22% में हैं। कमज़ोर पहलू हैं आपातकालीन निधि और विविधीकरण।")).toBeInTheDocument();
  });

  it("covers a falling score, no drags and one drag in Hindi", async () => {
    const down = renderWithI18n(<Health />, { lng: "hi", api: withHealth((h) => ({ ...h, changeThisMonth: -5, drags: [] })) });
    await loaded("hi");
    expect(screen.getByText("↓ इस महीने 5 अंक")).toBeInTheDocument();
    expect(screen.getByText(/कोई भी चीज़ आपके स्कोर को नीचे नहीं खींच रही।/)).toBeInTheDocument();
    down.unmount();

    const one = renderWithI18n(<Health />, { lng: "hi", api: withHealth((h) => ({ ...h, changeThisMonth: 0, drags: ["diversification"] })) });
    await loaded("hi");
    expect(screen.getByText("इस महीने कोई बदलाव नहीं")).toBeInTheDocument();
    expect(screen.getByText(/कमज़ोर पहलू है विविधीकरण।/)).toBeInTheDocument();
    one.unmount();
  });

  it("explains an error in Hindi", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Health />, { lng: "hi", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("यह लोड नहीं हो सका");
  });
});

describe("Health: accessibility", () => {
  it.each([
    ["en", 18, ["emergency-fund", "diversification"]],
    ["en", -5, []],
    ["en", 0, ["diversification"]],
    ["hi", 18, ["emergency-fund", "diversification"]],
    ["hi", -5, []],
  ] as const)("has no accessibility violations in %s with a change of %i and %j", async (lng, changeThisMonth, drags) => {
    const { container } = renderWithI18n(<Health />, { lng, api: withHealth((h) => ({ ...h, changeThisMonth, drags: [...drags] })) });
    await loaded(lng);
    await expectAccessible(container);
  });
});
