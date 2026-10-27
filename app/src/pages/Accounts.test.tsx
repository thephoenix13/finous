// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import App from "../App";
import { ApiProvider } from "../api";
import { createI18n } from "../i18n";
import { ApiError, createMockApi, type AccountsOverview, type Api } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Accounts from "./Accounts";

/** The persona, with its accounts changed. */
function withAccounts(change: (a: AccountsOverview) => AccountsOverview): Api {
  const base = createMockApi();
  return { ...base, listAccounts: async (options) => change(await base.listAccounts(options)) };
}

const loaded = () => screen.findByRole("heading", { level: 2, name: "Bank accounts" });
const group = (name: string) => within(screen.getByRole("region", { name }));

describe("Accounts: first view (prototype Accounts screen)", () => {
  it("groups the accounts as the prototype does, in its order", async () => {
    renderWithI18n(<Accounts />);
    await loaded();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Bank accounts", "Loans", "Cards", "Investments"]);
  });

  it("lists the banks with their type, last four digits and balance", async () => {
    renderWithI18n(<Accounts />);
    await loaded();
    const banks = group("Bank accounts");
    expect(banks.getByText("HDFC Bank")).toBeInTheDocument();
    expect(banks.getAllByText("Savings · •4821")).toHaveLength(1);
    expect(banks.getByText("₹2,84,000")).toBeInTheDocument();
    expect(banks.getByText("State Bank of India")).toBeInTheDocument();
    expect(banks.getByText("Savings · •7723")).toBeInTheDocument();
    expect(banks.getByText("₹1,36,000")).toBeInTheDocument();
  });

  it("lists the loan with when it ends and when it began, and what is outstanding", async () => {
    renderWithI18n(<Accounts />);
    await loaded();
    const loans = group("Loans");
    expect(loans.getByText("HDFC Home Loan")).toBeInTheDocument();
    expect(loans.getByText("Ends Mar 2044 · since Mar 2025")).toBeInTheDocument();
    expect(loans.getByText("₹62,00,000")).toBeInTheDocument();
  });

  it("lists the card with its limit and what is outstanding", async () => {
    renderWithI18n(<Accounts />);
    await loaded();
    const cards = group("Cards");
    expect(cards.getByText("ICICI Amazon Pay")).toBeInTheDocument();
    expect(cards.getByText("On ₹3,00,000 limit")).toBeInTheDocument();
    expect(cards.getByText("₹18,400")).toBeInTheDocument();
  });

  it("lists the three investments, each with its own line", async () => {
    renderWithI18n(<Accounts />);
    await loaded();
    const investments = group("Investments");
    expect(investments.getByText("Groww Mutual Funds")).toBeInTheDocument();
    expect(investments.getByText("9 active SIPs")).toBeInTheDocument();
    expect(investments.getByText("₹24,80,000")).toBeInTheDocument();
    expect(investments.getByText("Zerodha Holdings")).toBeInTheDocument();
    expect(investments.getByText("14 stocks")).toBeInTheDocument();
    expect(investments.getByText("₹8,40,000")).toBeInTheDocument();
    expect(investments.getByText("PPF Account")).toBeInTheDocument();
    expect(investments.getByText("HDFC · opened 2019")).toBeInTheDocument();
    expect(investments.getByText("₹6,20,000")).toBeInTheDocument();
  });

  it("links banks and the card to their page and the loan to the refinance check; investments are not links", async () => {
    renderWithI18n(<Accounts />);
    await loaded();
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual([
      "/", // Back
      "/accounts/hdfc",
      "/accounts/sbi",
      "/plans/refinance",
      "/accounts/icici-cc",
    ]);
    expect(within(group("Investments").getByText("Groww Mutual Funds").closest("div")!).queryByRole("link")).not.toBeInTheDocument();
  });

  it("has one h1 and a Back link to Home", async () => {
    renderWithI18n(<Accounts />);
    await loaded();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Accounts");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });
});

describe("Accounts: when the accounts are different", () => {
  it("leaves out a group with nothing in it", async () => {
    renderWithI18n(<Accounts />, { api: withAccounts((a) => ({ ...a, loans: [], cards: [] })) });
    await loaded();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["Bank accounts", "Investments"]);
  });

  it("says 'stock' and 'SIP' in the singular for one", async () => {
    renderWithI18n(<Accounts />, {
      api: withAccounts((a) => ({
        ...a,
        investments: [
          { kind: "investment", id: "a", name: "Funds", instrument: "mutual-funds", value: 1, activeSips: 1 },
          { kind: "investment", id: "b", name: "Shares", instrument: "stocks", value: 1, holdings: 1 },
        ],
      })),
    });
    await screen.findByText("1 active SIP");
    expect(screen.getByText("1 stock")).toBeInTheDocument();
  });

  it("words a PPF account that names no institution", async () => {
    renderWithI18n(<Accounts />, {
      api: withAccounts((a) => ({ ...a, investments: [{ kind: "investment", id: "p", name: "PPF", instrument: "ppf", value: 5, openedYear: 2019 }] })),
    });
    expect(await screen.findByText("Opened 2019")).toBeInTheDocument();
  });
});

describe("Accounts: reading the user's own data", () => {
  it("shows the loading block first, announced to assistive technology", () => {
    const stuck: Api = { ...createMockApi(), listAccounts: () => new Promise<never>(() => {}) };
    renderWithI18n(<Accounts />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Accounts");
  });

  it("says so, and offers a retry, when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Accounts />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Accounts: Hindi", () => {
  it("is translated, with names and amounts unchanged", async () => {
    renderWithI18n(<Accounts />, { lng: "hi" });
    await screen.findByRole("heading", { level: 2, name: "बैंक खाते" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("खाते");
    expect(screen.getByText("बचत खाता · •4821")).toBeInTheDocument();
    expect(screen.getByText("मार्च 2044 में समाप्त · मार्च 2025 से")).toBeInTheDocument();
    expect(screen.getByText("₹3,00,000 की सीमा पर")).toBeInTheDocument();
    expect(screen.getByText("9 सक्रिय SIP")).toBeInTheDocument();
    expect(screen.getByText("14 स्टॉक")).toBeInTheDocument();
    expect(screen.getByText("HDFC · 2019 में खोला")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual(["बैंक खाते", "लोन", "कार्ड", "निवेश"]);
  });
});

describe("Accounts: accessibility", () => {
  it.each([["en"], ["hi"]] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<Accounts />, { lng });
    await screen.findAllByRole("heading", { level: 2 });
    await expectAccessible(container);
  });
});

describe("Accounts: the walk in the real app", () => {
  it("goes from Home to the accounts, to a bank account and back a step at a time", async () => {
    window.history.pushState({}, "", "/");
    render(
      <I18nextProvider i18n={createI18n("en")}>
        <ApiProvider api={createMockApi()}>
          <App />
        </ApiProvider>
      </I18nextProvider>,
    );
    await userEvent.click(await screen.findByRole("link", { name: "All accounts" }));
    await userEvent.click(await screen.findByRole("link", { name: /HDFC Bank/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "HDFC Bank" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Back" }));
    expect(await screen.findByRole("heading", { level: 1, name: "Accounts" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Back" }));
    expect(await screen.findByRole("link", { name: "All accounts" })).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });
});
