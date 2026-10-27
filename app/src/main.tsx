import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import App from "./App";
import { ApiProvider } from "./api";
import { api } from "./api/instance";
import { ToastProvider } from "./components/ui";
import { i18n } from "./i18n/instance";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ApiProvider api={api}>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ApiProvider>
    </I18nextProvider>
  </StrictMode>,
);
