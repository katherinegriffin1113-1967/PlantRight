# PlantRight — session handoff

Everything a fresh Claude Code session needs to pick this project up. First
written 2026-07-20 after the plant-catalog + nursery release; updated
2026-07-21 after the plant-photos + gardener-features release; updated again
2026-07-21 for the v2 "Refine" pass (below).

## ⚠️ Current state: main is AHEAD of the live site

The v2 refinement work is committed and pushed to `main` but **NOT deployed**.
The live site at https://plantright.net is still running the plant-photos
release (Edge Function **version 9**). Deploy is manual and two-part (see the
deploy section) and was intentionally paused pending Katherine's go-ahead —
partly because the plan now makes **two** Firecrawl searches instead of one, so
credit burn per plan doubles, and credits were the main demo risk.

**Undeployed v2 commits (newest first):**

- `064a586` — **Address-limit enforcement.** Tiers are sold by property count
  but nothing enforced it. Now the edge function counts the user's distinct
  saved addresses (RLS-scoped) and rejects a *new* address once the plan limit
  is hit — 403 with `code: "address_limit"`, checked *before* the Firecrawl
  calls so a blocked request spends no credits. Re-running an existing address
  is always allowed. Limits: **free / Starter / Yard Pro = 1 address, Home +
  Landscape = 3.** (Free = 1 was an assumption — the tier copy never defines the
  free tier; confirm with Katherine if the intended model differs.) The
  dashboard mirrors it: a "N of M addresses used" line and an "Upgrade to add
  this address" CTA at the limit.
- `9107b60` — **Deepened Firecrawl + honest landing + login.** A second
  city-scoped Firecrawl search feeds `supabase/functions/planting-plan/local.ts`
  (local soil, county extension office, area pests/diseases, per-plant local
  notes); it runs parallel to the frost search and is non-fatal. The landing
  hero's sun/soil/microclimate promises are now real and shown in a "Your yard's
  conditions" strip. Login gained password reset (request + recovery) and a
  friendly "email not confirmed" path. `matchPlants` now returns copies so
  per-plant notes can't leak into the shared CATALOG across warm invocations.

**Not yet decided:** the fabricated landing-page stats ("12,000+ homeowners",
"94% thrive rate", "$340 saved") — flagged for the turn-in, left as-is pending
Katherine's call.

**Everything below this line describes the plant-photos release** (what's
currently live) plus the v2 additions where noted.

**Shipped since the original release (all live + committed + pushed):**

- **Clickable plant photos** — each recommended plant opens a detail modal with
  a photo + short description from Wikipedia's REST summary endpoint
  (`src/lib/plantPhotos.js`, `src/pages/PlantPhotoModal.jsx`).
- **Form reorder** — the dashboard asks the garden questions first, then the
  address + "Get my plan" button.
- **Planting calendar, care, and companions** — the same detail modal shows
  when to plant (timed to the plan's frost dates), spacing/sun/water care, and
  companion-planting notes. All computed client-side in `src/lib/plantData.js`.
- **Shopping list** — checkboxes on each plant build a nursery-ready print view.
- **Re-run + pre-fill** — reload a saved plan's answers into the form; the last
  answers persist in `localStorage`.
- **Pollinator filter** — a seventh garden question. Its definition lives in
  BOTH `plants.ts` (`isPollinator`, the matcher) and `plantData.js`
  (`isPollinatorFriendly`, the badge) — keep those two in sync.

**The one thing still not verified:** nobody has done a signed-in, end-to-end
click through the live app. Claude does not enter passwords into login forms,
so the dashboard is verified by rendering its components against fixture data
instead (a throwaway `src/pages/__preview.jsx` route, removed before each
commit). Katherine should sign in once, generate a real plan, and confirm the
questions, plant list, photos, calendar, and pollinator filter all behave.

## Where everything is

| Thing | Where |
|---|---|
| Source | `/Users/katherinegriffin/Claude/PlantRight` |
| GitHub | `katherinegriffin1113-1967/PlantRight`, branch `main` |
| Live site | https://plantright.net (also `plantright-app.netlify.app`) |
| Netlify site ID | `a4b2987c-9842-43e7-87cb-0dbface90f07` |
| Supabase project | `xqfdjgqtnfuqzsamtqdu` (org `pomxrycwksoszszotoea`) |
| Demo login | `plantright.demo@gmail.com` — password is in Katherine's notes, not here |

## What the app does

A homeowner enters an address, answers seven questions about their garden, and
gets back a plan: USDA hardiness zone, frost dates, a list of plants matched to
both the zone and their answers (each openable for a photo, planting calendar,
care, and companions), and nearby garden centers to buy them from.

The assignment required a landing page, Firecrawl, a connected database, and
login/auth. All four are in place — see the table in `README.md`.

## Architecture

**Frontend** — React 19 + Vite + React Router, deployed on Netlify.

- `src/App.jsx` — landing/marketing page at `/`
- `src/pages/Login.jsx` — Supabase email+password auth
- `src/pages/Dashboard.jsx` — the app at `/app`. Holds the `QUESTIONS` config,
  the `GardenPrefs` question panel, `PlanCard`, and `NurseryList`.
  `GardenPrefs` and `PlanCard` are exported so they can be rendered in
  isolation for testing.
- `src/pages/PlantPhotoModal.jsx` — the per-plant detail modal (photo,
  description, planting calendar, care, companions).
- `src/lib/plantPhotos.js` — plant name → Wikipedia photo/description. Holds a
  verified name→article-title map for all 120 catalog plants.
- `src/lib/plantData.js` — client-side planting calendar, companion, care, and
  pollinator logic derived from each plan's tags + frost dates.
- `src/pages/app.css` — dashboard + auth styles (tokens come from `index.css`)

**Backend** — one Supabase Edge Function, `supabase/functions/planting-plan/`:

- `index.ts` — orchestrates everything: resolves the place, calls Firecrawl,
  extracts frost dates, matches plants, fetches nurseries, saves the plan
- `plants.ts` — the 120-plant catalog and the preference matcher
- `nurseries.ts` — nearby garden centers

Two other functions handle Stripe: `create-checkout` and `verify-checkout`.

**Database** — Supabase Postgres, all RLS-protected: `profiles` (auto-created
by a `handle_new_user` trigger), `planting_plans` (per-user), `subscriptions`
(select-only for clients; only `verify-checkout` writes, via service role after
verifying with Stripe), and `app_secrets` (RLS with no policies at all — holds
`FIRECRAWL_API_KEY` and `STRIPE_SECRET_KEY`, read server-side only).

## How a plan gets built

1. Dashboard invokes `planting-plan` with `{ location, preferences }` and the
   user's JWT.
2. `lookupPlace()` geocodes via Nominatim to get **lat/lon and a ZIP**, then
   ZIP → `phzmapi.org` for the official USDA 2023 hardiness zone. The zone is
   resolved deterministically here, *not* scraped — an earlier version voted on
   scraped text and confidently returned zone 5 for West Palm Beach.
3. In parallel, Firecrawl v2 `/search` pulls live pages for frost dates and
   citations. Only pages that actually mention the user's city are used;
   generic "zone chart" pages list every zone and every date and poisoned the
   results.
4. `matchPlants()` filters the catalog to the zone, then applies the answers.
5. The nursery lookup is **chained off the geocode promise** so it overlaps the
   Firecrawl call and costs no extra wall-clock time.
6. The plan is written to `planting_plans` under the user's ID.

## The plant catalog (`plants.ts`)

120 plants, each tagged with `zones: [min, max]`, `life` (annual / perennial /
biennial), `type` (vegetable, fruit, herb, flower, shrub, tree, vine, grass,
groundcover), `size` (small <2ft / medium 2–6ft / large >6ft), `flowering`,
`sun`, and `water`.

`matchPlants(zone, prefs)` hard-filters on zone, then applies the answers as
optional filters. **The important behavior:** a narrow request (shade + small +
low-water + flowering, in a cold zone) would otherwise return nothing, so the
matcher drops the least-important constraint one at a time until at least four
plants remain, returns what it dropped in `plan.relaxed` (surfaced in the
summary as "we widened the search on …"), and still ranks plants that satisfied
every original answer first. Picks are also spread across categories so a plan
isn't twelve tomatoes.

To add plants, append to `CATALOG` — no other code changes needed.

## The nursery lookup (`nurseries.ts`)

Garden centers within 30 miles, nearest first, with address, distance, phone,
website, and a maps link. Falls back to a Google Maps search link when nothing
is mapped nearby (genuinely common in rural areas).

**Do not switch this to Overpass.** That was the first implementation and it
was measured: the public Overpass instances answered roughly one request in
three (504 under load) and took ~30 seconds to fail; the kumi and private.coffee
mirrors were unreachable; `overpass.osm.ch` is a Switzerland-only extract and
returns 0 results for US queries. Nominatim serves the same OpenStreetMap data
in under a second. Two Nominatim caveats: it ranks by prominence rather than
distance (so distance is computed and sorted locally), and `limit` must be high
(40) or nearby shops get crowded out by prominent far-away ones.

## Deploying — read this before shipping anything

**There is no Supabase CLI installed and Netlify is not wired to GitHub CI.
Pushing to GitHub deploys nothing.** Both halves are manual:

**Edge Function** — use the Supabase MCP `deploy_edge_function` tool. You must
inline the content of *every* file (`index.ts`, `plants.ts`, `nurseries.ts`) in
the `files` array; omitting one fails with `Module not found`. Afterward, diff
`get_edge_function` output against the local files to catch transcription drift.

**Frontend** — `npm run build`, then call the Netlify MCP `deploy-site` tool
and run the `npx @netlify/mcp …` command it returns. The returned proxy URL has
a **doubled slash** (`.app//proxy/`) that 404s — change it to a single slash.
Confirm success by checking that the asset hash in the live HTML matches the
hash `npm run build` just printed.

**Verifying the function without logging in:** POST to the function with only
the publishable key. A response of `{"error":"Not authenticated."}` is the
function's *own* message, which proves all three modules loaded and executed in
Supabase's Deno runtime. A gateway error or 500 would mean a boot failure.

## Gotchas that already cost time

- Netlify build env vars never propagated, so the Supabase URL + publishable
  key are hardcoded as fallbacks in `src/lib/supabase.js`. This is safe —
  publishable key plus RLS — and removing it will break the live site.
- Supabase email confirmation is ON, so new signups need confirming. The demo
  user was confirmed via SQL. Email domains without MX records (like `.app`)
  are rejected as invalid.
- `npm run dev` must be launched through the preview tooling, and the launch
  config in the *working directory* wins. A `plantright-dev` entry pointing at
  this repo lives in `~/claude_projects/.claude/launch.json`.
- Two pre-existing ESLint errors in `Dashboard.jsx` (`set-state-in-effect`, in
  the checkout and initial-load effects) predate all recent work. They do not
  block the build. Don't be alarmed by them, and don't "fix" them casually —
  they're in the Stripe return-handling path.

## Possible next steps

None are required; the assignment is complete. Re-run/pre-fill, the per-plant
planting window, and edit-and-re-run all shipped in the 2026-07-21 release.

- **Frost/weather alerts** — "frost tonight, cover your plants" for a saved
  location. Needs a weather API + an email service (Supabase can't send
  arbitrary email on its own) + a scheduled job. The biggest of the ideas.
- **Garden journal** — log plantings + photos across seasons. Needs a new table
  + Supabase Storage for images.
- **Garden bed layout planner** — drag plants into a spacing-aware bed grid.
- **Native-plant filter** — pollinator shipped; "native to your region" is the
  harder, region-specific data still to do.
- Add nursery opening hours (OSM has them; Nominatim's `extratags` are often
  null, so this likely means a second data source)
