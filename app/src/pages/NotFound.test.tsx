// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import App from "../App";
import { ApiProvider, createMockApi } from "../api";
import { createI18n } from "../i18n";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import NotFound from "./NotFound";

describe("NotFound", () => {
  it("says the page is missing and offers the way home", () => {
    renderWithI18n(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("We couldn't find that page.");
    expect(screen.getByRole("link", { name: "Go to Home" })).toHaveAttribute("href", "/");
  });

  it("is in Hindi too", () => {
    renderWithI18n(<NotFound />, { lng: "hi" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("हमें वह पेज नहीं मिला।");
    expect(screen.getByRole("link", { name: "होम पर जाएँ" })).toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<NotFound />, { lng });
    await expectAccessible(container);
  });

  it("is what the app shows at an unknown address, and Go to Home reaches Home", async () => {
    window.history.pushState({}, "", "/advice");
    render(
      <I18nextProvider i18n={createI18n("en")}>
        <ApiProvider api={createMockApi()}>
          <App />
        </ApiProvider>
      </I18nextProvider>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("We couldn't find that page.");
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument(); // still inside the app shell
    await userEvent.click(screen.getByRole("link", { name: "Go to Home" }));
    expect(await screen.findByText("Net worth")).toBeInTheDocument();
    window.history.pushState({}, "", "/");
  });
});
