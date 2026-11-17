import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { createMockConsoleApi } from "./api/mock";
import { createDemoAuth } from "./auth/demoAuth";
import "./index.css";

// Until the backend exists, the console runs on a demo bank and a demo sign-in. See README.md.
const query = new URLSearchParams(location.search);
const feed = query.get("feed");
const api = createMockConsoleApi({
  bank: query.get("bank") === "new" ? "new" : "demo",
  feed: feed === "not_connected" || feed === "failing" || feed === "connected" ? feed : undefined,
});
const auth = createDemoAuth();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App auth={auth} api={api} />
    </BrowserRouter>
  </StrictMode>,
);
