import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router";
import { ApiProvider } from "./api/context";
import type { ConsoleApi } from "./api/types";
import { AuthProvider } from "./auth/AuthProvider";
import type { AuthClient } from "./auth/types";
import { RequireArea, RequireSession } from "./layout/Guards";
import Shell from "./layout/Shell";
import type { Area } from "./lib/access";
import Address from "./pages/Address";
import Branding from "./pages/Branding";
import Documents from "./pages/Documents";
import Help from "./pages/Help";
import InviteStaff from "./pages/InviteStaff";
import Languages from "./pages/Languages";
import Later, { NotFound } from "./pages/Later";
import Overview from "./pages/Overview";
import SecondFactor from "./pages/SecondFactor";
import SignIn from "./pages/SignIn";
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
              <Route path="opportunities" element={later("opportunities", "Opportunities", "Customers who chose to share and could use one of your products.", "This screen is not built yet. It will list the customers who chose to share and could take a top-up, a refinance or a deposit renewal.")} />
              <Route path="campaigns" element={later("campaigns", "Campaigns", "Nudges to the customers who chose to share.", "This screen is not built yet. It will let you write a nudge, preview it, and see how it did.")} />
              <Route path="products" element={later("products", "Products", "Your loans and deposits, as customers see them.", "This screen is not built yet. It will hold your product catalogue, with compliance approval before customers see a change.")} />
              <Route path="reports" element={later("reports", "Reports", "The standard reports, ready to download.", "This screen is not built yet. It will hold adoption, opportunity and consent reports by branch.")} />
              <Route path="settings/app" element={<Navigate to={ROUTES.branding} replace />} />
              <Route path="settings/app/branding" element={guard("app", <Branding />)} />
              <Route path="settings/app/address" element={guard("app", <Address />)} />
              <Route path="settings/app/languages" element={guard("app", <Languages />)} />
              <Route path="settings/integration" element={later("integration", "Integration", "Connect your bank's data and sign-in.", "This screen is not built yet. It will show the data feed, its field mapping and test, and your sign-in and API keys.")} />
              <Route path="settings/team" element={guard("team", <Staff />)} />
              <Route path="settings/team/invite" element={guard("team", <InviteStaff />)} />
              <Route path="settings/compliance" element={guard("compliance", <Documents />)} />
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
