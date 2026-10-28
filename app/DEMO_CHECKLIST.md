# Demo-ready checklist

Goal: a stable PWA the partners can open on a phone and click through end to end, in English and Hindi, with no dead ends.
Everything runs on the mock persona (Aarav Mehta). No paid service is used. Tick a box only when it is merged **and** live.

## 0. Blocker: production deploys
- [ ] `finous-app` production is behind `main` (the rate limit refused the deploys of the first-run flow and the AI advisor, and a dashboard Redeploy only re-runs an older commit). Deploy current `main`, then check `/welcome` and `POST /api/advisor` on production.
- [x] Leftover projects `finous_app` and `finous-l4x6` deleted; `finous` skips app-only pushes.

## 1. Screens (prototype order)
Each screen: built to the prototype, English + Hindi, tests, axe check, checked at 375px and 320px.

**Home tab**
- [x] Home: net worth, month cash flow, "worth a look" (two insights). Links to Accounts, recap, search, notifications and the insight detail are added as those screens land
- [x] Accounts: list by type, bank and card detail (a loan opens the refinance check; investment rows are not links: their holdings screens need data the Api lacks)
- [x] Transaction detail (amount, counterparty, recategorise)
- [x] Cash flow
- [x] Monthly recap: saved, in and out, what changed (card utilisation, dining), spend share by category. The prototype's rate-reset and best-month lines are left out: the Api has no history
- [x] Search transactions
- [x] Notifications: what is open, worked out from the user's own data (insights, card statement, latest income); there is no feed in the Api
- [x] Recommendations (ranked) and recommendation detail, linked from Home and Plans. The prototype's confirmation screen (tracking number, "request received") is left out: it needs a write the Api does not have, and the reference would be invented.

**Advisor tab**
- [x] Advisor chat UI on a scripted, offline responder: four suggested questions plus typed ones, answers worked out from the user's own figures, sources shown, labelled on screen as not an AI model. Voice (Deepgram) and the real AI are paid: not included
- [ ] Milestone / stacks screens that need no writes

**Plans tab**
- [x] Plans hub, EMI, prepay, refinance, affordability, goal calculator, tax, health score + breakdown, goals + detail

**You tab**
- [x] You: name and email, links with live summaries, language switch
- [x] Linked accounts and consents (read only; no revoke or add-account: the Api has no writes)
- [x] Privacy (plain-words information; download and delete are left out, they need writes)
- [x] Profile (read only)
- [x] Language: stays the inline switch on the You screen

**First run (mock only, no real KYC or bank calls)**
- [x] Splash, welcome, consent, sync, then Home; shown once per device, replayable from You. No Aadhaar entry (it would look like real KYC); the consent step says it is a demo

## 2. Stability
- [x] A "page not found" screen (unknown addresses were blank)
- [x] Every tab and link in the app leads somewhere real; no placeholder hero left (the route-walk test fails if a route breaks)
- [x] Error and empty states on every screen (each screen's tests cover loading, error with retry, and empty)
- [x] Offline screen reachable and honest (PWA smoke test, 12 checks)
- [x] No console errors on any route: `App.routes.test.tsx` walks every route in English and Hindi, and fails on a console error, an error state, a missing or second h1, or an accessibility violation

## 3. Demo polish
- [ ] Hindi copy reviewed by a native speaker (written by Claude, not yet reviewed)
- [ ] Decision on the 12-month net-worth history (none is invented; Home shows no chart until decided)
- [ ] Decision on the tax ELSS SIP figure (prototype ₹30,000 vs ₹15,000)
- [ ] App icon, splash colour, install prompt checked on a real Android and iPhone
- [ ] Lighthouse PWA and accessibility pass on production
- [x] A one-page demo script: `DEMO_SCRIPT.md`

## 4. Not in scope without a paid service
- Voice (Deepgram), real Aadhaar eKYC, real Account Aggregator, push notifications backend. (The AI advisor is built: `api/advisor.ts` with `ANTHROPIC_API_KEY` set in Vercel.)
