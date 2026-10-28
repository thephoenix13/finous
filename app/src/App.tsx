import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import Shell from "./components/Shell";
import Advisor from "./pages/Advisor";
import AccountDetail from "./pages/AccountDetail";
import Accounts from "./pages/Accounts";
import AffordabilityCheck from "./pages/AffordabilityCheck";
import CashFlow from "./pages/CashFlow";
import Consents from "./pages/Consents";
import EmiCalculator from "./pages/EmiCalculator";
import GoalCalculator from "./pages/GoalCalculator";
import GoalDetail from "./pages/GoalDetail";
import Goals from "./pages/Goals";
import Health from "./pages/Health";
import HealthBreakdown from "./pages/HealthBreakdown";
import Home from "./pages/Home";
import LinkedAccounts from "./pages/LinkedAccounts";
import NotFound from "./pages/NotFound";
import Plans from "./pages/Plans";
import Privacy from "./pages/Privacy";
import PrepayCalculator from "./pages/PrepayCalculator";
import Profile from "./pages/Profile";
import RecommendationDetail from "./pages/RecommendationDetail";
import Recommendations from "./pages/Recommendations";
import RefinanceCheck from "./pages/RefinanceCheck";
import Search from "./pages/Search";
import Tax from "./pages/Tax";
import TransactionDetail from "./pages/TransactionDetail";
import You from "./pages/You";

// Dev-only token preview. Tree-shaken out of production builds.
const DevTokens = import.meta.env.DEV ? lazy(() => import("./pages/DevTokens")) : null;
const DevComponents = import.meta.env.DEV ? lazy(() => import("./pages/DevComponents")) : null;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Home />} />
          <Route path="advisor" element={<Advisor />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/:id" element={<AccountDetail />} />
          <Route path="search" element={<Search />} />
          <Route path="cash-flow" element={<CashFlow />} />
          <Route path="transactions/:id" element={<TransactionDetail />} />
          <Route path="plans" element={<Plans />} />
          <Route path="plans/recommendations" element={<Recommendations />} />
          <Route path="plans/recommendations/:id" element={<RecommendationDetail />} />
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
          <Route path="you/linked" element={<LinkedAccounts />} />
          <Route path="you/consents" element={<Consents />} />
          <Route path="you/privacy" element={<Privacy />} />
          <Route path="you/profile" element={<Profile />} />
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
