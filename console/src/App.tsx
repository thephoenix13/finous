import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router";
import { ApiProvider } from "./api/context";
import type { ConsoleApi } from "./api/types";
import { AuthProvider } from "./auth/AuthProvider";
import type { AuthClient } from "./auth/types";
import { RequireArea, RequireSession } from "./layout/Guards";
import Shell from "./layout/Shell";
import type { Area } from "./lib/access";
import AccessLog from "./pages/AccessLog";
import Address from "./pages/Address";
import Branding from "./pages/Branding";
import Consents from "./pages/Consents";
import CustomerRequests from "./pages/CustomerRequests";
import Documents from "./pages/Documents";
import FeedMapping from "./pages/FeedMapping";
import FollowUpLog from "./pages/FollowUpLog";
import Help from "./pages/Help";
import Integration from "./pages/Integration";
import InviteStaff from "./pages/InviteStaff";
import Languages from "./pages/Languages";
import Later, { NotFound } from "./pages/Later";
import OpportunityDetail from "./pages/OpportunityDetail";
import Opportunities from "./pages/Opportunities";
import Overview from "./pages/Overview";
import ProductEditor from "./pages/ProductEditor";
import Products from "./pages/Products";
import SecondFactor from "./pages/SecondFactor";
import SignIn from "./pages/SignIn";
import SignInKeys from "./pages/SignInKeys";
import Staff from "./pages/Staff";
import { ROUTES } from "./routes";

const guard = (area: Area, element: ReactElement) => <RequireArea area={area}>{element}</RequireArea>;

const later = (area: Area, title: string, description: string, body: string) =>
  guard(
    area,
    <Later title={title} description={description}>
      {body}
    </Later>,
  );

/**
 * The console. Sign-in and the second factor sit outside the frame. Everything else needs a signed-in staff member,
 * and each screen checks that the role may open it. Screens still to be built show a plain "not available yet" page.
 */
export default function App({ auth, api }: { auth: AuthClient; api: ConsoleApi }) {
  return (
    <AuthProvider client={auth}>
      <ApiProvider api={api}>
        <Routes>
          <Route path={ROUTES.signIn} element={<SignIn />} />
          <Route path={ROUTES.verify} element={<SecondFactor />} />
          <Route element={<RequireSession />}>
            <Route element={<Shell />}>
              <Route index element={guard("overview", <Overview />)} />
              <Route path="opportunities" element={guard("opportunities", <Opportunities />)} />
              <Route path="opportunities/:id" element={guard("opportunities", <OpportunityDetail />)} />
              <Route path="opportunities/:id/follow-up" element={guard("opportunities", <FollowUpLog />)} />
              <Route path="campaigns" element={later("campaigns", "Campaigns", "Nudges to the customers who chose to share.", "This screen is not built yet. It will let you write a nudge, preview it, and see how it did.")} />
              <Route path="products" element={guard("products", <Products />)} />
              <Route path="products/new" element={guard("products", <ProductEditor />)} />
              <Route path="products/:id/edit" element={guard("products", <ProductEditor />)} />
              <Route path="reports" element={later("reports", "Reports", "The standard reports, ready to download.", "This screen is not built yet. It will hold adoption, opportunity and consent reports by branch.")} />
              <Route path="settings/app" element={<Navigate to={ROUTES.branding} replace />} />
              <Route path="settings/app/branding" element={guard("app", <Branding />)} />
              <Route path="settings/app/address" element={guard("app", <Address />)} />
              <Route path="settings/app/languages" element={guard("app", <Languages />)} />
              <Route path="settings/integration" element={guard("integration", <Integration />)} />
              <Route path="settings/integration/mapping" element={guard("integration", <FeedMapping />)} />
              <Route path="settings/integration/access" element={guard("integration", <SignInKeys />)} />
              <Route path="settings/team" element={guard("team", <Staff />)} />
              <Route path="settings/team/invite" element={guard("team", <InviteStaff />)} />
              <Route path="settings/compliance" element={guard("compliance", <Documents />)} />
              <Route path="settings/compliance/consents" element={guard("compliance", <Consents />)} />
              <Route path="settings/compliance/access-log" element={guard("compliance", <AccessLog />)} />
              <Route path="settings/compliance/requests" element={guard("compliance", <CustomerRequests />)} />
              <Route path="settings/billing" element={later("billing", "Billing", "Your plan, usage and invoices.", "This screen is not built yet. It will show your plan, how many customers you have against it, and your invoices.")} />
              <Route path="help" element={guard("help", <Help />)} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </ApiProvider>
    </AuthProvider>
  );
}
