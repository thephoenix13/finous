# Demo-ready checklist

Goal: a stable PWA the partners can open on a phone and click through end to end, in English and Hindi, with no dead ends.
Everything runs on the mock persona (Aarav Mehta). No paid service is used. Tick a box only when it is merged **and** live.

## 0. Blocker: production deploys
- [ ] `finous-app` redeploy after Vercel's rate limit lifts (about 21:33 UTC, 28 Oct 2026). Merged code is not live until then.
- [x] Leftover projects `finous_app` and `finous-l4x6` deleted; `finous` skips app-only pushes.

## 1. Screens (prototype order)
Each screen: built to the prototype, English + Hindi, tests, axe check, checked at 375px and 320px.

**Home tab**
- [x] Home: net worth, month cash flow, "worth a look" (two insights). Links to Accounts, recap, search, notifications and the insight detail are added as those screens land
- [x] Accounts: list by type, bank and card detail (a loan opens the refinance check; investment rows are not links: their holdings screens need data the Api lacks)
- [x] Transaction detail (amount, counterparty, recategorise)
- [x] Cash flow
- [ ] Monthly recap
- [x] Search transactions
- [ ] Notifications
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
- [ ] Splash, welcome, consent, Aadhaar step, sync step, then Home

## 2. Stability
- [x] A "page not found" screen (unknown addresses were blank)
- [ ] Every tab and link in the app leads somewhere real; no placeholder hero left
- [ ] Error and empty states on every screen (the pattern exists: `DataState`)
- [ ] Offline screen reachable and honest; installed PWA opens offline
- [ ] No console errors on any route (add a route-walk test)

## 3. Demo polish
- [ ] Hindi copy reviewed by a native speaker (written by Claude, not yet reviewed)
- [ ] Decision on the 12-month net-worth history (none is invented; Home shows no chart until decided)
- [ ] Decision on the tax ELSS SIP figure (prototype ₹30,000 vs ₹15,000)
- [ ] App icon, splash colour, install prompt checked on a real Android and iPhone
- [ ] Lighthouse PWA and accessibility pass on production
- [ ] A one-page demo script: the click path, what is real, what is mock

## 4. Not in scope without a paid service
- Real AI advisor (model API), voice (Deepgram), real Aadhaar eKYC, real Account Aggregator, push notifications backend.
