# Finous demo script

About ten minutes. Open https://finous-app.vercel.app on a phone, or install it first (Share, Add to Home Screen on iPhone; the install prompt or menu on Android).

**Everything you see belongs to one made-up person, Aarav Mehta, as of 29 September 2026.** There is no backend and no real bank connection yet. What is real is the product: the screens, the calculators and the numbers they work out.

## The click path

1. **Home.** The greeting, net worth with this month's change, this month's in, out and saved, and the two things worth looking at. Tap the first one to open its recommendation.
2. **Recommendations** (Plans tab, or from Home). Three ranked suggestions, each with its reason and its headline figure. Open the refinance one: why, what it costs (₹39,000 upfront, recovered in 26 months), then "Open the refinance check".
3. **Refinance check.** It sets the 8.9% rate against the 8.5% market rate and shows about ₹1,523 a month saved. Then Back.
4. **Prepay calculator** and **Affordability check** (Plans). Change the inputs and the answers update live.
5. **Health score** (Plans) and its breakdown: six numbers, each explained. **Goals**: three goals, funded and tracked; open one.
6. **Tax** (Plans): what is left in Section 80C and the home loan interest deduction.
7. **Advisor tab.** Tap "Should I prepay my home loan?". The answer is worked out from Aarav's own figures and names the accounts it used. Type "how much did I spend on swiggy?" to show it handles free text. It says on screen that these are not AI answers.
8. **Home, then Cash flow, Monthly recap, Search, Notifications.** Search "swiggy" and open a transaction. Notifications lists what is open (the three suggestions, the card statement due, the latest salary).
9. **Accounts** (from Home): banks, loan, card, investments. Open the card for its statement cycle and auto-pay status.
10. **You tab.** Linked accounts (7 connections), Consent manager (what Finous may read, for how long, what revoking does), Privacy in plain words, Profile. Switch the language to Hindi and walk back through one screen.
11. **Offline.** Turn on airplane mode: the installed app opens and says it is offline instead of showing stale balances.

## What is real, what is not

| Real | Mock or not built |
| --- | --- |
| Every screen, the layout, the language switch (English and Hindi) | Aarav's data: one fixed persona, same for every visitor |
| The calculators (EMI, prepay, refinance, affordability, goal) and the tax and health-score maths | Real bank and investment data (Account Aggregator) |
| Installing it and opening it offline | Sign-in, Aadhaar verification and the first-run flow |
| Advisor answers worked out from the figures on screen | An AI advisor and voice: both paid services, not included |
| Accessibility checks and a test for every screen | Changing anything: revoke consent, add an account, create a goal, recategorise a transaction |

## Questions to expect

- **Is this connected to my bank?** Not yet. Account Aggregator access comes with the backend; the app already speaks to a defined contract, so swapping the mock for the real service does not change the screens.
- **Is the advisor AI?** Not in this build. It is a fixed set of rules over your numbers, and it says so. The real one is a paid model service.
- **Hindi?** Every screen has it. The wording was written by Claude and has not yet been checked by a native speaker.
- **Does it give advice?** It describes what the data shows and the general options, with a not-advice line on the recommendation and advisor screens.
