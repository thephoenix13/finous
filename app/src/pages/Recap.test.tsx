// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type AccountsOverview, type Api, type CashFlow } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Recap from "./Recap";

const loaded = () => screen.findByRole("heading", { level: 2, name: "Spend by category" });

function withFlow(change: (f: CashFlow) => CashFlow): Api {
  const base = createMockApi();
  return { ...base, getCashFlow: async (o) => change(await base.getCashFlow(o)) };
}

describe("Recap (prototype September recap)", () => {
  it("is titled for the month, and leads with what was saved and how it compares", async () => {
    renderWithI18n(<Recap />);
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sep 2026 recap");
    expect(screen.getByText("Saved this month")).toBeInTheDocument();
    expect(screen.getByText("₹53,600")).toBeInTheDocument();
    expect(screen.getByText("₹14,400 more than last month")).toBeInTheDocument();
  });

  it("shows what came in and went out", async () => {
    renderWithI18n(<Recap />);
    await loaded();
    expect(screen.getByText("₹2,40,000")).toBeInTheDocument();
    expect(screen.getByText("₹1,86,400")).toBeInTheDocument();
  });

  it("says what changed: card utilisation and dining", async () => {
    renderWithI18n(<Recap />);
    await loaded();
    const changed = within(screen.getByRole("region", { name: "What changed" }));
    expect(changed.getByText("Card utilisation is 6%")).toBeInTheDocument();
    expect(changed.getByText("ICICI Amazon Pay outstanding is ₹18,400.")).toBeInTheDocument();
    expect(changed.getByText("Dining is 22% over your 6-month average")).toBeInTheDocument();
    expect(changed.getByText("₹18,200 this month. Nothing alarming.")).toBeInTheDocument();
  });

  it("leaves out What changed when there is nothing to say", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      getCashFlow: async (o) => ({ ...(await base.getCashFlow(o)), insight: undefined }),
      listAccounts: async (o): Promise<AccountsOverview> => ({ ...(await base.listAccounts(o)), cards: [] }),
    };
    renderWithI18n(<Recap />, { api });
    await loaded();
    expect(screen.queryByRole("heading", { name: "What changed" })).not.toBeInTheDocument();
  });

  it("does not divide by a zero card limit", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      listAccounts: async (o): Promise<AccountsOverview> => {
        const a = await base.listAccounts(o);
        return { ...a, cards: a.cards.map((c) => ({ ...c, limit: 0 })) };
      },
    };
    renderWithI18n(<Recap />, { api });
    await loaded();
    expect(screen.queryByText(/Card utilisation/)).not.toBeInTheDocument();
  });

  it("shows each category's share of the spending, adding to 100%", async () => {
    renderWithI18n(<Recap />);
    await loaded();
    const spend = within(screen.getByRole("region", { name: "Spend by category" }));
    for (const [name, share] of [["EMI", "31%"], ["SIPs", "19%"], ["Rent and utilities", "23%"], ["Food and dining", "10%"], ["Other", "17%"]]) {
      expect(within(spend.getByText(name).closest("li")!).getByText(share)).toBeInTheDocument();
    }
  });

  it("shows 0% for every category rather than dividing by nothing", async () => {
    renderWithI18n(<Recap />, { api: withFlow((f) => ({ ...f, categories: f.categories.map((c) => ({ ...c, amount: 0 })) })) });
    await loaded();
    expect(screen.getAllByText("0%")).toHaveLength(5);
  });

  it("goes on to the recommendations, and Back to Home", async () => {
    renderWithI18n(<Recap />);
    await loaded();
    expect(screen.getByRole("link", { name: "See what to do next" })).toHaveAttribute("href", "/plans/recommendations");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });
});

describe("Recap: reading the user's own data", () => {
  it("shows the loading block first", () => {
    const stuck: Api = { ...createMockApi(), getCashFlow: () => new Promise<never>(() => {}) };
    renderWithI18n(<Recap />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Monthly recap");
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Recap />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
  });
});

describe("Recap: Hindi and accessibility", () => {
  it("is translated, with amounts unchanged", async () => {
    renderWithI18n(<Recap />, { lng: "hi" });
    await screen.findByRole("heading", { level: 2, name: "श्रेणी के हिसाब से खर्च" });
    expect(screen.getByText("₹53,600")).toBeInTheDocument();
    expect(screen.getByText("कार्ड का इस्तेमाल 6% है")).toBeInTheDocument();
    expect(screen.getByText("ICICI Amazon Pay का बकाया ₹18,400 है।")).toBeInTheDocument();
  });

  it.each([["en"], ["hi"]] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<Recap />, { lng });
    await screen.findAllByRole("heading", { level: 2 });
    await expectAccessible(container);
  });
});
