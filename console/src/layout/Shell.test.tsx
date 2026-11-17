import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockConsoleApi } from "../api/mock";
import type { Role } from "../lib/access";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const nav = () => within(screen.getByRole("navigation", { name: "Console" }));
const linkNames = () => nav().getAllByRole("link").map((l) => l.textContent);

/** A screen that crashes on purpose makes React and jsdom print the error. Keep the output readable. */
const hush = (event: ErrorEvent) => event.preventDefault();
function quietCrashes() {
  vi.spyOn(console, "error").mockImplementation(() => {});
  window.addEventListener("error", hush);
}

afterEach(() => {
  window.removeEventListener("error", hush);
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
});

describe("the console frame", () => {
  it("shows an Admin every screen in the sidebar, with settings grouped", async () => {
    renderConsole({ as: "admin" });
    await screen.findByRole("heading", { name: "Overview" });
    expect(linkNames()).toEqual(["Overview", "Opportunities", "Campaigns", "Products", "Reports", "Branding and app", "Integration", "Team", "Compliance", "Billing", "Help"]);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it.each<[Role, string[]]>([
    ["compliance", ["Overview", "Products", "Reports", "Compliance", "Help"]],
    ["marketing", ["Overview", "Opportunities", "Campaigns", "Products", "Reports", "Help"]],
    ["branch", ["Overview", "Opportunities", "Reports", "Help"]],
    ["readonly", ["Overview", "Reports", "Help"]],
  ])("shows %s only what they can open", async (role, expected) => {
    renderConsole({ as: role });
    await screen.findByRole("heading", { name: "Overview" });
    expect(linkNames()).toEqual(expected);
  });

  it("says who is signed in, with their bank and role", async () => {
    renderConsole({ as: "compliance" });
    await screen.findByRole("heading", { name: "Overview" });
    expect(screen.getByText("Imran Shaikh")).toBeInTheDocument();
    expect(screen.getByText("Demo Co-operative Bank")).toBeInTheDocument();
    // The role tag, not the sidebar link of the same name.
    expect(within(screen.getByRole("complementary")).getByText("Compliance", { selector: "span" })).toBeInTheDocument();
  });

  it("marks the current screen, and keeps Branding and app marked under its sub-screens", async () => {
    renderConsole({ route: "/settings/app/address" });
    await screen.findByRole("heading", { name: "Branding and app" });
    expect(nav().getByRole("link", { name: "Branding and app" })).toHaveAttribute("aria-current", "page");
    expect(nav().getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("marks the overview only on the overview itself", async () => {
    renderConsole({ route: "/help" });
    await screen.findByRole("heading", { name: "Help" });
    expect(nav().getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
    expect(nav().getByRole("link", { name: "Help" })).toHaveAttribute("aria-current", "page");
  });

  it("signs out and goes back to sign-in", async () => {
    const { auth } = renderConsole();
    await screen.findByRole("heading", { name: "Overview" });
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(auth.calls.signedOut).toBe(1);
  });

  it("opens and closes the menu on a narrow screen, and says so to assistive technology", async () => {
    renderConsole();
    await screen.findByRole("heading", { name: "Overview" });
    const menu = screen.getByRole("button", { name: "Menu" });
    expect(menu).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(menu);
    expect(menu).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(nav().getByRole("link", { name: "Help" }));
    expect(menu).toHaveAttribute("aria-expanded", "false");
  });

  it("offers a skip link to the content", async () => {
    renderConsole();
    await screen.findByRole("heading", { name: "Overview" });
    expect(screen.getByRole("link", { name: "Skip to the content" })).toHaveAttribute("href", "#main");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("is accessible", async () => {
    const { container } = renderConsole();
    await screen.findByRole("heading", { name: "Overview" });
    await expectAccessible(container);
  });
});

describe("no access (I1.3)", () => {
  it("tells a role it can't open a screen what is blocked, who can open it, and the way back", async () => {
    const { container } = renderConsole({ as: "readonly", route: "/settings/team" });
    expect(await screen.findByRole("heading", { name: "You don't have access to Team" })).toBeInTheDocument();
    expect(screen.getByText(/signed in with the Read-only role/)).toBeInTheDocument();
    expect(screen.getByText(/open to these roles: Admin\./)).toBeInTheDocument();
    expect(screen.getByText(/Ask an Admin/)).toBeInTheDocument();
    await expectAccessible(container);
    await userEvent.click(screen.getByRole("link", { name: "Back to the overview" }));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("names every role that can open the screen", async () => {
    renderConsole({ as: "marketing", route: "/settings/compliance" });
    expect(await screen.findByRole("heading", { name: "You don't have access to Compliance" })).toBeInTheDocument();
    expect(screen.getByText(/open to these roles: Admin, Compliance\./)).toBeInTheDocument();
  });

  it("blocks each setup screen for a role that is not an Admin", async () => {
    for (const [route, title] of [
      ["/settings/app/branding", "Branding and app"],
      ["/settings/app/address", "Branding and app"],
      ["/settings/app/languages", "Branding and app"],
      ["/settings/integration", "Integration"],
      ["/settings/team/invite", "Team"],
      ["/settings/billing", "Billing"],
      ["/campaigns", "Campaigns"],
    ] as const) {
      const { unmount } = renderConsole({ as: "branch", route });
      expect(await screen.findByRole("heading", { name: `You don't have access to ${title}` })).toBeInTheDocument();
      unmount();
    }
  });

  it("lets the right role in", async () => {
    renderConsole({ as: "compliance", route: "/settings/compliance" });
    expect(await screen.findByRole("heading", { name: "Compliance documents" })).toBeInTheDocument();
  });
});

describe("system screens (S.1, S.2)", () => {
  it("shows the offline screen instead of the content when the connection drops, with no figures from before", async () => {
    renderConsole();
    await screen.findByText("1,240");
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    fireEvent(window, new Event("offline"));
    expect(await screen.findByRole("heading", { name: "You're offline" })).toBeInTheDocument();
    expect(screen.queryByText("1,240")).not.toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Console" })).toBeInTheDocument();
  });

  it("comes back when the connection returns", async () => {
    renderConsole();
    await screen.findByText("1,240");
    fireEvent(window, new Event("offline"));
    await screen.findByRole("heading", { name: "You're offline" });
    fireEvent(window, new Event("online"));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("checks the network for real when they try again, and stays offline if it fails", async () => {
    const fetchStub = vi.fn().mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchStub);
    renderConsole();
    await screen.findByText("1,240");
    fireEvent(window, new Event("offline"));
    await screen.findByRole("heading", { name: "You're offline" });

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: "You're offline" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("shows the error screen when a screen crashes, and recovers when they go elsewhere", async () => {
    quietCrashes();
    const api = createMockConsoleApi();
    const broken = { ...api, overview: async () => ({ ...(await api.overview()), signUps: 0, launch: undefined as never }) };
    const { container } = renderConsole({ api: broken });
    expect(await screen.findByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    await expectAccessible(container);

    await userEvent.click(nav().getByRole("link", { name: "Help" }));
    expect(await screen.findByRole("heading", { name: "Help" })).toBeInTheDocument();
  });

  it("offers Report a problem on the error screen, which opens Help set to a problem", async () => {
    quietCrashes();
    const api = createMockConsoleApi();
    const broken = { ...api, overview: async () => ({ ...(await api.overview()), signUps: 0, launch: undefined as never }) };
    renderConsole({ api: broken });
    await userEvent.click(await screen.findByRole("link", { name: "Report a problem" }));
    expect(await screen.findByRole("heading", { name: "Help" })).toBeInTheDocument();
    expect(screen.getByLabelText("Topic")).toHaveValue("problem");
  });

  it("tries a crashed screen again from the Try again button", async () => {
    quietCrashes();
    let crash = true;
    const api = createMockConsoleApi();
    const flaky = { ...api, overview: async () => ({ ...(await api.overview()), ...(crash ? { signUps: 0, launch: undefined as never } : {}) }) };
    renderConsole({ api: flaky });
    await screen.findByRole("heading", { name: "Something went wrong" });
    crash = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("1,240")).toBeInTheDocument();
  });

  it("says plainly when an address doesn't exist, with a way back", async () => {
    renderConsole({ route: "/nowhere" });
    expect(await screen.findByRole("heading", { name: "We can't find that page" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: "Back to the overview" }));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("shows a screen still to be built as not available yet, with a way back", async () => {
    const { container } = renderConsole({ route: "/campaigns" });
    expect(await screen.findByRole("heading", { name: "Campaigns" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Not available yet" })).toBeInTheDocument();
    await expectAccessible(container);
    await userEvent.click(screen.getByRole("link", { name: "Back to the overview" }));
    expect(await screen.findByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });

  it("sends the old settings address to Branding", async () => {
    renderConsole({ route: "/settings/app" });
    expect(await screen.findByLabelText("Bank name")).toBeInTheDocument();
  });
});
