// PlantRight — "verify-checkout" Edge Function
// After Stripe redirects back with a session_id, this function retrieves the
// session from Stripe SERVER-SIDE, confirms it was paid AND belongs to the
// signed-in user, then records the subscription using the service role.
// Clients have no insert access to the subscriptions table (RLS), so a plan
// can only ever be granted through this verified path.

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

const VALID_PLANS = new Set(["starter", "yardpro", "homelandscape"]);

async function getStripeKey(admin: ReturnType<typeof createClient>) {
  const envKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (envKey) return envKey;
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
    const { session_id } = await req.json().catch(() => ({}));
    if (!session_id || typeof session_id !== "string") {
      return json({ error: "Missing session_id." }, 400);
    }

    // Signed-in user (anon client scoped by the caller's JWT)
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

    // Service-role client: reads the Stripe key and writes the subscription.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const stripeKey = await getStripeKey(admin);
    if (!stripeKey) {
      return json({ error: "Payments are not configured yet." }, 500);
    }

    // Retrieve the session from Stripe — never trust the client's claims.
    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const session = await res.json();
    if (!res.ok) {
      console.error("Stripe error:", JSON.stringify(session).slice(0, 500));
      return json({ error: "Could not verify checkout session." }, 502);
    }

    if (session.client_reference_id !== user.id) {
      return json({ error: "This checkout session belongs to another user." }, 403);
    }
    if (session.payment_status !== "paid") {
      return json({ error: "Payment not completed." }, 402);
    }

    const plan = session.metadata?.plan;
    const interval = session.metadata?.interval;
    if (!VALID_PLANS.has(plan)) {
      return json({ error: "Unrecognized plan on session." }, 400);
    }

    const { error: upsertErr } = await admin.from("subscriptions").upsert({
      user_id: user.id,
      plan,
      plan_interval: interval === "annual" ? "annual" : "monthly",
      stripe_session_id: session.id,
      stripe_customer_id:
        typeof session.customer === "string" ? session.customer : null,
      status: "active",
      updated_at: new Date().toISOString(),
    });
    if (upsertErr) {
      console.error("Upsert error:", upsertErr.message);
      return json({ error: "Payment verified but saving failed — contact support." }, 500);
    }

    return json({ plan, interval });
  } catch (err) {
    return json({ error: (err as Error).message ?? "Unexpected error." }, 500);
  }
});
