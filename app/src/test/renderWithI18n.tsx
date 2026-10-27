import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { createI18n, type Language } from "../i18n";

/** Renders `ui` in a fresh i18n instance (so tests never share language state) and a router. */
export function renderWithI18n(ui: ReactElement, { lng = "en", route = "/" }: { lng?: Language; route?: string } = {}) {
  const i18n = createI18n(lng);
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </I18nextProvider>,
  );
  return { i18n, ...utils };
}
