import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { AuthProvider } from "./auth/AuthProvider";
import type { AuthClient } from "./auth/types";
import AccessGate, { EnterDemo, type MemberEnvFactory } from "./components/AccessGate";
import { useMemberData } from "./api/memberContext";
import Shell from "./components/Shell";
import { firstRunDone } from "./lib/firstRun";
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
import Join from "./pages/Join";
import LinkedAccounts from "./pages/LinkedAccounts";
import NotFound from "./pages/NotFound";
import Plans from "./pages/Plans";
import Privacy from "./pages/Privacy";
import Notifications from "./pages/Notifications";
import PrepayCalculator from "./pages/PrepayCalculator";
import Profile from "./pages/Profile";
import Recap from "./pages/Recap";
import SignIn from "./pages/SignIn";
import RecommendationDetail from "./pages/RecommendationDetail";
import Recommendations from "./pages/Recommendations";
import RefinanceCheck from "./pages/RefinanceCheck";
import Search from "./pages/Search";
import Tax from "./pages/Tax";
import TransactionDetail from "./pages/TransactionDetail";
import Welcome from "./pages/Welcome";
import WelcomeConsent from "./pages/WelcomeConsent";
import WelcomeSync from "./pages/WelcomeSync";
import AccountForm from "./pages/forms/AccountForm";
import FiguresForm from "./pages/forms/FiguresForm";
import GoalForm from "./pages/forms/GoalForm";
import MemberOnly from "./pages/forms/MemberOnly";
import ProfileForm from "./pages/forms/ProfileForm";
import TaxForm from "./pages/forms/TaxForm";
import You from "./pages/You";

// Dev-only token preview. Tree-shaken out of production builds.
const DevTokens = import.meta.env.DEV ? lazy(() => import("./pages/DevTokens")) : null;
const DevComponents = import.meta.env.DEV ? lazy(() => import("./pages/DevComponents")) : null;

/** The welcome steps have no tab bar: nothing to go to until the accounts are connected. */
function WelcomeLayout() {
  return (
    <div className="mx-auto flex h-full max-w-[480px] flex-col bg-page">
      <main className="flex-1 overflow-y-auto pt-[env(safe-area-inset-top)]">
        <Outlet />
      </main>
    </div>
  );
}

/** Evaluated each time the front door is opened, so finishing the welcome lets the next visit through. A member skips it: it shows the demo connecting sample accounts. */
function FrontDoor() {
  const member = useMemberData();
  return member || firstRunDone() ? <Home /> : <Navigate to="/welcome" replace />;
}

/** `authClient` and `memberEnv` are for tests: leave them out and the app uses Supabase when this build has its settings, and runs as the demo when it has not. */
export default function App({ authClient, memberEnv }: { authClient?: AuthClient | null; memberEnv?: MemberEnvFactory }) {
  return (
    <AuthProvider client={authClient}>
    <BrowserRouter>
      <Routes>
        <Route element={<WelcomeLayout />}>
          <Route path="welcome" element={<Welcome />} />
          <Route path="welcome/consent" element={<WelcomeConsent />} />
          <Route path="welcome/sync" element={<WelcomeSync />} />
          <Route path="signin" element={<SignIn />} />
          <Route path="join" element={<Join />} />
        </Route>
        <Route path="demo" element={<EnterDemo />} />
        <Route element={<AccessGate memberEnv={memberEnv} />}>
        <Route element={<Shell />}>
          {/* Only the front door sends a first-time visitor to the welcome; a link to any other screen still opens it. */}
          <Route index element={<FrontDoor />} />
          <Route path="advisor" element={<Advisor />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="accounts/:id" element={<AccountDetail />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="recap" element={<Recap />} />
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
          {/* Changing one's own details: a member only. In the demo these send you home. */}
          <Route element={<MemberOnly />}>
            <Route path="you/figures" element={<FiguresForm />} />
            <Route path="you/profile/edit" element={<ProfileForm />} />
            <Route path="accounts/new" element={<AccountForm />} />
            <Route path="accounts/:id/edit" element={<AccountForm />} />
            <Route path="plans/goals/new" element={<GoalForm />} />
            <Route path="plans/goals/:id/edit" element={<GoalForm />} />
            <Route path="plans/tax/edit" element={<TaxForm />} />
          </Route>
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
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}
