// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import PageHeader from "./PageHeader";

describe("PageHeader", () => {
  it("shows the title as the screen's h1", () => {
    renderWithI18n(<PageHeader title="EMI calculator" backTo="/plans" />);
    expect(screen.getByRole("heading", { level: 1, name: "EMI calculator" })).toBeInTheDocument();
  });

  it.each([
    ["en", "Back"],
    ["hi", "वापस"],
  ] as const)("names the back link in %s", (lng, name) => {
    renderWithI18n(<PageHeader title="x" backTo="/plans" />, { lng });
    expect(screen.getByRole("link", { name })).toBeInTheDocument();
  });

  it("goes back to a fixed route, not to browser history", () => {
    renderWithI18n(<PageHeader title="x" backTo="/plans" />);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/plans");
  });

  it("keeps the arrow out of the accessible name", () => {
    renderWithI18n(<PageHeader title="x" backTo="/plans" />);
    expect(screen.getByRole("link", { name: "Back" }).querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<PageHeader title="x" backTo="/plans" />, { lng });
    await expectAccessible(container);
  });
});
