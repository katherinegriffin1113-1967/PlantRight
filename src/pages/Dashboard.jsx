import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../auth/AuthContext";
import PlantPhotoModal from "./PlantPhotoModal";
import YardView from "./YardView";
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

// The questions that narrow the catalog. `multi` groups are toggles that add
// up; the rest are single-choice, with "any" meaning "no preference".
const QUESTIONS = [
  {
    key: "types",
    multi: true,
    label: "What do you want to plant?",
    hint: "Pick as many as you like — or none for a bit of everything.",
    options: [
      { value: "vegetable", label: "🥕 Vegetables" },
      { value: "fruit", label: "🍓 Fruit" },
      { value: "herb", label: "🌿 Herbs" },
      { value: "flower", label: "🌸 Flowers" },
      { value: "shrub", label: "🪴 Shrubs" },
      { value: "tree", label: "🌳 Trees" },
      { value: "vine", label: "🍃 Vines" },
      { value: "grass", label: "🌾 Grasses" },
      { value: "groundcover", label: "🍀 Groundcover" },
    ],
  },
  {
    key: "life",
    label: "Annuals or perennials?",
    hint: "Annuals are replanted each year; perennials come back on their own.",
    options: [
      { value: "any", label: "Either" },
      { value: "annual", label: "Annuals" },
      { value: "perennial", label: "Perennials" },
    ],
  },
  {
    key: "size",
    label: "How big should they get?",
    hint: "Mature height, so nothing outgrows the spot you have.",
    options: [
      { value: "any", label: "Any size" },
      { value: "small", label: "Low · under 2 ft" },
      { value: "medium", label: "Mid · 2–6 ft" },
      { value: "large", label: "Tall · over 6 ft" },
    ],
  },
  {
    key: "flowering",
    label: "Do you want flowers?",
    options: [
      { value: "any", label: "Doesn't matter" },
      { value: "yes", label: "Yes — blooms please" },
      { value: "no", label: "Foliage only" },
    ],
  },
  {
    key: "sun",
    label: "How much sun does the spot get?",
    options: [
      { value: "any", label: "Not sure" },
      { value: "full", label: "Full sun · 6+ hrs" },
      { value: "part", label: "Part sun · 3–6 hrs" },
      { value: "shade", label: "Shade · under 3 hrs" },
    ],
  },
  {
    key: "water",
    label: "How much watering are you up for?",
    options: [
      { value: "any", label: "Happy to water" },
      { value: "low", label: "Low-water only" },
    ],
  },
  {
    key: "pollinator",
    label: "Want to help pollinators?",
    hint: "Favor blooms that feed bees and butterflies.",
    options: [
      { value: "any", label: "No preference" },
      { value: "yes", label: "🐝 Pollinator-friendly" },
    ],
  },
];

const DEFAULT_PREFS = {
  types: [],
  life: "any",
  size: "any",
  flowering: "any",
  sun: "any",
  water: "any",
  pollinator: "any",
};

// Remember the gardener's last answers so a return visit starts where they
// left off. Stored locally (not the DB) — it's a convenience, not user data.
const PREFS_KEY = "plantright:last-prefs";

function loadLastPrefs() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY));
    // Merge onto defaults so a newly added question can't arrive undefined.
    if (saved && typeof saved === "object") {
      return { ...DEFAULT_PREFS, ...saved, types: saved.types ?? [] };
    }
  } catch {
    /* corrupt or unavailable storage — fall back to defaults */
  }
  return DEFAULT_PREFS;
}

// Little badges under each plant name, so a recommendation explains itself.
const SIZE_LABEL = { small: "under 2 ft", medium: "2–6 ft", large: "over 6 ft" };
const SUN_LABEL = { full: "full sun", part: "part sun", shade: "shade" };
const WATER_LABEL = { low: "low water", medium: "avg water", high: "thirsty" };

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [location, setLocation] = useState("");
  const [prefs, setPrefs] = useState(loadLastPrefs);
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

  // Multi-select groups accumulate; single-choice groups replace, and
  // re-tapping the current choice clears it back to "no preference".
  const togglePref = (q, value) => {
    setPrefs((p) => {
      if (q.multi) {
        const has = p[q.key].includes(value);
        return {
          ...p,
          [q.key]: has
            ? p[q.key].filter((v) => v !== value)
            : [...p[q.key], value],
        };
      }
      return { ...p, [q.key]: p[q.key] === value ? "any" : value };
    });
  };

  // Load a saved plan's location + answers back into the form so the gardener
  // can tweak one thing and re-run instead of starting over.
  const reusePlan = (p) => {
    setLocation(p.location || "");
    if (p.preferences && typeof p.preferences === "object") {
      setPrefs({ ...DEFAULT_PREFS, ...p.preferences, types: p.preferences.types ?? [] });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generate = async (e) => {
    e.preventDefault();
    if (!location.trim()) return;
    setBusy(true);
    setError("");
    try {
      // Calls the Supabase Edge Function, which uses Firecrawl server-side
      // to pull address-specific growing data, then saves it to the DB.
      const { data, error } = await supabase.functions.invoke("planting-plan", {
        body: { location: location.trim(), preferences: prefs },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setActive(data.plan);
      setLocation("");
      // Remember these answers for next time.
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      } catch {
        /* storage full or blocked — non-critical */
      }
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
            First tell us what you want to grow. Then enter your address or city
            and we'll pull live growing data for your exact location — hardiness
            zone, frost dates, and a planting calendar, not a generic zip-code
            guess — and narrow the plant list to what you actually want to grow.
          </p>
          <form className="dash-form" onSubmit={generate}>
            <GardenPrefs
              prefs={prefs}
              onToggle={togglePref}
              onReset={() => setPrefs(DEFAULT_PREFS)}
            />

            <div className="dash-form-row">
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
            </div>
          </form>
          {busy && (
            <p className="dash-hint">
              Gathering local growing data with Firecrawl — this can take
              15–30&nbsp;seconds.
            </p>
          )}
          {error && <div className="dash-error">{error}</div>}
        </section>

        {active && <PlanCard plan={active} onReuse={reusePlan} />}

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

// The questions that shape the plant list, as a chip-toggle panel.
export function GardenPrefs({ prefs, onToggle, onReset }) {
  return (
    <fieldset className="prefs">
      <legend>Tell us about your garden</legend>
      {QUESTIONS.map((q) => (
        <div className="pref-q" key={q.key}>
          <span className="pref-label" id={`pref-${q.key}`}>
            {q.label}
          </span>
          {q.hint && <span className="pref-hint">{q.hint}</span>}
          <div
            className="pref-opts"
            role="group"
            aria-labelledby={`pref-${q.key}`}
          >
            {q.options.map((o) => {
              const on = q.multi
                ? prefs.types.includes(o.value)
                : prefs[q.key] === o.value;
              return (
                <button
                  type="button"
                  key={o.value}
                  className={`pref-chip ${on ? "on" : ""}`}
                  aria-pressed={on}
                  onClick={() => onToggle(q, o.value)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" className="pref-reset" onClick={onReset}>
        Reset answers
      </button>
    </fieldset>
  );
}

export function PlanCard({ plan, onReuse }) {
  // The plant whose photo is open, if any.
  const [preview, setPreview] = useState(null);
  // Names the gardener has checked off for their shopping list.
  const [picked, setPicked] = useState(() => new Set());

  const togglePick = (name) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const recs = Array.isArray(plan.recommendations) ? plan.recommendations : [];
  const pickedList = recs.filter((r) => picked.has(r.name));

  return (
    <section className="plan-card">
      <div className="plan-head">
        <div>
          <span className="plan-eyebrow">Plant plan for</span>
          <h2>{plan.location}</h2>
        </div>
        {plan.zone && <div className="plan-zone">Zone {plan.zone}</div>}
      </div>

      {onReuse && (
        <button
          type="button"
          className="plan-reuse"
          onClick={() => onReuse(plan)}
        >
          ↻ Re-run these answers with tweaks
        </button>
      )}

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

      {/* The three things the address actually determines: sun (the gardener's
          answer, which the picks are matched to), soil (from Firecrawl), and
          microclimate (zone + frost dates). */}
      {plan.conditions &&
        (plan.conditions.sun ||
          plan.conditions.soil ||
          plan.conditions.microclimate) && (
          <div className="plan-conditions">
            <h3>Your yard's conditions</h3>
            <div className="cond-grid">
              {plan.conditions.sun && (
                <div className="cond">
                  <span>☀️ Sun exposure</span>
                  <strong>{plan.conditions.sun}</strong>
                </div>
              )}
              {plan.conditions.microclimate && (
                <div className="cond">
                  <span>🌡️ Microclimate</span>
                  <strong>{plan.conditions.microclimate}</strong>
                </div>
              )}
              {plan.conditions.soil && (
                <div className="cond cond-wide">
                  <span>🪱 Soil</span>
                  <strong>{plan.conditions.soil}</strong>
                </div>
              )}
            </div>
          </div>
        )}

      <YardView key={plan.location} plan={plan} />

      {recs.length > 0 && (
        <div className="plan-recs">
          <h3>What will thrive here</h3>
          <p className="plan-recs-hint">
            Tap a plant to see what it looks like and how to grow it. Check the
            ones you want to build a shopping list.
          </p>
          <ul>
            {recs.map((r, i) => (
              <li key={i} className={picked.has(r.name) ? "picked" : ""}>
                <label
                  className="plan-rec-pick"
                  title={`Add ${r.name} to your shopping list`}
                >
                  <input
                    type="checkbox"
                    checked={picked.has(r.name)}
                    onChange={() => togglePick(r.name)}
                    aria-label={`Add ${r.name} to shopping list`}
                  />
                </label>
                <button
                  type="button"
                  className="plan-rec"
                  onClick={() => setPreview(r)}
                  aria-label={`See a photo of ${r.name}`}
                >
                  <span className="plan-rec-text">
                    <strong>{r.name}</strong>
                    {r.why ? <span> — {r.why}</span> : null}
                    {/* Plans saved before the catalog upgrade have no tags. */}
                    {r.life && (
                      <span className="plan-tags">
                        <em>{r.life}</em>
                        {r.type && <em>{r.type}</em>}
                        {SIZE_LABEL[r.size] && <em>{SIZE_LABEL[r.size]}</em>}
                        {SUN_LABEL[r.sun] && <em>{SUN_LABEL[r.sun]}</em>}
                        {WATER_LABEL[r.water] && <em>{WATER_LABEL[r.water]}</em>}
                        {r.flowering && <em className="bloom">flowering</em>}
                        {r.localNote && (
                          <em className="local-flag">📍 local note</em>
                        )}
                      </span>
                    )}
                  </span>
                  <span className="plan-rec-photo" aria-hidden="true">
                    📷
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {pickedList.length > 0 && (
            <div className="plan-shop-bar">
              <span>
                🛒 {pickedList.length} plant{pickedList.length > 1 ? "s" : ""} on
                your list
              </span>
              <span className="plan-shop-actions">
                <button type="button" onClick={() => window.print()}>
                  Print shopping list
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setPicked(new Set())}
                >
                  Clear
                </button>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Local pest/disease watch + the county extension office, both mined
          from the second Firecrawl search. */}
      {((Array.isArray(plan.concerns) && plan.concerns.length > 0) ||
        plan.extension) && (
        <div className="plan-watch">
          <h3>Local pest &amp; disease watch</h3>
          {Array.isArray(plan.concerns) && plan.concerns.length > 0 && (
            <>
              <p className="plan-watch-hint">
                Reported for your area — scout for these and act early:
              </p>
              <ul className="watch-chips">
                {plan.concerns.map((c, i) => (
                  <li key={i}>
                    {c.source ? (
                      <a href={c.source} target="_blank" rel="noreferrer">
                        {c.name}
                      </a>
                    ) : (
                      c.name
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {plan.extension && (
            <p className="plan-extension">
              📍 Your local growing resource:{" "}
              <a
                href={plan.extension.url}
                target="_blank"
                rel="noreferrer"
              >
                {plan.extension.title}
              </a>
            </p>
          )}
        </div>
      )}

      {preview && (
        <PlantPhotoModal
          key={preview.name}
          plant={preview}
          plan={plan}
          onClose={() => setPreview(null)}
        />
      )}

      {/* Only rendered for print — a clean shopping list to take to the
          nursery. Hidden on screen; the print stylesheet reveals it. */}
      {pickedList.length > 0 && (
        <div className="plan-print" aria-hidden="true">
          <h2>PlantRight shopping list</h2>
          <p>
            For {plan.location}
            {plan.zone ? ` · Zone ${plan.zone}` : ""}
          </p>
          <ul>
            {pickedList.map((r, i) => (
              <li key={i}>
                <strong>{r.name}</strong>
                {r.type ? ` — ${r.type}` : ""}
                {SIZE_LABEL[r.size] ? `, ${SIZE_LABEL[r.size]}` : ""}
                {SUN_LABEL[r.sun] ? `, ${SUN_LABEL[r.sun]}` : ""}
              </li>
            ))}
          </ul>
          {Array.isArray(plan.nurseries) && plan.nurseries[0] && (
            <p className="plan-print-nursery">
              Nearby: {plan.nurseries[0].name}
              {plan.nurseries[0].address ? ` — ${plan.nurseries[0].address}` : ""}
            </p>
          )}
        </div>
      )}

      <NurseryList plan={plan} />

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

// Garden centers near the address, so the plan ends somewhere you can drive to.
function NurseryList({ plan }) {
  const nurseries = Array.isArray(plan.nurseries) ? plan.nurseries : [];
  const searchUrl =
    plan.nursery_search_url ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `garden nursery near ${plan.location}`
    )}`;

  return (
    <div className="plan-nurseries">
      <h3>Where to buy these nearby</h3>
      {nurseries.length > 0 ? (
        <>
          <ul>
            {nurseries.map((n, i) => (
              <li key={i}>
                <div className="nursery-head">
                  <strong>{n.name}</strong>
                  <span className="nursery-miles">{n.miles} mi</span>
                </div>
                {n.address && <div className="nursery-addr">{n.address}</div>}
                <div className="nursery-links">
                  <a href={n.map_url} target="_blank" rel="noreferrer">
                    Directions
                  </a>
                  {n.phone && <a href={`tel:${n.phone}`}>{n.phone}</a>}
                  {n.website && (
                    <a href={n.website} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="nursery-note">
            Garden centers within 30 miles, from OpenStreetMap.{" "}
            <a href={searchUrl} target="_blank" rel="noreferrer">
              See more on Google Maps
            </a>
          </p>
        </>
      ) : (
        <p className="nursery-note">
          We couldn't find a mapped garden center within 30 miles of here.{" "}
          <a href={searchUrl} target="_blank" rel="noreferrer">
            Search nurseries near you on Google Maps
          </a>
        </p>
      )}
    </div>
  );
}
