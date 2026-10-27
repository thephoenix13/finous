// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { en } from "../i18n/locales/en";
import { hi } from "../i18n/locales/hi";
import { expectAccessible } from "../test/a11y";
import { renderWithI18n } from "../test/renderWithI18n";
import UpdatePrompt from "./UpdatePrompt";

const sw = vi.hoisted(() => ({ needRefresh: true, setNeedRefresh: vi.fn(), updateServiceWorker: vi.fn() }));

vi.mock("virtual:pwa-register/react", () => ({
  useRegisterSW: () => ({
    needRefresh: [sw.needRefresh, sw.setNeedRefresh],
    updateServiceWorker: sw.updateServiceWorker,
  }),
}));

const CATALOGS = { en: en.update, hi: hi.update } as const;

describe("UpdatePrompt", () => {
  beforeEach(() => {
    sw.needRefresh = true;
    sw.setNeedRefresh.mockClear();
    sw.updateServiceWorker.mockClear();
  });

  it("renders nothing when there is no update", () => {
    sw.needRefresh = false;
    const { container } = renderWithI18n(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(["en", "hi"] as const)("offers the update in %s", (lng) => {
    renderWithI18n(<UpdatePrompt />, { lng });
    expect(screen.getByRole("status")).toHaveTextContent(CATALOGS[lng].ready);
    expect(screen.getByRole("button", { name: CATALOGS[lng].later })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: CATALOGS[lng].reload })).toBeInTheDocument();
  });

  it.each(["en", "hi"] as const)("reloads into the new version from the %s button", async (lng) => {
    renderWithI18n(<UpdatePrompt />, { lng });
    await userEvent.click(screen.getByRole("button", { name: CATALOGS[lng].reload }));
    expect(sw.updateServiceWorker).toHaveBeenCalledWith(true);
  });

  it.each(["en", "hi"] as const)("dismisses without reloading from the %s button", async (lng) => {
    renderWithI18n(<UpdatePrompt />, { lng });
    await userEvent.click(screen.getByRole("button", { name: CATALOGS[lng].later }));
    expect(sw.setNeedRefresh).toHaveBeenCalledWith(false);
    expect(sw.updateServiceWorker).not.toHaveBeenCalled();
  });

  it("has no accessibility violations in Hindi", async () => {
    const { container } = renderWithI18n(<UpdatePrompt />, { lng: "hi" });
    await expectAccessible(container);
  });
});
