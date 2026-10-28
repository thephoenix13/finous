// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api, type CashFlow as Flow } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import CashFlow from "./CashFlow";

function withFlow(change: (f: Flow) => Flow): Api {
  const base = createMockApi();
  return { ...base, getCashFlow: async (o) => change(await base.getCashFlow(o)) };
}

const loaded = () => screen.findByRole("heading", { level: 2, name: "Where it went" });

describe("CashFlow (prototype cash flow)", () => {
  it("leads with what was saved this month and how it compares", async () => {
    renderWithI18n(<CashFlow />);
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("This month");
    expect(screen.getByText("Saved in Sep 2026")).toBeInTheDocument();
    expect(screen.getByText("₹53,600")).toBeInTheDocument();
    expect(screen.getByText("₹14,400 more than last month")).toBeInTheDocument();
  });

  it("shows money in, in the positive colour, and money out", async () => {
    renderWithI18n(<CashFlow />);
    await loaded();
    expect(screen.getByText("₹2,40,000")).toHaveClass("text-positive");
    expect(screen.getByText("₹1,86,400")).not.toHaveClass("text-positive");
  });

  it("lists where it went, in the Api's order", async () => {
    renderWithI18n(<CashFlow />);
    await loaded();
    const where = within(screen.getByRole("region", { name: "Where it went" }));
    for (const [name, amount] of [
      ["EMI", "₹58,345"],
      ["SIPs", "₹35,000"],
      ["Rent and utilities", "₹42,600"],
      ["Food and dining", "₹18,200"],
      ["Other", "₹32,255"],
    ]) {
      expect(where.getByText(name)).toBeInTheDocument();
      expect(where.getByText(amount)).toBeInTheDocument();
    }
  });

  it("says the dining insight with its own figures", async () => {
    renderWithI18n(<CashFlow />);
    await loaded();
    expect(screen.getByRole("heading", { level: 2, name: "Insight" })).toBeInTheDocument();
    expect(screen.getByText("Dining is 22% higher than your 6-month average. Nothing alarming, but worth a look.")).toBeInTheDocument();
  });

  it("leaves out the insight when there is none", async () => {
    renderWithI18n(<CashFlow />, { api: withFlow((f) => ({ ...f, insight: undefined })) });
    await loaded();
    expect(screen.queryByText("Insight")).not.toBeInTheDocument();
  });

  it("words a worse month and an equal month", async () => {
    const { unmount } = renderWithI18n(<CashFlow />, { api: withFlow((f) => ({ ...f, savedChangeVsLastMonth: -2_000 })) });
    expect(await screen.findByText("₹2,000 less than last month")).toBeInTheDocument();
    unmount();
    renderWithI18n(<CashFlow />, { api: withFlow((f) => ({ ...f, savedChangeVsLastMonth: 0 })) });
    expect(await screen.findByText("The same as last month")).toBeInTheDocument();
  });

  it("goes Back to Home", async () => {
    renderWithI18n(<CashFlow />);
    await loaded();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
  });
});

describe("CashFlow: reading the user's own data", () => {
  it("shows the loading block first", () => {
    const stuck: Api = { ...createMockApi(), getCashFlow: () => new Promise<never>(() => {}) };
    renderWithI18n(<CashFlow />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<CashFlow />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
  });
});

describe("CashFlow: Hindi and accessibility", () => {
  it("is translated, with amounts unchanged", async () => {
    renderWithI18n(<CashFlow />, { lng: "hi" });
    await screen.findByRole("heading", { level: 2, name: "कहाँ गया" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("इस महीने");
    expect(screen.getByText("₹53,600")).toBeInTheDocument();
    expect(screen.getByText(/22% ज़्यादा है/)).toBeInTheDocument();
    expect(screen.getByText("किराया और बिल")).toBeInTheDocument();
  });

  it.each([["en"], ["hi"]] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<CashFlow />, { lng });
    await screen.findAllByRole("heading", { level: 2 });
    await expectAccessible(container);
  });
});
