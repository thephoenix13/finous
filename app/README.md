# Finous app (B2C PWA)

The production PWA. Plan: `../docs/PWA/B2C PWA — Build Plan.html`. Architecture: `../docs/Product Tehnical Specifications/`.

This folder is separate from the marketing site at the repo root and in `../finous/`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173, token preview at /dev/tokens
npm test           # finance unit tests (Vitest)
npm run build      # typecheck + production build + service worker
npm run preview    # serve the build at http://localhost:4173 (needed to test the PWA)
```

The service worker is off in `npm run dev`. Test install and offline behaviour against `npm run preview`.

## Rules baked in (Architecture v1.1)

- Service worker precaches the app shell only (HTML, JS, CSS, icons). **No runtime caching.** Financial data is never cached.
- Offline shows the "You're offline" screen. Nothing cached is displayed.
- Updates are prompted ("A new version of Finous is ready"), never silent.
- System fonts only, so the shell works offline with no web-font requests.

## Finance maths

`src/lib/finance.ts` is pure and dependency-free: `emi`, `monthsToClose`, `loanSummary`, `prepay`, `refinance`,
`futureValue`, `monthlyContributionForGoal`, `bufferMonths`, `taxSaving`, `addMonths`. `src/lib/format.ts` has `inr`
(Indian digit grouping), `formatMonthYear` and `roundTo`.

- Money is plain rupees and is never rounded inside the module. Round when you display.
- Rates are annual percentages, compounded monthly. Invalid input throws `RangeError`.
- The tests use the figures from Prototype v2 (EMI ₹58,345, prepay ₹50,000 saves 4 months and about ₹1,83,378,
  refinance saves about ₹1,523 a month). If a screen's number changes, change it here first.

## Design tokens

Daylight tokens live in `src/styles/tokens.css` as plain CSS variables, mapped to Tailwind utilities in `src/index.css`
(`bg-page`, `text-ink`, `border-line`, `bg-domain-tint`, `shadow-card`, ...).

- Domain accents: set `data-domain="loan"` (also `emi`, `tax`, `inv`, `save`, `goal`, `ai`) on a container.
- Tenant branding (later milestone): override the same variables per tenant.

## Layout

```
src/
  components/   Shell, TabBar, OfflineScreen, UpdatePrompt, PlaceholderPage
  hooks/        useOnline
  lib/          finance (loan, prepay, refinance, goal maths), format (₹ and dates)
  pages/        DevTokens (dev only)
  styles/       tokens.css
public/         icons and favicon
```

## Status

M1 in progress: scaffold, tokens, PWA shell, offline screen and the tested finance module are done.
Still to do in M1: shared component library, i18n (en, hi), mock API, CI and Vercel previews.
