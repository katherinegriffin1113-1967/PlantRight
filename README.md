# 🌿 PlantRight

**Live app:** https://plantright.net (also at https://plantright-app.netlify.app)

PlantRight gives homeowners an **address-specific planting plan** — USDA hardiness
zone, frost dates, plants that will actually survive their yard, and the garden
centers nearby that sell them — instead of the zone-level generalities the
gardening industry sells.

Built for the *Hands-On: Build Your Custom Application* assignment.

## Assignment requirements

| Requirement | Where it lives |
|---|---|
| **ICP-driven design** | Built around the Problem-Aware avatar "Dana Mercer" — see [`docs/PlantRight-Problem-Aware-Avatar.md`](docs/PlantRight-Problem-Aware-Avatar.md) |
| **Landing page** | `src/App.jsx` — full marketing page at `/`, CTAs route into the app |
| **Firecrawl** | `supabase/functions/planting-plan/index.ts` — a Supabase Edge Function calls [Firecrawl](https://www.firecrawl.dev) v2 Search server-side to scrape live, location-specific growing data (zone, frost dates, planting calendars), then parses it into a structured plan with cited sources |
| **Connected database** | Supabase Postgres — `planting_plans` and `profiles` tables with Row Level Security so each user only sees their own plans |
| **Login / auth** | Supabase email + password auth (`src/pages/Login.jsx`, `src/auth/`) guarding the `/app` dashboard |

## How it works

1. Sign up / sign in (`/login`).
2. On the dashboard (`/app`), enter an address or city and answer six questions
   about the garden: what you want to plant, annuals vs. perennials, mature
   size, flowers vs. foliage, how much sun the spot gets, and how much watering
   you're up for.
3. The frontend invokes the `planting-plan` Edge Function with your session JWT.
4. The function verifies the user, resolves the hardiness zone from official
   USDA data, pulls live frost dates and citations for that location via
   Firecrawl, picks plants matching both the zone and your answers, finds
   nearby nurseries, and saves the plan to the database (owned via RLS).
5. Saved plans reload on every visit.

### Plant matching

Recommendations come from a 120-plant catalog where every entry is tagged with
its hardiness range, lifecycle, type, mature size, bloom, sun, and water needs.
Your answers filter it, and each plant is shown with those attributes as badges
so the recommendation explains itself.

Because a narrow request ("small, shade-tolerant, drought-proof, flowering") can
match nothing in a cold zone, the matcher widens the search one constraint at a
time rather than returning an empty plan — and says which constraint it relaxed,
while still ranking exact matches first.

### Nearby nurseries

Every plan ends with garden centers within 30 miles — nearest first, with
address, distance, phone, website, and a directions link — sourced from
OpenStreetMap via Nominatim, with a Google Maps search as a fallback where
nothing is mapped.

## Stack

- **Frontend:** React 19 + Vite, React Router — deployed on Netlify
- **Backend:** Supabase (Postgres + Auth + Edge Functions/Deno)
- **Data:** Firecrawl v2 Search API for live growing data (server-side only; the
  API key never ships to the browser), the official USDA 2023 hardiness zone map
  via phzmapi, and OpenStreetMap/Nominatim for geocoding and nurseries
- **Payments:** Stripe Checkout in test mode for the three subscription tiers

## Run locally

```bash
npm install
cp .env.example .env   # fill in Supabase URL + publishable key
npm run dev            # http://localhost:5173
```

The Supabase publishable key is safe for the browser by design; all data access
is enforced by Row Level Security. The Firecrawl API key lives server-side
(locked-down `app_secrets` table read only by the service role inside the Edge
Function).

## Project layout

```
src/
  App.jsx                 # landing page (marketing site)
  main.jsx                # router: / , /login , /app (protected)
  auth/                   # AuthContext + ProtectedRoute
  pages/                  # Login, Dashboard + app styles
  lib/supabase.js         # Supabase client
supabase/functions/
  planting-plan/
    index.ts              # plan generator: zone, frost dates, plants, nurseries
    plants.ts             # 120-plant catalog + preference matcher
    nurseries.ts          # nearby garden centers (OpenStreetMap)
  create-checkout/        # Stripe Checkout session (test mode)
  verify-checkout/        # server-side verification, grants the plan
docs/
  PlantRight-Problem-Aware-Avatar.md   # ICP avatar document
  SESSION-HANDOFF.md                   # full context for picking this up again
```
