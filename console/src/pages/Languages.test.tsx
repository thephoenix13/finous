import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const ROUTE = "/settings/app/languages";

async function open(api = createMockConsoleApi()) {
  const view = renderConsole({ route: ROUTE, api });
  await screen.findByRole("group", { name: "Advisor" });
  return { ...view, user: userEvent.setup() };
}

describe("Languages and advisor (I7.3)", () => {
  it("shows what the bank has now", async () => {
    const { container } = await open();
    expect(screen.getByRole("switch", { name: "English" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Hindi" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Fixed rules only/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^Off/ })).not.toBeChecked();
    await expectAccessible(container);
  });

  it("explains each advisor choice, including that AI sends figures outside India", async () => {
    await open();
    expect(screen.getByText(/Customers don't see the advisor at all/)).toBeInTheDocument();
    expect(screen.getByText(/No AI provider is involved/)).toBeInTheDocument();
    expect(screen.getByText(/sent to an AI provider outside India/)).toBeInTheDocument();
    expect(screen.getByText(/only if your compliance team agrees/)).toBeInTheDocument();
  });

  it("saves the languages and the advisor as chosen", async () => {
    const { user, api } = await open();
    await user.click(screen.getByRole("switch", { name: "Hindi" }));
    await user.click(screen.getByRole("radio", { name: /AI, with the customer's consent/ }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(api.saved.languages).toEqual([{ english: true, hindi: false, advisor: "ai" }]);
  });

  it("can turn the advisor off", async () => {
    const { user, api } = await open();
    await user.click(screen.getByRole("radio", { name: /^Off/ }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Saved.");
    expect(api.saved.languages[0].advisor).toBe("off");
  });

  it("will not let them turn both languages off", async () => {
    const { user, api } = await open();
    await user.click(screen.getByRole("switch", { name: "English" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Hindi" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Keep at least one language on.");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await user.click(screen.getByRole("switch", { name: "English" }));
    expect(screen.queryByText("Keep at least one language on.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(api.saved.languages).toHaveLength(0);
  });

  it("clears the saved message when they change something again", async () => {
    const { user } = await open();
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("Saved.");
    await user.click(screen.getByRole("switch", { name: "Hindi" }));
    expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  });

  it("keeps their choices and says so when the save fails", async () => {
    const api = createMockConsoleApi();
    const { user } = await open(api);
    await user.click(screen.getByRole("radio", { name: /^Off/ }));
    api.failNext("saveLanguages");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Your changes are still here.");
    expect(screen.getByRole("radio", { name: /^Off/ })).toBeChecked();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("languages");
    renderConsole({ route: ROUTE, api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("group", { name: "Advisor" })).toBeInTheDocument();
  });
});
