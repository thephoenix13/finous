// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { ApiError, ApiProvider, createMockApi, type Api } from "../api";
import { createI18n, type Language } from "../i18n";
import { firstRunDone, markFirstRunDone } from "../lib/firstRun";
import { expectAccessible } from "../test/a11y";

const KEY = "finous.firstRunDone";

function open(route: string, lng: Language = "en", api: Api = createMockApi()) {
  window.history.pushState({}, "", route);
  return render(
    <I18nextProvider i18n={createI18n(lng)}>
      <ApiProvider api={api}>
        <App />
      </ApiProvider>
    </I18nextProvider>,
  );
}
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
/** The sync screen schedules each step from the one before, so time has to pass in steps for React to schedule the next. */
const tick = async (steps: number) => {
  for (let i = 0; i < steps; i++) await advance(500);
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
  window.history.pushState({}, "", "/");
});

describe("firstRun storage", () => {
  it("is done once marked, and not before", () => {
    localStorage.removeItem(KEY);
    expect(firstRunDone()).toBe(false);
    markFirstRunDone();
    expect(firstRunDone()).toBe(true);
  });

  it("counts as done when storage cannot be read, so the welcome never traps anyone", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(firstRunDone()).toBe(true);
  });

  it("does not throw when storage cannot be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => markFirstRunDone()).not.toThrow();
  });
});

describe("The front door", () => {
  it("sends a first-time visitor from Home to the welcome", async () => {
    localStorage.removeItem(KEY);
    open("/");
    expect(await screen.findByRole("heading", { level: 1, name: "Finous" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/welcome");
  });

  it("lets a returning visitor straight into Home", async () => {
    open("/");
    expect(await screen.findByRole("link", { name: "All accounts" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
  });

  it("still opens a link to any other screen for a first-time visitor", async () => {
    localStorage.removeItem(KEY);
    open("/plans");
    expect(await screen.findByRole("heading", { level: 1, name: "What do you want to figure out?" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/plans");
  });
});

describe("Welcome, then consent, then sync, then Home", () => {
  it("shows the brand for a moment, then the promise with one way forward, with no tab bar", async () => {
    localStorage.removeItem(KEY);
    open("/welcome");
    expect(screen.getByRole("heading", { level: 1, name: "Finous" })).toBeInTheDocument();
    await advance(1300);
    expect(screen.getByRole("heading", { level: 1, name: "Every account. One number." })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/welcome/consent");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("shows what is being shared, says it is a demo, and asks for no Aadhaar number", async () => {
    localStorage.removeItem(KEY);
    open("/welcome/consent");
    expect(await screen.findByRole("heading", { level: 1, name: "What you're sharing" })).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Valid for 12 months")).toBeInTheDocument();
    expect(screen.getByText(/This is a demo\. No real accounts are connected yet/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/aadhaar/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Give consent" })).toHaveAttribute("href", "/welcome/sync");
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/welcome");
  });

  it("lists each account as waiting, turns them to done one by one, then lands on Home and remembers", async () => {
    localStorage.removeItem(KEY);
    open("/welcome/sync");
    expect(await screen.findByText("HDFC Bank")).toBeInTheDocument();
    expect(screen.getAllByText("Waiting")).toHaveLength(7);
    await tick(3);
    expect(screen.getAllByText("Done").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Done").length).toBeLessThan(7);
    expect(firstRunDone()).toBe(false);
    await tick(12);
    expect(await screen.findByRole("link", { name: "All accounts" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/");
    expect(firstRunDone()).toBe(true);
  });

  it("lets the user skip to the dashboard", async () => {
    localStorage.removeItem(KEY);
    open("/welcome/sync");
    await userEvent.click(await screen.findByRole("button", { name: "Skip to dashboard" }));
    expect(await screen.findByRole("link", { name: "All accounts" })).toBeInTheDocument();
    expect(firstRunDone()).toBe(true);
  });

  it("offers a retry when the accounts cannot be fetched", async () => {
    localStorage.removeItem(KEY);
    const api = createMockApi();
    api.failNext(new ApiError("unavailable"));
    open("/welcome/sync", "en", api);
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't load this");
    expect(firstRunDone()).toBe(false);
  });

  it("walks the whole way from the front door, and a second visit goes straight to Home", async () => {
    localStorage.removeItem(KEY);
    const first = open("/");
    await screen.findByRole("heading", { level: 1, name: "Finous" });
    await advance(1300);
    await userEvent.click(screen.getByRole("link", { name: "Get started" }));
    await userEvent.click(await screen.findByRole("link", { name: "Give consent" }));
    await screen.findByText("HDFC Bank");
    await tick(14);
    expect(await screen.findByRole("link", { name: "All accounts" })).toBeInTheDocument();
    first.unmount();
    window.history.pushState({}, "", "/");
    open("/");
    expect(await screen.findByRole("link", { name: "All accounts" })).toBeInTheDocument();
  });
});

describe("Replay from You", () => {
  it("has a row on You that opens the welcome again, and finishing it brings the user back to Home", async () => {
    open("/you");
    const replay = await screen.findByRole("link", { name: /Replay the welcome/ });
    expect(replay).toHaveAttribute("href", "/welcome");
    await userEvent.click(replay);
    await screen.findByRole("heading", { level: 1, name: "Finous" });
    await advance(1300);
    expect(screen.getByRole("heading", { level: 1, name: "Every account. One number." })).toBeInTheDocument();
  });
});

describe("Welcome: Hindi and accessibility", () => {
  it("is translated", async () => {
    localStorage.removeItem(KEY);
    open("/welcome", "hi");
    await advance(1300);
    expect(screen.getByRole("heading", { level: 1, name: "हर खाता। एक संख्या।" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "शुरू करें" })).toBeInTheDocument();
  });

  it.each([
    ["/welcome", "en"],
    ["/welcome/consent", "en"],
    ["/welcome/consent", "hi"],
    ["/welcome/sync", "hi"],
  ] as const)("%s in %s has no accessibility violations", async (route, lng) => {
    const { container } = open(route, lng);
    await advance(1300);
    await screen.findByRole("heading", { level: 1 });
    await expectAccessible(container);
  });
});
