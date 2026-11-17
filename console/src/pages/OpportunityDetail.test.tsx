import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

describe("Opportunity detail (I3.2)", () => {
  it("says who and why: the customer, what they shared, the product, and where it stands", async () => {
    const { container } = renderConsole({ route: "/opportunities/o3" });
    expect(await screen.findByRole("heading", { name: "Amit J." })).toBeInTheDocument();
    expect(screen.getByText("C-1043 · Refinance · Main branch")).toBeInTheDocument();
    const shared = within(screen.getByRole("heading", { name: "What they shared" }).closest("section")!);
    expect(shared.getByText("Loan outstanding")).toBeInTheDocument();
    expect(shared.getByText("₹18,20,000")).toBeInTheDocument();
    expect(shared.getByText("9.9% a year")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Home loan" })).toHaveAttribute("href", "/products/p1/edit");
    const stands = within(screen.getByRole("heading", { name: "Where it stands" }).closest("section")!);
    expect(stands.getByText("Contacted")).toBeInTheDocument();
    expect(stands.getByText("14 Nov 2026")).toBeInTheDocument();
    expect(stands.getByText("Suresh Pawar")).toBeInTheDocument();
    expect(stands.getByText("15 Nov 2026, 3:45 pm")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("says this view is logged, and writes it to the log under the staff member who opened it", async () => {
    const { api } = renderConsole({ route: "/opportunities/o1" });
    expect(await screen.findByText(/This view is logged/)).toBeInTheDocument();
    const log = await api.accessLog();
    expect(log[0]).toMatchObject({ staff: "Meera Joshi", customer: "Rohit K.", ref: "C-1041", reason: "Viewed opportunity" });
  });

  it("logs the branch member's own name, not an Admin's", async () => {
    const { api } = renderConsole({ route: "/opportunities/o1", as: "branch" });
    await screen.findByRole("heading", { name: "Rohit K." });
    expect((await api.accessLog())[0].staff).toBe("Suresh Pawar");
  });

  it("offers to add a product when there is none for this customer, and says no one has been in touch", async () => {
    renderConsole({ route: "/opportunities/o4" });
    expect(await screen.findByText(/You have no product for this yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add one to your catalogue" })).toHaveAttribute("href", "/products/new");
    expect(screen.getByText("Not contacted yet")).toBeInTheDocument();
    expect(screen.getByText("Nobody yet")).toBeInTheDocument();
  });

  it("opens the follow-up log", async () => {
    renderConsole({ route: "/opportunities/o5" });
    await userEvent.click(await screen.findByRole("link", { name: "Open the follow-up log" }));
    expect(await screen.findByRole("heading", { name: "Follow-up: Vikram P." })).toBeInTheDocument();
  });

  it("says plainly when the customer can't be found, and logs nothing", async () => {
    const { api } = renderConsole({ route: "/opportunities/nope" });
    expect(await screen.findByRole("heading", { name: "We can't find that customer" })).toBeInTheDocument();
    expect(await api.accessLog()).toHaveLength(8);
    expect(screen.getByRole("link", { name: "Back to the opportunities" })).toHaveAttribute("href", "/opportunities");
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("opportunity");
    renderConsole({ route: "/opportunities/o1", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Rohit K." })).toBeInTheDocument();
  });

  it("is closed to compliance and read-only roles, and logs nothing for them", async () => {
    for (const as of ["compliance", "readonly"] as const) {
      const { api, unmount } = renderConsole({ route: "/opportunities/o1", as });
      expect(await screen.findByRole("heading", { name: "You don't have access to Opportunities" })).toBeInTheDocument();
      expect(await api.accessLog()).toHaveLength(8);
      unmount();
    }
  });
});

async function openLog(id: string, options: { api?: MockConsoleApi; as?: "admin" | "branch" } = {}) {
  const view = renderConsole({ route: `/opportunities/${id}/follow-up`, ...options });
  await screen.findByRole("heading", { name: /^Follow-up:/ });
  return { ...view, user: userEvent.setup() };
}

const history = () => within(screen.getByRole("list", { name: "Follow-up history, newest first" })).getAllByRole("listitem");

describe("Follow-up log (I3.3)", () => {
  it("shows what has happened, newest first, with who said it and when", async () => {
    const { container } = await openLog("o5");
    expect(screen.getByText(/C-1045\. Track what was said/)).toBeInTheDocument();
    const items = history();
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Interested")).toBeInTheDocument();
    expect(items[0]).toHaveTextContent("Wants figures for ₹3 lakh over 5 years");
    expect(items[0]).toHaveTextContent("Suresh Pawar, 15 Nov 2026, 10:00 pm");
    expect(within(items[1]).getByText("Contacted")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("says the first update starts the log when there is none", async () => {
    await openLog("o1");
    expect(screen.getByText(/The first update starts the log/)).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Follow-up history, newest first" })).not.toBeInTheDocument();
  });

  it("starts the form at the customer's current status and assignee", async () => {
    await openLog("o5");
    expect(screen.getByLabelText("Status")).toHaveValue("interested");
    expect(screen.getByLabelText("Assigned to")).toHaveValue("s4");
    await screen.findByText("Add an update");
  });

  it("offers only people who can act: staff who have signed in, with their branch", async () => {
    const api = createMockConsoleApi();
    await api.inviteStaff({ email: "invited@demobank.example", role: "branch", branch: null });
    await openLog("o1", { api });
    const options = within(screen.getByLabelText("Assigned to")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Nobody yet", "Meera Joshi (all branches)", "Imran Shaikh (all branches)", "Neha Patil (all branches)", "Suresh Pawar (Main branch)", "Kavita Rao (all branches)"]);
  });

  it("asks for a note of some substance before adding an update, and adds nothing without one", async () => {
    const { user, api } = await openLog("o1");
    await user.click(screen.getByRole("button", { name: "Add update" }));
    expect(await screen.findByText("Write what happened, at least 5 characters.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("What happened"), "Hi");
    expect(screen.getByLabelText("What happened")).toHaveAttribute("aria-invalid", "true");
    expect(api.saved.followUps).toHaveLength(0);
  });

  it("adds the update at the top of the history, clears the note, and moves the customer's status and assignee", async () => {
    const { user, api } = await openLog("o1");
    await user.selectOptions(screen.getByLabelText("Status"), "contacted");
    await user.selectOptions(screen.getByLabelText("Assigned to"), "s3");
    await user.type(screen.getByLabelText("What happened"), "  Called, will visit on Monday. ");
    await user.click(screen.getByRole("button", { name: "Add update" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(history()[0]).toHaveTextContent("Called, will visit on Monday.");
    expect(history()[0]).toHaveTextContent("Meera Joshi");
    expect(history()[0]).toHaveTextContent("Assigned to Neha Patil");
    expect(screen.getByLabelText("What happened")).toHaveValue("");
    const o1 = (await api.opportunities({})).items.find((o) => o.id === "o1")!;
    expect(o1).toMatchObject({ status: "contacted", assignee: "Neha Patil" });
  });

  it("can leave a customer with nobody assigned", async () => {
    const { user, api } = await openLog("o5");
    await user.selectOptions(screen.getByLabelText("Assigned to"), "");
    await user.type(screen.getByLabelText("What happened"), "Handing back to the pool.");
    await user.click(screen.getByRole("button", { name: "Add update" }));
    await screen.findByText("Saved.");
    expect((await api.opportunities({})).items.find((o) => o.id === "o5")?.assignee).toBeNull();
  });

  it("logs the opening, because the screen shows the customer", async () => {
    const { api } = await openLog("o6", { as: "branch" });
    expect((await api.accessLog())[0]).toMatchObject({ staff: "Suresh Pawar", customer: "Anita M.", reason: "Viewed opportunity" });
  });

  it("keeps the note and says so when it can't be saved, then saves on a retry", async () => {
    const api = createMockConsoleApi();
    const { user } = await openLog("o1", { api });
    await user.type(screen.getByLabelText("What happened"), "Called, no answer.");
    api.failNext("addFollowUp");
    await user.click(screen.getByRole("button", { name: "Add update" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your changes are still here");
    expect(screen.getByLabelText("What happened")).toHaveValue("Called, no answer.");
    expect(screen.queryByRole("list", { name: "Follow-up history, newest first" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add update" }));
    await waitFor(() => expect(history()).toHaveLength(1));
  });

  it("links back to the customer and to the list", async () => {
    await openLog("o3");
    expect(screen.getByRole("link", { name: "Back to Amit J." })).toHaveAttribute("href", "/opportunities/o3");
    expect(screen.getByRole("link", { name: "Back to the opportunities" })).toHaveAttribute("href", "/opportunities");
  });

  it("says plainly when the customer can't be found", async () => {
    renderConsole({ route: "/opportunities/nope/follow-up" });
    expect(await screen.findByRole("heading", { name: "We can't find that customer" })).toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("followUps");
    renderConsole({ route: "/opportunities/o1/follow-up", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: /^Follow-up:/ })).toBeInTheDocument();
  });
});
