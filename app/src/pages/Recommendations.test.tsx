// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api } from "../api";
import type { Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import RecommendationDetail from "./RecommendationDetail";
import Recommendations from "./Recommendations";

const list = (lng: Language = "en", api?: Api) => renderWithI18n(<Recommendations />, { lng, api });
const detail = (id: string, lng: Language = "en", api?: Api) =>
  renderWithI18n(
    <Routes>
      <Route path="/plans/recommendations/:id" element={<RecommendationDetail />} />
    </Routes>,
    { route: `/plans/recommendations/${id}`, lng, api },
  );

const listLoaded = () => screen.findByText(/For information only|केवल जानकारी/);
const section = (name: string) => within(screen.getByRole("region", { name }));

describe("Recommendations (prototype recommendations)", () => {
  it("ranks the three insights in the Api's order, each a link to its own page", async () => {
    list();
    await listLoaded();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual([
      "/plans", // Back
      "/plans/recommendations/refi",
      "/plans/recommendations/fd",
      "/plans/recommendations/ef",
    ]);
  });

  it("gives each its reason and the one figure it is judged by", async () => {
    list();
    await listLoaded();
    const [refi, fd, ef] = screen.getAllByRole("listitem").map((li) => within(li));
    expect(refi.getByText("Your HDFC Home Loan rate is above market")).toBeInTheDocument();
    expect(refi.getByText("Save / year")).toBeInTheDocument();
    expect(fd.getByText("₹2,10,000 of your savings could earn more")).toBeInTheDocument();
    expect(fd.getByText("Gain / year")).toBeInTheDocument();
    expect(ef.getByText("Build your emergency fund")).toBeInTheDocument();
    expect(ef.getByText("Target")).toBeInTheDocument();
    expect(ef.getByText("₹7,20,000")).toBeInTheDocument();
  });

  it("carries the not-advice line, and goes Back to Plans", async () => {
    list();
    await listLoaded();
    expect(screen.getByText("For information only. Not investment advice. Rates and fees are indicative and may change.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });

  it("says so when there is nothing to recommend", async () => {
    const base = createMockApi();
    list("en", { ...base, listInsights: async () => [] });
    expect(await screen.findByText("Nothing to recommend right now.")).toBeInTheDocument();
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    list("en", api);
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await listLoaded();
  });
});

describe("RecommendationDetail: refinance", () => {
  it("says why: the rates and the monthly saving", async () => {
    detail("refi");
    await screen.findByRole("heading", { level: 2, name: "Why we're suggesting this" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Recommendation");
    expect(screen.getByText("Option to consider")).toBeInTheDocument();
    const why = section("Why we're suggesting this");
    expect(why.getByText("8.9%")).toBeInTheDocument();
    expect(why.getByText("8.5%")).toBeInTheDocument();
    expect(why.getByText("₹1,523")).toHaveClass("text-positive");
  });

  it("says what it costs, and when it is recovered", async () => {
    detail("refi");
    await screen.findByRole("heading", { level: 2, name: "What it costs" });
    const costs = section("What it costs");
    expect(costs.getByText("₹31,000")).toBeInTheDocument();
    expect(costs.getByText("₹8,000")).toBeInTheDocument();
    expect(costs.getByText("₹39,000")).toBeInTheDocument();
    expect(costs.getByText("Recovered in 26 months")).toBeInTheDocument();
  });

  it("opens the refinance check, or goes back with Not now", async () => {
    detail("refi");
    await screen.findByRole("heading", { level: 2, name: "What it costs" });
    expect(screen.getByRole("link", { name: "Open the refinance check" })).toHaveAttribute("href", "/plans/refinance");
    expect(screen.getByRole("link", { name: "Not now" })).toHaveAttribute("href", "/plans/recommendations");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans/recommendations");
  });
});

describe("RecommendationDetail: term deposit", () => {
  it("shows the rates, the extra a year, and what stays in savings; there is no tool to open", async () => {
    detail("fd");
    await screen.findByRole("heading", { level: 2, name: "What to know" });
    const why = section("Why we're suggesting this");
    expect(why.getByText("On ₹2,10,000")).toBeInTheDocument();
    expect(why.getByText("3%")).toBeInTheDocument();
    expect(why.getByText("7.1%")).toBeInTheDocument();
    const know = section("What to know");
    expect(know.getByText("12 months")).toBeInTheDocument();
    expect(know.getByText("₹2,10,000")).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/plans/recommendations", "/plans/recommendations"]);
    expect(screen.queryByRole("link", { name: /Open the/ })).not.toBeInTheDocument();
  });
});

describe("RecommendationDetail: emergency fund", () => {
  it("shows essentials, what is held and the gap, then the monthly amount and when it is reached", async () => {
    detail("ef");
    await screen.findByRole("heading", { level: 2, name: "What it takes" });
    const why = section("Why we're suggesting this");
    expect(why.getByText("₹1,19,145/month")).toBeInTheDocument();
    expect(why.getByText("₹4,20,000")).toBeInTheDocument();
    expect(why.getByText("Gap to 6 months")).toBeInTheDocument();
    expect(why.getByText("₹3,00,000")).toBeInTheDocument();
    const takes = section("What it takes");
    expect(takes.getByText("₹50,000")).toBeInTheDocument();
    expect(takes.getByText("Mar 2027")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open the goal calculator" })).toHaveAttribute("href", "/plans/goal-calc");
  });

  it("never shows a negative gap", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      listInsights: async (o) => (await base.listInsights(o)).map((i) => (i.kind === "emergency-fund" ? { ...i, heldAmount: 900_000 } : i)),
    };
    detail("ef", "en", api);
    await screen.findByRole("heading", { level: 2, name: "What it takes" });
    expect(section("Why we're suggesting this").getByText("₹0")).toBeInTheDocument();
  });
});

describe("RecommendationDetail: reading the user's own data", () => {
  it("says a recommendation that does not exist is not found, with no retry", async () => {
    detail("nope");
    expect(await screen.findByText("We couldn't find that recommendation.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the loading block first", () => {
    const stuck: Api = { ...createMockApi(), listInsights: () => new Promise<never>(() => {}) };
    detail("refi", "en", stuck);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("offers a retry when the data cannot be loaded", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    detail("refi", "en", api);
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
  });
});

describe("Recommendations: Hindi and accessibility", () => {
  it("is translated on the list and on a detail page", async () => {
    list("hi");
    await listLoaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("सुझाव");
    expect(screen.getByText("साल में बचत")).toBeInTheDocument();
  });

  it("is translated on the refinance page", async () => {
    detail("refi", "hi");
    await screen.findByRole("heading", { level: 2, name: "हम यह क्यों सुझा रहे हैं" });
    expect(screen.getByText("26 महीनों में वसूल")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "रीफ़ाइनेंस जाँच खोलें" })).toBeInTheDocument();
  });

  it.each([
    ["list", "en"],
    ["list", "hi"],
    ["refi", "en"],
    ["fd", "hi"],
    ["ef", "en"],
  ] as const)("has no accessibility violations: %s in %s", async (what, lng) => {
    const { container } = what === "list" ? list(lng) : detail(what, lng);
    await screen.findAllByRole("heading", { level: 1 });
    await screen.findAllByText(/₹/);
    await expectAccessible(container);
  });
});
