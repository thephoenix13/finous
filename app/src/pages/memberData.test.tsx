// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { createMockApi, type Api } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import AccountDetail from "./AccountDetail";
import Accounts from "./Accounts";
import CashFlow from "./CashFlow";
import Health from "./Health";
import Home from "./Home";
import Recap from "./Recap";
import Tax from "./Tax";

/**
 * A real member cannot always supply what the sample customer has: how last month compared, when a loan began, an income-band
 * percentile, a card's minimum due. These screens must say less rather than show something false or broken.
 */
const base = createMockApi();
const MORNING = new Date(2026, 8, 29, 9, 0);

describe("Home with less to say", () => {
  it("leaves out the month when no monthly figures are entered, and the change when there is nothing to compare", async () => {
    const api: Api = {
      ...base,
      getHome: async (o) => {
        const h = await base.getHome(o);
        return { ...h, netWorth: { value: h.netWorth.value }, month: undefined };
      },
    };
    renderWithI18n(<Home now={MORNING} />, { api });
    await screen.findByText("₹76,41,600");
    expect(screen.queryByText("This month")).not.toBeInTheDocument();
    expect(screen.queryByText(/this month$/)).not.toBeInTheDocument();
    expect(screen.queryByText("₹2,40,000")).not.toBeInTheDocument();
  });

  it("shows the month but not a comparison when last month is unknown", async () => {
    const api: Api = {
      ...base,
      getHome: async (o) => {
        const h = await base.getHome(o);
        return { ...h, month: { ...h.month!, savedChangeVsLastMonth: undefined } };
      },
    };
    renderWithI18n(<Home now={MORNING} />, { api });
    await screen.findByText("₹2,40,000");
    expect(screen.queryByText(/than last month|same as last month/)).not.toBeInTheDocument();
  });

  it("has no accessibility violations without a month", async () => {
    const api: Api = { ...base, getHome: async (o) => ({ ...(await base.getHome(o)), month: undefined }) };
    const { container } = renderWithI18n(<Home now={MORNING} />, { api });
    await screen.findByText("₹76,41,600");
    await expectAccessible(container);
  });
});

describe("cash flow and recap without a comparison", () => {
  const api: Api = { ...base, getCashFlow: async (o) => ({ ...(await base.getCashFlow(o)), savedChangeVsLastMonth: undefined }) };

  it("shows what was saved and says nothing about last month", async () => {
    renderWithI18n(<CashFlow />, { api });
    await screen.findByText("₹53,600");
    expect(screen.queryByText(/last month/)).not.toBeInTheDocument();
  });

  it("does the same on the recap", async () => {
    renderWithI18n(<Recap />, { api });
    await screen.findByText("₹53,600");
    expect(screen.queryByText(/last month/)).not.toBeInTheDocument();
  });
});

describe("health score without a change or an income-band percentile", () => {
  const api: Api = {
    ...base,
    getHealthScore: async (o) => {
      const h = await base.getHealthScore(o);
      return { ...h, changeThisMonth: undefined, topPercentForIncomeBand: undefined };
    },
  };

  it("shows the score and what drags it, without a rank or a change it cannot back", async () => {
    renderWithI18n(<Health />, { api });
    await screen.findByText("742");
    expect(screen.queryByText(/top .* for your income band/)).not.toBeInTheDocument();
    expect(screen.queryByText(/points|No change/)).not.toBeInTheDocument();
    expect(screen.getByText(/emergency fund/i)).toBeInTheDocument();
  });

  it("is accessible in Hindi too", async () => {
    const { container } = renderWithI18n(<Health />, { api, lng: "hi" });
    await screen.findByText("742");
    await expectAccessible(container);
  });
});

describe("a car loan with no start date, and a card with no minimum due", () => {
  const api: Api = {
    ...base,
    listAccounts: async (o) => {
      const a = await base.listAccounts(o);
      return { ...a, loans: [{ ...a.loans[0], id: "car", name: "SBI Car Loan", loanType: "car", startedOn: undefined, repaidPercent: undefined }] };
    },
    getAccount: async (id, o) => {
      if (id === "car") return (await api.listAccounts(o)).loans[0];
      const a = await base.getAccount(id, o);
      return a.kind === "card" ? { ...a, minimumDue: undefined } : a;
    },
  };

  it("lists the loan with when it ends only, and links it to its own page rather than the home-loan refinance check", async () => {
    renderWithI18n(<Accounts />, { api });
    expect(await screen.findByText("Ends Mar 2044")).toBeInTheDocument();
    expect(screen.queryByText(/since/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /SBI Car Loan/ })).toHaveAttribute("href", "/accounts/car");
  });

  it("names the kind of loan on its page", async () => {
    renderWithI18n(
      <Routes>
        <Route path="/accounts/:id" element={<AccountDetail />} />
      </Routes>,
      { route: "/accounts/car", api },
    );
    expect(await screen.findByText("Car loan")).toBeInTheDocument();
  });

  it("leaves the minimum due off the card's cycle when it was not entered", async () => {
    renderWithI18n(
      <Routes>
        <Route path="/accounts/:id" element={<AccountDetail />} />
      </Routes>,
      { route: "/accounts/icici-cc", api },
    );
    await screen.findByText("Payment due");
    expect(screen.queryByText("Minimum due")).not.toBeInTheDocument();
  });

  it("says it in Hindi", async () => {
    renderWithI18n(<Accounts />, { api, lng: "hi" });
    expect(await screen.findByText("मार्च 2044 में समाप्त")).toBeInTheDocument();
  });
});

describe("tax with only yearly totals", () => {
  it("shows a stated total with no provider as 'Total this year'", async () => {
    const api: Api = {
      ...base,
      getTaxSummary: async (o) => {
        const t = await base.getTaxSummary(o);
        return { ...t, section80C: { ...t.section80C, used: 42_000, items: [{ id: "ppf", kind: "ppf", amount: 42_000, schedule: "yearly-total" }] } };
      },
    };
    renderWithI18n(<Tax />, { api });
    expect(await screen.findByText("Total this year")).toBeInTheDocument();
    expect(screen.getByText("₹42,000", { selector: "span, div" })).toBeInTheDocument();
  });

  it("says it in Hindi", async () => {
    const api: Api = {
      ...base,
      getTaxSummary: async (o) => {
        const t = await base.getTaxSummary(o);
        return { ...t, section80C: { ...t.section80C, items: [{ id: "ppf", kind: "ppf", amount: 42_000, schedule: "yearly-total" }] } };
      },
    };
    renderWithI18n(<Tax />, { api, lng: "hi" });
    expect(await screen.findByText("इस साल का कुल")).toBeInTheDocument();
  });
});
