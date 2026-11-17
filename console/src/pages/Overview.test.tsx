import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import type { Overview } from "../api/types";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

/** The same mock, but with the overview changed, for the states the demo bank never shows. */
function withOverview(patch: Partial<Overview>): MockConsoleApi {
  const api = createMockConsoleApi();
  return { ...api, overview: async (options) => ({ ...(await api.overview(options)), ...patch }) };
}

describe("Overview (I2.1)", () => {
  it("shows the four totals and the feed for a bank with customers, and says the figures are sample data", async () => {
    const { container } = renderConsole();
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(await screen.findByText("1,240")).toBeInTheDocument();
    expect(screen.getByText("612")).toBeInTheDocument();
    expect(screen.getByText("38%")).toBeInTheDocument();
    expect(screen.getByText("2,310")).toBeInTheDocument();
    expect(screen.getByText("Opened the app in October 2026")).toBeInTheDocument();
    expect(screen.getByText(/demo bank with sample figures/)).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("pairs each label with its number", async () => {
    renderConsole();
    const label = await screen.findByText("Sign-ups");
    expect(label.closest("dl")).toHaveTextContent("1,240");
    expect(screen.getByText("Sharing with the bank").closest("dl")).toHaveTextContent("38%");
  });

  it("shows the feed as healthy for the demo bank, with the day it last ran", async () => {
    renderConsole();
    await screen.findByText("1,240");
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Last ran on 17 Nov 2026.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the feed" })).toHaveAttribute("href", "/settings/integration");
  });

  it("says the feed is not connected and links to its setup", async () => {
    renderConsole({ feed: "not_connected" });
    await screen.findByText("1,240");
    expect(screen.getByText(/Customers see only what they enter themselves/)).toBeInTheDocument();
    expect(screen.getByText("Not connected")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set up the feed" })).toHaveAttribute("href", "/settings/integration");
  });

  it("shows a feed that is healthy, or failing, with the day it last ran", async () => {
    const healthy = renderConsole({ api: withOverview({ feed: { state: "healthy", lastRun: "2026-11-16T02:00:00Z" } }) });
    expect(await screen.findByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Last ran on 16 Nov 2026.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See the feed" })).toBeInTheDocument();
    healthy.unmount();

    renderConsole({ api: withOverview({ feed: { state: "failing", lastRun: "2026-11-10T02:00:00Z" } }) });
    expect(await screen.findByText("Failing")).toBeInTheDocument();
    expect(screen.getByText("Last ran on 10 Nov 2026.")).toBeInTheDocument();
  });

  it("shows a dash, not 0%, when nobody could have chosen to share", async () => {
    renderConsole({ api: withOverview({ signUps: 5, sharingPercent: null }) });
    expect(await screen.findByText("–")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("shows a zero as 0%, which is not the same as a dash", async () => {
    renderConsole({ api: withOverview({ signUps: 5, sharingPercent: 0 }) });
    expect(await screen.findByText("0%")).toBeInTheDocument();
  });

  it("holds placeholder blocks while loading, with no spinner", () => {
    renderConsole();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("overview");
    renderConsole({ api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1,240")).toBeInTheDocument();
  });
});

describe("Overview with no customers yet (S.3)", () => {
  it("says there are no customers, with the launch checklist and a way to start", async () => {
    const { container } = renderConsole({ bank: "new" });
    expect(await screen.findByRole("heading", { name: "No customers yet" })).toBeInTheDocument();
    expect(screen.queryByText("Sign-ups")).not.toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Launch checklist" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(within(list).getAllByText("To do")).toHaveLength(4);
    await expectAccessible(container);
  });

  it("points the main button at the first step still to do", async () => {
    const api = createMockConsoleApi({ bank: "new" });
    await api.saveBranding(await api.branding());
    renderConsole({ api });
    await screen.findByRole("heading", { name: "No customers yet" });
    const buttons = screen.getAllByRole("link", { name: "Choose your web address" });
    expect(buttons[0]).toHaveAttribute("href", "/settings/app/address");
    const ticks = within(screen.getByRole("list", { name: "Launch checklist" })).getAllByRole("listitem").map((li) => li.textContent);
    expect(ticks[0]).toContain("Done");
    expect(ticks[1]).toContain("To do");
  });

  it("walks from the checklist to the branding screen", async () => {
    renderConsole({ bank: "new" });
    await screen.findByRole("heading", { name: "No customers yet" });
    await userEvent.click(within(screen.getByRole("list", { name: "Launch checklist" })).getByRole("link", { name: "Set your bank's name and colours" }));
    expect(await screen.findByRole("heading", { name: "Branding and app" })).toBeInTheDocument();
  });

  it("drops the sample-data banner for a bank that isn't the demo", async () => {
    renderConsole({ bank: "new" });
    await screen.findByRole("heading", { name: "No customers yet" });
    expect(screen.queryByText(/sample figures/)).not.toBeInTheDocument();
  });

  it("offers no start button once every step is done", async () => {
    const api = createMockConsoleApi({ bank: "new" });
    await api.saveBranding(await api.branding());
    await api.saveAddress({ subdomain: "ours", installName: "Ours" });
    await api.saveLanguages({ english: true, hindi: true, advisor: "rules" });
    await api.inviteStaff({ email: "a@b.example", role: "branch", branch: null });
    renderConsole({ api });
    await screen.findByRole("heading", { name: "No customers yet" });
    expect(screen.getAllByText("Done")).toHaveLength(4);
    expect(screen.getAllByRole("link", { name: "Set your bank's name and colours" })).toHaveLength(1);
  });
});
