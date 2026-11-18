import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const ROUTE = "/settings/app/address";
const phone = () => within(screen.getByRole("region", { name: "Preview of the app on a phone's home screen" }));

async function open(options: { api?: MockConsoleApi; bank?: "demo" | "new" } = {}) {
  const view = renderConsole({ route: ROUTE, ...options });
  await screen.findByLabelText("Web address");
  return { ...view, user: userEvent.setup() };
}

describe("Web address and install (I7.2)", () => {
  it("shows the address and install name the bank has, with the home-screen preview", async () => {
    const { container } = await open();
    expect(screen.getByLabelText("Web address")).toHaveValue("demo-coop");
    expect(screen.getByText(".app.finous.site")).toBeInTheDocument();
    expect(screen.getByLabelText("Name shown under the icon")).toHaveValue("Demo Bank");
    expect(phone().getByText("Demo Bank")).toBeInTheDocument();
    expect(screen.getByText(/Customers open https:\/\/demo-coop\.app\.finous\.site/)).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("shows the bank's first letter on the icon, in its brand colour, until there's a logo", async () => {
    await open();
    expect(phone().getByText("D")).toBeInTheDocument();
  });

  it("updates the preview and the address hint as they type", async () => {
    const { user } = await open();
    const name = screen.getByLabelText("Name shown under the icon");
    await user.clear(name);
    await user.type(name, "Seva");
    expect(phone().getByText("Seva")).toBeInTheDocument();
    const address = screen.getByLabelText("Web address");
    await user.clear(address);
    await user.type(address, "seva-bank");
    expect(screen.getByText(/Customers open https:\/\/seva-bank\.app\.finous\.site/)).toBeInTheDocument();
  });

  it("warns, without blocking, when the name is longer than a phone shows", async () => {
    const { user } = await open();
    const name = screen.getByLabelText("Name shown under the icon");
    await user.clear(name);
    await user.type(name, "Seva Sahakari Bank");
    expect(screen.getByText(/may cut this off after about 12 characters/)).toBeInTheDocument();
    expect(name).not.toHaveAttribute("aria-invalid");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("saves a trimmed, lower case address", async () => {
    const { user, api } = await open();
    const address = screen.getByLabelText("Web address");
    await user.clear(address);
    await user.type(address, "  Seva-Bank ");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(api.saved.address).toEqual([{ subdomain: "seva-bank", installName: "Demo Bank" }]);
  });

  it("explains an address that can't be used, once they try to save, and saves nothing", async () => {
    const { user, api } = await open();
    const address = screen.getByLabelText("Web address");
    await user.clear(address);
    await user.type(address, "ab");
    expect(screen.queryByText(/at least 3/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Use at least 3 characters.")).toBeInTheDocument();
    expect(address).toHaveAttribute("aria-invalid", "true");
    expect(api.saved.address).toHaveLength(0);
  });

  it("refuses a reserved word", async () => {
    const { user } = await open();
    const address = screen.getByLabelText("Web address");
    await user.clear(address);
    await user.type(address, "admin");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/reserved/)).toBeInTheDocument();
  });

  it("says when another bank already has the address, and lets them pick another", async () => {
    const { user, api } = await open();
    const address = screen.getByLabelText("Web address");
    await user.clear(address);
    await user.type(address, "alpha-bank");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Another bank already uses this address. Choose another.")).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("That address is taken.");
    expect(api.saved.address).toHaveLength(0);

    await user.clear(address);
    await user.type(address, "alpha-coop");
    expect(screen.queryByText(/Another bank already uses/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
  });

  it("asks for an install name when it is empty", async () => {
    const { user } = await open();
    await user.clear(screen.getByLabelText("Name shown under the icon"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText(/Enter the name phones should show/)).toBeInTheDocument();
  });

  it("keeps their entries and says so when the save fails", async () => {
    const api = createMockConsoleApi();
    const { user } = await open({ api });
    const address = screen.getByLabelText("Web address");
    await user.clear(address);
    await user.type(address, "kept-address");
    api.failNext("saveAddress");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't save that. Your changes are still here.");
    expect(address).toHaveValue("kept-address");
  });

  it("starts empty for a new bank, with a placeholder in the preview", async () => {
    await open({ bank: "new" });
    expect(screen.getByLabelText("Web address")).toHaveValue("");
    expect(phone().getByText("Your app")).toBeInTheDocument();
    expect(screen.getByText(/Customers open https:\/\/your-bank\.app\.finous\.site/)).toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("address");
    renderConsole({ route: ROUTE, api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Web address")).toBeInTheDocument();
  });
});
