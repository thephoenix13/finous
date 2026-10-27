// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api, type Goal } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import GoalDetail from "./GoalDetail";

/** The persona, with one goal changed. */
function withGoal(id: string, change: (goal: Goal) => Goal): Api {
  const base = createMockApi();
  return { ...base, getGoal: async (goalId, options) => (goalId === id ? change(await base.getGoal(goalId, options)) : base.getGoal(goalId, options)) };
}

/** The screen at its real address, so the goal's id comes from the route as it does in the app. */
function show(id: string, options: Parameters<typeof renderWithI18n>[1] = {}) {
  return renderWithI18n(
    <>
      <Link to="/plans/goals/emergency-fund">Other goal</Link>
      <Routes>
        <Route path="/plans/goals/:id" element={<GoalDetail />} />
      </Routes>
    </>,
    { ...options, route: `/plans/goals/${id}` },
  );
}

const loaded = () => screen.findByText(/months? remaining|महीने? बाकी/);
const under = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
const rowOf = (title: string) => screen.getByText(title).parentElement!.parentElement!;

describe("GoalDetail: the home upgrade (prototype Goal detail screen)", () => {
  it("is titled by the goal, and shows ₹8,40,000 funded of a ₹30,00,000 target for Dec 2027", async () => {
    show("home-upgrade");
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Home upgrade");
    expect(under("Funded")).toBe("₹8,40,000");
    expect(screen.getByText("of ₹30,00,000 target · Dec 2027")).toBeInTheDocument();
  });

  it("draws the bar at 28%, with 15 months remaining", async () => {
    show("home-upgrade");
    await loaded();
    expect(screen.getByText("28% funded")).toBeInTheDocument();
    expect(screen.getByText("15 months remaining")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Home upgrade funded" })).toHaveAttribute("aria-valuenow", "28");
  });

  it("lists the three contributions: a fund, a recurring deposit and a savings top-up", async () => {
    show("home-upgrade");
    await loaded();
    const region = screen.getByRole("region", { name: "Contributions" });
    expect(region).toContainElement(screen.getByText("Groww — Parag Parikh Flexi Cap"));
    expect(within(rowOf("Groww — Parag Parikh Flexi Cap")).getByText("₹15,000/month since Apr 2024")).toBeInTheDocument();
    expect(within(rowOf("Groww — Parag Parikh Flexi Cap")).getByText("₹5,50,000")).toBeInTheDocument();
    expect(within(rowOf("HDFC — Recurring deposit")).getByText("₹10,000/month since Aug 2025")).toBeInTheDocument();
    expect(within(rowOf("HDFC — Recurring deposit")).getByText("₹1,50,000")).toBeInTheDocument();
    expect(within(rowOf("HDFC — Savings top-up")).getByText("One-time, Jan 2026")).toBeInTheDocument();
    expect(within(rowOf("HDFC — Savings top-up")).getByText("₹1,40,000")).toBeInTheDocument();
  });

  it("adds up on screen: the three contributions make the ₹8,40,000", async () => {
    show("home-upgrade");
    await loaded();
    const amounts = ["Groww — Parag Parikh Flexi Cap", "HDFC — Recurring deposit", "HDFC — Savings top-up"].map((t) =>
      Number(within(rowOf(t)).getByText(/^₹[\d,]+$/).textContent!.replace(/[^\d]/g, "")),
    );
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(840_000);
  });

  it("says it will fall short at today's ₹25,000 a month, and what it would take, at three figures", async () => {
    show("home-upgrade");
    await loaded();
    expect(screen.getByRole("heading", { level: 2, name: "On track?" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "At today's ₹25,000/month you'll reach about ₹12,90,000 by Dec 2027. Hitting ₹30,00,000 needs about ₹1,35,000/month. Moving the target to Dec 2029 brings that down to about ₹46,100/month. Assumes a 6% return.",
      ),
    ).toBeInTheDocument();
  });

  it("agrees with a hand calculation: ₹12,93,667 projected, ₹1,34,827 needed, ₹46,098 if two years later", async () => {
    const r = 0.06 / 12;
    const fv = (n: number) => 840_000 * (1 + r) ** n + 25_000 * (((1 + r) ** n - 1) / r);
    const need = (n: number) => (3_000_000 - 840_000 * (1 + r) ** n) / (((1 + r) ** n - 1) / r);
    expect(Math.round(fv(15))).toBe(1_293_667);
    expect(Math.round(need(15))).toBe(134_827);
    expect(Math.round(need(39))).toBe(46_098);
    show("home-upgrade");
    await loaded();
    expect(screen.getByText(/about ₹12,90,000 by/)).toBeInTheDocument();
    expect(screen.getByText(/needs about ₹1,35,000\/month/)).toBeInTheDocument();
    expect(screen.getByText(/about ₹46,100\/month/)).toBeInTheDocument();
  });

  it("has one h1, a Back link to the goals, and no button: there is no 'add to this goal' to do yet", async () => {
    show("home-upgrade");
    await loaded();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans/goals");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("GoalDetail: goals whose contributions the Api does not know", () => {
  it("shows the emergency fund with no contributions section, and says what it needs without claiming a projection", async () => {
    show("emergency-fund");
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Emergency fund");
    expect(under("Funded")).toBe("₹4,20,000");
    expect(screen.getByText("58% funded")).toBeInTheDocument();
    expect(screen.getByText("6 months remaining")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Contributions" })).not.toBeInTheDocument();
    expect(screen.getByText("Reaching ₹7,20,000 by Mar 2027 needs about ₹50,000/month. Assumes no return.")).toBeInTheDocument();
    expect(screen.queryByText(/At today's/)).not.toBeInTheDocument();
  });

  it("shows the education goal the same way, at its own return and a long horizon", async () => {
    show("daughters-education");
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Daughter's education");
    expect(screen.getByText("141 months remaining")).toBeInTheDocument();
    expect(screen.getByText("Reaching ₹50,00,000 by Jun 2038 needs about ₹18,400/month. Assumes a 6% return.")).toBeInTheDocument();
  });
});

describe("GoalDetail: when the outlook is different", () => {
  it("says the goal is on track, and what today's saving reaches, when it gets there in time", async () => {
    // Worked by hand: ₹8.4L plus ₹2,00,000 a month at 6% for 15 months is ₹40,12,563, shown as ₹40,10,000.
    show("home-upgrade", { api: withGoal("home-upgrade", (g) => ({ ...g, currentMonthlyContribution: 200_000 })) });
    await loaded();
    expect(screen.getByText("You're on track. At today's ₹2,00,000/month you'll reach about ₹40,10,000 by Dec 2027. Assumes a 6% return.")).toBeInTheDocument();
    expect(screen.queryByText(/needs about/)).not.toBeInTheDocument();
  });

  it("says the target is already reached, and asks for nothing", async () => {
    show("home-upgrade", { api: withGoal("home-upgrade", (g) => ({ ...g, fundedAmount: 3_100_000, percentFunded: 103, monthlyNeeded: 0 })) });
    await loaded();
    expect(screen.getByText("You've already reached ₹30,00,000.")).toBeInTheDocument();
    expect(screen.getByText("103% funded")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
    expect(screen.queryByText(/needs about/)).not.toBeInTheDocument();
  });

  it("shows no outlook, and does not fail, when the date has come", async () => {
    show("home-upgrade", { api: withGoal("home-upgrade", (g) => ({ ...g, monthsRemaining: 0 })) });
    await loaded();
    expect(screen.getByText("0 months remaining")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "On track?" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Contributions" })).toBeInTheDocument();
  });

  it("says '1 month remaining', in the singular", async () => {
    show("home-upgrade", { api: withGoal("home-upgrade", (g) => ({ ...g, monthsRemaining: 1 })) });
    expect(await screen.findByText("1 month remaining")).toBeInTheDocument();
  });

  it("leaves the contributions out when there are none, rather than showing an empty list", async () => {
    show("home-upgrade", { api: withGoal("home-upgrade", (g) => ({ ...g, contributions: [] })) });
    await loaded();
    expect(screen.queryByRole("region", { name: "Contributions" })).not.toBeInTheDocument();
  });
});

describe("GoalDetail: the goal in the address", () => {
  it("says the goal cannot be found, with no retry, when there is no such goal", async () => {
    show("no-such-goal");
    expect(await screen.findByText("We couldn't find that goal.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Goal");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans/goals");
  });

  it("loads the new goal when the address changes, without a page reload", async () => {
    show("home-upgrade");
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Home upgrade");
    await userEvent.click(screen.getByRole("link", { name: "Other goal" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Emergency fund" })).toBeInTheDocument();
    expect(under("Funded")).toBe("₹4,20,000");
  });
});

describe("GoalDetail: reading the user's own data", () => {
  it("shows the loading block first, with just 'Goal' as the title", () => {
    const stuck: Api = { ...createMockApi(), getGoal: () => new Promise<never>(() => {}) };
    show("home-upgrade", { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Goal$/);
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    show("home-upgrade", { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Home upgrade");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("GoalDetail: Hindi", () => {
  it("is translated: the hero, the months and the bar, with the goal's own name unchanged", async () => {
    show("home-upgrade", { lng: "hi" });
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Home upgrade");
    expect(under("जमा")).toBe("₹8,40,000");
    expect(screen.getByText("₹30,00,000 के लक्ष्य में से · दिस॰ 2027")).toBeInTheDocument();
    expect(screen.getByText("28% पूरा")).toBeInTheDocument();
    expect(screen.getByText("15 महीने बाकी")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/plans/goals");
  });

  it("words the three contributions in Hindi, with the fund's own name and the Hindi months", async () => {
    show("home-upgrade", { lng: "hi" });
    await loaded();
    expect(screen.getByRole("region", { name: "योगदान" })).toBeInTheDocument();
    expect(within(rowOf("Groww का Parag Parikh Flexi Cap")).getByText("अप्रैल 2024 से ₹15,000/माह")).toBeInTheDocument();
    expect(within(rowOf("HDFC — रिकरिंग डिपॉज़िट")).getByText("अग॰ 2025 से ₹10,000/माह")).toBeInTheDocument();
    expect(within(rowOf("HDFC — बचत में जमा")).getByText("एकमुश्त, जन॰ 2026")).toBeInTheDocument();
  });

  it("writes the outlook in Hindi, in each case", async () => {
    const behind = show("home-upgrade", { lng: "hi" });
    await loaded();
    expect(screen.getByRole("heading", { level: 2, name: "सही रास्ते पर?" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "आज के ₹25,000/माह पर आप दिस॰ 2027 तक लगभग ₹12,90,000 तक पहुँचेंगे। ₹30,00,000 तक पहुँचने के लिए लगभग ₹1,35,000/माह चाहिए। लक्ष्य को दिस॰ 2029 तक बढ़ाने पर यह घटकर लगभग ₹46,100/माह हो जाता है। 6% रिटर्न माना गया है।",
      ),
    ).toBeInTheDocument();
    behind.unmount();

    const unknown = show("emergency-fund", { lng: "hi" });
    await loaded();
    expect(screen.getByText("मार्च 2027 तक ₹7,20,000 तक पहुँचने के लिए लगभग ₹50,000/माह चाहिए। कोई रिटर्न नहीं माना गया।")).toBeInTheDocument();
    unknown.unmount();

    const ahead = show("home-upgrade", { lng: "hi", api: withGoal("home-upgrade", (g) => ({ ...g, currentMonthlyContribution: 200_000 })) });
    await loaded();
    expect(screen.getByText("आप सही रास्ते पर हैं। आज के ₹2,00,000/माह पर आप दिस॰ 2027 तक लगभग ₹40,10,000 तक पहुँचेंगे। 6% रिटर्न माना गया है।")).toBeInTheDocument();
    ahead.unmount();

    show("home-upgrade", { lng: "hi", api: withGoal("home-upgrade", (g) => ({ ...g, fundedAmount: 3_100_000, percentFunded: 103 })) });
    await loaded();
    expect(screen.getByText("आप ₹30,00,000 का लक्ष्य पहले ही पा चुके हैं।")).toBeInTheDocument();
  });

  it("says a goal cannot be found, and explains an error, in Hindi", async () => {
    const missing = show("no-such-goal", { lng: "hi" });
    expect(await screen.findByText("वह लक्ष्य नहीं मिला।")).toBeInTheDocument();
    missing.unmount();

    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    show("home-upgrade", { lng: "hi", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("यह लोड नहीं हो सका");
  });
});

describe("GoalDetail: accessibility", () => {
  it.each([
    ["en", "home-upgrade"],
    ["en", "emergency-fund"],
    ["hi", "home-upgrade"],
    ["hi", "daughters-education"],
  ] as const)("has no accessibility violations in %s for %s", async (lng, id) => {
    const { container } = show(id, { lng });
    await loaded();
    await expectAccessible(container);
  });

  it("has none when the goal is reached, or cannot be found", async () => {
    const reached = show("home-upgrade", { api: withGoal("home-upgrade", (g) => ({ ...g, fundedAmount: 3_100_000, percentFunded: 103 })) });
    await loaded();
    await expectAccessible(reached.container);
    reached.unmount();

    const { container } = show("no-such-goal");
    await screen.findByText("We couldn't find that goal.");
    await expectAccessible(container);
  });
});
