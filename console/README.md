# Finous console (institutions)

The web app a bank's staff use to run Finous under their own name. It is separate from the consumer PWA in `../app` and
shares nothing with it at run time. The plan behind it:
[Institution (B2B) Solution Plan](https://claude.ai/artifact/XTVPWD7JkvSWUKw9w3ZKvK) and
[Screens Plan](https://claude.ai/artifact/6KofBXZCPKDhpFpj5sUAjN), whose screen numbers (I1.1, I7.1, S.3 ...) are used below.

The consumer app is not changed by anything in this folder.

## Run

```bash
npm install
npm run dev        # http://localhost:5174
npm test           # unit and component tests (Vitest, Testing Library, axe)
npm run build      # typecheck + production build
npm run ci         # what CI runs: typecheck, tests, build
```

Open `http://localhost:5174/?bank=new` for a bank that has just been set up and has no customers yet.
Add `feed=not_connected` or `feed=failing` (for example `?feed=failing`) to see the data feed in those states.

## The demo

There is no backend yet, so the console runs on a **demo bank with sample figures** and a **demo sign-in**:

- Any password works. The code on the second step is `123456`.
- The sign-in screen lists one person per role (Admin, Compliance, Marketing, Branch, Read-only), so every
  "no access" screen can be reached. The list only appears because the demo sign-in provides it; real sign-in never will.
- A banner on the overview says the figures are samples. Nothing in the demo is a real customer.

## What is built

**Phase 0, setup and access**

| Screen | Where |
| --- | --- |
| I1.1 Staff sign-in | `/sign-in` |
| I1.2 Second factor | `/sign-in/verify` |
| I1.3 No access | shown in place of any screen a role can't open |
| I2.1 Overview | `/` |
| I7.1 Branding | `/settings/app/branding` |
| I7.2 Web address and install | `/settings/app/address` |
| I7.3 Languages and advisor | `/settings/app/languages` |
| I8.1 Staff and roles | `/settings/team` |
| I8.2 Invite staff | `/settings/team/invite` |
| I9.4 Documents | `/settings/compliance` |
| I11.1 Help and contact | `/help` |
| S.1 Error, S.2 Offline, S.3 No customers yet, S.5 Loading | the error boundary, the frame, the empty overview, the placeholder blocks |

**Phase 1, the bank-data pilot** (all on the mock; nothing here reads a real bank's data yet)

| Screen | Where |
| --- | --- |
| I7.4 Data feed status, S.4 Feed not connected | `/settings/integration` |
| I7.5 Feed mapping and test | `/settings/integration/mapping` |
| I7.6 Sign-in and API keys | `/settings/integration/access` |
| I5.1 Product catalogue | `/products` |
| I5.2 Product editor | `/products/new`, `/products/:id/edit` |
| I3.1 Opportunity list | `/opportunities` |
| I3.2 Opportunity detail | `/opportunities/:id` |
| I3.3 Follow-up log | `/opportunities/:id/follow-up` |
| I9.1 Consent ledger | `/settings/compliance/consents` |
| I9.2 Staff access log | `/settings/compliance/access-log` |
| I9.3 Customer requests | `/settings/compliance/requests` |

The sidebar also links to Campaigns, Reports and Billing. Those belong to Phase 2, so each shows a plain "Not available yet"
page with a way back.

What the Phase 1 screens do that is easy to miss:

- **Opening a customer or exporting a list is logged.** `opportunity()` and `exportOpportunities()` take the staff member, and
  the mock writes the entry the staff access log shows. The real API must do the same, on the server.
- **Only people who chose to share ever appear.** The screens say so, and the opportunity list shows names shortened
  ("Rohit K.") with a reference. The CSV export has no figures or phone numbers.
- **Branch staff see their own branch only.** The list locks to the signed-in person's branch and ignores a branch in the
  address. This keeps the screen honest; the server must enforce it.
- **Exports can't run formulas.** A cell that starts with `=`, `+`, `-` or `@` is written as plain text.
- **API keys are shown once.** The list holds only the first characters. Rotating asks first, because the old key stops working.
- **No secrets are typed into the console.** Single sign-on takes a service name, an identifier and an https address, never a
  client secret.
- **A test run touches no real customer.** Feed mapping runs over a sample file of test customers, and a column the bank
  doesn't match (phone numbers, say) is never read.
- **Products can't say Apply.** The disclosure is refused if it does, because the app only ever says Learn more. The Hindi
  disclosure is required once the bank turns Hindi on.

## How it is put together

```
src/
  api/        ConsoleApi (types.ts), the in-memory mock and its sample data (fixtures.ts), useApiData, errors
  auth/       AuthClient (types.ts), the demo sign-in, AuthProvider
  layout/     Shell (sidebar, offline screen), Guards (signed in, role may open), ErrorBoundary
  lib/        access (roles and areas), contrast, validate, product, mapping, csv, format, useSaver, useOnline
  pages/      one file per screen, with its test beside it
  ui/         Button, Field, Select, Switch, Tag, Card, PageHeader, States, SaveBar, CopyButton
```

- **One API, two implementations.** Screens only call `ConsoleApi`. `createMockConsoleApi` serves the demo and tests; the
  real client replaces it in `main.tsx`. The mock rejects with the same `ApiError` codes the real one will.
- **One sign-in client.** Screens only call `AuthClient`. The demo client stands in for real sign-in. The bank's single
  sign-on (I1.1) and its settings (I7.6) come with the bank-data pilot, so there is no single sign-on button yet.
- **Roles.** `lib/access.ts` is the one place that says which role opens which part of the console. The sidebar hides what
  a role can't open, and the route guard shows the no-access screen if they type the address anyway. This is a
  convenience for staff, not security: the backend must enforce the same rules.
- **Saving.** Every settings form uses `useSaver`: a second press while a save is running is ignored, a failed save keeps
  what was typed, and the result is announced in a live region.
- **Accessibility.** Each screen has one `h1`, labelled fields, visible focus, and passes axe in its test. A bank's
  colours can't break it: text on the brand colour must reach 4.5:1 and the brand colour 3:1 against the app's
  background, or Save is blocked (`lib/validate.ts`).
- **English only** for Phases 0 to 2, as in the Screens Plan.
- **No service worker, no storage of data.** The console is not a PWA. The demo keeps only the signed-in person in the
  tab's session storage, and the list of remembered devices in local storage.

## Things to decide or check before this goes to a bank

- **The customer app's address.** `APP_DOMAIN` in `src/lib/validate.ts` is `app.finous.site`, so a bank is
  `<name>.app.finous.site`, which is where the customer app looks for it. Today each new bank also needs its address
  added to the `finous-app` Vercel project and a CNAME for it at the DNS provider (see `app/README.md`, "Adding a bank's address"):
  a wildcard needs DNS that can delegate `_acme-challenge`, which finous.site's current DNS cannot.
- **Deploying.** `vercel.json` is ready, but there is no Vercel project for the console yet, and no domain.
- **Documents.** The data processing agreement and security summary are listed as "Not shared yet". Real files and
  download links arrive with the backend.
- **Hindi wording.** The sample product disclosures are in Hindi written by Claude. They need a native speaker before a bank sees them.
- **Product approval.** In Phase 1 a product marked Live shows at once. Compliance sign-off before a change goes live is I5.3, in Phase 2.
- **The customer app.** Nothing here shows a real customer until the app has the share-with-the-bank switch (C1.4, C3.1), runs under
  a bank's branding, and the feed delivers data. Those are the next, separate changes.
- **Help.** Tickets go to the mock. Where they land in real life (a shared inbox, a ticket tool) is not decided, so the
  screen shows no email address.
