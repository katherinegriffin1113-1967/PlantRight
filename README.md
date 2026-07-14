# 🌿 PlantRight

**Live app:** https://plantright.net (also at https://plantright-app.netlify.app)

PlantRight gives homeowners an **address-specific planting plan** — USDA hardiness
zone, frost dates, and plants that will actually survive their yard — instead of
the zone-level generalities the gardening industry sells.

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
2. On the dashboard (`/app`), enter an address or city.
3. The frontend invokes the `planting-plan` Edge Function with your session JWT.
4. The function verifies the user, pulls live web data for that location via
   Firecrawl, extracts the hardiness zone + frost dates, matches zone-appropriate
   plants, and saves the plan to the database (owned by the user via RLS).
5. Saved plans reload on every visit.

## Stack

- **Frontend:** React 19 + Vite, React Router — deployed on Netlify
- **Backend:** Supabase (Postgres + Auth + Edge Functions/Deno)
- **Data:** Firecrawl v2 Search API (server-side only; the API key never ships to the browser)

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
  planting-plan/index.ts  # Firecrawl-powered plan generator (Edge Function)
docs/                     # ICP avatar document
```
