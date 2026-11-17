import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { downloadText } from "../lib/download";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

vi.mock("../lib/download", () => ({ downloadText: vi.fn() }));

beforeEach(() => vi.mocked(downloadText).mockClear());

const customers = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0].textContent);

async function open(route = "/opportunities", options: { as?: "admin" | "marketing" | "branch"; api?: MockConsoleApi } = {}) {
  const view = renderConsole({ route, ...options });
  await screen.findByRole("table", { name: "Opportunities, newest first" });
  return { ...view, user: userEvent.setup() };
}

describe("Opportunity list (I3.1)", () => {
  it("lists the customers who shared, newest first, with their type, product, status, branch and who has it", async () => {
    const { container } = await open();
    expect(screen.getByRole("heading", { name: "Opportunities" })).toBeInTheDocument();
    expect(customers()).toHaveLength(12);
    expect(customers()[0]).toBe("Rohit K.C-1041");
    const first = within(screen.getAllByRole("row")[1]);
    expect(first.getByText("Top-up")).toBeInTheDocument();
    expect(first.getByText("Home loan")).toBeInTheDocument();
    expect(first.getByText("New")).toBeInTheDocument();
    expect(first.getByText("Main branch")).toBeInTheDocument();
    expect(first.getByText("16 Nov 2026")).toBeInTheDocument();
    expect(first.getByText("Nobody yet")).toBeInTheDocument();
    expect(within(screen.getAllByRole("row")[3]).getByText("Suresh Pawar")).toBeInTheDocument();
    expect(screen.getByText("12 customers")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("says only customers who chose to share are listed, and that opening or exporting is logged", async () => {
    await open();
    expect(screen.getByText(/Only customers who chose to share are listed/)).toBeInTheDocument();
    expect(screen.getByText(/added to the staff access log/)).toBeInTheDocument();
  });

  it("says when there is no product in the catalogue for a customer", async () => {
    await open();
    expect(screen.getAllByText("None in your catalogue")).toHaveLength(2);
  });

  it("links each customer to their page", async () => {
    await open();
    expect(screen.getByRole("link", { name: "Rohit K." })).toHaveAttribute("href", "/opportunities/o1");
  });

  describe("filters", () => {
    it("narrows by type, status and branch, and says how many are left", async () => {
      const { user } = await open();
      await user.selectOptions(screen.getByLabelText("Type"), "maturing");
      await waitFor(() => expect(customers()).toHaveLength(3));
      expect(screen.getByText("3 customers")).toBeInTheDocument();
      await user.selectOptions(screen.getByLabelText("Status"), "contacted");
      await waitFor(() => expect(customers()).toEqual(["Anita M.C-1051"]));
      expect(screen.getByText("1 customer")).toBeInTheDocument();
    });

    it("narrows by branch", async () => {
      const { user } = await open();
      await user.selectOptions(screen.getByLabelText("Branch"), "Station branch");
      await waitFor(() => expect(customers()).toHaveLength(3));
      for (const r of screen.getAllByRole("row").slice(1)) expect(within(r).getByText("Station branch")).toBeInTheDocument();
    });

    it("starts from the filters in the address, so a filtered view can be shared or reloaded", async () => {
      await open("/opportunities?type=topup&status=new");
      expect(screen.getByLabelText("Type")).toHaveValue("topup");
      expect(screen.getByLabelText("Status")).toHaveValue("new");
      expect(customers()).toEqual(["Rohit K.C-1041", "Nitin W.C-1057"]);
    });

    it("ignores a filter value it doesn't know", async () => {
      await open("/opportunities?type=zzz&status=nope");
      expect(customers()).toHaveLength(12);
      expect(screen.getByLabelText("Type")).toHaveValue("");
    });

    it("says nothing matches, and clears the filters in one press", async () => {
      renderConsole({ route: "/opportunities?type=insurance&status=closed" });
      const user = userEvent.setup();
      expect(await screen.findByRole("heading", { name: "No opportunities match these filters" })).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Clear the filters" }));
      await waitFor(() => expect(screen.getByRole("table", { name: "Opportunities, newest first" })).toBeInTheDocument());
      expect(customers()).toHaveLength(12);
    });
  });

  describe("branch staff", () => {
    it("see only their own branch, with no branch filter to widen it", async () => {
      await open("/opportunities", { as: "branch" });
      expect(screen.getByText("Showing Main branch only.")).toBeInTheDocument();
      expect(screen.queryByLabelText("Branch")).not.toBeInTheDocument();
      expect(customers()).toHaveLength(5);
      for (const r of screen.getAllByRole("row").slice(1)) expect(within(r).getByText("Main branch")).toBeInTheDocument();
    });

    it("can't widen it from the address either", async () => {
      await open("/opportunities?branch=Station%20branch", { as: "branch" });
      expect(customers()).toHaveLength(5);
      expect(screen.queryByText("Station branch")).not.toBeInTheDocument();
    });
  });

  it("gives marketing the branch filter, and closes the screen to compliance and read-only roles", async () => {
    const { unmount } = await open("/opportunities", { as: "marketing" });
    expect(screen.getByLabelText("Branch")).toBeInTheDocument();
    unmount();
    for (const as of ["compliance", "readonly"] as const) {
      const view = renderConsole({ route: "/opportunities", as });
      expect(await screen.findByRole("heading", { name: "You don't have access to Opportunities" })).toBeInTheDocument();
      view.unmount();
    }
  });

  describe("export", () => {
    it("downloads the list as a CSV with no figures or phone numbers, and says it was logged", async () => {
      const { user, api } = await open();
      await user.click(screen.getByRole("button", { name: "Export as CSV" }));
      expect(await screen.findByText("Exported 12 customers. This was added to the staff access log.")).toBeInTheDocument();
      expect(downloadText).toHaveBeenCalledTimes(1);
      const [filename, text] = vi.mocked(downloadText).mock.calls[0];
      expect(filename).toBe("opportunities.csv");
      const lines = text.trim().split("\r\n");
      expect(lines[0]).toBe("Reference,Customer,Type,Matched product,Status,Branch,Detected on,Assigned to");
      expect(lines[1]).toBe("C-1041,Rohit K.,Top-up,Home loan,New,Main branch,2026-11-16,");
      expect(lines).toHaveLength(13);
      expect(text).not.toMatch(/₹|\d{10}/);
      expect((await api.accessLog())[0]).toMatchObject({ staff: "Meera Joshi", reason: "Exported opportunity list", customer: "12 customers" });
    });

    it("exports only what is filtered, and says it in the singular for one", async () => {
      const { user } = await open("/opportunities?status=closed");
      await user.click(screen.getByRole("button", { name: "Export as CSV" }));
      expect(await screen.findByText("Exported 1 customer. This was added to the staff access log.")).toBeInTheDocument();
      expect(vi.mocked(downloadText).mock.calls[0][1].trim().split("\r\n")).toHaveLength(2);
    });

    it("leaves a name that looks like a formula as plain text", async () => {
      const base = createMockConsoleApi();
      const sneaky: MockConsoleApi = {
        ...base,
        exportOpportunities: async (f, v) => (await base.exportOpportunities(f, v)).map((o, i) => (i === 0 ? { ...o, customer: "=HYPERLINK(1)" } : o)),
      };
      const { user } = await open("/opportunities", { api: sneaky });
      await user.click(screen.getByRole("button", { name: "Export as CSV" }));
      await screen.findByText(/Exported 12 customers/);
      expect(vi.mocked(downloadText).mock.calls[0][1]).toContain("C-1041,'=HYPERLINK(1),");
    });

    it("says nothing was downloaded when the export fails, and doesn't claim it was logged", async () => {
      const api = createMockConsoleApi();
      const { user } = await open("/opportunities", { api });
      api.failNext("exportOpportunities");
      await user.click(screen.getByRole("button", { name: "Export as CSV" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("nothing was downloaded");
      expect(downloadText).not.toHaveBeenCalled();
      expect(screen.queryByText(/Exported/)).not.toBeInTheDocument();
    });

    it("forgets the last export's message when the filter changes", async () => {
      const { user } = await open();
      await user.click(screen.getByRole("button", { name: "Export as CSV" }));
      await screen.findByText(/Exported 12 customers/);
      await user.selectOptions(screen.getByLabelText("Type"), "topup");
      expect(screen.queryByText(/Exported 12 customers/)).not.toBeInTheDocument();
    });

    it("is off when there is nothing to export", async () => {
      renderConsole({ route: "/opportunities?type=insurance&status=closed" });
      await screen.findByRole("heading", { name: "No opportunities match these filters" });
      expect(screen.getByRole("button", { name: "Export as CSV" })).toBeDisabled();
    });
  });

  describe("when there is nothing to show", () => {
    it("says nothing can be found until the feed is connected, and points to the feed (S.4)", async () => {
      const { container } = renderConsole({ route: "/opportunities", feed: "not_connected" });
      expect(await screen.findByRole("heading", { name: "Nothing to show until your data arrives" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Set up the data feed" })).toHaveAttribute("href", "/settings/integration");
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Type")).not.toBeInTheDocument();
      await expectAccessible(container);
    });

    it("says the same for a new bank", async () => {
      renderConsole({ route: "/opportunities", bank: "new" });
      expect(await screen.findByRole("heading", { name: "Nothing to show until your data arrives" })).toBeInTheDocument();
    });

    it("says there are none yet, once the feed is connected but no one has been found", async () => {
      const base = createMockConsoleApi();
      renderConsole({ route: "/opportunities", api: { ...base, opportunities: async () => ({ feedConnected: true, items: [] }) } });
      expect(await screen.findByRole("heading", { name: "No opportunities yet" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Clear the filters" })).not.toBeInTheDocument();
    });
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("opportunities");
    renderConsole({ route: "/opportunities", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table", { name: "Opportunities, newest first" })).toBeInTheDocument();
  });
});
