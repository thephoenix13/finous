# Finous — The AI layer that helps banks understand their customers

Marketing site for **Finous**, a B2B + B2C financial intelligence platform for RBI-regulated banks and NBFCs. Built by **Nidhiverse Pvt Ltd**.

Three pages (HashRouter, static-host friendly), each with its own waitlist:

- **`/` — Landing**: concept introduction ("One layer. Two directions."), live intelligence console, market stats, moat teaser.
- **`/b2b` — For Institutions**: business case, regulated segments, platform architecture, moat, security & governance, pilot program, institution FAQ.
- **`/b2c` — For Customers**: live phone mock, unified ledger, Hindi/English AI advisor demo, how it works, privacy promises.
- **`/app` — Day 0 Tools** (standalone HTML at `public/app/index.html`): Five detailed tools with full functionality:
  - **EMI Calculator**: Loan type presets, amortization schedule, principal vs interest breakdown with visual bars
  - **SIP Calculator**: Regular SIP, Step-up SIP (annual increase), Goal-based reverse calculator
  - **Loan Eligibility**: Multiple loan types, co-applicant support, FOIR breakdown, credit score impact
  - **Budgeting Tool**: 50/30/20 rule with detailed category breakdown (housing, food, transport, etc.)
  - **Credit Card Picks**: On hold (integration pending)

  All tools open in modals with working calculation logic. Apple-inspired design, same visual identity as the main site.

- **`/app/reading-resources` — Reading Resources** (standalone HTML at `public/app/reading-resources/index.html`): Dedicated content library page with:
  - 8 articles across 4 categories (Investing, Credit, Budgeting, Tax)
  - Category filters and search-ready structure
  - Newsletter signup form
  - CMS integration points documented in code (ready for Sanity/Contentful/Strapi)
  - Same design language as /app page

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
