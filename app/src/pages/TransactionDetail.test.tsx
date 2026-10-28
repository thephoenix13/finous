// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api } from "../api";
import type { Language } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import TransactionDetail from "./TransactionDetail";

const page = (id: string, lng: Language = "en", api?: Api) =>
  renderWithI18n(
    <Routes>
      <Route path="/transactions/:id" element={<TransactionDetail />} />
    </Routes>,
    { route: `/transactions/${id}`, lng, api },
  );

const loaded = () => screen.findByText(/Counterparty|लेन-देन का|किसके साथ/);

describe("TransactionDetail: a payment out (prototype transaction)", () => {
  it("shows the amount and the account it left", async () => {
    page("t3");
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Transaction");
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("₹842")).toBeInTheDocument();
    expect(screen.getByText("Debited from HDFC Bank •4821")).toBeInTheDocument();
  });

  it("shows who, when and which category", async () => {
    page("t3");
    await loaded();
    expect(screen.getByText("Swiggy", { selector: "span.block.text-\\[13px\\]" })).toBeInTheDocument();
    expect(screen.getByText("28 September 2026 · 9:12 PM")).toBeInTheDocument();
    expect(screen.getByText("Food and dining")).toBeInTheDocument();
  });

  it("lists other transactions in the same category, newest first, each a link", async () => {
    page("t3");
    await loaded();
    const similar = within(screen.getByRole("region", { name: "Similar transactions" }));
    const links = similar.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/transactions/t4", "/transactions/t5", "/transactions/t7"]);
    expect(similar.getByText("Blinkit")).toBeInTheDocument();
    expect(similar.getByText("−₹576")).toBeInTheDocument();
    expect(similar.queryByText("−₹842")).not.toBeInTheDocument();
  });

  it("goes Back to the account the money left", async () => {
    page("t3");
    await loaded();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/accounts/hdfc");
  });

  it("opens a similar transaction", async () => {
    page("t3");
    await loaded();
    await userEvent.click(screen.getByRole("link", { name: /Blinkit/ }));
    expect(await screen.findByText("₹1,240", { selector: "p, div, span" })).toBeInTheDocument();
    expect(screen.getByText("27 September 2026 · 7:42 PM")).toBeInTheDocument();
  });
});

describe("TransactionDetail: other kinds", () => {
  it("says Received and Credited for money in, and leaves out a time the bank did not report", async () => {
    page("t6");
    await loaded();
    expect(screen.getByText("Received")).toBeInTheDocument();
    expect(screen.getByText("₹2,40,000")).toBeInTheDocument();
    expect(screen.getByText("Credited to HDFC Bank •4821")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Similar transactions" })).not.toBeInTheDocument();
  });

  it("shows a date alone when there is no time", async () => {
    page("t5");
    await loaded();
    expect(screen.getByText("26 September 2026")).toBeInTheDocument();
  });

  it("names a card account by its last four digits", async () => {
    page("t7");
    await loaded();
    expect(screen.getByText("Debited from ICICI Amazon Pay •4419")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/accounts/icici-cc");
  });
});

describe("TransactionDetail: reading the user's own data", () => {
  it("says a transaction that does not exist is not found, with no retry", async () => {
    page("nope");
    expect(await screen.findByText("We couldn't find that transaction.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/accounts");
  });

  it("shows the loading block first", () => {
    const stuck: Api = { ...createMockApi(), listTransactions: () => new Promise<never>(() => {}) };
    page("t3", "en", stuck);
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    page("t3", "en", api);
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await loaded();
  });
});

describe("TransactionDetail: Hindi", () => {
  it("is translated, with names and amounts unchanged", async () => {
    page("t3", "hi");
    await loaded();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("लेन-देन");
    expect(screen.getByText("रकम")).toBeInTheDocument();
    expect(screen.getByText("HDFC Bank •4821 से कटे")).toBeInTheDocument();
    expect(screen.getByText("28 सितंबर 2026 · 9:12 pm")).toBeInTheDocument();
    expect(screen.getByText("खान-पान")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "मिलते-जुलते लेन-देन" })).toBeInTheDocument();
  });

  it("is translated when not found", async () => {
    page("nope", "hi");
    expect(await screen.findByText("हमें वह लेन-देन नहीं मिला।")).toBeInTheDocument();
  });
});

describe("TransactionDetail: accessibility", () => {
  it.each([
    ["t3", "en"],
    ["t6", "en"],
    ["t3", "hi"],
  ] as const)("has no accessibility violations for %s in %s", async (id, lng) => {
    const { container } = page(id, lng);
    await loaded();
    await expectAccessible(container);
  });
});
