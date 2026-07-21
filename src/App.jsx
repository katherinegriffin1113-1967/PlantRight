import { useState, useEffect } from "react";

/* ------------------------------------------------------------------
   Lightweight analytics shim — logs the events named in the PRD.
   ------------------------------------------------------------------ */
const track = (event, payload = {}) => {
  // In production this would post to an analytics endpoint.
  // eslint-disable-next-line no-console
  console.log("[analytics]", event, payload);
};

/* ------------------------------------------------------------------
   Scroll reveal: adds `.in` to elements with `.reveal` as they enter.
   ------------------------------------------------------------------ */
function useScrollReveal() {
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const els = document.querySelectorAll(".reveal");
    if (reduce) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const delay = entry.target.dataset.delay || 0;
            setTimeout(() => entry.target.classList.add("in"), delay);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* ------------------------------------------------------------------
   Scroll-depth milestone tracking (25/50/75/100).
   ------------------------------------------------------------------ */
function useScrollDepth() {
  useEffect(() => {
    const fired = new Set();
    const onScroll = () => {
      const scrolled =
        (window.scrollY + window.innerHeight) /
        document.documentElement.scrollHeight;
      [25, 50, 75, 100].forEach((m) => {
        if (scrolled * 100 >= m && !fired.has(m)) {
          fired.add(m);
          track(`scroll_${m}`);
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
}

/* ================================================================== */
/*  NAV                                                               */
/* ================================================================== */
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "How It Works", href: "#how" },
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "Stories", href: "#stories" },
  ];

  return (
    <nav className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="nav-inner">
        <a href="#top" className="logo" aria-label="PlantRight home">
          <span className="leaf">🌿</span> PlantRight
        </a>

        <ul className="nav-links">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="nav-actions">
          <a href="/login" className="nav-signin">
            Sign In
          </a>
          <a
            href="/app"
            className="btn btn-primary nav-cta"
            onClick={() => track("hero_cta_primary", { source: "nav" })}
          >
            See My Plant List
          </a>
          <button
            className="hamburger"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>
            {l.label}
          </a>
        ))}
        <a href="/login" onClick={() => setMenuOpen(false)}>
          Sign In
        </a>
        <a
          href="/app"
          className="btn btn-primary"
          onClick={() => setMenuOpen(false)}
        >
          See My Plant List
        </a>
      </div>
    </nav>
  );
}

/* ================================================================== */
/*  HERO                                                              */
/* ================================================================== */
const beds = [
  {
    name: "Front Left Bed",
    conf: 94,
    sun: "4.3 hrs sun",
    soil: "Clay-heavy",
    chips: ["Coral Bells", "Hostas", "Astilbe"],
  },
  {
    name: "Fence Strip",
    conf: 91,
    sun: "6.1 hrs sun",
    soil: "Reflected heat",
    chips: ["Lantana", "Salvia", "Coneflower"],
  },
  {
    name: "Backyard Border",
    conf: 97,
    sun: "5.4 hrs sun",
    soil: "Loamy",
    chips: ["Forest Grass", "Ferns", "Hydrangea"],
  },
];

function Hero() {
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setFilled(true), 350);
    return () => clearTimeout(t);
  }, []);

  return (
    <header className="hero" id="top">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="badge-pill">
            <span className="pulse-dot" />
            Trusted by 12,000+ homeowners
          </span>

          <h1>
            Stop buying plants that <span className="die">die</span>. Start
            knowing what thrives.
          </h1>

          <p className="hero-sub">
            Type in your address. We map your exact sun exposure, soil
            conditions, and microclimate. You get a precise plant list for your
            specific yard, not your zip code.
          </p>

          <blockquote className="journal-quote">
            “I had my Pinterest board pulled up. I had done research… and I
            still walked out of that nursery with a cart full of things I am not
            entirely sure about and a receipt that made me wince in the parking
            lot.”
            <span className="attribution">
              — Dana’s Garden Journal, March 14th
            </span>
          </blockquote>

          <div className="hero-ctas" id="hero-cta">
            <a
              href="/app"
              className="btn btn-primary btn-lg"
              onClick={() => track("hero_cta_primary", { source: "hero" })}
            >
              ✦ See My Plant List
            </a>
            <a
              href="#video"
              className="btn btn-outline btn-lg"
              onClick={() => track("hero_cta_secondary")}
            >
              Watch How It Works
            </a>
          </div>

          <p className="micro-copy">
            Free to start · No account required · Results in 60 seconds
          </p>
        </div>

        <div className="yard-card-wrap">
          <div className="float-badge top">🌱 94% survival rate</div>
          <div className="float-badge bottom">💸 Saved $340 this season</div>

          <div className="yard-card" role="img" aria-label="Sample yard report">
            <div className="yard-card-head">
              <div className="label">Your Yard Report</div>
              <div className="addr">14 Magnolia Lane</div>
            </div>

            {beds.map((bed) => (
              <div className="bed-row" key={bed.name}>
                <div className="bed-row-top">
                  <span className="bed-name">{bed.name}</span>
                  <span className="bed-conf">{bed.conf}%</span>
                </div>
                <div className="bed-meta">
                  {bed.sun} · {bed.soil}
                </div>
                <div className="chips">
                  {bed.chips.map((c) => (
                    <span className="chip" key={c}>
                      {c}
                    </span>
                  ))}
                </div>
                <div className="conf-bar">
                  <div
                    className="conf-fill"
                    style={{ width: filled ? `${bed.conf}%` : "0%" }}
                  />
                </div>
              </div>
            ))}

            <div className="yard-card-foot">
              <div className="save">
                Potential savings:
                <strong>$340/season</strong>
              </div>
              <button
                className="foot-btn"
                onClick={() => track("hero_cta_primary", { source: "card" })}
              >
                Get Mine →
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ================================================================== */
/*  PAIN                                                              */
/* ================================================================== */
const painCards = [
  {
    title: "The Tag Lies",
    icon: "🏷️",
    stat: "6.2 hrs",
    label:
      "Average difference between zone conditions and actual yard conditions",
  },
  {
    title: "The Money Disappears",
    icon: "💸",
    stat: "$380",
    label:
      "Average amount homeowners lose annually on plants that don’t thrive",
  },
  {
    title: "Nobody Actually Helps",
    icon: "🤷",
    stat: "73%",
    label:
      "Homeowners who report failures despite following label instructions",
  },
];

function Pain() {
  return (
    <section className="section pain" id="how">
      <div className="container">
        <div className="section-head reveal">
          <h2>The garden center is a beautiful trap.</h2>
          <p>
            You walk in with hope and a Pinterest board and you walk out with
            $200 of plants and a receipt you’re already nervous about.
          </p>
        </div>

        <div className="pain-grid">
          {painCards.map((card, i) => (
            <div
              className="pain-card reveal"
              key={card.title}
              data-delay={i * 100}
            >
              <div className="pain-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <div className="pain-stat">{card.stat}</div>
              <div className="pain-label">{card.label}</div>
            </div>
          ))}
        </div>

        <blockquote className="pull-quote-block reveal">
          “I put it in the cart. That is my whole problem summarized in one
          sentence.”
          <span className="attribution">— Dana’s Garden Journal, March 14th</span>
        </blockquote>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  SOLUTION                                                          */
/* ================================================================== */
function Solution() {
  const before = [
    "Guessing at the nursery",
    "“Full sun” with no context",
    "$380 lost each season",
    "Dead plants, no explanation",
    "Embarrassed by your own yard",
  ];
  const after = [
    "Precise list by bed",
    "4.3 hours of actual sun data",
    "94% average thrive rate",
    "Plants that survive summer",
    "The yard you always pictured",
  ];

  return (
    <section className="section solution">
      <div className="container solution-grid">
        <div className="reveal">
          <p className="eyebrow">The Fix</p>
          <h2>Precision built for your address. Not your zone.</h2>
          <p>
            You’re not unskilled. You’re underinformed — working without the one
            thing that actually matters: data about <strong>your</strong> exact
            yard.
          </p>
          <p>
            PlantRight cross-references your address against a database of{" "}
            <strong>14,000+ plant varieties</strong>, mapping sun exposure,
            soil, and microclimate down to the individual bed.
          </p>
          <p>
            <strong>You walk into the nursery knowing. Not hoping.</strong>
          </p>
          <div className="differentiator">
            Unlike gardening apps that recycle zone-based advice, PlantRight uses
            your address to build a yard-specific survival model.
          </div>
        </div>

        <div className="before-after reveal" data-delay={150}>
          <div className="ba-panel ba-before">
            <h4>❌ Before PlantRight</h4>
            <ul>
              {before.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
          <div className="ba-panel ba-after">
            <h4>✅ After PlantRight</h4>
            <ul>
              {after.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  FEATURES                                                          */
/* ================================================================== */
function SunMappingVisual() {
  const rows = [
    { name: "Front Left Bed", hours: "4.3 hrs", pct: 54 },
    { name: "Fence Strip", hours: "6.1 hrs", pct: 76 },
    { name: "Backyard Border", hours: "5.4 hrs", pct: 67 },
  ];
  return (
    <div className="feature-visual">
      {rows.map((r) => (
        <div className="fv-row" key={r.name}>
          <div className="fv-name">{r.name}</div>
          <div className="fv-bar">
            <i style={{ width: `${r.pct}%` }} />
          </div>
          <div className="fv-hours">{r.hours}</div>
        </div>
      ))}
    </div>
  );
}

function PlantListVisual() {
  const rows = [
    { name: "Coral Bells", sub: "Front Left Bed", pct: 94, low: false },
    {
      name: "Japanese Forest Grass",
      sub: "Backyard Border",
      pct: 92,
      low: false,
    },
    {
      name: "Japanese Pieris",
      sub: "Flagged — too much afternoon sun",
      pct: 31,
      low: true,
    },
  ];
  return (
    <div className="feature-visual">
      {rows.map((r) => (
        <div className="fv-row" key={r.name}>
          <div className="fv-name">
            {r.name}
            <small>{r.sub}</small>
          </div>
          <div className={`fv-bar ${r.low ? "low" : ""}`}>
            <i style={{ width: `${r.pct}%` }} />
          </div>
          <div className={`fv-pct ${r.low ? "low" : ""}`}>{r.pct}%</div>
        </div>
      ))}
    </div>
  );
}

function ShoppingVisual() {
  return (
    <div className="feature-visual">
      <div className="shop-bed">Front Left Bed</div>
      <div className="shop-row">
        <span>Coral Bells</span>
        <span className="qty">×3</span>
        <span className="price">$42</span>
      </div>
      <div className="shop-row">
        <span>Astilbe</span>
        <span className="qty">×2</span>
        <span className="price">$24</span>
      </div>
      <div className="shop-bed">Fence Strip</div>
      <div className="shop-row">
        <span>Lantana</span>
        <span className="qty">×4</span>
        <span className="price">$36</span>
      </div>
      <div className="shop-row">
        <span>Salvia</span>
        <span className="qty">×3</span>
        <span className="price">$27</span>
      </div>
      <div className="shop-total">
        <span>Estimated total</span>
        <span>$129</span>
      </div>
    </div>
  );
}

function Features() {
  const features = [
    {
      metric: "4.3 hrs · exact sun data per bed zone",
      title: "Address-Level Sun Mapping",
      body: "We measure real hours of direct sun for every bed — not “part shade” as a vibe. The oak canopy, the garage wall, the afternoon shift: all accounted for.",
      visual: <SunMappingVisual />,
      reverse: false,
    },
    {
      metric: "94% · average thrive rate for PlantRight recommendations",
      title: "Survival-Rated Plant Lists",
      body: "Every plant is ranked by how confidently it will perform in your conditions. That Japanese Pieris the nursery recommended? Flagged at 31% before it ever reached your cart.",
      visual: <PlantListVisual />,
      reverse: true,
    },
    {
      metric: "$340 · average first-season savings on failed plants",
      title: "Printable Nursery Guide",
      body: "Walk in with a real list, organized by bed, with quantities and estimated cost. No more wandering the aisles hoping. A real list this time — not a hopeful one.",
      visual: <ShoppingVisual />,
      reverse: false,
    },
  ];

  return (
    <section className="section features" id="features">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Features</p>
          <h2>Everything you need to plant with certainty.</h2>
        </div>

        {features.map((f) => (
          <div
            className={`feature-block ${f.reverse ? "reverse" : ""}`}
            key={f.title}
          >
            <div className="feature-text reveal">
              <div className="feature-metric">{f.metric}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
            <div className="reveal" data-delay={120}>
              {f.visual}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ================================================================== */
/*  ROI CALCULATOR                                                    */
/* ================================================================== */
function RoiCalculator() {
  const [bedsCount, setBedsCount] = useState(4);
  const [spend, setSpend] = useState(28);
  const [plants, setPlants] = useState(18);
  const [failPct, setFailPct] = useState(40);

  const failedPlants = Math.round(plants * (failPct / 100));
  const moneyLost = failedPlants * spend;
  const netSavings = Math.max(0, moneyLost - 29);

  const onSlide = (setter, name) => (e) => {
    setter(Number(e.target.value));
    track("roi_slider_interaction", { input: name, value: e.target.value });
  };

  const sliders = [
    {
      label: "Planting beds in yard",
      value: bedsCount,
      display: bedsCount,
      min: 1,
      max: 12,
      step: 1,
      onChange: onSlide(setBedsCount, "beds"),
    },
    {
      label: "Average spend per plant",
      value: spend,
      display: `$${spend}`,
      min: 5,
      max: 80,
      step: 1,
      onChange: onSlide(setSpend, "spend"),
    },
    {
      label: "Plants purchased per season",
      value: plants,
      display: plants,
      min: 4,
      max: 60,
      step: 1,
      onChange: onSlide(setPlants, "plants"),
    },
    {
      label: "% that don’t survive summer",
      value: failPct,
      display: `${failPct}%`,
      min: 10,
      max: 80,
      step: 1,
      onChange: onSlide(setFailPct, "failPct"),
    },
  ];

  return (
    <section className="section" id="roi">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">ROI Calculator</p>
          <h2>See your own number.</h2>
          <p>You’ve spent more than $29 on plants that died in a month.</p>
        </div>

        <div className="roi-card reveal">
          <div className="roi-inputs">
            {sliders.map((s) => (
              <div className="roi-input-group" key={s.label}>
                <div className="roi-input-head">
                  <label htmlFor={s.label}>{s.label}</label>
                  <span className="val">{s.display}</span>
                </div>
                <input
                  id={s.label}
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={s.value}
                  onChange={s.onChange}
                  aria-valuetext={String(s.display)}
                />
              </div>
            ))}
          </div>

          <div className="roi-results">
            <div className="lead">You’re losing annually</div>
            <div className="roi-big">${moneyLost.toLocaleString()}</div>

            <div className="roi-breakdown">
              <div className="roi-line">
                <span>Failed plants</span>
                <span>{failedPlants} plants</span>
              </div>
              <div className="roi-line">
                <span>Money lost</span>
                <span>${moneyLost.toLocaleString()}</span>
              </div>
              <div className="roi-line">
                <span>PlantRight cost</span>
                <span>$29 / year</span>
              </div>
              <div className="roi-line net">
                <span>Net savings</span>
                <span className="accent">${netSavings.toLocaleString()}</span>
              </div>
            </div>

            <a
              href="#pricing"
              className="btn btn-light btn-lg btn-block"
              onClick={() => track("roi_cta_click")}
            >
              Start Saving This Season →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  SOCIAL PROOF                                                      */
/* ================================================================== */
const testimonials = [
  {
    name: "Lisa",
    loc: "Mount Pleasant, SC",
    initials: "LM",
    story:
      "Twelve years of gardening and this was the first time I actually understood my own beds. It wasn’t me. It was information.",
  },
  {
    name: "Kim",
    loc: "Orlando, FL",
    initials: "KO",
    story:
      "I refused to hire someone. I wanted to figure it out myself — and for the first time, I finally did.",
  },
  {
    name: "David",
    loc: "West Palm Beach, FL",
    initials: "DW",
    story:
      "I’d been photographing gardens on vacation for years. I finally recreated one of them in my own backyard.",
  },
  {
    name: "Caeleigh",
    loc: "Richmond, VA",
    initials: "CR",
    story:
      "I stopped guessing and planted exactly what the plan said would work in my shade — and every bit of it took.",
  },
];

const caseMetrics = [
  { num: "$0", lbl: "lost this season" },
  { num: "94%", lbl: "thrive rate" },
  { num: "3", lbl: "neighbors who asked" },
];

const statsBar = [
  { num: "12,000+", lbl: "Homeowners using PlantRight" },
  { num: "94%", lbl: "Average plant thrive rate" },
  { num: "$4.2M", lbl: "Saved in failed plant purchases" },
  { num: "14,000+", lbl: "Plant varieties in database" },
];

function Social() {
  return (
    <section className="section social" id="stories">
      <div className="container">
        <div className="social-feature reveal">
          <blockquote>
            “I went back through my journal last night. I barely recognized the
            person who wrote that March entry. The problem was never who I was.
            It was what I did not know.”
            <span className="attribution">
              — Dana’s Garden Journal, July 6th
            </span>
          </blockquote>
          <div className="case-metrics">
            {caseMetrics.map((m) => (
              <div className="case-metric" key={m.lbl}>
                <div className="num">{m.num}</div>
                <div className="lbl">{m.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="testimonials">
          {testimonials.map((t, i) => (
            <div
              className="testimonial reveal"
              key={t.name}
              data-delay={i * 100}
            >
              <div className="t-head">
                <div className="t-avatar">{t.initials}</div>
                <div>
                  <div className="t-name">{t.name}</div>
                  <div className="t-loc">{t.loc}</div>
                </div>
              </div>
              <p>“{t.story}”</p>
            </div>
          ))}
        </div>

        <div className="stats-bar reveal">
          {statsBar.map((s) => (
            <div className="stat" key={s.lbl}>
              <div className="num">{s.num}</div>
              <div className="lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  PRICING                                                           */
/* ================================================================== */
const plans = [
  {
    id: "starter",
    name: "Starter",
    monthly: 4,
    annual: 2,
    diff: "1 property, up to 4 beds",
    feats: ["Address sun mapping", "Up to 4 beds", "Survival-rated lists"],
    featured: false,
  },
  {
    id: "yardpro",
    name: "Yard Pro",
    monthly: 9,
    annual: 5,
    diff: "1 property, unlimited beds",
    feats: [
      "Everything in Starter",
      "Unlimited beds",
      "Plant comparisons",
      "Before/After visualizer",
    ],
    featured: true,
  },
  {
    id: "homelandscape",
    name: "Home + Landscape",
    monthly: 19,
    annual: 11,
    diff: "3 properties, landscaper sharing",
    feats: [
      "Everything in Yard Pro",
      "Up to 3 properties",
      "Landscaper sharing",
      "Full history log",
    ],
    featured: false,
  },
];

function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section className="section pricing" id="pricing">
      <div className="container">
        <div className="section-head reveal">
          <p className="eyebrow">Pricing</p>
          <h2>Less than one dead plant.</h2>
        </div>

        <div className="toggle-wrap reveal">
          <span className={!annual ? "active" : ""}>Monthly</span>
          <button
            className={`toggle ${annual ? "annual" : "monthly"}`}
            role="switch"
            aria-checked={annual}
            aria-label="Toggle annual billing"
            onClick={() => {
              setAnnual((a) => !a);
              track("pricing_toggle", { annual: !annual });
            }}
          >
            <i />
          </button>
          <span className={annual ? "active" : ""}>Annual</span>
          <span className="save-tag">Save ~45%</span>
        </div>

        <div className="pricing-grid">
          {plans.map((p) => (
            <div
              className={`price-card reveal ${p.featured ? "featured" : ""}`}
              key={p.name}
            >
              {p.featured && (
                <div className="popular-badge">🌱 Most Popular</div>
              )}
              <div className="price-name">{p.name}</div>
              <div className="price-amount">
                ${annual ? p.annual : p.monthly}
                <span>/mo</span>
              </div>
              <div className="price-sub">
                {annual ? "billed annually" : "billed monthly"} · {p.diff}
              </div>
              <ul className="price-feats">
                {p.feats.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <a
                href={`/app?plan=${p.id}&interval=${annual ? "annual" : "monthly"}`}
                className={`btn btn-block ${
                  p.featured ? "btn-primary" : "btn-outline"
                }`}
                onClick={() =>
                  p.featured ? track("pricing_cta_pro") : track("pricing_cta")
                }
              >
                Choose {p.name}
              </a>
            </div>
          ))}
        </div>

        <div className="trust-row reveal">
          <span>✓ No credit card</span>
          <span>✓ 30-day free trial</span>
          <span>✓ Cancel anytime</span>
          <span>✓ Results in 60 seconds</span>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  VIDEO                                                             */
/* ================================================================== */
function Video() {
  return (
    <section className="section" id="video">
      <div className="container">
        <div className="section-head reveal">
          <h2>Your address goes in. Your plant list comes out.</h2>
        </div>

        <div className="video-wrap reveal">
          <div className="video-player">
            <button
              className="play-btn"
              aria-label="Play walkthrough video"
              onClick={() => track("video_play")}
            />
          </div>

          <div className="video-timestamps">
            <span>
              <b>0:00</b> Enter address
            </span>
            <span>
              <b>0:18</b> Beds populate
            </span>
            <span>
              <b>0:42</b> Plant list
            </span>
            <span>
              <b>1:10</b> Export guide
            </span>
          </div>

          <p className="video-cta">
            Ready to see your own yard? It takes 60 seconds.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  FINAL CTA                                                         */
/* ================================================================== */
function FinalCta() {
  return (
    <section className="final-cta">
      <div className="container">
        <h2>This spring, walk into the nursery knowing.</h2>
        <p>
          12,000 homeowners stopped guessing and started growing. Your yard is
          next.
        </p>
        <div className="final-ctas">
          <a
            href="/app"
            className="btn btn-light btn-lg"
            onClick={() => track("hero_cta_primary", { source: "final" })}
          >
            ✦ Get My Plant List
          </a>
          <a href="#how" className="btn btn-white-outline btn-lg">
            See How It Works
          </a>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== */
/*  FOOTER                                                            */
/* ================================================================== */
const footerCols = [
  {
    title: "Product",
    links: ["How It Works", "Features", "Pricing", "Plant Database"],
  },
  {
    title: "Resources",
    links: ["Garden Journal", "Sun Mapping Guide", "Help Center", "Blog"],
  },
  { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
  { title: "Legal", links: ["Privacy", "Terms", "Cookies", "Accessibility"] },
];

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              <span className="leaf">🌿</span> PlantRight
            </div>
            <p>
              Address-specific plant recommendations. Not your zone. Not your
              region. Your yard.
            </p>
            <div className="social-icons">
              <a href="#" aria-label="Instagram">
                ◎
              </a>
              <a href="#" aria-label="Pinterest">
                ◈
              </a>
              <a href="#" aria-label="Facebook">
                ƒ
              </a>
              <a href="#" aria-label="YouTube">
                ▷
              </a>
            </div>
          </div>

          {footerCols.map((col) => (
            <div className="footer-col" key={col.title}>
              <h5>{col.title}</h5>
              <ul>
                {col.links.map((link) => (
                  <li key={link}>
                    <a href="#">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span>© 2026 PlantRight. All rights reserved.</span>
          <div className="footer-bottom-links">
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ================================================================== */
/*  APP                                                               */
/* ================================================================== */
export default function LandingPage() {
  useScrollReveal();
  useScrollDepth();

  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Pain />
        <Solution />
        <Features />
        <RoiCalculator />
        <Social />
        <Pricing />
        <Video />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
