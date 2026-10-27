# Finous app (B2C PWA)

The production PWA. Plan: `../docs/PWA/B2C PWA — Build Plan.html`. Architecture: `../docs/Product Tehnical Specifications/`.

This folder is separate from the marketing site at the repo root and in `../finous/`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173, previews at /dev/tokens and /dev/components
npm test           # unit and component tests (Vitest, Testing Library, axe)
npm run build      # typecheck + production build + service worker
npm run preview    # serve the build at http://localhost:4173 (needed to test the PWA)
npm run test:pwa   # after a build: installs the service worker in headless Chrome, goes offline, checks the cache
npm run ci         # everything CI runs: typecheck, tests, build, PWA check
```

The service worker is off in `npm run dev`. Test install and offline behaviour against `npm run preview`.

## Rules baked in (Architecture v1.1)

- Service worker precaches the app shell only (HTML, JS, CSS, icons). **No runtime caching.** Financial data is never cached.
- Offline shows the "You're offline" screen. Nothing cached is displayed.
- Updates are prompted ("A new version of Finous is ready"), never silent.
- System fonts only, so the shell works offline with no web-font requests.

## CI and deploys

**CI** (`../.github/workflows/app-ci.yml`) runs on every pull request and every push to `main` (no path filter, because
it is a required check): install (`npm ci`), typecheck, tests, build, then the PWA check.
Run the same thing locally with `npm run ci`.

The PWA check (`scripts/pwa-check.mjs`) fails the build if the service worker stops installing, caches anything
under `/api` or any runtime cache, or if the app no longer loads offline, including on a deep link.

The smoke script is careful about its own start-up, because a slow runner once made it fail with a bare "timed out" while
everything else had passed. Chrome gets 30 seconds to open its debugging port, each poll has its own 2 second limit, and if Chrome
or the preview server dies first the script stops at once and prints how (its exit code and its last lines of output, for
example `Chrome exited with code 9 before it was ready`). The waiting and watching live in `scripts/lib/wait.mjs`, with tests in
`wait.test.mjs` that run in `npm test` and use real short-lived processes. If the check fails in CI, read the step's log first:
a start-up failure of Chrome is not a failure of the app, and re-running just that job (`gh run rerun <id> --failed`) is the
first thing to try.

**Vercel** (`vercel.json`): Vite build, SPA rewrite to `index.html`, security headers, immutable caching for
hashed assets and `no-cache` for `sw.js`, `index.html` and the manifest (so updates are always seen).
`ignoreCommand` skips a deploy when nothing in `app/` changed.

### One-time Vercel setup (needs your Vercel account)

1. Vercel, **Add New, Project**, import the `thephoenix13/finous` repo.
2. Set **Root Directory** to `app`. Framework is detected as Vite; leave the commands as they are (they come from `vercel.json`).
3. Production branch `main`. Every pull request then gets a preview URL, posted as a comment on the PR.
4. Settings, **Git**, confirm "Ignored Build Step" shows the `vercel.json` command.
5. Optional: in the *existing* marketing-site project (repo root), set the Ignored Build Step to
   `git diff --quiet HEAD^ HEAD -- . ':(exclude)app'` so app-only pushes do not rebuild the marketing site.
6. In GitHub, **Settings, Branches**, require the "Typecheck, test, build, PWA check" check on `main`.

Not set up yet: a Content-Security-Policy (needs the final API, Deepgram and tenant origins; planned for M8 hardening).

## Finance maths

`src/lib/finance.ts` is pure and dependency-free: `emi`, `monthsToClose`, `loanSummary`, `prepay`, `refinance`,
`futureValue`, `monthlyContributionForGoal`, `bufferMonths`, `taxSaving`, `carAffordability`, `addMonths`. `src/lib/format.ts` has `inr`
(Indian digit grouping), `formatMonthYear` and `roundTo`.

- Money is plain rupees and is never rounded inside the module. Round when you display.
- Rates are annual percentages, compounded monthly. Invalid input throws `RangeError`.
- The tests use the figures from Prototype v2 (EMI ₹58,345, prepay ₹50,000 saves 4 months and about ₹1,83,378,
  refinance saves about ₹1,523 a month). If a screen's number changes, change it here first.

## Component library

`src/components/ui/`, imported from `components/ui`. Each component is tested for behaviour, keyboard use,
accessible names and a clean axe run (`src/test/a11y.ts`; colour contrast is checked by hand because jsdom has no layout).

| Component | Notes |
| --- | --- |
| `Button`, `ButtonLink` | `primary`, `accent`, `ghost`, `quiet`; `md` (52px) or `sm` (44px). Defaults to `type="button"`. `loading` keeps the label and blocks repeat taps. `ButtonLink` is a real link styled the same. |
| `HeroCard` | Tinted card with the one big number. `size` is `xl` (a score), `lg` (Home) or `md` (results); `align="center"` centres it. Colours come from `data-domain`. |
| `Card` | `raised` (shadow) or `outline` (hairline). |
| `Row`, `RowGroup` | Renders a real `<button>` (`onClick`), a real link (`to`) or plain content. |
| `Tag` | `neutral`, `positive`, `warning`, `negative`. Text carries the meaning. |
| `Switch` | `<button role="switch">`. `label` is required. Controlled or uncontrolled. |
| `Progress` | A thin `progressbar` for how much of a limit or target is used (0 to 100, held to the ends). `label` is required; `valueText` is what is read aloud. Colours from `data-domain`. |
| `Slider` | Native range input with a label, formatted live value and `aria-valuetext`. 44px touch target. |
| `Field` | Always-visible label, hint and error wired with `aria-describedby`, forwards its ref. |
| `ToastProvider`, `useToast` | One polite live-region message at a time. Wrapped around the app in `main.tsx`. |

Not included yet: `Sheet`.

## Design tokens

Daylight tokens live in `src/styles/tokens.css` as plain CSS variables, mapped to Tailwind utilities in `src/index.css`
(`bg-page`, `text-ink`, `border-line`, `bg-domain-tint`, `shadow-card`, ...).

- Domain accents: set `data-domain="loan"` (also `emi`, `tax`, `inv`, `save`, `goal`, `ai`) on a container.
- Tenant branding (later milestone): override the same variables per tenant.

## Languages (English and Hindi)

react-i18next, with the catalogs bundled in the app: they are precached by the service worker, so translations work offline
and there is no loading state.

- **Add a string:** put it in `src/i18n/locales/en.ts`, then in `hi.ts`. `hi.ts` is typed against English, so a missing key
  fails `npm run typecheck`. `t("nav.home")` is type-checked too: a typo in a key is a compile error.
- **Use it:** `const { t } = useTranslation()`. Never hard-code user-facing text in a component.
- **Choosing the language:** the saved choice (`localStorage` key `finous.lang`), then the browser's language preferences in
  order, then English. `LanguageSwitcher` (on the You tab) changes it. `<html lang>` follows it.
- **Hindi typography:** `index.css` resets letter-spacing and loosens line height under `html:lang(hi)`. Devanagari clips
  and breaks conjuncts with the tight English settings. Fonts are the system's Devanagari font.
- **Tests:** `catalogs.test.ts` checks both catalogs have the same keys and placeholders, nothing is empty, and every Hindi
  string is really Devanagari and not a copy of the English. `scripts/pwa-check.mjs` looks for the English "You're offline" heading.
- **Numbers and dates:** not localised yet. `inr` keeps Indian grouping with Western digits, and `formatMonthYear` is still English.
- **Review needed:** the Hindi copy was written by Claude and needs a native-speaker pass before launch.

## Mock API

`src/api/` is the contract between the app and its backend, with a mock that serves the prototype persona (Aarav Mehta,
Bengaluru, 29 September 2026). Build screens against `Api`; swap in the real HTTP client later without touching them.

```ts
import { createMockApi, isApiError } from "./api";
const api = createMockApi({ latencyMs: 250 });
const home = await api.getHome();
```

- **Contract:** `types.ts` is the whole surface (profile, home, accounts, transactions, net worth, cash flow, insights,
  health score, goals, tax, consents), documented with the REST route each method will call. Money is whole rupees, spending is
  negative, dates are ISO. The backend sends numbers and a `kind`, never display text: the client formats and translates.
- **One suite for every implementation:** `contract.suite.ts` checks what any backend must guarantee (net worth is assets
  minus liabilities, endpoints agree with each other, newest-first order, errors, cancellation). Run it against the HTTP
  client too: `describeApiContract("http", () => createHttpApi(...))`.
- **Persona figures** live in `persona.ts` and derive from `lib/finance` wherever it owns the maths. `persona.test.ts` pins
  each one to Prototype v2.
- **Errors:** failed calls reject with `ApiError` (`code`: `unauthorized`, `not_found`, `unavailable`, with the matching HTTP
  `status`). Cancelling with an `AbortSignal` rejects with an `AbortError`.
- **Testing error screens:** `api.failNext(new ApiError("unavailable"))` fails the next call you make, once.
- **Copies:** every response is a deep copy, so nothing can change the persona by accident.
- **Not here yet:** writes (revoke consent, add a manual asset, create a goal), and a 12-month net-worth history. The
  prototype only draws a decorative curve, so no numbers were invented for it.

## Calculators (M2)

Each calculator is a screen under the Plans tab (`/plans/<tool>`), built on `lib/finance` with no backend. The EMI
calculator (`pages/EmiCalculator.tsx`) is the pattern to copy:

- **Shape:** `PageHeader` (Back link and the one h1, going to a fixed route, not history), a `HeroCard` with the result in a
  polite live region (so a screen reader hears the answer change as a slider moves), then `Slider`s. Colours come from `data-domain`.
- **Wire-up:** add the route in `App.tsx`, a `Row` in `pages/Plans.tsx`, and strings in both `en.ts` and `hi.ts`.
- **Wording that depends on a number** uses i18next plurals (`tenureValue_one`, `tenureValue_other`), not string maths.
- **Numbers on a narrow card:** the result split uses a container query (`@container`, `@[18rem]:`), because the app is a 480px
  column and viewport breakpoints do not apply. At 320px with the largest values, three amounts side by side collide; they
  stack instead. Check new result layouts at 320px with the largest inputs.
- **Tests** pin results to the prototype or to an independent calculation, cover the slider ranges and extremes, the
  principal + interest = total identity to the rupee, Hindi, axe, and the route from the Plans tab and back.

**Screens that read the user's own data** (prepay and, next, refinance, affordability and goals) follow `pages/PrepayCalculator.tsx`:

- **Load with `useApiData(load)`** inside an `ApiProvider` (wrapped around the app in `main.tsx`). It gives `loading`, `ready` or
  `error` plus `retry`, and cancels a load when the screen goes away or is retried. `load` must be a function declared outside
  the component. Show `LoadingCard`, `LoadError` (with the retry) and, when the data is legitimately empty (no home loan), a plain message.
- **Split the screen in two:** an outer component that loads and picks the state, and an inner form that receives the data as props.
- **Test it** with `renderWithI18n(ui, { api })`. Use `api.failNext(new ApiError("unavailable"))` for the error and retry path,
  and a small wrapper that returns a changed persona (no loan, one bank, a tiny loan) for the edge cases.
- **Derive, don't copy.** The prepay screen takes the loan, savings and essentials from the API; nothing persona-specific is
  hard-coded in the page. It computes the EMI from the loan's schedule (balance, rate, months left), not the whole-rupee instalment
  the bank debits, because that matches the prototype's ₹1,83,378 to the rupee; the rounded EMI gives ₹1,83,382.
- **Dates** go through `formatMonthYear(ym, i18n.resolvedLanguage)`: a fixed English table, Intl for Hindi (`नव॰ 2043`).
  Rates and shares go through `percent()` (no trailing zeros, at most two decimals: 8.9 is "8.9%", 9 is "9%").

**A read-out of something the backend worked out** (the refinance check, `pages/RefinanceCheck.tsx`) uses the same shape without
a slider: it shows the backend's `RefinanceInsight` instead of recomputing it, so there is one source of truth for the numbers.

- **Tell the empty cases apart.** "No home loan" (`common.noHomeLoan`) and "there is a loan but no offer" (switching would not
  help) are different messages. An offer only counts if its `loanId` is the loan on screen.
- **Put what the screen shows in the contract.** The cost breakdown (processing fee, documentation) lives in `RefinanceInsight.costs`,
  and the contract suite checks the costs add up to `upfrontCost`, the offer quotes the named loan's rate, and the yearly saving is
  twelve times the monthly. A real backend has to meet the same rules.

**A scenario that compares the user's budget with a purchase** (the affordability check, `pages/AffordabilityCheck.tsx`) reads one
number from the Api (the monthly headroom, `getCashFlow().saved`) and does the rest in `lib/finance` (`carAffordability`).

- **Round what is an estimate, not the verdict.** The prototype shows ₹67,200 and ₹72,000 where the exact figures are ₹67,206 and
  ₹72,006: planning estimates, to the nearest ₹100 (`roundTo(x, 100)`). The yes or no uses the exact comparison. A shortfall is
  never shown as ₹0 (floor ₹100), nor the down payment as ₹0L (floor ₹0.1L).
- **Handle the answer the prototype never shows.** The prototype only says "Not yet". Once the data can differ, "Yes" (with what is
  left over) is needed, and so is "more headroom, and no down payment alone would fix it" (when the running cost is above the headroom).
- **The scenario is fixed** (a ₹40L car, 20% down, 9.5% over 60 months, ₹4,800 a month of insurance), as in the prototype. Letting the user
  pick the price is a product decision, not a build detail.
- **Lakhs** go through `toLakhs()` (the number only: 40, 8.8); the unit is in the string, since Hindi says "लाख".

**A worked example with nothing to load** (the goal calculator, `pages/GoalCalculator.tsx`) is the simplest shape: constants for
the example, `monthlyContributionForGoal` from `lib/finance`, no `useApiData`, so no loading or error state. It shows the answer to
the nearest ₹100 and says so in a footnote, and writes durations through plurals (`years_one`, `years_other`).

- **No "Create this goal" button yet.** The prototype has one, but there is no Goals list or form to land on and no write in the
  Api contract. A button that said "Goal created" and created nothing would be a false promise. It arrives with the Goals screens
  and a `createGoal` write.
- **Inputs are a product decision.** Like the affordability check, the prototype shows one fixed example, so that is what is built.

**A summary the backend assembles** (the tax screen, `pages/Tax.tsx`) is read in one call, `getTaxSummary()`, and shown as it is, with
only the small sums done on the client (what is left in 80C, and the saving from `taxSaving`).

- **Contract rules, as for every endpoint:** 80C `used` is the sum of its `items`; the deductible home loan interest is the lesser of
  paid and the cap; the financial year ends on 31 March after today; a SIP carries its monthly amount and nothing else does.
- **Cover the cases the prototype does not draw.** Over-investing in 80C leaves ₹0 of room, not a negative figure, and the bar is held
  full; a 0% rate makes no promise of a saving; interest under the cap does not say "capped". "For information only" stays on the card.
- **A fixed `data-domain`** colours the whole screen (`tax` is gold). The Plans row for Tax shows a **live subtitle** ("₹56,000 left in
  80C") loaded on its own: it describes the screen until the figure arrives, and goes on describing it if the load fails or nothing is left,
  so the hub never shows an error for a detail.
- **Dates** without a year go through `formatDayMonth(iso, i18n.resolvedLanguage)` ("31 March", "31 मार्च").
- **Find rows by their link target in tests, not by position:** every new tool row shifts the others.

**A score and its breakdown** (the health score, `pages/Health.tsx` and `pages/HealthBreakdown.tsx`) is two screens over one
`getHealthScore()`, each loading it through the shared `loadHealth`. Going from one to the next is a real link, and Back on the
breakdown returns to the score, not the hub.

- **A bar can show something other than the value.** Debt to income reads 24%, but a low debt load is a good score, so its bar is 78%
  full: the bar is the component's `score`, the text is its `value`. Each bar is a `Progress` carrying the name and the value for
  assistive technology, and the visible name and value beside it are `aria-hidden`, so nothing is read twice.
- **Name what is dragging in the language's own words**: `formatList(items, lang)` (Intl.ListFormat) gives "A and B" in English and
  "A और B" in Hindi, and the singular reads "The drag is" and not "The drags are". Cover no drags at all.
- **Leave out what the data does not say.** The prototype's "Repayment is clean.", its "fixable in about six months" and its
  "See 3 actions" button each need something the Api does not give (a list of strengths, a time to fix, a recommendations
  screen), so none is faked. They arrive with the data or screen that backs them.
- **Do not name a file by case alone.** `health.ts` beside `Health.tsx` is one name on Windows and macOS, so `import "./pages/Health"`
  could pick the wrong file while Linux CI would not. The shared loader is `healthData.ts`.

**A list and a detail** (the goals, `pages/Goals.tsx` and `pages/GoalDetail.tsx`) are two screens over `listGoals()` and `getGoal(id)`.
The detail takes its goal from the address (`useParams`) and builds its load with `useCallback(..., [id])`, so it reloads when the address
changes. A goal that does not exist is its own state ("We couldn't find that goal", no retry), not a failed load.

- **Estimates get one rounding rule: three significant figures** (`roundSig`), said to be "about". The prototype rounded each goal by
  hand and inconsistently (₹1,35,000 and ₹46,000 to the thousand, ₹18,400 to the hundred), so no single rule reproduces it. Three figures
  matches ₹1,35,000, ₹50,000 and ₹18,400 and gives ₹46,100 where the prototype says ₹46,000 (the exact figure is ₹46,098).
  Amounts are written in full (₹12,90,000), not as "₹12.9L", so no unit has to be translated.
- **Say what the data supports, in cases.** The "On track?" card has four outlooks: behind (what today's saving reaches, what the goal needs,
  and what it would need two years later), on track, a goal with no known monthly saving (just what it needs), and already reached. A goal
  whose date has come shows no card, because the maths needs a month to work with. The what-if of two years is the prototype's, as a named constant.
- **The contract carries kinds, not copy.** A contribution has a `kind` (`fund`, `recurring-deposit`, `savings-top-up`) and only a fund has a
  `label` (its own name). The client words the rest, so Hindi can translate "Recurring deposit". The suite checks that only a fund names itself.
- **The user's own names stay as written.** A goal called "Home upgrade" is data, so it is not translated; the screen around it is.
- **Left out because the Api cannot back it:** the "+" to make a goal and "Add to this goal" (both are writes, and there is no write in the
  contract), so there is no button on either screen. They arrive with a `createGoal` and a contribution write.

Done: all of Plans. M2 is complete. The natural next screen is Recommendations (the three ranked actions `listInsights()` already returns).
Not on the refinance screen: "Ask HDFC for a quote". That is the Home action flow (an offer, then a confirmation), a later milestone.

## Layout

```
src/
  api/          types (the contract), mock, persona, errors, contract.suite, ApiProvider, useApiData
  components/   Shell, TabBar, PageHeader, DataState, OfflineScreen, UpdatePrompt, PlaceholderPage, LanguageSwitcher
  components/ui/ shared library: Button, HeroCard, Card, Row, Tag, Switch, Slider, Field, Toast
  hooks/        useOnline
  i18n/         createI18n, language detection, locales/en.ts and hi.ts
  lib/          finance (loan, prepay, refinance, goal maths), format (₹ and dates)
  pages/        Plans, Goals, GoalDetail, Health, HealthBreakdown, Tax, EmiCalculator, PrepayCalculator, RefinanceCheck, AffordabilityCheck, GoalCalculator, You, DevTokens and DevComponents (dev only)
  test/         setup, the axe helper, renderWithI18n, the PWA virtual-module stub
  styles/       tokens.css
public/         icons and favicon
```

## Status

M1 is done: scaffold, tokens, PWA shell, offline screen, the tested finance module, the shared component library,
CI with Vercel previews, English and Hindi i18n, and the mock API.
M2 is done: the Plans hub, all five calculators (EMI, prepay, refinance, affordability, goal), the tax screen, the health score with its breakdown, and the goals list and detail are live. Next is Recommendations, then the milestones that need writes. The rest run on `lib/finance` and the mock.
Until the backend exists the app serves the mock persona to everyone (`api/instance.ts`, with a 250 ms delay so loading states are real).
