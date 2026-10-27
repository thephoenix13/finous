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
`futureValue`, `monthlyContributionForGoal`, `bufferMonths`, `taxSaving`, `addMonths`. `src/lib/format.ts` has `inr`
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
| `HeroCard` | Tinted card with the one big number. Colours come from `data-domain`. |
| `Card` | `raised` (shadow) or `outline` (hairline). |
| `Row`, `RowGroup` | Renders a real `<button>` (`onClick`), a real link (`to`) or plain content. |
| `Tag` | `neutral`, `positive`, `warning`, `negative`. Text carries the meaning. |
| `Switch` | `<button role="switch">`. `label` is required. Controlled or uncontrolled. |
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
  health score, goals, consents), documented with the REST route each method will call. Money is whole rupees, spending is
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

## Layout

```
src/
  api/          types (the contract), mock, persona, errors, contract.suite
  components/   Shell, TabBar, OfflineScreen, UpdatePrompt, PlaceholderPage, LanguageSwitcher
  components/ui/ shared library: Button, HeroCard, Card, Row, Tag, Switch, Slider, Field, Toast
  hooks/        useOnline
  i18n/         createI18n, language detection, locales/en.ts and hi.ts
  lib/          finance (loan, prepay, refinance, goal maths), format (₹ and dates)
  pages/        You, DevTokens and DevComponents (dev only)
  test/         setup, the axe helper, renderWithI18n, the PWA virtual-module stub
  styles/       tokens.css
public/         icons and favicon
```

## Status

M1 is done: scaffold, tokens, PWA shell, offline screen, the tested finance module, the shared component library,
CI with Vercel previews, English and Hindi i18n, and the mock API.
Next is M2 (calculators), which can run entirely on `lib/finance` and the mock.
