// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api, type TransactionPage } from "../api";
import type { Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import AccountDetail from "./AccountDetail";

const page = (id: string, lng: Language = "en", api?: Api) =>
  renderWithI18n(
    <Routes>
      <Route path="/accounts/:id" element={<AccountDetail />} />
    </Routes>,
    { route: `/accounts/${id}`, lng, api },
  );

const loaded = () => screen.findByRole("heading", { level: 2, name: /Recent|हाल के/ });
const recent = () => within(screen.getByRole("region", { name: /Recent|हाल के/ }));

describe("AccountDetail: a bank account (prototype account detail)", () => {
  it("names the account, its type and last four digits, its balance and this month's movement", async () => {
    page("hdfc");
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("HDFC Bank");
    expect(screen.getByText("Savings · •4821")).toBeInTheDocument();
    expect(screen.getByText("₹2,84,000")).toBeInTheDocument();
    expect(screen.getByText("↑ ₹18,400 this month")).toBeInTheDocument();
  });

  it("lists the five latest transactions, newest first, with when each happened and its signed amount", async () => {
    page("hdfc");
    await loaded();
    const rows = within(screen.getByRole("region", { name: "Recent" })).getAllByText(/ · /);
    expect(rows.map((r) => r.textContent)).toEqual([
      "Yesterday · 9:12 PM",
      "Yesterday · 7:00 AM",
      "Yesterday · 6:00 AM",
      "Sun · 7:42 PM",
      "Sat · 10:24 AM",
    ]);
    expect(recent().getByText("Swiggy")).toBeInTheDocument();
    expect(recent().getByText("−₹842")).toBeInTheDocument();
    expect(recent().getByText("SIP — Parag Parikh Flexi Cap")).toBeInTheDocument();
    expect(recent().getByText("−₹15,000")).toBeInTheDocument();
    expect(recent().getByText("Blinkit")).toBeInTheDocument();
    expect(recent().getByText("−₹1,240")).toBeInTheDocument();
  });

  it("shows money in with a plus, in the positive colour", async () => {
    page("hdfc");
    await loaded();
    const salary = recent().getByText("+₹2,40,000");
    expect(salary).toHaveClass("text-positive");
    expect(recent().getByText("−₹842")).not.toHaveClass("text-positive");
  });

  it("goes Back to the accounts list", async () => {
    page("hdfc");
    await loaded();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/accounts");
  });

  it("leaves the movement out when the bank has not shared it, and says so when there are no transactions", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      getAccount: async (id, o) => {
        const a = await base.getAccount(id, o);
        return a.kind === "bank" ? { ...a, changeThisMonth: undefined } : a;
      },
      listTransactions: async (): Promise<TransactionPage> => ({ items: [], total: 0 }),
    };
    page("sbi", "en", api);
    await loaded();
    expect(screen.queryByText(/this month/)).not.toBeInTheDocument();
    expect(screen.getByText("No recent transactions.")).toBeInTheDocument();
  });

  it("shows a falling month with its own arrow", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      getAccount: async (id, o) => {
        const a = await base.getAccount(id, o);
        return a.kind === "bank" ? { ...a, changeThisMonth: -5_000 } : a;
      },
    };
    page("hdfc", "en", api);
    await loaded();
    expect(screen.getByText("↓ ₹5,000 this month")).toBeInTheDocument();
  });
});

describe("AccountDetail: the card (prototype card detail)", () => {
  it("shows what is outstanding, the limit and how much of it is used, with a bar", async () => {
    page("icici-cc");
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ICICI Amazon Pay");
    expect(screen.getByText("Outstanding")).toBeInTheDocument();
    expect(screen.getByText("₹18,400")).toBeInTheDocument();
    expect(screen.getByText("of ₹3,00,000 limit · 6% used")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Card limit used" })).toHaveAttribute("aria-valuenow", "6");
  });

  it("shows the statement cycle: the last statement, the next payment, the minimum and auto-pay", async () => {
    page("icici-cc");
    await loaded();
    const cycle = within(screen.getByRole("region", { name: "Cycle" }));
    expect(cycle.getByText("Statement date")).toBeInTheDocument();
    expect(cycle.getByText("28th of every month")).toBeInTheDocument();
    expect(cycle.getByText("28 September")).toBeInTheDocument();
    expect(cycle.getByText("Payment due")).toBeInTheDocument();
    expect(cycle.getByText("15th of every month")).toBeInTheDocument();
    expect(cycle.getByText("15 October")).toBeInTheDocument();
    expect(cycle.getByText("₹1,840")).toBeInTheDocument();
    expect(cycle.getByText("Not set up")).toBeInTheDocument();
  });

  it("says auto-pay is on when it is", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      getAccount: async (id, o) => {
        const a = await base.getAccount(id, o);
        return a.kind === "card" ? { ...a, autoPay: true } : a;
      },
    };
    page("icici-cc", "en", api);
    await loaded();
    expect(within(screen.getByRole("region", { name: "Cycle" })).getByText("On")).toBeInTheDocument();
  });

  it("lists the card's own transactions", async () => {
    page("icici-cc");
    await loaded();
    expect(recent().getByText("Swiggy")).toBeInTheDocument();
    expect(recent().getByText("−₹576")).toBeInTheDocument();
    expect(recent().getByText("Thu")).toBeInTheDocument();
  });

  it("does not divide by a zero limit", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      getAccount: async (id, o) => {
        const a = await base.getAccount(id, o);
        return a.kind === "card" ? { ...a, limit: 0 } : a;
      },
    };
    page("icici-cc", "en", api);
    await loaded();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText(/0% used/)).toBeInTheDocument();
  });
});

describe("AccountDetail: a loan or an investment, reached by address", () => {
  it("shows a loan's outstanding amount and says what it is", async () => {
    page("hdfc-home");
    expect(await screen.findByText("Home loan")).toBeInTheDocument();
    expect(screen.getByText("₹62,00,000")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it.each([
    ["groww", "Mutual funds", "₹24,80,000"],
    ["zerodha", "Stocks", "₹8,40,000"],
    ["ppf", "PPF", "₹6,20,000"],
  ])("shows %s as %s worth %s", async (id, eyebrow, value) => {
    page(id);
    expect(await screen.findByText(eyebrow)).toBeInTheDocument();
    expect(screen.getByText(value)).toBeInTheDocument();
  });
});

describe("AccountDetail: reading the user's own data", () => {
  it("says an account that does not exist is not found, with no retry", async () => {
    page("nope");
    expect(await screen.findByText("We couldn't find that account.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Accounts");
  });

  it("shows the loading block first, announced to assistive technology", () => {
    const stuck: Api = { ...createMockApi(), getAccount: () => new Promise<never>(() => {}) };
    page("hdfc", "en", stuck);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    page("hdfc", "en", api);
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("AccountDetail: Hindi", () => {
  it("is translated for a bank account, with names and amounts unchanged", async () => {
    page("hdfc", "hi");
    await loaded();
    expect(screen.getByText("बचत खाता · •4821")).toBeInTheDocument();
    expect(screen.getByText("↑ इस महीने ₹18,400")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("हाल के");
    expect(recent().getByText("कल · 9:12 pm")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "वापस" })).toHaveAttribute("href", "/accounts");
  });

  it("is translated for the card", async () => {
    page("icici-cc", "hi");
    await loaded();
    expect(screen.getByText("बकाया")).toBeInTheDocument();
    expect(screen.getByText("₹3,00,000 की सीमा में से · 6% इस्तेमाल")).toBeInTheDocument();
    const cycle = within(screen.getByRole("region", { name: "चक्र" }));
    expect(cycle.getByText("हर महीने की 28 तारीख")).toBeInTheDocument();
    expect(cycle.getByText("28 सितंबर")).toBeInTheDocument();
    expect(cycle.getByText("15 अक्टूबर")).toBeInTheDocument();
    expect(cycle.getByText("सेट नहीं है")).toBeInTheDocument();
  });

  it("is translated when the account is not found", async () => {
    page("nope", "hi");
    expect(await screen.findByText("हमें वह खाता नहीं मिला।")).toBeInTheDocument();
  });
});

describe("AccountDetail: accessibility", () => {
  it.each([
    ["hdfc", "en"],
    ["icici-cc", "en"],
    ["hdfc-home", "en"],
    ["hdfc", "hi"],
    ["icici-cc", "hi"],
  ] as const)("has no accessibility violations for %s in %s", async (id, lng) => {
    const { container } = page(id, lng);
    await screen.findByRole("heading", { level: 1 });
    await screen.findAllByText(/₹/);
    await expectAccessible(container);
  });
});
