// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import TabBar from "./TabBar";

const LABELS = {
  en: { nav: "Main", tabs: ["Home", "Advisor", "Plans", "You"] },
  hi: { nav: "मुख्य", tabs: ["होम", "सलाहकार", "योजनाएँ", "आप"] },
} as const;

describe("TabBar", () => {
  it.each(["en", "hi"] as const)("labels the navigation and all four tabs in %s", (lng) => {
    renderWithI18n(<TabBar />, { lng });
    const nav = screen.getByRole("navigation", { name: LABELS[lng].nav });
    const links = nav.querySelectorAll("a");
    expect([...links].map((a) => a.textContent)).toEqual([...LABELS[lng].tabs]);
  });

  it("links to the same routes in every language", () => {
    const hrefs = (lng: "en" | "hi") => {
      const { unmount } = renderWithI18n(<TabBar />, { lng });
      const out = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
      unmount();
      return out;
    };
    expect(hrefs("hi")).toEqual(hrefs("en"));
    expect(hrefs("en")).toEqual(["/", "/advisor", "/plans", "/you"]);
  });

  it("marks the current tab", () => {
    renderWithI18n(<TabBar />, { lng: "hi", route: "/plans" });
    expect(screen.getByRole("link", { name: "योजनाएँ" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "होम" })).not.toHaveAttribute("aria-current");
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<TabBar />, { lng });
    await expectAccessible(container);
  });
});
