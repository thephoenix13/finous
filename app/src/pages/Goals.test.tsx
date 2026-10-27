// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api, type Goal } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Goals from "./Goals";

/** The persona, with its goals changed. */
function withGoals(change: (goals: Goal[]) => Goal[]): Api {
  const base = createMockApi();
  return { ...base, listGoals: async (options) => change(await base.listGoals(options)) };
}

const loaded = () => screen.findAllByRole("link", { name: /funded|पूरा/ }).then(() => undefined);
const cards = () => screen.getAllByRole("listitem");

/** What the prototype's Goals screen shows, card by card. */
const PROTOTYPE = [
  { id: "home-upgrade", eyebrow: "Home upgrade · Dec 2027", of: "₹8,40,000 of ₹30,00,000", pct: "28% funded", needed: "about ₹1,35,000/mo needed" },
  { id: "emergency-fund", eyebrow: "Emergency fund · Mar 2027", of: "₹4,20,000 of ₹7,20,000", pct: "58% funded", needed: "about ₹50,000/mo needed" },
  { id: "daughters-education", eyebrow: "Daughter's education · Jun 2038", of: "₹6,20,000 of ₹50,00,000", pct: "12% funded", needed: "about ₹18,400/mo needed" },
] as const;

describe("Goals: first view (prototype Goals screen)", () => {
  it("says there are three active goals, funded from the linked accounts", async () => {
    renderWithI18n(<Goals />);
    await loaded();
    expect(screen.getByText("3 active goals. Funded from your linked accounts.")).toBeInTheDocument();
  });

  it("shows the three goals in order, each with its date, amounts, progress and what it needs a month", async () => {
    renderWithI18n(<Goals />);
    await loaded();
    expect(cards()).toHaveLength(3);
    PROTOTYPE.forEach((goal, i) => {
      const card = within(cards()[i]);
      expect(card.getByText(goal.eyebrow)).toBeInTheDocument();
      expect(card.getByText(goal.of)).toBeInTheDocument();
      expect(card.getByText(goal.pct)).toBeInTheDocument();
      expect(card.getByText(goal.needed)).toBeInTheDocument();
    });
  });

  it("links each goal to its own page", async () => {
    renderWithI18n(<Goals />);
    await loaded();
    expect(screen.getAllByRole("link", { name: /funded/ }).map((l) => l.getAttribute("href"))).toEqual(PROTOTYPE.map((g) => `/plans/goals/${g.id}`));
  });

  it("draws each bar to its percentage, and names it by its goal", async () => {
    renderWithI18n(<Goals />);
    await loaded();
    const bars = screen.getAllByRole("progressbar");
    expect(bars.map((b) => [b.getAttribute("aria-label"), b.getAttribute("aria-valuenow"), b.getAttribute("aria-valuetext")])).toEqual([
      ["Home upgrade funded", "28", "28%"],
      ["Emergency fund funded", "58", "58%"],
      ["Daughter's education funded", "12", "12%"],
    ]);
  });

  it("shows the monthly need to three figures: ₹1,34,827 reads ₹1,35,000, ₹18,364 reads ₹18,400", async () => {
    const api = createMockApi();
    const goals = await api.listGoals();
    expect(goals.map((g) => g.monthlyNeeded)).toEqual([134_827, 50_000, 18_364]); // what the Api says, to the rupee
    renderWithI18n(<Goals />);
    await loaded();
    expect(screen.queryByText(/134,827|18,364/)).not.toBeInTheDocument(); // not shown to the rupee
  });

  it("colours the list with the goal accent", async () => {
    const { container } = renderWithI18n(<Goals />);
    await loaded();
    expect(container.querySelector("[data-domain='goal']")).toBeInTheDocument();
  });

  it("has one h1, a Back link to the Plans tab, and no button: there is no 'new goal' to make yet", async () => {
    renderWithI18n(<Goals />);
    await loaded();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Goals");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Goals: when the goals are different", () => {
  it("says 'goal', in the singular, for one", async () => {
    renderWithI18n(<Goals />, { api: withGoals((all) => all.slice(0, 1)) });
    await loaded();
    expect(screen.getByText("1 active goal. Funded from your linked accounts.")).toBeInTheDocument();
    expect(cards()).toHaveLength(1);
  });

  it("says there are no goals, instead of an empty list", async () => {
    renderWithI18n(<Goals />, { api: withGoals(() => []) });
    expect(await screen.findByText("You have no goals yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(/active goal/)).not.toBeInTheDocument();
  });

  it("asks for nothing more once a goal is reached, and holds its bar full", async () => {
    renderWithI18n(<Goals />, { api: withGoals((all) => [{ ...all[0], fundedAmount: 3_100_000, percentFunded: 103, monthlyNeeded: 0 }]) });
    await loaded();
    expect(screen.getByText("103% funded")).toBeInTheDocument();
    expect(screen.queryByText(/mo needed/)).not.toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("rounds whatever it needs to three figures, at any size", async () => {
    renderWithI18n(<Goals />, { api: withGoals((all) => [{ ...all[0], monthlyNeeded: 2_468_901 }, { ...all[1], monthlyNeeded: 987 }]) });
    await loaded();
    expect(screen.getByText("about ₹24,70,000/mo needed")).toBeInTheDocument();
    expect(screen.getByText("about ₹987/mo needed")).toBeInTheDocument();
  });
});

describe("Goals: reading the user's own data", () => {
  it("shows the loading block first, announced to assistive technology", () => {
    const stuck: Api = { ...createMockApi(), listGoals: () => new Promise<never>(() => {}) };
    renderWithI18n(<Goals />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Goals");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Goals />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(cards()).toHaveLength(3);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Goals: Hindi", () => {
  it("is translated: title, summary and each card's wording, with the amounts unchanged", async () => {
    renderWithI18n(<Goals />, { lng: "hi" });
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("लक्ष्य");
    expect(screen.getByText("3 सक्रिय लक्ष्य। आपके लिंक किए गए खातों से फंडेड।")).toBeInTheDocument();
    const home = within(cards()[0]);
    expect(home.getByText("Home upgrade · दिस॰ 2027 तक")).toBeInTheDocument(); // the goal's name is the user's own, so it stays as written
    expect(home.getByText("₹30,00,000 में से ₹8,40,000")).toBeInTheDocument();
    expect(home.getByText("28% पूरा")).toBeInTheDocument();
    expect(home.getByText("लगभग ₹1,35,000/माह चाहिए")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans");
  });

  it("writes the other two cards in Hindi too", async () => {
    renderWithI18n(<Goals />, { lng: "hi" });
    await loaded();
    expect(within(cards()[1]).getByText("लगभग ₹50,000/माह चाहिए")).toBeInTheDocument();
    expect(within(cards()[2]).getByText("लगभग ₹18,400/माह चाहिए")).toBeInTheDocument();
    expect(within(cards()[2]).getByText("Daughter's education · जून 2038 तक")).toBeInTheDocument();
  });

  it("covers no goals and an error in Hindi", async () => {
    const none = renderWithI18n(<Goals />, { lng: "hi", api: withGoals(() => []) });
    expect(await screen.findByText("अभी आपका कोई लक्ष्य नहीं है।")).toBeInTheDocument();
    none.unmount();

    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Goals />, { lng: "hi", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("यह लोड नहीं हो सका");
  });
});

describe("Goals: accessibility", () => {
  it.each([
    ["en", 3],
    ["en", 1],
    ["en", 0],
    ["hi", 3],
    ["hi", 0],
  ] as const)("has no accessibility violations in %s with %i goals", async (lng, count) => {
    const { container } = renderWithI18n(<Goals />, { lng, api: withGoals((all) => all.slice(0, count)) });
    if (count === 0) await screen.findByText(lng === "en" ? "You have no goals yet." : "अभी आपका कोई लक्ष्य नहीं है।");
    else await loaded();
    await expectAccessible(container);
  });
});
