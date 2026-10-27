# Finous app (B2C PWA)

The production PWA. Plan: `../docs/PWA/B2C PWA — Build Plan.html`. Architecture: `../docs/Product Tehnical Specifications/`.

This folder is separate from the marketing site at the repo root and in `../finous/`.

## Run

```bash
npm install
npm run dev        # http://localhost:5173, token preview at /dev/tokens
npm run build      # typecheck + production build + service worker
npm run preview    # serve the build at http://localhost:4173 (needed to test the PWA)
```

The service worker is off in `npm run dev`. Test install and offline behaviour against `npm run preview`.

## Rules baked in (Architecture v1.1)

- Service worker precaches the app shell only (HTML, JS, CSS, icons). **No runtime caching.** Financial data is never cached.
- Offline shows the "You're offline" screen. Nothing cached is displayed.
- Updates are prompted ("A new version of Finous is ready"), never silent.
- System fonts only, so the shell works offline with no web-font requests.

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
  pages/        DevTokens (dev only)
  styles/       tokens.css
public/         icons and favicon
```

## Status

M1 in progress: scaffold, tokens, PWA shell and offline screen are done.
Still to do in M1: shared component library, i18n (en, hi), mock API, CI and Vercel previews.
