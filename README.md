# Finous — The AI layer that helps banks understand their customers

Marketing site for **Finous**, a B2B + B2C financial intelligence platform for RBI-regulated banks and NBFCs. Built by **Nidhiverse Pvt Ltd**.

Three pages (HashRouter, static-host friendly), each with its own waitlist:

- **`/` — Landing**: concept introduction ("One layer. Two directions."), live intelligence console, market stats, moat teaser.
- **`/b2b` — For Institutions**: business case, regulated segments, platform architecture, moat, security & governance, pilot program, institution FAQ.
- **`/b2c` — For Customers**: live phone mock, unified ledger, Hindi/English AI advisor demo, how it works, privacy promises.
- **`/app` — Day 0 Tools** (standalone HTML at `public/app/index.html`): Mobile-first app experience with personalized onboarding:
  - **Welcome Screen**: User enters their name (saved to localStorage for returning visitors)
  - **Greeting Screen**: "Hello, [Name]" with grid of 6 tools
  - **Tool Screens**: Full-screen calculator interfaces with back navigation
  
  **Tools included:**
  - **EMI Calculator**: Loan type presets, amortization schedule, principal vs interest breakdown with visual bars
  - **SIP Calculator**: Regular SIP, Step-up SIP (annual increase), Goal-based reverse calculator
  - **Loan Eligibility**: Multiple loan types, co-applicant support, FOIR breakdown, credit score impact
  - **Budgeting Tool**: 50/30/20 rule with detailed category breakdown (housing, food, transport, etc.)
  - **Reading Resources**: Links to dedicated content library page
  - **Credit Card Picks**: On hold (integration pending)

  App-like experience with smooth screen transitions, localStorage persistence, and touch-optimized UI. Apple-inspired design, same visual identity as the main site.

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

### Vercel Configuration

The `vercel.json` file includes rewrites for clean URLs:
- `/privacy` → `/legal/privacy.html`
- `/terms` → `/legal/terms.html`
- `/data-usage` → `/legal/data-usage.html`

## Legal Pages

Three legal document pages are available at:
- `/legal/privacy.html` - Privacy Policy
- `/legal/terms.html` - Terms and Conditions
- `/legal/data-usage.html` - Data Usage and Sharing Policy

These pages are accessible via clean URLs (`/privacy`, `/terms`, `/data-usage`) thanks to Vercel rewrites. All pages include:
- Finous branding with legal document badge
- Draft notice for review before publishing
- Responsive design matching the main site
- Print-friendly styling
- Placeholder dates and addresses (to be filled after registration)

**Important:** These are draft documents. A qualified legal professional must review them before publishing.

## Contact

- Waitlist / partnerships: founder@finous.site
- Confidential · Not for distribution
