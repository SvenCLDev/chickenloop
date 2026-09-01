# Homepage mobile LCP baseline

Measured before LCP optimization work (production, Lighthouse mobile simulated throttling).

| Metric | Value |
|--------|-------|
| URL | https://www.chickenloop.com/ |
| Date | 2026-09-01 |
| LCP | 11.5 s |
| Performance score | 60 |
| TTFB (root document) | 40 ms |

## Likely LCP element

Hero background image (`/Kitesurfer.jpg` via `next/image`), full-viewport above-the-fold.

## Changes applied (branch 2026-March-12)

- Compressed `public/Kitesurfer.jpg` to 1600×1066 (~376 KB source)
- Server-rendered `HomepageHero` with preload link in `app/page.tsx`
- Client-only hero rotation for slides 2–4 (`HomepageHeroRotation`)
- Navbar logo de-prioritized on homepage (`logoPriority={false}`)
- Job card images no longer use `priority` on homepage
- Google Analytics moved to `next/script` with `afterInteractive`

## Post-deploy verification

1. Re-run [PageSpeed Insights](https://pagespeed.web.dev/) mobile on `/` — target LCP ≤ 2.5 s (lab)
2. Monitor Vercel Speed Insights LCP p75 for `/`
3. Watch Google Search Console Core Web Vitals URL group over 28 days
