# Finous — The AI layer that helps banks understand their customers

Marketing site for **Finous**, a B2B + B2C financial intelligence platform for RBI-regulated banks and NBFCs. Built by **Nidhiverse Pvt Ltd**.

Live sections: Hero with a live intelligence console · About (B2B/B2C) with market stats · Platform architecture · The Moat · Security & Governance · Institution FAQ · Pilot Program / Engagement Model · Waitlist.

## Tech stack

- **React 18** + **TypeScript**
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
