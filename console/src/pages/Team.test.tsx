import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiError } from "../api/errors";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const row = (name: string | RegExp) => within(screen.getByRole("row", { name }));

describe("Team (I8.1)", () => {
  it("lists everyone with their role, branch, last visit and status", async () => {
    const { container } = renderConsole({ route: "/settings/team" });
    expect(await screen.findByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(await screen.findAllByRole("row")).toHaveLength(6);
    const admin = row(/Meera Joshi/);
    expect(admin.getByText("admin@demobank.example")).toBeInTheDocument();
    expect(admin.getByText("Admin")).toBeInTheDocument();
    expect(admin.getByText("All branches")).toBeInTheDocument();
    expect(admin.getByText("16 Nov 2026")).toBeInTheDocument();
    expect(admin.getByText("Active")).toBeInTheDocument();
    expect(row(/Suresh Pawar/).getByText("Main branch")).toBeInTheDocument();
    expect(row(/Kavita Rao/).getByText("Never")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("names the table for a screen reader", async () => {
    renderConsole({ route: "/settings/team" });
    expect(await screen.findByRole("table", { name: "Staff with access to the console" })).toBeInTheDocument();
  });

  it("offers Invite staff", async () => {
    renderConsole({ route: "/settings/team" });
    await userEvent.click(await screen.findByRole("link", { name: "Invite staff" }));
    expect(await screen.findByRole("heading", { name: "Invite staff" })).toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("staff");
    renderConsole({ route: "/settings/team", api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});

async function openInvite(api?: MockConsoleApi) {
  const view = renderConsole({ route: "/settings/team/invite", api });
  await screen.findByLabelText("Work email");
  return { ...view, user: userEvent.setup() };
}

describe("Invite staff (I8.2)", () => {
  it("asks for an email, a role and a branch, and is accessible", async () => {
    const { container } = await openInvite();
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Branch")).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("lists every role and every branch, with All branches first", async () => {
    await openInvite();
    const roles = within(screen.getByLabelText("Role")).getAllByRole("option").map((o) => o.textContent);
    expect(roles).toEqual(["Choose a role", "Admin", "Compliance", "Marketing", "Branch", "Read-only"]);
    const branches = within(screen.getByLabelText("Branch")).getAllByRole("option").map((o) => o.textContent);
    expect(branches).toEqual(["Choose a branch", "All branches", "Main branch", "Market Road branch", "Station branch"]);
  });

  it("says what a role is for once they pick it", async () => {
    const { user } = await openInvite();
    await user.selectOptions(screen.getByLabelText("Role"), "branch");
    expect(screen.getByText(/opportunities for their branch/)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Role"), "readonly");
    expect(screen.getByText(/Nothing can be changed/)).toBeInTheDocument();
  });

  it("shows all three problems at once, only after they try to send, and sends nothing", async () => {
    const { user, api } = await openInvite();
    expect(screen.queryByText(/Choose a role\./)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByText(/Enter a work email/)).toBeInTheDocument();
    expect(screen.getByText("Choose a role.")).toBeInTheDocument();
    expect(screen.getByText(/Choose a branch, or All branches/)).toBeInTheDocument();
    expect((await api.staff()).members).toHaveLength(5);
  });

  it("refuses an email that already has access, before asking the server", async () => {
    const { user } = await openInvite();
    await user.type(screen.getByLabelText("Work email"), "Admin@DemoBank.example");
    await user.selectOptions(screen.getByLabelText("Role"), "marketing");
    await user.selectOptions(screen.getByLabelText("Branch"), "all");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByText(/already has access or an open invitation/)).toBeInTheDocument();
  });

  it("sends the invitation and shows the person as Invited on the team screen", async () => {
    const { user } = await openInvite();
    await user.type(screen.getByLabelText("Work email"), "New.Person@DemoBank.example");
    await user.selectOptions(screen.getByLabelText("Role"), "branch");
    await user.selectOptions(screen.getByLabelText("Branch"), "Station branch");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("heading", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByText("Invitation sent to new.person@demobank.example.")).toBeInTheDocument();
    const invited = row(/new\.person@demobank\.example/);
    expect(invited.getByText("Invited")).toBeInTheDocument();
    expect(invited.getByText("Branch")).toBeInTheDocument();
    expect(invited.getByText("Station branch")).toBeInTheDocument();
    expect(invited.getByText("Not signed in yet")).toBeInTheDocument();
  });

  it("records All branches as no branch at all", async () => {
    const { user, api } = await openInvite();
    await user.type(screen.getByLabelText("Work email"), "all@demobank.example");
    await user.selectOptions(screen.getByLabelText("Role"), "marketing");
    await user.selectOptions(screen.getByLabelText("Branch"), "all");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    await screen.findByRole("heading", { name: "Team" });
    expect((await api.staff()).members.at(-1)).toMatchObject({ email: "all@demobank.example", branch: null, role: "marketing" });
  });

  it("stays on the form, keeping what they typed, when the server says the person already has access", async () => {
    const base = createMockConsoleApi();
    const racy: MockConsoleApi = { ...base, inviteStaff: async () => { throw new ApiError("conflict"); } };
    const { user } = await openInvite(racy);
    await user.type(screen.getByLabelText("Work email"), "race@demobank.example");
    await user.selectOptions(screen.getByLabelText("Role"), "branch");
    await user.selectOptions(screen.getByLabelText("Branch"), "all");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("already has access or an open invitation");
    expect(screen.getByLabelText("Work email")).toHaveValue("race@demobank.example");
    expect(screen.queryByRole("heading", { name: "Team" })).not.toBeInTheDocument();
  });

  it("says when the invitation couldn't be sent, keeps the form, and sends on a retry", async () => {
    const api = createMockConsoleApi();
    const { user } = await openInvite(api);
    await user.type(screen.getByLabelText("Work email"), "retry@demobank.example");
    await user.selectOptions(screen.getByLabelText("Role"), "readonly");
    await user.selectOptions(screen.getByLabelText("Branch"), "all");
    api.failNext("inviteStaff");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't send the invitation");
    expect(screen.getByLabelText("Work email")).toHaveValue("retry@demobank.example");
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    expect(await screen.findByText("Invitation sent to retry@demobank.example.")).toBeInTheDocument();
  });

  it("offers a way back to the team", async () => {
    const { user } = await openInvite();
    await user.click(screen.getByRole("link", { name: "Back to the team" }));
    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
