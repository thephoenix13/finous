// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createMockApi, type AccountsOverview, type Api } from "../api";
import { ROUTES } from "../routes";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Accounts from "./Accounts";
import Advisor from "./Advisor";
import AffordabilityCheck from "./AffordabilityCheck";
import CashFlow from "./CashFlow";
import Goals from "./Goals";
import Health from "./Health";
import HealthBreakdown from "./HealthBreakdown";
import Home from "./Home";
import PrepayCalculator from "./PrepayCalculator";
import Profile from "./Profile";
import Recap from "./Recap";
import Search from "./Search";

/**
 * A member who has just signed up has entered nothing. Each screen has to say what is missing and where to add it,
 * not show an error, a blank, or the email address as a name.
 */
const base = createMockApi();
const MORNING = new Date(2026, 8, 29, 9, 0);

const noFigures: Api = {
  ...base,
  getCashFlow: async () => {
    throw new ApiError("no_data");
  },
  getHealthScore: async () => {
    throw new ApiError("no_data");
  },
};
const none: AccountsOverview = { bank: [], loans: [], cards: [], investments: [], otherAssets: [] } as unknown as AccountsOverview;

describe("screens that need the monthly figures", () => {
  it.each([
    ["Cash flow", <CashFlow key="c" />, /cash flow fills in/],
    ["Recap", <Recap key="r" />, /recap fills in/],
    ["Health score", <Health key="h" />, /work out your score/],
    ["Health breakdown", <HealthBreakdown key="hb" />, /work out your score/],
    ["Can I afford it", <AffordabilityCheck key="a" />, /what you could afford/],
    ["Prepay", <PrepayCalculator key="p" />, /safety net/],
  ])("%s asks for them and links to where they go", async (_name, page, reason) => {
    renderWithI18n(page, { api: noFigures });
    expect(await screen.findByRole("heading", { name: "Add your monthly figures" })).toBeInTheDocument();
    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add monthly figures" })).toHaveAttribute("href", ROUTES.figures);
    expect(screen.queryByRole("button", { name: /try again|retry/i })).not.toBeInTheDocument();
  });

  it("says it in Hindi and is accessible", async () => {
    const { container } = renderWithI18n(<CashFlow />, { api: noFigures, lng: "hi" });
    expect(await screen.findByRole("heading", { name: "अपने मासिक आँकड़े जोड़ें" })).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("still shows a real failure as a failure with a retry", async () => {
    const api: Api = {
      ...base,
      getCashFlow: async () => {
        throw new ApiError("unavailable");
      },
    };
    renderWithI18n(<CashFlow />, { api });
    expect(await screen.findByRole("button", { name: /try again|retry/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add your monthly figures" })).not.toBeInTheDocument();
  });
});

describe("a member with no accounts", () => {
  const api: Api = { ...noFigures, listAccounts: async () => none, getNetWorthHistory: async () => ({ points: [] }) as never };

  it("sees a prompt to add the first account on the accounts screen", async () => {
    const { container } = renderWithI18n(<Accounts />, { api });
    expect(await screen.findByRole("heading", { name: "Add your first account" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add an account" })).toHaveAttribute("href", ROUTES.newAccount);
    await expectAccessible(container);
  });

  it("still lists the accounts of a member who has some", async () => {
    renderWithI18n(<Accounts />, { api: base });
    expect(await screen.findByText(/HDFC Bank/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Add your first account" })).not.toBeInTheDocument();
  });
});

describe("home for a new member", () => {
  const api: Api = {
    ...base,
    listAccounts: async () => none,
    getHome: async (o) => ({ ...(await base.getHome(o)), netWorth: { value: 0 }, month: undefined }),
    getProfile: async (o) => ({ ...(await base.getProfile(o)), firstName: "", name: "a@b.com", email: "a@b.com", city: "" }),
  };

  it("greets without a name and points at the first account", async () => {
    renderWithI18n(<Home now={MORNING} />, { api });
    expect(await screen.findByText("Good morning.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add an account" })).toHaveAttribute("href", ROUTES.newAccount);
    expect(screen.queryByRole("link", { name: "Add monthly figures" })).not.toBeInTheDocument();
  });

  it("asks for the monthly figures once there is an account but no figures", async () => {
    const withAccount: Api = { ...api, listAccounts: base.listAccounts };
    renderWithI18n(<Home now={MORNING} />, { api: withAccount });
    expect(await screen.findByRole("link", { name: "Add monthly figures" })).toHaveAttribute("href", ROUTES.figures);
    expect(screen.queryByRole("link", { name: "Add an account" })).not.toBeInTheDocument();
  });

  it("keeps the named greeting when there is a name, and no prompts for a complete member", async () => {
    renderWithI18n(<Home now={MORNING} />, { api: base });
    expect(await screen.findByText(/Good morning, Aarav/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Add an account" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Add monthly figures" })).not.toBeInTheDocument();
  });

  it("greets in Hindi without a name", async () => {
    renderWithI18n(<Home now={MORNING} />, { api, lng: "hi" });
    expect(await screen.findByText("सुप्रभात।")).toBeInTheDocument();
  });
});

describe("goals, search and profile", () => {
  it("offers to add the first goal", async () => {
    renderWithI18n(<Goals />, { api: { ...base, listGoals: async () => [] } });
    expect(await screen.findByRole("heading", { name: "Set your first goal" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a goal" })).toHaveAttribute("href", ROUTES.newGoal);
  });

  it("says there are no transactions yet, rather than that none match nothing", async () => {
    const api: Api = { ...base, listTransactions: async () => ({ items: [], total: 0 }) };
    renderWithI18n(<Search />, { api });
    expect(await screen.findByText("No transactions yet.")).toBeInTheDocument();
    expect(screen.queryByText(/match/)).not.toBeInTheDocument();
  });

  it("names the query when a search finds nothing", async () => {
    const api: Api = { ...base, listTransactions: async (q) => (q?.search ? { items: [], total: 0 } : base.listTransactions(q)) };
    renderWithI18n(<Search />, { api });
    await userEvent.type(await screen.findByRole("searchbox"), "zzzz");
    expect(await screen.findByText(/No transactions match “zzzz”/)).toBeInTheDocument();
  });

  it("shows a dash for a name that is only the email and for a missing city", async () => {
    const api: Api = { ...base, getProfile: async (o) => ({ ...(await base.getProfile(o)), name: "a@b.com", email: "a@b.com", city: "" }) };
    renderWithI18n(<Profile />, { api });
    const name = (await screen.findByText("Full name")).closest("div") as HTMLElement;
    const city = screen.getByText("City").closest("div") as HTMLElement;
    expect(city).toHaveTextContent("—");
    expect(name).toHaveTextContent("—");
    expect(name).not.toHaveTextContent("a@b.com");
  });

  it("shows a real name and city as they are", async () => {
    renderWithI18n(<Profile />, { api: base });
    expect(await screen.findByText("Aarav Mehta")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });
});

describe("advisor without monthly figures", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 503 })));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const ask = async (question: string, api: Api = noFigures) => {
    renderWithI18n(<Advisor />, { api });
    await userEvent.type(await screen.findByRole("textbox", { name: "Ask the advisor" }), `${question}{Enter}`);
  };

  it("loads, and asks for the figures on a spending question instead of calling the AI", async () => {
    await ask("What's my biggest expense this month?");
    expect(await screen.findByText(/I need your monthly figures/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add monthly figures" })).toHaveAttribute("href", ROUTES.figures);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does the same for 'can I afford', and for food", async () => {
    await ask("Can I afford a car?");
    expect(await screen.findByText(/I need your monthly figures/)).toBeInTheDocument();
  });

  it("still answers about a loan, which needs no figures", async () => {
    await ask("Should I prepay my home loan?");
    expect(await screen.findByText(/You owe ₹62,00,000 on HDFC Home Loan/)).toBeInTheDocument();
    expect(screen.queryByText(/I need your monthly figures/)).not.toBeInTheDocument();
  });

  it("answers in Hindi", async () => {
    renderWithI18n(<Advisor />, { api: noFigures, lng: "hi" });
    await userEvent.type(await screen.findByRole("textbox", { name: "सलाहकार से पूछें" }), "इस महीने मेरा सबसे बड़ा खर्च क्या है?{Enter}");
    expect(await screen.findByText(/मासिक आँकड़े चाहिए/)).toBeInTheDocument();
  });
});
