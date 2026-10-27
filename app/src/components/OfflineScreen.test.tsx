// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { en } from "../i18n/locales/en";
import { hi } from "../i18n/locales/hi";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import OfflineScreen from "./OfflineScreen";

const CATALOGS = { en: en.offline, hi: hi.offline } as const;

describe("OfflineScreen", () => {
  it.each(["en", "hi"] as const)("says it in %s: heading, explanation and retry", (lng) => {
    renderWithI18n(<OfflineScreen onRetry={() => {}} />, { lng });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(CATALOGS[lng].title);
    expect(screen.getByText(CATALOGS[lng].body)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CATALOGS[lng].retry })).toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("calls onRetry from the %s button", async (lng) => {
    const onRetry = vi.fn();
    renderWithI18n(<OfflineScreen onRetry={onRetry} />, { lng });
    await userEvent.click(screen.getByRole("button", { name: CATALOGS[lng].retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("is announced as an alert", () => {
    renderWithI18n(<OfflineScreen onRetry={() => {}} />, { lng: "hi" });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<OfflineScreen onRetry={() => {}} />, { lng });
    await expectAccessible(container);
  });
});
