import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import "./app.css";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    monthly: 4,
    annual: 2,
    blurb: "1 property, up to 4 beds",
  },
  {
    id: "yardpro",
    name: "Yard Pro",
    monthly: 9,
    annual: 5,
    blurb: "1 property, unlimited beds",
    featured: true,
  },
  {
    id: "homelandscape",
    name: "Home + Landscape",
    monthly: 19,
    annual: 11,
    blurb: "3 properties, landscaper sharing",
  },
];

const PLAN_NAMES = {
  starter: "Starter",
  yardpro: "Yard Pro",
  homelandscape: "Home + Landscape",
};

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);
  const [active, setActive] = useState(null);
  const [sub, setSub] = useState(null);
  const [banner, setBanner] = useState(null); // {type: "success"|"info"|"error", msg}
  const [annualUpgrade, setAnnualUpgrade] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const handledParams = useRef(false);

  // Load this user's saved plans (RLS ensures only their own rows).
  const loadPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("planting_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setError(`Could not load saved plans: ${error.message}`);
    } else if (data) {
      setPlans(data);
      // Default to the newest plan's inner object, but never clobber an
      // active plan we just set (functional update avoids a stale closure).
      setActive((prev) => prev ?? data[0]?.plan ?? null);
    }
  }, []);

  // Load the user's subscription (select-only via RLS).
  const loadSub = useCallback(async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("plan, plan_interval, status")
      .maybeSingle();
    if (data?.status === "active") setSub(data);
  }, []);

  // Start a Stripe Checkout for a tier — the edge function returns the
  // hosted checkout URL and we hand the browser to Stripe.
  const startCheckout = useCallback(async (planId, interval) => {
    setCheckoutBusy(planId);
    setBanner(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        { body: { plan: planId, interval } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.assign(data.url);
        return; // navigating away
      }
      throw new Error("No checkout URL returned.");
    } catch (err) {
      let msg = err?.message || "Could not start checkout.";
      if (err?.context && typeof err.context.json === "function") {
        try {
          const body = await err.context.json();
          if (body?.error) msg = body.error;
        } catch {
          /* keep default */
        }
      }
      setBanner({ type: "error", msg });
      setCheckoutBusy("");
    }
  }, []);

  // Handle checkout returns and pricing deep links exactly once.
  useEffect(() => {
    if (handledParams.current) return;
    handledParams.current = true;

    const sessionId = searchParams.get("session_id");
    const cancelled = searchParams.get("checkout") === "cancelled";
    const deepPlan = searchParams.get("plan");
    const deepInterval = searchParams.get("interval");

    const clear = () => setSearchParams({}, { replace: true });

    if (sessionId) {
      (async () => {
        const { data, error } = await supabase.functions.invoke(
          "verify-checkout",
          { body: { session_id: sessionId } }
        );
        if (!error && data?.plan) {
          setBanner({
            type: "success",
            msg: `You're on ${PLAN_NAMES[data.plan] ?? data.plan} — welcome aboard! 🌱`,
          });
          loadSub();
        } else {
          setBanner({
            type: "error",
            msg: "We couldn't verify that payment. If you were charged, contact support.",
          });
        }
        clear();
      })();
    } else if (cancelled) {
      setBanner({ type: "info", msg: "Checkout cancelled — no charge was made." });
      clear();
    } else if (deepPlan && PLAN_NAMES[deepPlan]) {
      // Arrived from a landing-page pricing button: go straight to checkout.
      startCheckout(deepPlan, deepInterval === "monthly" ? "monthly" : "annual");
      clear();
    }
  }, [searchParams, setSearchParams, loadSub, startCheckout]);

  useEffect(() => {
    loadPlans();
    loadSub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async (e) => {
    e.preventDefault();
    if (!location.trim()) return;
    setBusy(true);
    setError("");
    try {
      // Calls the Supabase Edge Function, which uses Firecrawl server-side
      // to pull address-specific growing data, then saves it to the DB.
      const { data, error } = await supabase.functions.invoke("planting-plan", {
        body: { location: location.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setActive(data.plan);
      setLocation("");
      await loadPlans();
    } catch (err) {
      // supabase-js wraps non-2xx function responses in a FunctionsHttpError
      // and hides the JSON body on err.context — dig it out for a real message.
      let msg =
        err?.message || "Could not build your plan. Please try again in a moment.";
      if (err?.context && typeof err.context.json === "function") {
        try {
          const body = await err.context.json();
          if (body?.error) msg = body.error;
        } catch {
          /* keep default message */
        }
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dash">
      <header className="dash-nav">
        <Link to="/" className="dash-logo">
          <span>🌿</span> PlantRight
        </Link>
        <div className="dash-user">
          {sub && (
            <span className="dash-plan-badge">
              {PLAN_NAMES[sub.plan] ?? sub.plan}
            </span>
          )}
          <span className="dash-email">{user?.email}</span>
          <button className="dash-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dash-main">
        {banner && (
          <div className={`dash-banner ${banner.type}`}>
            {banner.msg}
            <button onClick={() => setBanner(null)} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        <section className="dash-hero">
          <h1>Your address-specific plant plan</h1>
          <p>
            Enter your address or city. We pull live growing data for your exact
            location — hardiness zone, frost dates, and a planting calendar — not
            a generic zip-code guess.
          </p>
          <form className="dash-form" onSubmit={generate}>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. 1600 Amphitheatre Pkwy, Mountain View, CA"
              aria-label="Your address or city"
            />
            <button type="submit" disabled={busy}>
              {busy ? "Building your plan…" : "Get my plan"}
            </button>
          </form>
          {busy && (
            <p className="dash-hint">
              Gathering local growing data with Firecrawl — this can take
              15–30&nbsp;seconds.
            </p>
          )}
          {error && <div className="dash-error">{error}</div>}
        </section>

        {active && <PlanCard plan={active} />}

        {plans.length > 0 && (
          <section className="dash-saved">
            <h2>Saved plans</h2>
            <div className="dash-saved-grid">
              {plans.map((p) => {
                const plan = p.plan || p;
                return (
                  <button
                    key={p.id}
                    className={`dash-saved-item ${
                      active && active.location === plan.location ? "on" : ""
                    }`}
                    onClick={() => setActive(plan)}
                  >
                    <strong>{plan.location}</strong>
                    <span>Zone {plan.zone || "—"}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="dash-upgrade" id="upgrade">
          <h2>{sub ? "Your plan" : "Upgrade your garden"}</h2>
          <p className="dash-upgrade-sub">
            {sub
              ? `You're on ${PLAN_NAMES[sub.plan] ?? sub.plan} (billed ${sub.plan_interval}). Switch plans anytime.`
              : "Unlock unlimited beds, comparisons, and more."}
          </p>
          <div className="dash-toggle">
            <span className={!annualUpgrade ? "on" : ""}>Monthly</span>
            <button
              role="switch"
              aria-checked={annualUpgrade}
              aria-label="Toggle annual billing"
              className={`dash-switch ${annualUpgrade ? "annual" : ""}`}
              onClick={() => setAnnualUpgrade((a) => !a)}
            >
              <i />
            </button>
            <span className={annualUpgrade ? "on" : ""}>
              Annual <em>save ~45%</em>
            </span>
          </div>
          <div className="dash-tiers">
            {TIERS.map((t) => {
              const current = sub?.plan === t.id;
              return (
                <div
                  key={t.id}
                  className={`dash-tier ${t.featured ? "featured" : ""} ${
                    current ? "current" : ""
                  }`}
                >
                  <div className="dash-tier-name">{t.name}</div>
                  <div className="dash-tier-price">
                    ${annualUpgrade ? t.annual : t.monthly}
                    <span>/mo</span>
                  </div>
                  <div className="dash-tier-blurb">
                    {annualUpgrade ? "billed annually" : "billed monthly"} ·{" "}
                    {t.blurb}
                  </div>
                  <button
                    disabled={current || checkoutBusy !== ""}
                    onClick={() =>
                      startCheckout(t.id, annualUpgrade ? "annual" : "monthly")
                    }
                  >
                    {current
                      ? "Current plan"
                      : checkoutBusy === t.id
                        ? "Opening checkout…"
                        : `Choose ${t.name}`}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="dash-upgrade-note">
            Secure payment by Stripe. Test mode: use card 4242 4242 4242 4242,
            any future expiry, any CVC.
          </p>
        </section>
      </main>
    </div>
  );
}

function PlanCard({ plan }) {
  return (
    <section className="plan-card">
      <div className="plan-head">
        <div>
          <span className="plan-eyebrow">Plant plan for</span>
          <h2>{plan.location}</h2>
        </div>
        {plan.zone && <div className="plan-zone">Zone {plan.zone}</div>}
      </div>

      <div className="plan-stats">
        <div>
          <span>Last spring frost</span>
          <strong>{plan.last_frost || "—"}</strong>
        </div>
        <div>
          <span>First fall frost</span>
          <strong>{plan.first_frost || "—"}</strong>
        </div>
        <div>
          <span>Growing window</span>
          <strong>{plan.growing_season || "—"}</strong>
        </div>
      </div>

      {plan.summary && <p className="plan-summary">{plan.summary}</p>}

      {Array.isArray(plan.recommendations) && plan.recommendations.length > 0 && (
        <div className="plan-recs">
          <h3>What will thrive here</h3>
          <ul>
            {plan.recommendations.map((r, i) => (
              <li key={i}>
                <strong>{r.name}</strong>
                {r.why ? <span> — {r.why}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      {Array.isArray(plan.sources) && plan.sources.length > 0 && (
        <div className="plan-sources">
          <h4>Sources (via Firecrawl)</h4>
          <ul>
            {plan.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title || s.url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
