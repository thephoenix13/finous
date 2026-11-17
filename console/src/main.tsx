import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { createMockConsoleApi } from "./api/mock";
import { createDemoAuth } from "./auth/demoAuth";
import "./index.css";

// Until the backend exists, the console runs on a demo bank and a demo sign-in. See README.md.
const api = createMockConsoleApi({ bank: new URLSearchParams(location.search).get("bank") === "new" ? "new" : "demo" });
const auth = createDemoAuth();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App auth={auth} api={api} />
    </BrowserRouter>
  </StrictMode>,
);
