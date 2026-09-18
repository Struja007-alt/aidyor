import React, { useState } from "react";
import { Link } from "react-router-dom";

/**
 * AIDYOR — API Access page
 * Self-serve signup: company name + email + plan tier → Stripe Checkout → API key.
 * Requires VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY env vars (already used elsewhere in this app).
 */

const CONTACT_EMAIL = "api@aidyor.app";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Tier = "starter" | "growth" | "enterprise";

const PLANS: { tier: Tier; name: string; desc: string; calls: string; price: string }[] = [
  { tier: "starter", name: "Starter", desc: "For testing integration and low-volume bots", calls: "1,000 calls/mo", price: "$49" },
  { tier: "growth", name: "Growth", desc: "For live wallets, bots, and front-ends with real traffic", calls: "5,000 calls/mo", price: "$99" },
  { tier: "enterprise", name: "Enterprise", desc: "High volume, priority support", calls: "25,000 calls/mo", price: "$199" },
];

export default function ApiAccess() {
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(tier: Tier) {
    setError(null);

    if (!companyName.trim() || companyName.trim().length < 2) {
      setError("Enter your company or project name.");
      return;
    }
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim());
    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }

    setLoadingTier(tier);
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/api-signup/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          company_name: companyName.trim(),
          contact_email: contactEmail.trim(),
          plan_tier: tier,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.checkout_url) {
        setError(data.message || data.error || "Something went wrong starting checkout. Please try again.");
        setLoadingTier(null);
        return;
      }

      window.location.href = data.checkout_url;
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Network error. Please try again.");
      setLoadingTier(null);
    }
  }

  return (
    <div className="aidyor-api-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');
        .aidyor-api-page {
          --bg: #0B0F14;
          --panel: #121820;
          --panel-alt: #161D26;
          --border: #232B33;
          --text: #E6EDF3;
          --text-dim: #8B98A5;
          --amber: #FFB454;
          --danger: #FF6B6B;
          --safe: #4ADE80;
          background: var(--bg);
          color: var(--text);
          font-family: 'Inter', -apple-system, sans-serif;
          line-height: 1.5;
          min-height: 100vh;
        }
        .aidyor-api-page * { box-sizing: border-box; }
        .aidyor-api-page .wrap {
          max-width: 880px;
          margin: 0 auto;
          padding: 0 24px;
        }
        .aidyor-api-page .display {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .aidyor-api-page .mono {
          font-family: 'JetBrains Mono', monospace;
        }
        .aidyor-api-page nav {
          border-bottom: 1px solid var(--border);
          padding: 20px 0;
        }
        .aidyor-api-page nav .wrap {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .aidyor-api-page .brand {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 18px;
          letter-spacing: 0.02em;
        }
        .aidyor-api-page .brand span { color: var(--amber); }
        .aidyor-api-page nav a.cta-small {
          color: var(--bg);
          background: var(--amber);
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
        }
        .aidyor-api-page .hero {
          padding: 64px 0 48px;
          display: grid;
          gap: 40px;
        }
        .aidyor-api-page .eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--amber);
          letter-spacing: 0.04em;
          margin-bottom: 16px;
        }
        .aidyor-api-page h1 {
          font-size: clamp(30px, 5vw, 44px);
          margin: 0 0 18px;
          line-height: 1.1;
        }
        .aidyor-api-page .lede {
          color: var(--text-dim);
          font-size: 17px;
          max-width: 54ch;
          margin: 0 0 28px;
        }
        .aidyor-api-page .hero-ctas {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .aidyor-api-page .btn-primary {
          background: var(--amber);
          color: var(--bg);
          font-weight: 600;
          padding: 12px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 15px;
          border: none;
          cursor: pointer;
        }
        .aidyor-api-page .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
        .aidyor-api-page .btn-ghost {
          border: 1px solid var(--border);
          color: var(--text);
          padding: 12px 20px;
          border-radius: 6px;
          text-decoration: none;
          font-size: 15px;
          background: transparent;
          cursor: pointer;
        }
        .aidyor-api-page .terminal {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
        }
        .aidyor-api-page .terminal-bar {
          background: var(--panel-alt);
          border-bottom: 1px solid var(--border);
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .aidyor-api-page .dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: var(--border);
        }
        .aidyor-api-page .terminal-title {
          margin-left: 6px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: var(--text-dim);
        }
        .aidyor-api-page .terminal-body {
          padding: 20px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          overflow-x: auto;
        }
        .aidyor-api-page .terminal-body .req { color: var(--text-dim); }
        .aidyor-api-page .terminal-body .key { color: #7DB0FF; }
        .aidyor-api-page .terminal-body .str { color: var(--safe); }
        .aidyor-api-page .flag-danger { color: var(--danger); }
        .aidyor-api-page .flag-amber { color: var(--amber); }
        .aidyor-api-page .flag-safe { color: var(--safe); }
        .aidyor-api-page pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
        .aidyor-api-page section {
          padding: 48px 0;
          border-top: 1px solid var(--border);
        }
        .aidyor-api-page .section-label {
          font-family: 'JetBrains Mono', monospace;
          color: var(--amber);
          font-size: 13px;
          margin-bottom: 8px;
        }
        .aidyor-api-page h2 {
          font-size: 26px;
          margin: 0 0 24px;
        }
        .aidyor-api-page .endpoint-row {
          display: flex;
          gap: 16px;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
          align-items: baseline;
          flex-wrap: wrap;
        }
        .aidyor-api-page .endpoint-row:last-child { border-bottom: none; }
        .aidyor-api-page .method {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--amber);
          background: rgba(255,180,84,0.1);
          padding: 3px 8px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .aidyor-api-page .path {
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px;
          color: var(--text);
        }
        .aidyor-api-page .desc {
          color: var(--text-dim);
          font-size: 14px;
        }
        .aidyor-api-page .signup-form {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 24px;
          margin-bottom: 28px;
          display: grid;
          gap: 14px;
        }
        .aidyor-api-page .signup-form label {
          font-size: 13px;
          color: var(--text-dim);
          margin-bottom: 6px;
          display: block;
        }
        .aidyor-api-page .signup-form input {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
        }
        .aidyor-api-page .signup-form input:focus {
          outline: none;
          border-color: var(--amber);
        }
        .aidyor-api-page .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .aidyor-api-page .form-error {
          color: var(--danger);
          font-size: 13px;
          margin: 0;
        }
        .aidyor-api-page .pricing-table {
          border-top: 1px solid var(--border);
        }
        .aidyor-api-page .pricing-row {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 16px;
          padding: 20px 0;
          border-bottom: 1px solid var(--border);
          align-items: center;
        }
        .aidyor-api-page .tier-name {
          font-weight: 600;
          font-size: 16px;
        }
        .aidyor-api-page .tier-desc {
          color: var(--text-dim);
          font-size: 13px;
          margin-top: 2px;
        }
        .aidyor-api-page .tier-calls {
          font-family: 'JetBrains Mono', monospace;
          color: var(--text-dim);
          font-size: 14px;
          text-align: right;
        }
        .aidyor-api-page .tier-price {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 20px;
          text-align: right;
          min-width: 90px;
        }
        .aidyor-api-page .tier-price small {
          font-family: 'Inter', sans-serif;
          font-weight: 400;
          font-size: 13px;
          color: var(--text-dim);
        }
        .aidyor-api-page .tier-btn {
          background: var(--amber);
          color: var(--bg);
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 6px;
          border: none;
          font-size: 14px;
          cursor: pointer;
          white-space: nowrap;
        }
        .aidyor-api-page .tier-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .aidyor-api-page .use-cases {
          display: grid;
          gap: 4px;
        }
        .aidyor-api-page .use-case {
          padding: 14px 0;
          border-bottom: 1px solid var(--border);
          display: flex;
          gap: 14px;
        }
        .aidyor-api-page .use-case:last-child { border-bottom: none; }
        .aidyor-api-page .use-case-mark {
          color: var(--amber);
          font-family: 'JetBrains Mono', monospace;
          flex-shrink: 0;
        }
        .aidyor-api-page footer {
          padding: 56px 0 72px;
          text-align: center;
        }
        .aidyor-api-page footer h2 {
          margin-bottom: 12px;
        }
        .aidyor-api-page footer p {
          color: var(--text-dim);
          margin-bottom: 28px;
        }
        @media (min-width: 720px) {
          .aidyor-api-page .hero { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .aidyor-api-page .form-grid { grid-template-columns: 1fr; }
          .aidyor-api-page .pricing-row { grid-template-columns: 1fr; text-align: left; gap: 8px; }
          .aidyor-api-page .tier-calls, .aidyor-api-page .tier-price { text-align: left; }
        }
      `}</style>

      <nav>
        <div className="wrap">
          <div className="brand">AIDYOR<span>.</span> API</div>
          <a className="cta-small" href="#pricing">Get API access</a>
        </div>
      </nav>

      <div className="wrap">
        <section className="hero" style={{ borderTop: "none" }}>
          <div>
            <div className="eyebrow">// RISK SCORE API</div>
            <h1 className="display">
              Stop bad contracts before your users touch them.
            </h1>
            <p className="lede">
              One API call returns a risk score across 9 chains — rug pulls, honeypots,
              hidden taxes, and more. Built for wallets, trading bots, and DEX front-ends
              that need a scam check without building one from scratch.
            </p>
            <div className="hero-ctas">
              <a className="btn-primary" href="#pricing">Get started</a>
              <Link className="btn-ghost" to="/api-docs">Read the docs</Link>
            </div>
          </div>

          <div className="terminal">
            <div className="terminal-bar">
              <div className="dot" />
              <div className="dot" />
              <div className="dot" />
              <span className="terminal-title">POST /v1/scan</span>
            </div>
            <div className="terminal-body">
              <pre>
                <span className="req">{`{`}</span>{"\n"}
                {"  "}<span className="key">"chain"</span>: <span className="str">"ethereum"</span>,{"\n"}
                {"  "}<span className="key">"address"</span>: <span className="str">"0x7a25...d41f"</span>{"\n"}
                <span className="req">{`}`}</span>{"\n\n"}
                <span className="req">→ 200 OK</span>{"\n"}
                <span className="req">{`{`}</span>{"\n"}
                {"  "}<span className="key">"risk_score"</span>: 82,{"\n"}
                {"  "}<span className="key">"verdict"</span>: <span className="flag-danger">"high_risk"</span>,{"\n"}
                {"  "}<span className="key">"flags"</span>: [{"\n"}
                {"    "}<span className="flag-danger">"honeypot_suspected"</span>,{"\n"}
                {"    "}<span className="flag-amber">"liquidity_unlocked"</span>,{"\n"}
                {"    "}<span className="flag-amber">"high_sell_tax"</span>{"\n"}
                {"  "}],{"\n"}
                {"  "}<span className="key">"sources_checked"</span>: 7{"\n"}
                <span className="req">{`}`}</span>
              </pre>
            </div>
          </div>
        </section>

        <section id="endpoints">
          <div className="section-label">// ENDPOINTS</div>
          <h2 className="display">What you get</h2>
          <div className="endpoint-row">
            <span className="method">POST</span>
            <span className="path">/scan</span>
            <span className="desc">Single contract risk check — address (+ optional chain) in, risk score + flags out</span>
          </div>
          <div className="endpoint-row">
            <span className="method">GET</span>
            <span className="path">/usage</span>
            <span className="desc">Check your current billing-period usage and remaining calls</span>
          </div>
          <div className="endpoint-row">
            <span className="method">GET</span>
            <span className="path">/plans</span>
            <span className="desc">Public — list available pricing tiers, no auth required</span>
          </div>
        </section>

        <section id="pricing">
          <div className="section-label">// PRICING</div>
          <h2 className="display">Simple, usage-based tiers</h2>

          <div className="signup-form">
            <div className="form-grid">
              <div>
                <label htmlFor="company_name">Company / project name</label>
                <input
                  id="company_name"
                  type="text"
                  placeholder="Acme Wallet"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="contact_email">Work email</label>
                <input
                  id="contact_email"
                  type="email"
                  placeholder="you@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <p className="desc" style={{ margin: 0 }}>
              Pick a plan below. You'll be sent to Stripe Checkout, then your API key is issued instantly on payment.
            </p>
          </div>

          <div className="pricing-table">
            {PLANS.map((plan) => (
              <div className="pricing-row" key={plan.tier}>
                <div>
                  <div className="tier-name">{plan.name}</div>
                  <div className="tier-desc">{plan.desc}</div>
                </div>
                <div className="tier-calls">{plan.calls}</div>
                <div className="tier-price">{plan.price}<small>/mo</small></div>
                <button
                  className="tier-btn"
                  disabled={loadingTier !== null}
                  onClick={() => startCheckout(plan.tier)}
                >
                  {loadingTier === plan.tier ? "Redirecting…" : "Subscribe"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section id="who-its-for">
          <div className="section-label">// WHO IT'S FOR</div>
          <h2 className="display">Built to drop into products people already use</h2>
          <div className="use-cases">
            <div className="use-case">
              <span className="use-case-mark">→</span>
              <span><strong>Wallet apps</strong> — flag risky contracts before a user signs a transaction</span>
            </div>
            <div className="use-case">
              <span className="use-case-mark">→</span>
              <span><strong>Trading bots</strong> — add a risk check command before a trade executes</span>
            </div>
            <div className="use-case">
              <span className="use-case-mark">→</span>
              <span><strong>DEX front-ends</strong> — show a risk badge next to new/unverified token listings</span>
            </div>
            <div className="use-case">
              <span className="use-case-mark">→</span>
              <span><strong>Portfolio trackers</strong> — warn users holding flagged tokens</span>
            </div>
          </div>
        </section>

        <footer>
          <h2 className="display">Questions before you subscribe?</h2>
          <p>Enterprise volume, custom terms, or anything else — reach out directly.</p>
          <div className="hero-ctas" style={{ justifyContent: "center" }}>
            <a className="btn-primary" href={`mailto:${CONTACT_EMAIL}?subject=AIDYOR API Access`}>
              Email us
            </a>
            <Link className="btn-ghost" to="/api-docs">Read the docs</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
