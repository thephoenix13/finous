// @vitest-environment jsdom
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError, createMockApi, type Api } from "../api";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import Search from "./Search";

const box = () => screen.getByRole("searchbox", { name: "Search transactions" });
const results = () => within(screen.getByRole("region", { name: "Results" }));

describe("Search (prototype search)", () => {
  it("starts with the eight latest transactions, newest first, each a link", async () => {
    renderWithI18n(<Search />);
    await screen.findByText("Recent transactions");
    const links = results().getAllByRole("link");
    expect(links).toHaveLength(8);
    expect(links[0]).toHaveAttribute("href", "/transactions/t3");
    expect(results().getByText("−₹842")).toBeInTheDocument();
  });

  it("finds a transaction by what it was for, ignoring case, and counts the matches", async () => {
    renderWithI18n(<Search />);
    await screen.findByText("Recent transactions");
    await userEvent.type(box(), "SWIGGY");
    expect(await screen.findByText("3 results")).toBeInTheDocument();
    expect(results().getAllByRole("link").map((l) => l.getAttribute("href"))).toEqual(["/transactions/t3", "/transactions/t7", "/transactions/t8"]);
    expect(results().getByText("Swiggy Instamart")).toBeInTheDocument();
  });

  it("says '1 result' in the singular", async () => {
    renderWithI18n(<Search />);
    await userEvent.type(box(), "salary");
    expect(await screen.findByText("1 result")).toBeInTheDocument();
    expect(results().getByText("+₹2,40,000")).toHaveClass("text-positive");
  });

  it("ignores spaces around the text and returns to the latest when cleared", async () => {
    renderWithI18n(<Search />);
    await userEvent.type(box(), "  blinkit ");
    expect(await screen.findByText("1 result")).toBeInTheDocument();
    await userEvent.clear(box());
    expect(await screen.findByText("Recent transactions")).toBeInTheDocument();
  });

  it("sends the trimmed text to the Api, and no search at all when it is only spaces", async () => {
    const base = createMockApi();
    const sent: (string | undefined)[] = [];
    const api: Api = { ...base, listTransactions: (q, o) => (sent.push(q?.search), base.listTransactions(q, o)) };
    renderWithI18n(<Search />, { api });
    await screen.findByText("Recent transactions");
    await userEvent.type(box(), "  blinkit ");
    await screen.findByText("1 result");
    expect(sent.at(-1)).toBe("blinkit");
    await userEvent.clear(box());
    await userEvent.type(box(), "   ");
    await screen.findByText("Recent transactions");
    expect(sent.at(-1)).toBeUndefined();
  });

  it("says when nothing matches, with what was typed", async () => {
    renderWithI18n(<Search />);
    await userEvent.type(box(), "zzz");
    expect(await screen.findByText("No transactions match “zzz”.")).toBeInTheDocument();
    expect(screen.getByText("0 results")).toBeInTheDocument();
    expect(results().queryByRole("link")).not.toBeInTheDocument();
  });

  it("goes Back to Home and has one h1", () => {
    renderWithI18n(<Search />);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});

describe("Search: reading the user's own data", () => {
  it("shows the loading block first", () => {
    const stuck: Api = { ...createMockApi(), listTransactions: () => new Promise<never>(() => {}) };
    renderWithI18n(<Search />, { api: stuck });
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("offers a retry when the data cannot be loaded; retry recovers", async () => {
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    renderWithI18n(<Search />, { api });
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    await screen.findByText("Recent transactions");
  });
});

describe("Search: Hindi and accessibility", () => {
  it("is translated", async () => {
    renderWithI18n(<Search />, { lng: "hi" });
    await screen.findByText("हाल के लेन-देन");
    await userEvent.type(screen.getByRole("searchbox", { name: "लेन-देन खोजें" }), "swiggy");
    expect(await screen.findByText("3 नतीजे")).toBeInTheDocument();
  });

  it.each([["en"], ["hi"]] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<Search />, { lng });
    await screen.findAllByRole("link");
    await expectAccessible(container);
  });
});
