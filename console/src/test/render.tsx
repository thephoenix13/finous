import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import App from "../App";
import { createMockConsoleApi, type MockConsoleApi, type MockOptions } from "../api/mock";
import { createDemoAuth, demoSession } from "../auth/demoAuth";
import type { Role } from "../lib/access";

type Options = MockOptions & {
  route?: string;
  /** Who is signed in. Null for nobody. Defaults to an Admin. */
  as?: Role | null;
  api?: MockConsoleApi;
  auth?: ReturnType<typeof createDemoAuth>;
};

/**
 * Renders the whole console at `route` with a fresh mock API and a demo sign-in (so tests never share data),
 * signed in as `as`. Pass `api` or `auth` to use your own, for example one told to fail its next call.
 */
export function renderConsole({ route = "/", as = "admin", bank, api = createMockConsoleApi({ bank }), auth }: Options = {}) {
  const client = auth ?? createDemoAuth({ session: as ? demoSession(as) : null });
  const utils = render(
    <MemoryRouter initialEntries={[route]}>
      <App auth={client} api={api} />
    </MemoryRouter>,
  );
  return { api, auth: client, ...utils };
}
