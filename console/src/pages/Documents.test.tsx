import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockConsoleApi, type MockConsoleApi } from "../api/mock";
import { expectAccessible } from "../test/a11y";
import { renderConsole } from "../test/render";

const ROUTE = "/settings/compliance";
const item = (title: string) => within(screen.getByRole("heading", { name: title }).closest("li") as HTMLElement);

describe("Compliance documents (I9.4)", () => {
  it("lists the three documents a compliance officer asks for first", async () => {
    const { container } = renderConsole({ route: ROUTE, as: "compliance" });
    expect(await screen.findByRole("heading", { name: "Data processing agreement" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Security summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Privacy notice" })).toBeInTheDocument();
    expect(screen.getByText(/who holds customer data/)).toBeInTheDocument();
    await expectAccessible(container);
  });

  it("marks what hasn't been shared yet, and shows no version for it", async () => {
    renderConsole({ route: ROUTE });
    await screen.findByRole("heading", { name: "Security summary" });
    expect(item("Data processing agreement").getByText("Not shared yet")).toBeInTheDocument();
    expect(item("Security summary").getByText("Not shared yet")).toBeInTheDocument();
    expect(item("Security summary").queryByText(/Version/)).not.toBeInTheDocument();
  });

  it("shows the version and date of what has been shared, and says there is no download when there isn't one", async () => {
    renderConsole({ route: ROUTE });
    await screen.findByRole("heading", { name: "Privacy notice" });
    const privacy = item("Privacy notice");
    expect(privacy.getByText("Shared")).toBeInTheDocument();
    expect(privacy.getByText("Version 1.0, dated 20 Oct 2026")).toBeInTheDocument();
    expect(privacy.getByText("No download yet")).toBeInTheDocument();
    expect(privacy.queryByRole("link")).not.toBeInTheDocument();
  });

  it("offers a download, named for its document, when there is one", async () => {
    const base = createMockConsoleApi();
    const api: MockConsoleApi = {
      ...base,
      documents: async () => (await base.documents()).map((d) => (d.id === "privacy" ? { ...d, href: "https://example.test/privacy-v1.pdf" } : d)),
    };
    renderConsole({ route: ROUTE, api });
    const link = await screen.findByRole("link", { name: "Download Privacy notice" });
    expect(link).toHaveAttribute("href", "https://example.test/privacy-v1.pdf");
    expect(link).toHaveAttribute("download");
    expect(item("Privacy notice").queryByText("No download yet")).not.toBeInTheDocument();
  });

  it("is closed to roles that aren't Admin or Compliance", async () => {
    renderConsole({ route: ROUTE, as: "readonly" });
    expect(await screen.findByRole("heading", { name: "You don't have access to Compliance" })).toBeInTheDocument();
  });

  it("says it could not load, and loads when they try again", async () => {
    const api = createMockConsoleApi();
    api.failNext("documents");
    renderConsole({ route: ROUTE, api });
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Privacy notice" })).toBeInTheDocument();
  });
});
