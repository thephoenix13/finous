import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router";
import { ApiProvider, createMockApi, type Api } from "../api";
import { createI18n, type Language } from "../i18n";

type Options = { lng?: Language; route?: string; api?: Api };

/**
 * Renders `ui` in a fresh i18n instance and a fresh mock Api (so tests never share language or data state), and a router.
 * Pass `api` to use your own, for example a mock with `failNext`, or a stub that returns a different persona.
 */
export function renderWithI18n(ui: ReactElement, { lng = "en", route = "/", api = createMockApi() }: Options = {}) {
  const i18n = createI18n(lng);
  const utils = render(
    <I18nextProvider i18n={i18n}>
      <ApiProvider api={api}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </ApiProvider>
    </I18nextProvider>,
  );
  return { i18n, api, ...utils };
}
