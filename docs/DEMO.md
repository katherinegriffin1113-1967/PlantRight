# PlantRight — demo script & pre-turn-in checklist

A rehearsable click path for showing the app, plus the deploy steps that must
happen first. Written 2026-07-21 for the v2 "Refine Your Application" turn-in
(due Sun, Jul 26).

## Before the demo: deploy + config (one-time)

The v2 work is committed to `main` but **not deployed**. In order:

1. **Supabase Auth config** (dashboard → Authentication → URL Configuration):
   add `https://plantright.net/login` and
   `https://plantright-app.netlify.app/login` to the redirect allowlist.
   Without this, password-reset emails won't return users to the app.
2. **Edge functions** (Supabase MCP `deploy_edge_function`):
   - `planting-plan` — inline ALL FIVE files: `index.ts`, `plants.ts`,
     `nurseries.ts`, `local.ts`, `address.ts`. Missing one fails with
     "Module not found".
   - `verify-checkout` — single file; now cancels the previous Stripe
     subscription on plan switch.
3. **Frontend**: `npm run build`, then Netlify MCP `deploy-site` (fix the
   doubled `//proxy` slash in the returned URL). Confirm the live HTML
   references the new asset hash.
4. **Smoke test**: POST to `planting-plan` with only the publishable key —
   `{"error":"Not authenticated."}` proves all five modules loaded.

## Demo state (already set up)

- Demo account: `plantright.demo@gmail.com` (password in Katherine's notes).
- Its subscription is **Home + Landscape** (3 addresses) and its saved plans
  were pruned to **1** (the West Palm Beach address) — so the demo can add
  **two brand-new addresses live** before hitting the limit.
- Stripe is test mode: card `4242 4242 4242 4242`, any future expiry/CVC.

## The click path (~5 minutes)

1. **Landing page** (plantright.net): scroll the ICP story — Dana's journal
   quote, "The garden center is a beautiful trap", pricing tiers. Note the
   footer's data-source links (USDA, Firecrawl, OpenStreetMap, Wikipedia).
2. **Sign in** (`/login`) as the demo user. Point out "Forgot your password?"
   — the reset flow is live.
3. **Generate a plan**: answer the seven garden questions, enter a NEW
   address (e.g. `1342 Chrismill Lane, Mount Pleasant, SC`), Get my plan.
   While it builds, the staged progress line narrates each backend step.
4. **Walk the plan top to bottom**:
   - Zone badge + frost dates (official USDA data)
   - **Your yard's conditions** — sun / microclimate / soil
   - Satellite view of the address
   - Plant list: tap one with a "📍 local note" badge → photo, note for your
     area (with source), planting calendar, care, companions
   - **Local pest & disease watch** + county extension link
   - Check a few plants → print-ready shopping list
   - **Where to buy these nearby** — real nurseries with distances
   - Sources list (Firecrawl citations)
5. **Address limit**: the usage line reads "2 of 3 addresses used". Type a
   third new address → works; then explain that a fourth would flip the
   button to "Upgrade to add this address" (server enforces it too, before
   any Firecrawl spend).
6. **Stripe (optional)**: sign out, create a throwaway account, buy Starter
   with the test card, show the badge appear.

## Known caveats (say them before the professor finds them)

- Testimonials/stat numbers on the landing page are illustrative marketing
  copy for the ICP exercise.
- Plans generated before v2 lack the conditions/pests sections — regenerate
  to show them.
- Re-running an already-saved address never counts against the limit.

## Requirement → evidence map (for the write-up)

| v2 axis | What to show |
|---|---|
| ICP fit | Dana-centered landing narrative; every feature answers her nursery-overwhelm problem |
| Landing page | Hero promises = exactly what the app delivers (conditions strip); honest footer |
| Firecrawl deepened | Two city-scoped searches: frost dates + citations, AND soil / pests / extension / per-plant local notes |
| Data/login tightened | Address-limit enforcement (server-side, RLS-scoped), password reset + resend-confirmation, per-address deduped saved plans, `npm test` suite over the matcher/extractors |
