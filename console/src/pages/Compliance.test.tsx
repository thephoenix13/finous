import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockConsoleApi } from "../api/mock";
import { downloadText } from "../lib/download";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

vi.mock("../lib/download", () => ({ downloadText: vi.fn() }));

beforeEach(() => vi.mocked(downloadText).mockClear());

const bodyRows = () => screen.getAllByRole("row").slice(1);

describe("Compliance tabs", () => {
  it("move between the four compliance screens, keeping the current one marked", async () => {
    renderConsole({ route: "/settings/compliance", as: "compliance" });
    const tabs = await screen.findByRole("navigation", { name: "Compliance" });
    expect(within(tabs).getByRole("link", { name: "Documents" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(within(tabs).getByRole("link", { name: "Consent ledger" }));
    expect(await screen.findByRole("heading", { name: "Consent ledger" })).toBeInTheDocument();
    const next = screen.getByRole("navigation", { name: "Compliance" });
    expect(within(next).getByRole("link", { name: "Consent ledger" })).toHaveAttribute("aria-current", "page");
    expect(within(next).getByRole("link", { name: "Documents" })).not.toHaveAttribute("aria-current");
    await userEvent.click(within(next).getByRole("link", { name: "Staff access log" }));
    expect(await screen.findByRole("heading", { name: "Staff access log" })).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("navigation", { name: "Compliance" })).getByRole("link", { name: "Customer requests" }));
    expect(await screen.findByRole("heading", { name: "Customer requests" })).toBeInTheDocument();
  });

  it("are open to Admin and Compliance, and closed to the rest", async () => {
    for (const route of ["/settings/compliance/consents", "/settings/compliance/access-log", "/settings/compliance/requests"]) {
      for (const as of ["admin", "compliance"] as const) {
        const { unmount } = renderConsole({ route, as });
        expect(await screen.findByRole("navigation", { name: "Compliance" })).toBeInTheDocument();
        unmount();
      }
      for (const as of ["marketing", "branch", "readonly"] as const) {
        const { unmount } = renderConsole({ route, as });
        expect(await screen.findByRole("heading", { name: "You don't have access to Compliance" })).toBeInTheDocument();
        unmount();
      }
    }
  });
});

describe("Consent ledger (I9.1)", () => {
  it("counts who is sharing and who stopped, and says the list is the latest changes, not everyone", async () => {
    const { container } = renderConsole({ route: "/settings/compliance/consents" });
    expect(await screen.findByText("471")).toBeInTheDocument();
    expect(screen.getByText("Sharing now").closest("dl")).toHaveTextContent("471");
    expect(screen.getByText("Shared, then stopped").closest("dl")).toHaveTextContent("38");
    expect(screen.getByText(/The most recent 12 changes, newest first\. Not every customer\./)).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("lists each change with the customer shortened, what they chose, and when", async () => {
    renderConsole({ route: "/settings/compliance/consents" });
    await screen.findByRole("table", { name: "Latest consent changes" });
    expect(bodyRows()).toHaveLength(12);
    const first = within(bodyRows()[0]);
    expect(first.getByText("Rohit K.")).toBeInTheDocument();
    expect(first.getByText("C-1041")).toBeInTheDocument();
    expect(first.getByText("Started sharing")).toBeInTheDocument();
    expect(first.getByText("16 Nov 2026, 2:12 pm")).toBeInTheDocument();
    expect(within(bodyRows()[2]).getByText("Stopped sharing")).toBeInTheDocument();
  });

  it("filters the changes to those who started, or those who stopped", async () => {
    renderConsole({ route: "/settings/compliance/consents" });
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText("Show"), "stopped");
    expect(bodyRows()).toHaveLength(3);
    for (const r of bodyRows()) expect(within(r).getByText("Stopped sharing")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Show"), "sharing");
    expect(bodyRows()).toHaveLength(9);
    await user.selectOptions(screen.getByLabelText("Show"), "");
    expect(bodyRows()).toHaveLength(12);
  });

  it("says no one has chosen to share yet for a new bank, with zero counts", async () => {
    renderConsole({ route: "/settings/compliance/consents", bank: "new" });
    expect(await screen.findByRole("heading", { name: "No one has chosen to share yet" })).toBeInTheDocument();
    expect(screen.getByText("Sharing now").closest("dl")).toHaveTextContent("0");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("consentLedger");
    renderConsole({ route: "/settings/compliance/consents", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("471")).toBeInTheDocument();
  });
});

describe("Staff access log (I9.2)", () => {
  it("lists who opened whom and why, newest first, with customers shortened", async () => {
    const { container } = renderConsole({ route: "/settings/compliance/access-log" });
    await screen.findByRole("table", { name: "Staff access log, newest first" });
    expect(bodyRows()).toHaveLength(8);
    const first = within(bodyRows()[0]);
    expect(first.getByText("Suresh Pawar")).toBeInTheDocument();
    expect(first.getByText("Rohit K.")).toBeInTheDocument();
    expect(first.getByText("C-1041")).toBeInTheDocument();
    expect(first.getByText("Viewed opportunity")).toBeInTheDocument();
    expect(first.getByText("16 Nov 2026, 3:42 pm")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("shows an export as an export, with no reference to fake", async () => {
    renderConsole({ route: "/settings/compliance/access-log" });
    await screen.findByRole("table");
    const exportRow = within(screen.getByRole("row", { name: /Exported opportunity list/ }));
    expect(exportRow.getByText("12 customers")).toBeInTheDocument();
    expect(exportRow.queryByText("—")).not.toBeInTheDocument();
  });

  it("shows a view that staff just made, written by the opportunity screen", async () => {
    const api = createMockConsoleApi();
    await api.opportunity("o7", { staffId: "x", name: "Neha Patil" });
    renderConsole({ route: "/settings/compliance/access-log", api });
    await screen.findByRole("table");
    expect(bodyRows()).toHaveLength(9);
    expect(within(bodyRows()[0]).getByText("Sanjay B.")).toBeInTheDocument();
  });

  it("exports the log as a CSV with everything on screen", async () => {
    renderConsole({ route: "/settings/compliance/access-log" });
    await userEvent.click(await screen.findByRole("button", { name: "Export as CSV" }));
    expect(downloadText).toHaveBeenCalledTimes(1);
    const [filename, text] = vi.mocked(downloadText).mock.calls[0];
    expect(filename).toBe("staff-access-log.csv");
    const lines = text.trim().split("\r\n");
    expect(lines[0]).toBe("When (IST),Staff member,Customer,Reference,Reason");
    expect(lines).toHaveLength(9);
    // The date has a comma in it, so it is quoted.
    expect(lines[1]).toBe('"16 Nov 2026, 3:42 pm",Suresh Pawar,Rohit K.,C-1041,Viewed opportunity');
  });

  it("says no one has opened a customer yet for a new bank, and offers no export", async () => {
    renderConsole({ route: "/settings/compliance/access-log", bank: "new" });
    expect(await screen.findByRole("heading", { name: "No one has opened a customer yet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export as CSV" })).not.toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("accessLog");
    renderConsole({ route: "/settings/compliance/access-log", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});

describe("Customer requests (I9.3)", () => {
  it("lists each request with what was asked, when it came, when it is due, and its status", async () => {
    const { container } = renderConsole({ route: "/settings/compliance/requests" });
    await screen.findByRole("table", { name: "Customer requests" });
    expect(bodyRows()).toHaveLength(4);
    const first = within(bodyRows()[0]);
    expect(first.getByText("C-1041")).toBeInTheDocument();
    expect(first.getByText("Export their data")).toBeInTheDocument();
    expect(first.getByText("10 Nov 2026")).toBeInTheDocument();
    expect(first.getByText("24 Nov 2026")).toBeInTheDocument();
    expect(first.getByText("Open")).toBeInTheDocument();
    expect(within(bodyRows()[1]).getByText("Delete their data")).toBeInTheDocument();
    expect(within(bodyRows()[2]).getByText("Done")).toBeInTheDocument();
    expect(screen.getByText(/Finous deals with the data Finous holds/)).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("offers Mark as done only on requests that are still open", async () => {
    renderConsole({ route: "/settings/compliance/requests" });
    await screen.findByRole("table");
    expect(screen.getAllByRole("button", { name: /Mark as done/ })).toHaveLength(2);
    expect(within(bodyRows()[2]).queryByRole("button")).not.toBeInTheDocument();
  });

  it("asks first, saying what must be true, and a cancel changes nothing", async () => {
    const { api } = renderConsole({ route: "/settings/compliance/requests" });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Mark as done for C-1041" }));
    expect(screen.getByText(/has been sent to the customer/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText(/has been sent to the customer/)).not.toBeInTheDocument();
    expect(api.saved.completed).toHaveLength(0);
  });

  it("says a deletion must really have been done, in its own words", async () => {
    renderConsole({ route: "/settings/compliance/requests" });
    await userEvent.click(await screen.findByRole("button", { name: "Mark as done for C-1044" }));
    expect(screen.getByText(/has been deleted/)).toBeInTheDocument();
  });

  it("marks one done once confirmed, records who did it, and leaves the others open", async () => {
    const { api } = renderConsole({ route: "/settings/compliance/requests" });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Mark as done for C-1041" }));
    await user.click(screen.getByRole("button", { name: "Yes, it's done for C-1041" }));
    await waitFor(() => expect(within(bodyRows()[0]).getByText("Done")).toBeInTheDocument());
    expect(within(bodyRows()[0]).queryByRole("button")).not.toBeInTheDocument();
    expect(within(bodyRows()[1]).getByText("Open")).toBeInTheDocument();
    expect(api.saved.completed).toEqual([{ id: "r1", by: "admin@demobank.example" }]);
  });

  it("says nothing was changed when it can't be saved, and lets them try again", async () => {
    const api = createMockConsoleApi();
    renderConsole({ route: "/settings/compliance/requests", api });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Mark as done for C-1041" }));
    api.failNext("completeRequest");
    await user.click(screen.getByRole("button", { name: "Yes, it's done for C-1041" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was changed");
    expect(within(bodyRows()[0]).getByText("Open")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Yes, it's done for C-1041" }));
    await waitFor(() => expect(within(bodyRows()[0]).getByText("Done")).toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says there are none for a new bank", async () => {
    renderConsole({ route: "/settings/compliance/requests", bank: "new" });
    expect(await screen.findByRole("heading", { name: "No requests" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("customerRequests");
    renderConsole({ route: "/settings/compliance/requests", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
