import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const ROUTE = "/settings/integration/access";

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
});

/** Gives the real navigator a clipboard for one test. Replacing the whole navigator would make the app think it is offline. */
function stubClipboard(writeText: () => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn(writeText) }, configurable: true });
}

async function open(options: { bank?: "demo" | "new"; api?: MockConsoleApi } = {}) {
  const view = renderConsole({ route: ROUTE, ...options });
  await screen.findByRole("heading", { name: "Link from your app" });
  return { ...view, user: userEvent.setup() };
}

const keyRow = (name: string) => within(screen.getByRole("row", { name: new RegExp(name) }));

describe("Sign-in and API keys (I7.6)", () => {
  it("shows the link for the app, single sign-on and the keys, and is accessible", async () => {
    const { container } = await open();
    expect(screen.getByText("https://demo-coop.finous.site/?from=bank")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Single sign-on" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API keys" })).toBeInTheDocument();
    await expectAccessible(container);
  });

  describe("link from the app", () => {
    it("copies the link and says so", async () => {
      const { user } = await open();
      stubClipboard(() => Promise.resolve());
      await user.click(screen.getByRole("button", { name: "Copy the link" }));
      expect(await screen.findByText("Copied.")).toBeInTheDocument();
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://demo-coop.finous.site/?from=bank");
    });

    it("says so, rather than pretending, when the browser won't copy", async () => {
      const { user } = await open();
      stubClipboard(() => Promise.reject(new Error("denied")));
      await user.click(screen.getByRole("button", { name: "Copy the link" }));
      expect(await screen.findByText(/Couldn't copy/)).toBeInTheDocument();
      expect(screen.queryByText("Copied.")).not.toBeInTheDocument();
    });

    it("asks a bank with no web address yet to choose one first", async () => {
      await open({ bank: "new" });
      expect(screen.getByText(/You need a web address first/)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Choose your web address" })).toHaveAttribute("href", "/settings/app/address");
      expect(screen.queryByRole("button", { name: "Copy the link" })).not.toBeInTheDocument();
    });
  });

  describe("single sign-on", () => {
    it("starts off, with the fields switched off", async () => {
      await open();
      expect(screen.getByRole("switch", { name: "Single sign-on" })).not.toBeChecked();
      for (const label of ["Sign-in service", "Identifier", "Sign-in address"]) expect(screen.getByLabelText(label)).toBeDisabled();
    });

    it("turns the fields on with the switch", async () => {
      const { user } = await open();
      await user.click(screen.getByRole("switch", { name: "Single sign-on" }));
      for (const label of ["Sign-in service", "Identifier", "Sign-in address"]) expect(screen.getByLabelText(label)).toBeEnabled();
    });

    it("asks for all three, at once, when it is on and Save is pressed with them empty", async () => {
      const { user, api } = await open();
      await user.click(screen.getByRole("switch", { name: "Single sign-on" }));
      await user.click(screen.getByRole("button", { name: "Save single sign-on" }));
      expect(await screen.findByText(/Say which service/)).toBeInTheDocument();
      expect(screen.getByText(/Enter the identifier/)).toBeInTheDocument();
      expect(screen.getByText(/Enter the sign-in address, starting with https/)).toBeInTheDocument();
      expect(api.saved.sso).toHaveLength(0);
    });

    it("refuses a sign-in address that isn't https", async () => {
      const { user } = await open();
      await user.click(screen.getByRole("switch", { name: "Single sign-on" }));
      await user.type(screen.getByLabelText("Sign-in service"), "Okta");
      await user.type(screen.getByLabelText("Identifier"), "urn:demo");
      await user.type(screen.getByLabelText("Sign-in address"), "http://login.example/demo");
      await user.click(screen.getByRole("button", { name: "Save single sign-on" }));
      expect(await screen.findByText(/starting with https/)).toBeInTheDocument();
    });

    it("saves trimmed settings, and says so", async () => {
      const { user, api } = await open();
      await user.click(screen.getByRole("switch", { name: "Single sign-on" }));
      await user.type(screen.getByLabelText("Sign-in service"), "  Microsoft Entra ");
      await user.type(screen.getByLabelText("Identifier"), " urn:demo-bank ");
      await user.type(screen.getByLabelText("Sign-in address"), "https://login.example/demo");
      await user.click(screen.getByRole("button", { name: "Save single sign-on" }));
      expect(await screen.findByText("Saved.")).toBeInTheDocument();
      expect(api.saved.sso).toEqual([{ enabled: true, provider: "Microsoft Entra", entityId: "urn:demo-bank", signInUrl: "https://login.example/demo" }]);
    });

    it("can be switched off and saved with the fields empty", async () => {
      const { user, api } = await open();
      await user.click(screen.getByRole("button", { name: "Save single sign-on" }));
      expect(await screen.findByText("Saved.")).toBeInTheDocument();
      expect(api.saved.sso[0].enabled).toBe(false);
    });

    it("keeps what they typed and says so when the save fails", async () => {
      const api = createMockConsoleApi();
      const { user } = await open({ api });
      await user.click(screen.getByRole("switch", { name: "Single sign-on" }));
      await user.type(screen.getByLabelText("Sign-in service"), "Okta");
      await user.type(screen.getByLabelText("Identifier"), "urn:demo");
      await user.type(screen.getByLabelText("Sign-in address"), "https://login.example/demo");
      api.failNext("saveSingleSignOn");
      await user.click(screen.getByRole("button", { name: "Save single sign-on" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Your changes are still here");
      expect(screen.getByLabelText("Sign-in service")).toHaveValue("Okta");
    });
  });

  describe("API keys", () => {
    it("lists each key by name, with the start of it and when it was made and last used, never the whole key", async () => {
      await open();
      const branch = keyRow("Branch app");
      expect(branch.getByText("fk_live_8f3a…")).toBeInTheDocument();
      expect(branch.getByText("2 Oct 2026")).toBeInTheDocument();
      expect(branch.getByText("16 Nov 2026")).toBeInTheDocument();
      expect(keyRow("Reporting").getByText("Never")).toBeInTheDocument();
    });

    it("says there are no keys for a new bank", async () => {
      await open({ bank: "new" });
      expect(screen.getByText(/No keys yet/)).toBeInTheDocument();
      expect(screen.queryByRole("table", { name: "API keys" })).not.toBeInTheDocument();
    });

    it("asks for a name before making a key, and makes none without one", async () => {
      const { user } = await open();
      await user.click(screen.getByRole("button", { name: "Make a key" }));
      expect(await screen.findByText(/Name the key after what will use it/)).toBeInTheDocument();
      expect(screen.getAllByRole("row")).toHaveLength(3);
    });

    it("makes a key, shows its secret once, lists it, and hides the secret when they say they've stored it", async () => {
      const { user } = await open();
      await user.type(screen.getByLabelText("New key name"), "Mobile team");
      await user.click(screen.getByRole("button", { name: "Make a key" }));
      const box = await screen.findByText(/Mobile team: copy this key now\. You won't see it again\./);
      const secret = box.closest("div")!.querySelector("code")!.textContent!;
      expect(secret).toMatch(/^fk_live_/);
      expect(screen.getByLabelText("New key name")).toHaveValue("");
      const row = keyRow("Mobile team");
      expect(row.getByText(`${secret.slice(0, 12)}…`)).toBeInTheDocument();
      expect(within(screen.getByRole("table", { name: "API keys" })).queryByText(secret)).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "I've stored it" }));
      expect(screen.queryByText(secret)).not.toBeInTheDocument();
      expect(screen.getByText(`${secret.slice(0, 12)}…`)).toBeInTheDocument();
    });

    it("copies a new key's secret", async () => {
      const { user } = await open();
      stubClipboard(() => Promise.resolve());
      await user.type(screen.getByLabelText("New key name"), "Mobile team");
      await user.click(screen.getByRole("button", { name: "Make a key" }));
      await screen.findByText(/copy this key now/);
      await user.click(screen.getByRole("button", { name: "Copy the key for Mobile team" }));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/^fk_live_/));
    });

    it("says nothing was made when making a key fails, and keeps the name", async () => {
      const api = createMockConsoleApi();
      const { user } = await open({ api });
      await user.type(screen.getByLabelText("New key name"), "Mobile team");
      api.failNext("createKey");
      await user.click(screen.getByRole("button", { name: "Make a key" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was created");
      expect(screen.getByLabelText("New key name")).toHaveValue("Mobile team");
      expect(screen.queryByText(/copy this key now/)).not.toBeInTheDocument();
    });

    it("asks before rotating, and says the old key stops working", async () => {
      const { user } = await open();
      await user.click(screen.getByRole("button", { name: "Rotate Branch app" }));
      expect(screen.getByText(/The old key stops working at once/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Rotate Branch app" })).toBeInTheDocument();
      expect(screen.queryByText(/copy this key now/)).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Cancel" }));
      expect(screen.queryByText(/The old key stops working at once/)).not.toBeInTheDocument();
    });

    it("rotates a key: shows the new secret once and changes the start shown for it", async () => {
      const { user } = await open();
      await user.click(screen.getByRole("button", { name: "Rotate Branch app" }));
      await user.click(screen.getByRole("button", { name: "Rotate Branch app" }));
      expect(await screen.findByText(/Branch app: copy this key now/)).toBeInTheDocument();
      expect(screen.queryByText("fk_live_8f3a…")).not.toBeInTheDocument();
      expect(keyRow("Branch app").getByText("Never")).toBeInTheDocument();
      expect(screen.getAllByRole("row")).toHaveLength(3);
      expect(screen.queryByText(/The old key stops working at once/)).not.toBeInTheDocument();
    });

    it("says the old key still works when rotating fails, and keeps the key as it was", async () => {
      const api = createMockConsoleApi();
      const { user } = await open({ api });
      await user.click(screen.getByRole("button", { name: "Rotate Branch app" }));
      api.failNext("rotateKey");
      await user.click(screen.getByRole("button", { name: "Rotate Branch app" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("The old key still works");
      expect(screen.getByText("fk_live_8f3a…")).toBeInTheDocument();
      expect(screen.queryByText(/copy this key now/)).not.toBeInTheDocument();
    });
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("signInSettings");
    renderConsole({ route: ROUTE, api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Link from your app" })).toBeInTheDocument();
  });
});
