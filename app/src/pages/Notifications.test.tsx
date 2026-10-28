// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type AccountsOverview, type Api } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Notifications from "./Notifications";

const loaded = () => screen.findByText("ICICI Amazon Pay statement is ready");
const item = (title: RegExp | string) => within(screen.getByRole("link", { name: title }));

describe("Notifications (prototype notifications)", () => {
  it("lists what is open: the insights, the card statement and the latest income, each a link", async () => {
    renderWithI18n(<Notifications />);
    await loaded();
    expect(screen.getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual([
      "/", // Back
      "/plans/recommendations/refi",
      "/plans/recommendations/fd",
      "/plans/recommendations/ef",
      "/accounts/icici-cc",
      "/transactions/t6",
    ]);
  });

  it("words the insights as the Home screen does, under Worth a look", async () => {
    renderWithI18n(<Notifications />);
    await loaded();
    expect(screen.getAllByText("Worth a look")).toHaveLength(3);
    expect(item(/above market/).getByText(/Current 8.9%. Market offers/)).toBeInTheDocument();
  });

  it("says when the card statement came, what is due and when, and whether auto-pay is on", async () => {
    renderWithI18n(<Notifications />);
    await loaded();
    const card = item(/statement is ready/);
    expect(card.getByText("Yesterday")).toBeInTheDocument();
    expect(card.getByText("₹18,400 due on 15 October. Auto-pay is off.")).toBeInTheDocument();
  });

  it("says auto-pay is on when it is", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      listAccounts: async (o): Promise<AccountsOverview> => {
        const a = await base.listAccounts(o);
        return { ...a, cards: a.cards.map((c) => ({ ...c, autoPay: true })) };
      },
    };
    renderWithI18n(<Notifications />, { api });
    await loaded();
    expect(screen.getByText("₹18,400 due on 15 October. Auto-pay is on.")).toBeInTheDocument();
  });

  it("leaves out a card with nothing outstanding", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      listAccounts: async (o): Promise<AccountsOverview> => {
        const a = await base.listAccounts(o);
        return { ...a, cards: a.cards.map((c) => ({ ...c, outstanding: 0 })) };
      },
    };
    renderWithI18n(<Notifications />, { api });
    await screen.findAllByText("Worth a look");
    expect(screen.queryByText(/statement is ready/)).not.toBeInTheDocument();
  });

  it("shows the latest income with its day, and the account it reached", async () => {
    renderWithI18n(<Notifications />);
    await loaded();
    const salary = item(/Salary credit/);
    expect(salary.getByText("Sat")).toBeInTheDocument();
    expect(salary.getByText("₹2,40,000 to HDFC Bank •4821.")).toBeInTheDocument();
  });

  it("says so when nothing is open", async () => {
    const base = createMockApi();
    const api: Api = {
      ...base,
      listInsights: async () => [],
      listTransactions: async () => ({ items: [], total: 0 }),
      listAccounts: async (o): Promise<AccountsOverview> => ({ ...(await base.listAccounts(o)), cards: [] }),
    };
    renderWithI18n(<Notifications />, { api });
    expect(await screen.findByText("Nothing needs your attention.")).toBeInTheDocument();
  });

  it("goes Back to Home", async () => {
    renderWithI18n(<Notifications />);
    await loaded();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Notifications");
  });
});

describe("Notifications: reading the user's own data", () => {
  it("shows the loading block first", () => {
    const stuck: Api = { ...createMockApi(), listInsights: () => new Promise<never>(() => {}) };
    renderWithI18n(<Notifications />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Notifications />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
  });
});

describe("Notifications: Hindi and accessibility", () => {
  it("is translated", async () => {
    renderWithI18n(<Notifications />, { lng: "hi" });
    expect(await screen.findByText("ICICI Amazon Pay का स्टेटमेंट तैयार है")).toBeInTheDocument();
    expect(screen.getByText("₹18,400 15 अक्टूबर को देय है। ऑटो-पे बंद है।")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("सूचनाएँ");
    expect(screen.getAllByText("देखने लायक")).toHaveLength(3);
  });

  it.each([["en"], ["hi"]] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<Notifications />, { lng });
    await screen.findAllByText(/₹/);
    await expectAccessible(container);
  });
});
