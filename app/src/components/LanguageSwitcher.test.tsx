// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { STORAGE_KEY } from "../i18n";
import You from "../pages/You";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import LanguageSwitcher from "./LanguageSwitcher";
import TabBar from "./TabBar";

describe("LanguageSwitcher", () => {
  it("is a labelled group with one button per language, each in its own name", () => {
    renderWithI18n(<LanguageSwitcher />);
    const group = screen.getByRole("group", { name: "Language" });
    expect(group).toContainElement(screen.getByRole("button", { name: "English" }));
    expect(group).toContainElement(screen.getByRole("button", { name: "हिन्दी" }));
  });

  it("tags each button with its own language so screen readers pronounce it properly", () => {
    renderWithI18n(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("lang", "en");
    expect(screen.getByRole("button", { name: "हिन्दी" })).toHaveAttribute("lang", "hi");
  });

  it.each([
    ["en", "English", "हिन्दी"],
    ["hi", "हिन्दी", "English"],
  ] as const)("shows %s as the pressed language", (lng, pressed, other) => {
    renderWithI18n(<LanguageSwitcher />, { lng });
    expect(screen.getByRole("button", { name: pressed })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: other })).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the language, renames the group, and remembers the choice", async () => {
    const { i18n } = renderWithI18n(<LanguageSwitcher />);
    await userEvent.click(screen.getByRole("button", { name: "हिन्दी" }));

    expect(i18n.resolvedLanguage).toBe("hi");
    expect(screen.getByRole("group", { name: "भाषा" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "हिन्दी" })).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.lang).toBe("hi");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("hi");
  });

  it("switches back to English", async () => {
    renderWithI18n(<LanguageSwitcher />, { lng: "hi" });
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe("en");
  });

  it("works from the keyboard", async () => {
    const user = userEvent.setup();
    renderWithI18n(<LanguageSwitcher />);
    await user.tab();
    await user.tab();
    expect(screen.getByRole("button", { name: "हिन्दी" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("group", { name: "भाषा" })).toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<LanguageSwitcher />, { lng });
    await expectAccessible(container);
  });
});

describe("You screen", () => {
  it("shows the language control under the profile hero", () => {
    renderWithI18n(<You />, { route: "/you" });
    expect(screen.getByRole("heading", { level: 1, name: "Profile and privacy." })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
  });

  it("switching language retranslates the whole screen, tab bar included", async () => {
    renderWithI18n(
      <>
        <You />
        <TabBar />
      </>,
      { route: "/you" },
    );
    await userEvent.click(screen.getByRole("button", { name: "हिन्दी" }));

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("प्रोफ़ाइल और प्राइवेसी।");
    expect(screen.getByRole("navigation", { name: "मुख्य" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "होम" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("has no accessibility violations in %s", async (lng) => {
    const { container } = renderWithI18n(<You />, { lng, route: "/you" });
    await expectAccessible(container);
  });
});
