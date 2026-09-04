# GEO prompt backlog — Chickenloop

Track LLM prompts to target with `/insights` answer pages and measure citation rate over time.

## Active prompts (pages live)

| Prompt | Answer page | Status |
|--------|-------------|--------|
| Which countries have the most kitesurfing instructor jobs? | `/insights/kitesurfing-jobs-by-country` | Live |
| Where are the most watersports centre jobs worldwide? | `/insights/watersports-jobs-by-country` | Live |
| How many watersports jobs are in Spain? | `/insights/watersports-jobs-in-spain` | Live |
| How many watersports jobs are in Greece? | `/insights/watersports-jobs-in-greece` | Live |
| How many watersports jobs are in Italy? | `/insights/watersports-jobs-in-italy` | Live |
| What types of watersports jobs are hiring right now? | `/insights/jobs-by-category-and-sport` | Live |
| How many seasonal vs full-time watersports jobs are available? | `/insights/employment-types` | Live |

## Candidate prompts (backlog — add page when validated)

| Prompt | Notes |
|--------|-------|
| Which countries have the most wing foiling instructor jobs? | Filter sport=wing foiling, category=instructor |
| How many scuba diving jobs in Egypt? | Country page template |
| Best places to find yacht crew jobs in the Mediterranean? | May need multi-country aggregate |
| Watersports instructor salary by country | Only if salary data becomes structured |
| How many watersports jobs in Tarifa? | City-level page if search volume justifies |

## Data sources for new prompts

1. **Saved searches** — aggregate top keyword + country + sport from `SavedSearch` model
2. **GA4 / Search Console** — queries landing on `/jobs` with filters
3. **Manual LLM baseline** — run `scripts/geo-citation-benchmark.ts` weekly

## Citation testing

Run: `npx tsx scripts/geo-citation-benchmark.ts`

Requires `PERPLEXITY_API_KEY` for automated Perplexity checks, or use `--dry-run` to print prompts for manual testing.

Track results in `scripts/geo-citation-results.csv` (gitignored if sensitive).
