import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import "./app.css";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [plans, setPlans] = useState([]);
  const [active, setActive] = useState(null);

  // Load this user's saved plans (RLS ensures only their own rows).
  const loadPlans = useCallback(async () => {
    const { data, error } = await supabase
      .from("planting_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setPlans(data);
      // Default to the newest plan's inner object, but never clobber an
      // active plan we just set (functional update avoids a stale closure).
      setActive((prev) => prev ?? data[0]?.plan ?? null);
    }
  }, []);

  useEffect(() => {
    loadPlans();
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
          <span className="dash-email">{user?.email}</span>
          <button className="dash-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dash-main">
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
                      active && (active.location === plan.location) ? "on" : ""
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
