// PlantRight — "create-checkout" Edge Function
// Creates a Stripe Checkout Session (subscription) for the signed-in user and
// returns the hosted checkout URL. Prices mirror the landing page tiers.
// The Stripe secret key stays server-side; the browser only ever sees the URL.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

// Amounts in cents. Annual tiers bill once per year at the landing page's
// discounted monthly rate × 12 ("$5/mo billed annually" → $60/yr).
const PLANS: Record<
  string,
  { name: string; monthly: number; annual: number }
> = {
  starter: { name: "PlantRight Starter", monthly: 400, annual: 2400 },
  yardpro: { name: "PlantRight Yard Pro", monthly: 900, annual: 6000 },
  homelandscape: {
    name: "PlantRight Home + Landscape",
    monthly: 1900,
    annual: 13200,
  },
};

const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "https://plantright-app.netlify.app",
  "https://plantright.io",
  "https://www.plantright.io",
]);

async function getStripeKey(): Promise<string | undefined> {
  const envKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (envKey) return envKey;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return undefined;
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
  const { data } = await admin
    .from("app_secrets")
    .select("value")
    .eq("key", "STRIPE_SECRET_KEY")
    .maybeSingle();
  return data?.value ?? undefined;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const stripeKey = await getStripeKey();
    if (!stripeKey) {
      return json(
        { error: "Payments are not configured yet (missing Stripe key)." },
        500
      );
    }

    const { plan, interval } = await req.json().catch(() => ({}));
    const tier = PLANS[plan as string];
    if (!tier || !["monthly", "annual"].includes(interval)) {
      return json({ error: "Invalid plan or billing interval." }, 400);
    }

    // Signed-in user only
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not authenticated." }, 401);

    // Redirect back to wherever the request came from (whitelisted).
    const origin = req.headers.get("origin") ?? "";
    const site = ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://plantright-app.netlify.app";

    const amount = interval === "annual" ? tier.annual : tier.monthly;
    const recurring = interval === "annual" ? "year" : "month";

    const body = new URLSearchParams({
      mode: "subscription",
      client_reference_id: user.id,
      customer_email: user.email ?? "",
      success_url: `${site}/app?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/app?checkout=cancelled`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": String(amount),
      "line_items[0][price_data][recurring][interval]": recurring,
      "line_items[0][price_data][product_data][name]": tier.name,
      "metadata[user_id]": user.id,
      "metadata[plan]": plan,
      "metadata[interval]": interval,
    });

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const session = await res.json();
    if (!res.ok) {
      console.error("Stripe error:", JSON.stringify(session).slice(0, 500));
      return json(
        { error: "Could not start checkout. Please try again." },
        502
      );
    }

    return json({ url: session.url });
  } catch (err) {
    return json({ error: (err as Error).message ?? "Unexpected error." }, 500);
  }
});
