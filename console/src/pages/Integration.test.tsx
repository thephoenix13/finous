import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const ROUTE = "/settings/integration";

describe("Data feed status (I7.4)", () => {
  it("shows a healthy feed: when it last ran, how many rows, and when it runs next, in Indian time", async () => {
    const { container } = renderConsole({ route: ROUTE });
    expect(await screen.findByRole("heading", { name: "Integration" })).toBeInTheDocument();
    expect(await screen.findByText("Healthy")).toBeInTheDocument();
    const last = screen.getByText("Last run").closest("dl")!;
    expect(last).toHaveTextContent("17 Nov 2026, 7:30 am");
    expect(screen.getByText("Rows read", { selector: "dt" }).closest("dl")).toHaveTextContent("1,874");
    expect(screen.getByText("Next run").closest("dl")).toHaveTextContent("18 Nov 2026, 7:30 am");
    await expectAccessible(container);
  });

  it("lists the recent runs, newest first, with what a bad one said", async () => {
    renderConsole({ route: ROUTE });
    const table = await screen.findByRole("table", { name: "The feed's recent runs, newest first" });
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(8);
    expect(rows[1]).toHaveTextContent("17 Nov 2026");
    expect(within(rows[1]).getByText("Worked")).toBeInTheDocument();
    const failed = rows.find((r) => within(r).queryByText("Failed"))!;
    expect(failed).toHaveTextContent("The file was not at the agreed location.");
    expect(within(failed).getAllByText("–")).toHaveLength(2);
    const partial = rows.find((r) => r.textContent?.includes("12 rows had no balance"))!;
    expect(partial).toHaveTextContent("1,869");
  });

  it("warns when the latest run failed, and says customers still see the last good figures", async () => {
    renderConsole({ route: ROUTE, feed: "failing" });
    expect(await screen.findByText("Failing")).toBeInTheDocument();
    expect(screen.getByText(/The latest run didn't work: The file was not at the agreed location\./)).toBeInTheDocument();
    expect(screen.getByText(/still see the figures from the last run that did/)).toBeInTheDocument();
    expect(screen.queryByText("Healthy")).not.toBeInTheDocument();
  });

  it("says the data isn't connected yet, and points to matching columns (S.4)", async () => {
    const { container } = renderConsole({ route: ROUTE, bank: "new" });
    expect(await screen.findByRole("heading", { name: "Your bank's data isn't connected yet" })).toBeInTheDocument();
    expect(screen.queryByText("Recent runs")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Match your columns" })).toHaveAttribute("href", "/settings/integration/mapping");
    await expectAccessible(container);
  });

  it("moves between the three integration screens", async () => {
    renderConsole({ route: ROUTE });
    const tabs = await screen.findByRole("navigation", { name: "Integration" });
    expect(within(tabs).getByRole("link", { name: "Data feed" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(within(tabs).getByRole("link", { name: "Mapping and test" }));
    expect(await screen.findByRole("heading", { name: "Match your columns" })).toBeInTheDocument();
    expect(within(screen.getByRole("navigation", { name: "Integration" })).getByRole("link", { name: "Data feed" })).not.toHaveAttribute("aria-current");
    await userEvent.click(within(screen.getByRole("navigation", { name: "Integration" })).getByRole("link", { name: "Sign-in and API keys" }));
    expect(await screen.findByRole("heading", { name: "Link from your app" })).toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("feed");
    renderConsole({ route: ROUTE, api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Healthy")).toBeInTheDocument();
  });

  it("is closed to everyone but an Admin", async () => {
    for (const as of ["compliance", "marketing", "branch", "readonly"] as const) {
      const { unmount } = renderConsole({ route: ROUTE, as });
      expect(await screen.findByRole("heading", { name: "You don't have access to Integration" })).toBeInTheDocument();
      unmount();
    }
  });
});
