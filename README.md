# Finous — The AI layer that helps banks understand their customers

Marketing site for **Finous**, a B2B + B2C financial intelligence platform for RBI-regulated banks and NBFCs. Built by **Nidhiverse Pvt Ltd**.

Three pages (HashRouter, static-host friendly), each with its own waitlist:

- **`/` — Landing**: concept introduction ("One layer. Two directions."), live intelligence console, market stats, moat teaser.
- **`/b2b` — For Institutions**: business case, regulated segments, platform architecture, moat, security & governance, pilot program, institution FAQ.
- **`/b2c` — For Customers**: live phone mock, unified ledger, Hindi/English AI advisor demo, how it works, privacy promises.

## Tech stack

- **React 18** + **TypeScript** + **react-router-dom** (HashRouter — works on any static host)
- **Vite 6** (build & dev server)
- **Tailwind CSS v4** + custom design-token stylesheet
- Google Fonts: Space Grotesk / Inter / Noto Sans Devanagari
- No images — all visuals are CSS/SVG. Motion via IntersectionObserver + CSS keyframes, with `prefers-reduced-motion` fallbacks.

## Getting started

```bash
npm install
npm run dev        # local development
npm run build      # production build → dist/
```

## Deploy

The site is fully static. Point any static host (GitHub Pages, Vercel, Netlify, Cloudflare Pages) at the `dist/` output.

## Contact

- Waitlist / partnerships: founder@finous.site
- Confidential · Not for distribution
