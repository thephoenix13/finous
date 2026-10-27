import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import Shell from "./components/Shell";
import PlaceholderPage from "./components/PlaceholderPage";

// Dev-only token preview. Tree-shaken out of production builds.
const DevTokens = import.meta.env.DEV ? lazy(() => import("./pages/DevTokens")) : null;
const DevComponents = import.meta.env.DEV ? lazy(() => import("./pages/DevComponents")) : null;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route
            index
            element={<PlaceholderPage eyebrow="Home" title="Every account. One number." note="Net worth, cash flow and what to look at. Arrives in M4." />}
          />
          <Route
            path="advisor"
            element={<PlaceholderPage domain="ai" eyebrow="Advisor" title="Ask about any transaction." note="Chat, sources and voice. Arrives in M5 and M6." />}
          />
          <Route
            path="plans"
            element={<PlaceholderPage domain="goal" eyebrow="Plans" title="What do you want to figure out?" note="Calculators, health score, goals and tax. EMI and prepay tools arrive in M2." />}
          />
          <Route
            path="you"
            element={<PlaceholderPage eyebrow="You" title="Profile and privacy." note="Linked accounts, consent manager and data controls. Arrive in M7." />}
          />
          {DevComponents && (
            <Route
              path="dev/components"
              element={
                <Suspense fallback={null}>
                  <DevComponents />
                </Suspense>
              }
            />
          )}
          {DevTokens && (
            <Route
              path="dev/tokens"
              element={
                <Suspense fallback={null}>
                  <DevTokens />
                </Suspense>
              }
            />
          )}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
