# PlantRight — Final Submission

**Student:** Katherine Griffin
**Live application:** https://plantright.net
**Source code:** https://github.com/katherinegriffin1113-1967/PlantRight
**Assignment:** Hands-On — Build Your Custom Application (v1) + Refine Your Application (v2)

---

## What PlantRight is

PlantRight gives homeowners an **address-specific planting plan** instead of
the zone-level generalities the gardening industry sells. It was designed
around a specific Ideal Customer Profile — "Dana Mercer," a Problem-Aware
homeowner who keeps buying plants that die because big-box garden centers sell
by region, not by yard (full avatar document:
`docs/PlantRight-Problem-Aware-Avatar.md`).

A user enters their address and answers seven questions about their garden
(what they want to grow, annuals vs. perennials, mature size, flowers vs.
foliage, sun, watering appetite, pollinator-friendliness). In about 20 seconds
they get back:

- Their **USDA hardiness zone** from the official 2023 USDA map
- **Local frost dates** and growing window, pulled live from the web
- A **plant list** matched to both their zone and their answers — each plant
  opens into a photo, a planting calendar timed to their frost dates, care
  notes, companion-planting advice, and (where found) a growing note sourced
  from local pages
- Their area's **soil type** and a **local pest & disease watch**, with links
  to the sources and their county extension office
- A satellite view of the property and **real nearby garden centers** with
  distances, phone numbers, and directions
- A checkable **shopping list** that prints cleanly to take to the nursery

## How each required technology is used

### Supabase (database, auth, and server-side logic)

- **Authentication:** email/password sign-up and sign-in, with email
  confirmation, password reset, and a resend-confirmation flow. The `/app`
  dashboard is a protected route.
- **Postgres database:** `profiles` (auto-created by a trigger on signup),
  `planting_plans` (every generated plan, one row per run), `subscriptions`
  (paid tier per user), and `app_secrets` (API keys, locked down). Every
  table uses **Row Level Security**, so each user can only ever read their
  own data — enforced by the database itself, not application code.
- **Edge Functions (Deno):** all third-party API work happens server-side in
  three functions — `planting-plan` (builds the plan), `create-checkout` and
  `verify-checkout` (Stripe). API keys never reach the browser.
- The plan generator also **enforces the business model** server-side: tiers
  are sold by number of properties, and the function rejects an
  over-the-limit address before spending any API credits.

### Firecrawl (live web data)

Every plan fires **two Firecrawl v2 Search requests** from the edge function:

1. A frost-date search — results are filtered to pages that actually mention
   the user's city, then parsed for last-spring/first-fall frost dates, which
   drive each plant's planting calendar. Sources are cited in the plan.
2. A local-conditions search — mined for the area's typical soil, common
   pests and diseases (each chip links to the page that mentioned it), the
   county extension office, and per-plant local growing notes.

Deliberate design choice: the hardiness zone itself comes from the official
USDA dataset rather than scraped text, because scraped pages proved
unreliable for that one value — Firecrawl supplies what genuinely benefits
from live data (dates, local conditions, citations).

### Netlify (hosting and domain)

- The React + Vite frontend is built and hosted on Netlify.
- The custom domain **plantright.net** was purchased through Netlify's domain
  registration service (Name.com registrar) and attached to the site with
  automatic HTTPS. The app is also reachable at plantright-app.netlify.app.

### Stripe (payments — test mode)

A full subscription checkout is wired for the three pricing tiers (Starter,
Yard Pro, Home + Landscape), monthly or annual. The flow is production-shaped:
the browser only ever receives a Stripe-hosted checkout URL; after payment,
the server retrieves the session **directly from Stripe**, confirms it was
paid and belongs to the signed-in user, and only then grants the plan (the
subscriptions table is not writable by clients at all). Switching tiers
automatically cancels the previous Stripe subscription so no one double-bills.
The account runs in **Stripe test mode** — it processes real checkout flows
with test cards but can never charge a real card.

## How to log in

1. Go to **https://plantright.net** and click **Sign In** (or go directly to
   https://plantright.net/login)
2. Demo account: **plantright.demo@gmail.com** / **plantright123**
3. You'll land on the dashboard. Answer the garden questions, enter an
   address (e.g. `1342 Chrismill Lane, Mount Pleasant, SC`), and click
   **Get my plan**. The build takes 15–30 seconds and narrates each step.

The demo account is on the Home + Landscape tier (3 properties). You can also
create your own account — new signups require email confirmation.

## How to demo Stripe

1. While signed in, scroll to the pricing tiers at the bottom of the
   dashboard and click **Choose** on any plan
2. On Stripe's checkout page, use the test card:
   - Card number: **4242 4242 4242 4242**
   - Expiry: any future date · CVC: any 3 digits · ZIP: anything
3. Complete the payment — you'll return to the dashboard with a welcome
   banner and the plan badge in the header

Because the account is in test mode, no real charge can ever occur.

## A few things worth knowing

- **Address limits are real:** the free tier and entry tiers cover one
  property; Home + Landscape covers three. Adding an address beyond the plan
  limit swaps the button for an upgrade prompt — and the server enforces the
  same rule independently, before any paid API call. Re-running an existing
  address is always allowed and doesn't count.
- **Tests:** `npm test` runs a Deno suite over the server-side logic — the
  plant matcher (zone safety, constraint relaxation), address
  canonicalization, and the Firecrawl text-extraction functions. The suite
  includes regression tests written from real failures found during live
  verification.
- **Honesty in extraction:** anything mined from the web is cited, and a
  data point that can't be grounded is omitted rather than guessed — an
  empty soil card beats a wrong one.
- **Marketing copy:** the landing page's testimonials and statistics
  ("12,000+ homeowners," etc.) are illustrative marketing copy written for
  the ICP exercise, not real metrics.
- **Documentation:** `README.md` maps every assignment requirement to the
  code that implements it; `docs/DEMO.md` has a fuller walkthrough;
  `docs/SESSION-HANDOFF.md` records the architecture and engineering
  decisions, including measured trade-offs (e.g., why nursery lookup uses
  Nominatim instead of Overpass).

**Stack summary:** React 19 + Vite + React Router · Supabase (Postgres, Auth,
Edge Functions, RLS) · Firecrawl v2 Search · Stripe Checkout (test mode) ·
Netlify hosting + plantright.net · USDA PHZ data · OpenStreetMap/Nominatim ·
Mapbox satellite imagery · Wikipedia plant photos
