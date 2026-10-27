// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api, type HomeSummary } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Home from "./Home";

const MORNING = new Date(2026, 8, 29, 9, 0);
const AFTERNOON = new Date(2026, 8, 29, 14, 0);
const EVENING = new Date(2026, 8, 29, 20, 0);

/** The persona, with its home summary changed. */
function withHome(change: (home: HomeSummary) => HomeSummary): Api {
  const base = createMockApi();
  return { ...base, getHome: async (options) => change(await base.getHome(options)) };
}

const loaded = () => screen.findByRole("heading", { level: 1 });

describe("Home: first view (prototype Home screen)", () => {
  it("greets the user by first name, under the day and date", async () => {
    renderWithI18n(<Home now={MORNING} />);
    expect(await loaded()).toHaveTextContent("Good morning, Aarav.");
    expect(screen.getByText("Tuesday, 29 September")).toBeInTheDocument();
  });

  it("shows net worth and what it moved this month", async () => {
    renderWithI18n(<Home now={MORNING} />);
    await loaded();
    expect(screen.getByText("Net worth")).toBeInTheDocument();
    expect(screen.getByText("₹76,41,600")).toBeInTheDocument();
    expect(screen.getByText("↑ ₹1,24,000 this month")).toBeInTheDocument();
  });

  it("shows this month's money in, out and saved, and how saving compares with last month", async () => {
    renderWithI18n(<Home now={MORNING} />);
    await loaded();
    const month = within(screen.getByRole("region", { name: "This month" }));
    expect(month.getByText("In").nextSibling).toHaveTextContent("₹2,40,000");
    expect(month.getByText("Out").nextSibling).toHaveTextContent("₹1,86,400");
    expect(month.getByText("Saved").nextSibling).toHaveTextContent("₹53,600");
    expect(month.getByText("₹14,400 more than last month")).toBeInTheDocument();
  });

  it("shows the two things to look at, numbered, with the loan named and the figures from the Api", async () => {
    renderWithI18n(<Home now={MORNING} />);
    await loaded();
    const look = within(screen.getByRole("region", { name: "Look at this" }));
    expect(look.getByText("Your HDFC Home Loan rate is above market")).toBeInTheDocument();
    expect(look.getByText("Current 8.9%. Market offers 8.5%. Refinancing could save ₹1,523/month.")).toBeInTheDocument();
    expect(look.getByText("₹2,10,000 of your savings could earn more")).toBeInTheDocument();
    expect(look.getByText("Moving it to a term deposit could earn ₹8,610 more per year.")).toBeInTheDocument();
    expect(look.getByText("01")).toBeInTheDocument();
    expect(look.getByText("02")).toBeInTheDocument();
  });

  it("has one h1 and no button: nothing here writes anything", async () => {
    renderWithI18n(<Home now={MORNING} />);
    await loaded();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("links to all accounts", async () => {
    renderWithI18n(<Home now={MORNING} />);
    await loaded();
    expect(screen.getByRole("link", { name: "All accounts" })).toHaveAttribute("href", "/accounts");
  });

  it("draws no net-worth curve: the Api has no history to draw it from", async () => {
    const { container } = renderWithI18n(<Home now={MORNING} />);
    await loaded();
    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });
});

describe("Home: greeting by time of day", () => {
  it.each([
    [MORNING, "Good morning, Aarav."],
    [AFTERNOON, "Good afternoon, Aarav."],
    [EVENING, "Good evening, Aarav."],
    [new Date(2026, 8, 29, 11, 59), "Good morning, Aarav."],
    [new Date(2026, 8, 29, 12, 0), "Good afternoon, Aarav."],
    [new Date(2026, 8, 29, 16, 59), "Good afternoon, Aarav."],
    [new Date(2026, 8, 29, 17, 0), "Good evening, Aarav."],
  ])("at %s says %s", async (now, text) => {
    renderWithI18n(<Home now={now} />);
    expect(await loaded()).toHaveTextContent(text);
  });
});

describe("Home: when the figures are different", () => {
  it("says 'less than last month' and a falling net worth with its own arrow", async () => {
    renderWithI18n(<Home now={MORNING} />, {
      api: withHome((h) => ({ ...h, netWorth: { ...h.netWorth, changeThisMonth: -50_000 }, month: { ...h.month, savedChangeVsLastMonth: -3_200 } })),
    });
    await loaded();
    expect(screen.getByText("↓ ₹50,000 this month")).toBeInTheDocument();
    expect(screen.getByText("₹3,200 less than last month")).toBeInTheDocument();
  });

  it("says the same when saving did not change", async () => {
    renderWithI18n(<Home now={MORNING} />, { api: withHome((h) => ({ ...h, month: { ...h.month, savedChangeVsLastMonth: 0 } })) });
    await loaded();
    expect(screen.getByText("The same as last month")).toBeInTheDocument();
  });

  it("says nothing needs attention, instead of an empty list", async () => {
    renderWithI18n(<Home now={MORNING} />, { api: withHome((h) => ({ ...h, lookAt: [] })) });
    await loaded();
    expect(screen.getByText("Nothing needs your attention right now.")).toBeInTheDocument();
  });

  it("words an emergency-fund insight too, with the date its target is met", async () => {
    const base = createMockApi();
    const ef = (await base.listInsights()).find((i) => i.kind === "emergency-fund")!;
    renderWithI18n(<Home now={MORNING} />, { api: withHome((h) => ({ ...h, lookAt: [ef] })) });
    await loaded();
    expect(screen.getByText("Build your emergency fund")).toBeInTheDocument();
    expect(screen.getByText("You hold ₹4,20,000 of a ₹7,20,000 target. ₹50,000 a month gets you there by Mar 2027.")).toBeInTheDocument();
  });

  it("falls back to 'home loan' when the loan is not among the linked accounts", async () => {
    const base = createMockApi();
    renderWithI18n(<Home now={MORNING} />, { api: { ...base, listAccounts: async (o) => ({ ...(await base.listAccounts(o)), loans: [] }) } });
    await loaded();
    expect(screen.getByText("Your home loan rate is above market")).toBeInTheDocument();
  });
});

describe("Home: reading the user's own data", () => {
  it("shows the loading block first, announced to assistive technology", () => {
    const stuck: Api = { ...createMockApi(), getHome: () => new Promise<never>(() => {}) };
    renderWithI18n(<Home now={MORNING} />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Home now={MORNING} />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await loaded()).toHaveTextContent("Good morning, Aarav.");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Home: Hindi", () => {
  it("is translated throughout, with the amounts unchanged", async () => {
    renderWithI18n(<Home now={MORNING} />, { lng: "hi" });
    expect(await loaded()).toHaveTextContent("सुप्रभात, Aarav।");
    expect(screen.getByText("मंगलवार, 29 सितंबर")).toBeInTheDocument();
    expect(screen.getByText("नेट वर्थ")).toBeInTheDocument();
    expect(screen.getByText("↑ इस महीने ₹1,24,000")).toBeInTheDocument();
    expect(screen.getByText("पिछले महीने से ₹14,400 ज़्यादा")).toBeInTheDocument();
    expect(screen.getByText("आपके HDFC Home Loan की दर बाज़ार से ऊपर है")).toBeInTheDocument();
    expect(screen.getByText("अभी 8.9%। बाज़ार में 8.5% मिल रही है। रिफाइनेंस से हर महीने ₹1,523 बच सकते हैं।")).toBeInTheDocument();
    expect(screen.getByText("आपकी बचत का ₹2,10,000 ज़्यादा कमा सकता है")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "सभी खाते" })).toHaveAttribute("href", "/accounts");
  });

  it("greets in the afternoon and evening in Hindi", async () => {
    const afternoon = renderWithI18n(<Home now={AFTERNOON} />, { lng: "hi" });
    expect(await loaded()).toHaveTextContent("नमस्कार, Aarav।");
    afternoon.unmount();
    renderWithI18n(<Home now={EVENING} />, { lng: "hi" });
    expect(await loaded()).toHaveTextContent("शुभ संध्या, Aarav।");
  });
});

describe("Home: accessibility", () => {
  it.each([["en"], ["hi"]] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<Home now={MORNING} />, { lng });
    await loaded();
    await expectAccessible(container);
  });

  it("has none with nothing to look at, or a falling month", async () => {
    const { container } = renderWithI18n(<Home now={MORNING} />, {
      api: withHome((h) => ({ ...h, lookAt: [], netWorth: { ...h.netWorth, changeThisMonth: -1 }, month: { ...h.month, savedChangeVsLastMonth: -1 } })),
    });
    await loaded();
    await expectAccessible(container);
  });
});
