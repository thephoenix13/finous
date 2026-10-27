// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import { LoadError, LoadingCard } from "./DataState";

const WORDS = {
  en: { loading: "Loading", error: "We couldn't load this. Check your connection and try again.", retry: "Try again" },
  hi: { loading: "लोड हो रहा है", error: "यह लोड नहीं हो सका। अपना कनेक्शन जाँचें और फिर कोशिश करें।", retry: "फिर कोशिश करें" },
} as const;

describe("LoadingCard", () => {
  it.each(["en", "hi"] as const)("tells assistive technology it is loading, in %s", (lng) => {
    renderWithI18n(<LoadingCard />, { lng });
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent(WORDS[lng].loading);
  });

  it("hides the words from sighted users, who see the block", () => {
    renderWithI18n(<LoadingCard />);
    expect(screen.getByText("Loading")).toHaveClass("sr-only");
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<LoadingCard />, { lng });
    await expectAccessible(container);
  });
});

describe("LoadError", () => {
  it.each(["en", "hi"] as const)("says what happened and offers a retry, in %s", (lng) => {
    renderWithI18n(<LoadError onRetry={() => {}} />, { lng });
    expect(screen.getByRole("alert")).toHaveTextContent(WORDS[lng].error);
    expect(screen.getByRole("button", { name: WORDS[lng].retry })).toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("calls onRetry once from the %s button", async (lng) => {
    const onRetry = vi.fn();
    renderWithI18n(<LoadError onRetry={onRetry} />, { lng });
    await userEvent.click(screen.getByRole("button", { name: WORDS[lng].retry }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<LoadError onRetry={() => {}} />, { lng });
    await expectAccessible(container);
  });
});
