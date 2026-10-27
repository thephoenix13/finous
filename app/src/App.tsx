import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { BrowserRouter, Route, Routes } from "react-router";
import Shell from "./components/Shell";
import PlaceholderPage from "./components/PlaceholderPage";
import AffordabilityCheck from "./pages/AffordabilityCheck";
import EmiCalculator from "./pages/EmiCalculator";
import GoalCalculator from "./pages/GoalCalculator";
import GoalDetail from "./pages/GoalDetail";
import Goals from "./pages/Goals";
import Health from "./pages/Health";
import HealthBreakdown from "./pages/HealthBreakdown";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import Plans from "./pages/Plans";
import PrepayCalculator from "./pages/PrepayCalculator";
import RefinanceCheck from "./pages/RefinanceCheck";
import Tax from "./pages/Tax";
import You from "./pages/You";

// Dev-only token preview. Tree-shaken out of production builds.
const DevTokens = import.meta.env.DEV ? lazy(() => import("./pages/DevTokens")) : null;
const DevComponents = import.meta.env.DEV ? lazy(() => import("./pages/DevComponents")) : null;

export default function App() {
  const { t } = useTranslation();
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route
            path="advisor"
            element={<PlaceholderPage domain="ai" eyebrow={t("pages.advisor.eyebrow")} title={t("pages.advisor.title")} note={t("pages.advisor.note")} />}
          />
          <Route path="plans" element={<Plans />} />
          <Route path="plans/goals" element={<Goals />} />
          <Route path="plans/goals/:id" element={<GoalDetail />} />
          <Route path="plans/health" element={<Health />} />
          <Route path="plans/health/breakdown" element={<HealthBreakdown />} />
          <Route path="plans/tax" element={<Tax />} />
          <Route path="plans/prepay" element={<PrepayCalculator />} />
          <Route path="plans/refinance" element={<RefinanceCheck />} />
          <Route path="plans/afford" element={<AffordabilityCheck />} />
          <Route path="plans/goal-calc" element={<GoalCalculator />} />
          <Route path="plans/emi" element={<EmiCalculator />} />
          <Route path="you" element={<You />} />
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
